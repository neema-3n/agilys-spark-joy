import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { CreateReservationDto, UpdateReservationDto } from './dto/reservations.dto';
import { ReservationStatus, assertReservationTransitionAllowed } from '../common/domain/reservation-engagement-rules';

interface ReservationRow {
  id: string;
  numero: string;
  exercice_id: string;
  ligne_budgetaire_id: string;
  montant: string | number;
  objet: string;
  beneficiaire: string | null;
  projet_id: string | null;
  date_reservation: Date | string;
  date_expiration: Date | string | null;
  statut: 'active' | 'utilisee' | 'annulee' | 'expiree';
  motif_annulation: string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  client_id: string;
  ecritures_count: string | number;
  ligne_budgetaire_libelle: string | null;
  ligne_budgetaire_disponible: string | number | null;
  projet_code: string | null;
  projet_nom: string | null;
  projet_statut: string | null;
  engagements_json: Array<{
    id: string;
    numero: string;
    montant: string | number;
    statut: string;
  }> | null;
}

interface EcritureRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero_piece: string;
  numero_ligne: number;
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

interface ReservationView {
  id: string;
  numero: string;
  exerciceId: string;
  ligneBudgetaireId: string;
  montant: number;
  objet: string;
  beneficiaire?: string;
  projetId?: string;
  dateReservation: string;
  dateExpiration?: string;
  statut: ReservationStatus;
  motifAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  ecrituresCount?: number;
  ligneBudgetaire?: {
    libelle: string;
    disponible: number;
  };
  projet?: {
    id: string;
    code: string;
    nom: string;
    statut: string;
  };
  engagements?: Array<{
    id: string;
    numero: string;
    montant: number;
    statut: string;
  }>;
}

@Injectable()
export class ReservationsService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser, exerciceId: string): Promise<ReservationView[]> {
    const result = await this.postgresService.query<ReservationRow>(
      this.baseSelect() +
        `
          WHERE r.client_id = $1
            AND r.exercice_id = $2
          ORDER BY r.created_at DESC
        `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<ReservationView> {
    const result = await this.postgresService.query<ReservationRow>(
      this.baseSelect() +
        `
          WHERE r.client_id = $1
            AND r.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Réservation introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateReservationDto): Promise<ReservationView> {
    const exerciceResult = await this.postgresService.query<{ code: string }>(
      `
        SELECT code
        FROM public.exercices
        WHERE id = $1
        LIMIT 1
      `,
      [payload.exerciceId]
    );

    const exerciceCode = exerciceResult.rows[0]?.code;
    if (!exerciceCode) {
      throw new NotFoundException('Exercice introuvable');
    }

    await this.assertLigneBudgetaireInScope(actor.tenantId, payload.exerciceId, payload.ligneBudgetaireId);
    if (payload.projetId) {
      await this.assertProjetInScope(actor.tenantId, payload.exerciceId, payload.projetId);
    }

    const numero = await this.generateNextNumero(actor.tenantId, payload.exerciceId);

    const inserted = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.reservations_credits (
          numero,
          exercice_id,
          client_id,
          ligne_budgetaire_id,
          montant,
          objet,
          beneficiaire,
          projet_id,
          date_expiration,
          statut,
          date_reservation,
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
          'active',
          CURRENT_DATE,
          $10
        )
        RETURNING id
      `,
      [
        numero,
        payload.exerciceId,
        actor.tenantId,
        payload.ligneBudgetaireId,
        payload.montant,
        payload.objet,
        payload.beneficiaire?.trim() || null,
        payload.projetId ?? null,
        payload.dateExpiration ?? null,
        actor.sub
      ]
    );

    const id = inserted.rows[0]?.id;
    if (!id) {
      throw new NotFoundException('Réservation non créée');
    }

    const created = await this.getById(actor, id);
    await this.generateEcrituresForReservation(actor, created);
    return created;
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateReservationDto): Promise<ReservationView> {
    const reservation = await this.getById(actor, id);
    assertReservationTransitionAllowed('update', reservation.statut);

    const ecritures = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.ecritures_comptables
        WHERE reservation_id = $1
          AND statut_ecriture = 'validee'
        LIMIT 1
      `,
      [id]
    );

    if (ecritures.rows.length > 0) {
      throw new BadRequestException(
        '❌ Modification impossible : Cette opération a été comptabilisée.\n\n' +
          '💡 Pour effectuer une correction :\n' +
          "1. Annulez cette réservation (génère des écritures d'annulation)\n" +
          '2. Créez une nouvelle réservation avec les bonnes valeurs'
      );
    }

    const keys = Object.keys(payload) as Array<keyof UpdateReservationDto>;
    if (keys.length === 0) {
      return this.getById(actor, id);
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) {
        continue;
      }

      setClauses.push(`${this.mapUpdateKeyToColumn(key)} = $${index}`);
      values.push(value);
      index += 1;
    }

    if (setClauses.length === 0) {
      return this.getById(actor, id);
    }

    if (payload.ligneBudgetaireId) {
      await this.assertLigneBudgetaireInScope(actor.tenantId, reservation.exerciceId, payload.ligneBudgetaireId);
    }

    if (payload.projetId !== undefined && payload.projetId !== null) {
      await this.assertProjetInScope(actor.tenantId, reservation.exerciceId, payload.projetId);
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query(
      `
        UPDATE public.reservations_credits
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
      `,
      values
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Réservation introuvable');
    }

    return this.getById(actor, id);
  }

  async utiliser(actor: AuthenticatedUser, id: string): Promise<ReservationView> {
    const reservation = await this.getById(actor, id);
    assertReservationTransitionAllowed('utiliser', reservation.statut);

    const result = await this.postgresService.query(
      `
        UPDATE public.reservations_credits
        SET
          statut = 'utilisee',
          updated_at = now()
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Réservation introuvable');
    }

    return this.getById(actor, id);
  }

  async annuler(actor: AuthenticatedUser, id: string, motifAnnulation: string): Promise<ReservationView> {
    const reservation = await this.getById(actor, id);
    assertReservationTransitionAllowed('annuler', reservation.statut);

    const ecritures = await this.postgresService.query<EcritureRow>(
      `
        SELECT
          id,
          client_id,
          exercice_id,
          numero_piece,
          numero_ligne,
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
        WHERE reservation_id = $1
          AND statut_ecriture = 'validee'
      `,
      [id]
    );

    if (ecritures.rows.length > 0) {
      await this.createContrepassations(actor, ecritures.rows, motifAnnulation);
    }

    const result = await this.postgresService.query(
      `
        UPDATE public.reservations_credits
        SET
          statut = 'annulee',
          motif_annulation = $1,
          updated_at = now()
        WHERE id = $2
          AND client_id = $3
      `,
      [motifAnnulation, id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Réservation introuvable');
    }

    return this.getById(actor, id);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const reservation = await this.getById(actor, id);

    if (reservation.statut !== 'active') {
      throw new BadRequestException(
        '❌ Suppression impossible\n\n💡 Utilisez l\'annulation au lieu de la suppression pour conserver l\'historique'
      );
    }

    const result = await this.postgresService.query(
      `
        DELETE FROM public.reservations_credits
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Réservation introuvable');
    }
  }

  private async assertLigneBudgetaireInScope(tenantId: string, exerciceId: string, ligneBudgetaireId: string): Promise<void> {
    const result = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.lignes_budgetaires
        WHERE id = $1
          AND client_id = $2
          AND exercice_id = $3
          AND statut = 'actif'
        LIMIT 1
      `,
      [ligneBudgetaireId, tenantId, exerciceId]
    );

    if (!result.rows[0]) {
      throw new BadRequestException(
        "Ligne budgétaire invalide pour le tenant/exercice actif ou non disponible (statut attendu: 'actif')."
      );
    }
  }

  private async assertProjetInScope(tenantId: string, exerciceId: string, projetId: string): Promise<void> {
    const result = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.projets
        WHERE id = $1
          AND client_id = $2
          AND exercice_id = $3
        LIMIT 1
      `,
      [projetId, tenantId, exerciceId]
    );

    if (!result.rows[0]) {
      throw new BadRequestException('Projet invalide pour le tenant/exercice actif.');
    }
  }

  private async generateNextNumero(clientId: string, exerciceId: string): Promise<string> {
    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.reservations_credits
        WHERE client_id = $1
          AND exercice_id = $2
          AND numero LIKE 'RES-%'
        ORDER BY numero DESC
        LIMIT 1
      `,
      [clientId, exerciceId]
    );

    const lastNumero = result.rows[0]?.numero;
    const match = lastNumero?.match(/^RES-(\d+)$/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `RES-${String(nextNumber).padStart(5, '0')}`;
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

  private async generateEcrituresForReservation(actor: AuthenticatedUser, reservation: ReservationView): Promise<void> {
    const operationDataResult = await this.postgresService.query<Record<string, unknown>>(
      `
        SELECT *
        FROM public.reservations_credits
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [reservation.id, actor.tenantId]
    );

    const operationData = operationDataResult.rows[0];
    if (!operationData) {
      return;
    }

    await this.postgresService.query(
      `
        SELECT public.generate_ecritures_comptables(
          $1,
          $2::uuid,
          $3,
          $4::uuid,
          $5,
          $6::date,
          $7,
          $8::jsonb,
          $9::uuid
        )
      `,
      [
        reservation.clientId,
        reservation.exerciceId,
        'reservation',
        reservation.id,
        reservation.numero,
        reservation.dateReservation,
        reservation.montant,
        JSON.stringify(operationData),
        actor.sub
      ]
    );
  }

  private mapUpdateKeyToColumn(key: keyof UpdateReservationDto): string {
    const map: Record<keyof UpdateReservationDto, string> = {
      ligneBudgetaireId: 'ligne_budgetaire_id',
      montant: 'montant',
      objet: 'objet',
      beneficiaire: 'beneficiaire',
      projetId: 'projet_id',
      dateExpiration: 'date_expiration'
    };

    return map[key];
  }

  private baseSelect(): string {
    return `
      SELECT
        r.*,
        lb.libelle AS ligne_budgetaire_libelle,
        lb.disponible AS ligne_budgetaire_disponible,
        p.code AS projet_code,
        p.nom AS projet_nom,
        p.statut AS projet_statut,
        COALESCE(ec.cnt, 0) AS ecritures_count,
        COALESCE(eng.items, '[]'::jsonb) AS engagements_json
      FROM public.reservations_credits r
      LEFT JOIN public.lignes_budgetaires lb ON lb.id = r.ligne_budgetaire_id
      LEFT JOIN public.projets p ON p.id = r.projet_id
      LEFT JOIN (
        SELECT reservation_id, COUNT(*) AS cnt
        FROM public.ecritures_comptables
        GROUP BY reservation_id
      ) ec ON ec.reservation_id = r.id
      LEFT JOIN (
        SELECT
          reservation_credit_id,
          jsonb_agg(
            jsonb_build_object(
              'id', id,
              'numero', numero,
              'montant', montant,
              'statut', statut
            )
            ORDER BY created_at DESC
          ) AS items
        FROM public.engagements
        GROUP BY reservation_credit_id
      ) eng ON eng.reservation_credit_id = r.id
    `;
  }

  private mapRowToView(row: ReservationRow): ReservationView {
    const engagements = (row.engagements_json || []).map((eng) => ({
      id: eng.id,
      numero: eng.numero,
      montant: Number(eng.montant ?? 0),
      statut: eng.statut
    }));

    return {
      id: row.id,
      numero: row.numero,
      exerciceId: row.exercice_id,
      ligneBudgetaireId: row.ligne_budgetaire_id,
      montant: Number(row.montant ?? 0),
      objet: row.objet,
      beneficiaire: row.beneficiaire ?? undefined,
      projetId: row.projet_id ?? undefined,
      dateReservation: this.toDateOnly(row.date_reservation),
      dateExpiration: row.date_expiration ? this.toDateOnly(row.date_expiration) : undefined,
      statut: row.statut,
      motifAnnulation: row.motif_annulation ?? undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      clientId: row.client_id,
      ecrituresCount: Number(row.ecritures_count ?? 0),
      ligneBudgetaire:
        row.ligne_budgetaire_libelle && row.ligne_budgetaire_disponible !== null
          ? {
              libelle: row.ligne_budgetaire_libelle,
              disponible: Number(row.ligne_budgetaire_disponible)
            }
          : undefined,
      projet:
        row.projet_id && row.projet_code && row.projet_nom && row.projet_statut
          ? {
              id: row.projet_id,
              code: row.projet_code,
              nom: row.projet_nom,
              statut: row.projet_statut
            }
          : undefined,
      engagements: engagements.length > 0 ? engagements : undefined
    };
  }

  private toDateOnly(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    return value.toISOString().slice(0, 10);
  }
}
