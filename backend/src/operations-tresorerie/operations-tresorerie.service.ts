import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { CreateOperationTresorerieDto } from './dto/operations-tresorerie.dto';

interface OperationTresorerieRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  date_operation: Date | string;
  type_operation: 'encaissement' | 'decaissement' | 'transfert';
  compte_id: string;
  compte_contrepartie_id: string | null;
  montant: string | number;
  mode_paiement: string | null;
  reference_bancaire: string | null;
  libelle: string;
  categorie: string | null;
  piece_justificative: string | null;
  paiement_id: string | null;
  recette_id: string | null;
  depense_id: string | null;
  statut: 'validee' | 'rapprochee' | 'annulee';
  rapproche: boolean;
  date_rapprochement: Date | string | null;
  observations: string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  compte_code: string | null;
  compte_libelle: string | null;
  compte_type: string | null;
  compte_contrepartie_code: string | null;
  compte_contrepartie_libelle: string | null;
  compte_contrepartie_type: string | null;
  paiement_numero: string | null;
  depense_rel_id: string | null;
  depense_numero: string | null;
  depense_objet: string | null;
  ligne_budgetaire_id: string | null;
  ligne_budgetaire_libelle: string | null;
}

interface OperationsTresorerieStatsRow {
  nombre_total: string | number;
  nombre_encaissements: string | number;
  nombre_decaissements: string | number;
  nombre_transferts: string | number;
  montant_encaissements: string | number;
  montant_decaissements: string | number;
  montant_transferts: string | number;
  solde_net: string | number;
  operations_non_rapprochees: string | number;
}

interface OperationTresorerieView {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateOperation: string;
  typeOperation: 'encaissement' | 'decaissement' | 'transfert';
  compteId: string;
  compteContrepartieId?: string;
  montant: number;
  modePaiement?: string;
  referenceBancaire?: string;
  libelle: string;
  categorie?: string;
  pieceJustificative?: string;
  paiementId?: string;
  recetteId?: string;
  depenseId?: string;
  statut: 'validee' | 'rapprochee' | 'annulee';
  rapproche: boolean;
  dateRapprochement?: string;
  observations?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  compte?: {
    code: string;
    libelle: string;
    type: string;
  };
  compteContrepartie?: {
    code: string;
    libelle: string;
    type: string;
  };
  paiement?: {
    id: string;
    numero: string;
    depense?: {
      id: string;
      numero: string;
      objet: string;
      ligneBudgetaire?: {
        id: string;
        libelle: string;
      };
    };
  };
}

interface OperationsTresorerieStatsView {
  nombreTotal: number;
  nombreEncaissements: number;
  nombreDecaissements: number;
  nombreTransferts: number;
  montantEncaissements: number;
  montantDecaissements: number;
  montantTransferts: number;
  soldeNet: number;
  operationsNonRapprochees: number;
}

@Injectable()
export class OperationsTresorerieService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser, exerciceId: string): Promise<OperationTresorerieView[]> {
    const result = await this.postgresService.query<OperationTresorerieRow>(
      this.buildBaseSelect() +
        `
          WHERE ot.client_id = $1
            AND ot.exercice_id = $2
          ORDER BY ot.date_operation DESC, ot.numero DESC
        `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getByCompte(actor: AuthenticatedUser, compteId: string): Promise<OperationTresorerieView[]> {
    const result = await this.postgresService.query<OperationTresorerieRow>(
      this.buildBaseSelect() +
        `
          WHERE ot.client_id = $1
            AND ot.compte_id = $2
          ORDER BY ot.date_operation DESC, ot.numero DESC
        `,
      [actor.tenantId, compteId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<OperationTresorerieView> {
    const result = await this.postgresService.query<OperationTresorerieRow>(
      this.buildBaseSelect() +
        `
          WHERE ot.client_id = $1
            AND ot.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Opération de trésorerie introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateOperationTresorerieDto): Promise<OperationTresorerieView> {
    const numero = await this.generateNextNumero(actor.tenantId, payload.exerciceId);

    const result = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.operations_tresorerie (
          client_id,
          exercice_id,
          numero,
          date_operation,
          type_operation,
          compte_id,
          compte_contrepartie_id,
          montant,
          mode_paiement,
          reference_bancaire,
          libelle,
          categorie,
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
          $10,
          $11,
          $12,
          $13,
          'validee',
          $14
        )
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.exerciceId,
        numero,
        payload.dateOperation,
        payload.typeOperation,
        payload.compteId,
        payload.compteContrepartieId?.trim() ? payload.compteContrepartieId : null,
        payload.montant,
        payload.modePaiement?.trim() || null,
        payload.referenceBancaire?.trim() || null,
        payload.libelle,
        payload.categorie?.trim() || null,
        payload.observations?.trim() || null,
        actor.sub
      ]
    );

    const insertedId = result.rows[0]?.id;
    if (!insertedId) {
      throw new NotFoundException("Impossible de créer l'opération de trésorerie");
    }

    return this.getById(actor, insertedId);
  }

  async rapprocher(actor: AuthenticatedUser, operationIds: string[]): Promise<void> {
    const result = await this.postgresService.query(
      `
        UPDATE public.operations_tresorerie
        SET
          rapproche = true,
          statut = 'rapprochee',
          date_rapprochement = CURRENT_DATE,
          updated_at = now()
        WHERE client_id = $1
          AND id = ANY($2::uuid[])
      `,
      [actor.tenantId, operationIds]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Aucune opération de trésorerie à rapprocher');
    }
  }

  async getStats(actor: AuthenticatedUser, exerciceId: string): Promise<OperationsTresorerieStatsView> {
    const result = await this.postgresService.query<OperationsTresorerieStatsRow>(
      `
        SELECT
          COUNT(*) AS nombre_total,
          COUNT(*) FILTER (WHERE type_operation = 'encaissement') AS nombre_encaissements,
          COUNT(*) FILTER (WHERE type_operation = 'decaissement') AS nombre_decaissements,
          COUNT(*) FILTER (WHERE type_operation = 'transfert') AS nombre_transferts,
          COALESCE(SUM(montant) FILTER (WHERE type_operation = 'encaissement'), 0) AS montant_encaissements,
          COALESCE(SUM(montant) FILTER (WHERE type_operation = 'decaissement'), 0) AS montant_decaissements,
          COALESCE(SUM(montant) FILTER (WHERE type_operation = 'transfert'), 0) AS montant_transferts,
          COALESCE(
            SUM(CASE
              WHEN type_operation = 'encaissement' THEN montant
              WHEN type_operation = 'decaissement' THEN -montant
              ELSE 0
            END),
            0
          ) AS solde_net,
          COUNT(*) FILTER (WHERE rapproche = false) AS operations_non_rapprochees
        FROM public.operations_tresorerie
        WHERE client_id = $1
          AND exercice_id = $2
          AND statut != 'annulee'
      `,
      [actor.tenantId, exerciceId]
    );

    const row = result.rows[0];

    return {
      nombreTotal: Number(row?.nombre_total ?? 0),
      nombreEncaissements: Number(row?.nombre_encaissements ?? 0),
      nombreDecaissements: Number(row?.nombre_decaissements ?? 0),
      nombreTransferts: Number(row?.nombre_transferts ?? 0),
      montantEncaissements: Number(row?.montant_encaissements ?? 0),
      montantDecaissements: Number(row?.montant_decaissements ?? 0),
      montantTransferts: Number(row?.montant_transferts ?? 0),
      soldeNet: Number(row?.solde_net ?? 0),
      operationsNonRapprochees: Number(row?.operations_non_rapprochees ?? 0)
    };
  }

  private async generateNextNumero(clientId: string, exerciceId: string): Promise<string> {
    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.operations_tresorerie
        WHERE client_id = $1
          AND exercice_id = $2
          AND numero LIKE 'OPE%'
        ORDER BY numero DESC
        LIMIT 1
      `,
      [clientId, exerciceId]
    );

    const lastNumero = result.rows[0]?.numero;
    const match = lastNumero?.match(/^OPE(\d+)$/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `OPE${String(nextNumber).padStart(6, '0')}`;
  }

  private buildBaseSelect(): string {
    return `
      SELECT
        ot.*,
        c.code AS compte_code,
        c.libelle AS compte_libelle,
        c.type AS compte_type,
        cc.code AS compte_contrepartie_code,
        cc.libelle AS compte_contrepartie_libelle,
        cc.type AS compte_contrepartie_type,
        p.numero AS paiement_numero,
        d.id AS depense_rel_id,
        d.numero AS depense_numero,
        d.objet AS depense_objet,
        lb.id AS ligne_budgetaire_id,
        lb.libelle AS ligne_budgetaire_libelle
      FROM public.operations_tresorerie ot
      LEFT JOIN public.comptes_tresorerie c ON c.id = ot.compte_id
      LEFT JOIN public.comptes_tresorerie cc ON cc.id = ot.compte_contrepartie_id
      LEFT JOIN public.paiements p ON p.id = ot.paiement_id
      LEFT JOIN public.depenses d ON d.id = p.depense_id
      LEFT JOIN public.lignes_budgetaires lb ON lb.id = d.ligne_budgetaire_id
    `;
  }

  private mapRowToView(row: OperationTresorerieRow): OperationTresorerieView {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      numero: row.numero,
      dateOperation: this.toDateOnly(row.date_operation),
      typeOperation: row.type_operation,
      compteId: row.compte_id,
      compteContrepartieId: row.compte_contrepartie_id ?? undefined,
      montant: Number(row.montant ?? 0),
      modePaiement: row.mode_paiement ?? undefined,
      referenceBancaire: row.reference_bancaire ?? undefined,
      libelle: row.libelle,
      categorie: row.categorie ?? undefined,
      pieceJustificative: row.piece_justificative ?? undefined,
      paiementId: row.paiement_id ?? undefined,
      recetteId: row.recette_id ?? undefined,
      depenseId: row.depense_id ?? undefined,
      statut: row.statut,
      rapproche: row.rapproche,
      dateRapprochement: row.date_rapprochement ? this.toDateOnly(row.date_rapprochement) : undefined,
      observations: row.observations ?? undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      compte:
        row.compte_code && row.compte_libelle && row.compte_type
          ? {
              code: row.compte_code,
              libelle: row.compte_libelle,
              type: row.compte_type
            }
          : undefined,
      compteContrepartie:
        row.compte_contrepartie_code && row.compte_contrepartie_libelle && row.compte_contrepartie_type
          ? {
              code: row.compte_contrepartie_code,
              libelle: row.compte_contrepartie_libelle,
              type: row.compte_contrepartie_type
            }
          : undefined,
      paiement:
        row.paiement_id && row.paiement_numero
          ? {
              id: row.paiement_id,
              numero: row.paiement_numero,
              depense:
                row.depense_rel_id && row.depense_numero && row.depense_objet
                  ? {
                      id: row.depense_rel_id,
                      numero: row.depense_numero,
                      objet: row.depense_objet,
                      ligneBudgetaire:
                        row.ligne_budgetaire_id && row.ligne_budgetaire_libelle
                          ? {
                              id: row.ligne_budgetaire_id,
                              libelle: row.ligne_budgetaire_libelle
                            }
                          : undefined
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
