import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { CreatePaiementDto } from './dto/paiements.dto';

interface PaiementRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  depense_id: string;
  montant: string | number;
  date_paiement: Date | string;
  mode_paiement: 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';
  reference_paiement: string | null;
  observations: string | null;
  statut: 'valide' | 'annule';
  motif_annulation: string | null;
  date_annulation: Date | string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  depense_numero: string | null;
  depense_objet: string | null;
  depense_montant: string | number | null;
  fournisseur_id: string | null;
  fournisseur_nom: string | null;
  fournisseur_code: string | null;
  ecritures_count: string | number;
}

interface EcritureRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero_piece: string;
  numero_ligne: number;
  date_ecriture: Date | string;
  compte_debit_id: string;
  compte_credit_id: string;
  montant: string | number;
  libelle: string;
  type_operation: string;
  source_id: string;
  regle_comptable_id: string | null;
  engagement_id: string | null;
  reservation_id: string | null;
  bon_commande_id: string | null;
  facture_id: string | null;
  depense_id: string | null;
  paiement_id: string | null;
}

interface PaiementView {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  depenseId: string;
  montant: number;
  datePaiement: string;
  modePaiement: 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';
  referencePaiement?: string;
  observations?: string;
  statut: 'valide' | 'annule';
  motifAnnulation?: string;
  dateAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  ecrituresCount?: number;
  depense?: {
    id: string;
    numero: string;
    objet: string;
    montant: number;
    fournisseur?: {
      id: string;
      nom: string;
      code: string;
    };
  };
}

@Injectable()
export class PaiementsService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser, exerciceId: string): Promise<PaiementView[]> {
    const result = await this.postgresService.query<PaiementRow>(
      this.baseSelect() +
        `
          WHERE p.client_id = $1
            AND p.exercice_id = $2
          ORDER BY p.date_paiement DESC, p.created_at DESC
        `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getByDepense(actor: AuthenticatedUser, depenseId: string): Promise<PaiementView[]> {
    const result = await this.postgresService.query<PaiementRow>(
      this.baseSelect() +
        `
          WHERE p.client_id = $1
            AND p.depense_id = $2
          ORDER BY p.date_paiement DESC, p.created_at DESC
        `,
      [actor.tenantId, depenseId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<PaiementView> {
    const result = await this.postgresService.query<PaiementRow>(
      this.baseSelect() +
        `
          WHERE p.client_id = $1
            AND p.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Paiement introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreatePaiementDto): Promise<PaiementView> {
    const depense = await this.postgresService.query<{
      id: string;
      client_id: string;
      exercice_id: string;
    }>(
      `
        SELECT id, client_id, exercice_id
        FROM public.depenses
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [payload.depenseId, actor.tenantId]
    );

    const depenseRow = depense.rows[0];
    if (!depenseRow) {
      throw new NotFoundException('Dépense introuvable');
    }

    if (depenseRow.exercice_id !== payload.exerciceId) {
      throw new BadRequestException('La dépense ne correspond pas à l\'exercice sélectionné');
    }

    const numero = await this.generateNextNumero(actor.tenantId, payload.exerciceId);

    const insertResult = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.paiements (
          client_id,
          exercice_id,
          numero,
          depense_id,
          montant,
          date_paiement,
          mode_paiement,
          reference_paiement,
          observations,
          statut,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          'valide',
          $10
        )
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.exerciceId,
        numero,
        payload.depenseId,
        payload.montant,
        payload.datePaiement,
        payload.modePaiement,
        payload.referencePaiement?.trim() || null,
        payload.observations?.trim() || null,
        actor.sub
      ]
    );

    const insertedId = insertResult.rows[0]?.id;
    if (!insertedId) {
      throw new NotFoundException('Impossible de créer le paiement');
    }

    return this.getById(actor, insertedId);
  }

  async annuler(actor: AuthenticatedUser, id: string, motif: string): Promise<PaiementView> {
    const paiement = await this.getById(actor, id);

    const validatedEntries = await this.postgresService.query<EcritureRow>(
      `
        SELECT
          id,
          client_id,
          exercice_id,
          numero_piece,
          numero_ligne,
          date_ecriture,
          compte_debit_id,
          compte_credit_id,
          montant,
          libelle,
          type_operation,
          source_id,
          regle_comptable_id,
          engagement_id,
          reservation_id,
          bon_commande_id,
          facture_id,
          depense_id,
          paiement_id
        FROM public.ecritures_comptables
        WHERE paiement_id = $1
          AND statut_ecriture = 'validee'
      `,
      [id]
    );

    if (validatedEntries.rows.length > 0) {
      await this.createContrepassations(actor, validatedEntries.rows, motif);
    }

    const updateResult = await this.postgresService.query(
      `
        UPDATE public.paiements
        SET
          statut = 'annule',
          motif_annulation = $1,
          date_annulation = CURRENT_DATE,
          updated_at = now()
        WHERE id = $2
          AND client_id = $3
      `,
      [motif, id, actor.tenantId]
    );

    if ((updateResult.rowCount ?? 0) === 0) {
      throw new NotFoundException('Paiement introuvable');
    }

    return this.getById(actor, id);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const paiement = await this.getById(actor, id);

    if (paiement.statut === 'valide') {
      throw new BadRequestException(
        '❌ Suppression impossible\n\n💡 Utilisez l\'annulation au lieu de la suppression pour conserver l\'historique comptable'
      );
    }

    const result = await this.postgresService.query(
      `
        DELETE FROM public.paiements
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Paiement introuvable');
    }
  }

  private async createContrepassations(actor: AuthenticatedUser, entries: EcritureRow[], motif: string): Promise<void> {
    for (const entry of entries) {
      await this.postgresService.query(
        `
          INSERT INTO public.ecritures_comptables (
            client_id,
            exercice_id,
            numero_piece,
            numero_ligne,
            date_ecriture,
            compte_debit_id,
            compte_credit_id,
            montant,
            libelle,
            type_operation,
            source_id,
            regle_comptable_id,
            statut_ecriture,
            ecriture_origine_id,
            created_by,
            engagement_id,
            reservation_id,
            bon_commande_id,
            facture_id,
            depense_id,
            paiement_id
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            CURRENT_DATE,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            'contrepassation',
            $12,
            $13,
            $14,
            $15,
            $16,
            $17,
            $18,
            $19
          )
        `,
        [
          entry.client_id,
          entry.exercice_id,
          entry.numero_piece,
          entry.numero_ligne + 1000,
          entry.compte_credit_id,
          entry.compte_debit_id,
          entry.montant,
          `Annulation: ${entry.libelle} - ${motif}`,
          entry.type_operation,
          entry.source_id,
          entry.regle_comptable_id,
          entry.id,
          actor.sub,
          entry.engagement_id,
          entry.reservation_id,
          entry.bon_commande_id,
          entry.facture_id,
          entry.depense_id,
          entry.paiement_id
        ]
      );
    }
  }

  private async generateNextNumero(clientId: string, exerciceId: string): Promise<string> {
    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.paiements
        WHERE client_id = $1
          AND exercice_id = $2
          AND numero LIKE 'PAY%'
        ORDER BY numero DESC
        LIMIT 1
      `,
      [clientId, exerciceId]
    );

    const lastNumero = result.rows[0]?.numero;
    const match = lastNumero?.match(/^PAY(\d+)$/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `PAY${String(nextNumber).padStart(6, '0')}`;
  }

  private baseSelect(): string {
    return `
      SELECT
        p.*,
        d.numero AS depense_numero,
        d.objet AS depense_objet,
        d.montant AS depense_montant,
        f.id AS fournisseur_id,
        f.nom AS fournisseur_nom,
        f.code AS fournisseur_code,
        COALESCE(ec.cnt, 0) AS ecritures_count
      FROM public.paiements p
      LEFT JOIN public.depenses d ON d.id = p.depense_id
      LEFT JOIN public.fournisseurs f ON f.id = d.fournisseur_id
      LEFT JOIN (
        SELECT paiement_id, COUNT(*) AS cnt
        FROM public.ecritures_comptables
        GROUP BY paiement_id
      ) ec ON ec.paiement_id = p.id
    `;
  }

  private mapRowToView(row: PaiementRow): PaiementView {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      numero: row.numero,
      depenseId: row.depense_id,
      montant: Number(row.montant ?? 0),
      datePaiement: this.toDateOnly(row.date_paiement),
      modePaiement: row.mode_paiement,
      referencePaiement: row.reference_paiement ?? undefined,
      observations: row.observations ?? undefined,
      statut: row.statut,
      motifAnnulation: row.motif_annulation ?? undefined,
      dateAnnulation: row.date_annulation ? this.toDateOnly(row.date_annulation) : undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      ecrituresCount: Number(row.ecritures_count ?? 0),
      depense:
        row.depense_numero && row.depense_objet && row.depense_montant !== null
          ? {
              id: row.depense_id,
              numero: row.depense_numero,
              objet: row.depense_objet,
              montant: Number(row.depense_montant),
              fournisseur:
                row.fournisseur_id && row.fournisseur_nom && row.fournisseur_code
                  ? {
                      id: row.fournisseur_id,
                      nom: row.fournisseur_nom,
                      code: row.fournisseur_code
                    }
                  : undefined
            }
          : undefined
    };
  }

  private toDateOnly(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    return value.toISOString().slice(0, 10);
  }
}
