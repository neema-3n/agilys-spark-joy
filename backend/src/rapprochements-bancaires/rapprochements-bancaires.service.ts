import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type { CreateRapprochementBancaireDto } from './dto/rapprochements-bancaires.dto';

interface RapprochementRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  compte_id: string;
  date_debut: Date | string;
  date_fin: Date | string;
  solde_releve: string | number;
  solde_comptable: string | number;
  ecart: string | number;
  statut: 'en_cours' | 'valide' | 'annule';
  date_validation: Date | string | null;
  valide_par: string | null;
  observations: string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  compte_code: string | null;
  compte_libelle: string | null;
  compte_type: string | null;
}

@Injectable()
export class RapprochementsBancairesService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser, exerciceId: string) {
    const result = await this.postgresService.query<RapprochementRow>(
      this.baseSelect() +
        `
          WHERE rb.client_id = $1
            AND rb.exercice_id = $2
          ORDER BY rb.created_at DESC
        `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string) {
    const result = await this.postgresService.query<RapprochementRow>(
      this.baseSelect() +
        `
          WHERE rb.client_id = $1
            AND rb.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Rapprochement bancaire introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateRapprochementBancaireDto) {
    const operations = await this.postgresService.query<{ type_operation: string; montant: string | number }>(
      `
        SELECT type_operation, montant
        FROM public.operations_tresorerie
        WHERE compte_id = $1
          AND client_id = $2
          AND date_operation >= $3
          AND date_operation <= $4
          AND statut != 'annulee'
      `,
      [payload.compteId, actor.tenantId, payload.dateDebut, payload.dateFin]
    );

    let soldeComptable = 0;
    for (const op of operations.rows) {
      if (op.type_operation === 'encaissement') {
        soldeComptable += Number(op.montant ?? 0);
      } else if (op.type_operation === 'decaissement') {
        soldeComptable -= Number(op.montant ?? 0);
      }
    }

    const ecart = payload.soldeReleve - soldeComptable;
    const numero = await this.generateNextNumero(actor.tenantId);

    const insertResult = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.rapprochements_bancaires (
          client_id,
          exercice_id,
          numero,
          compte_id,
          date_debut,
          date_fin,
          solde_releve,
          solde_comptable,
          ecart,
          observations,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.exerciceId,
        numero,
        payload.compteId,
        payload.dateDebut,
        payload.dateFin,
        payload.soldeReleve,
        soldeComptable,
        ecart,
        payload.observations?.trim() || null,
        actor.sub
      ]
    );

    const id = insertResult.rows[0]?.id;
    if (!id) {
      throw new NotFoundException('Rapprochement bancaire non créé');
    }

    return this.getById(actor, id);
  }

  async valider(actor: AuthenticatedUser, id: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        UPDATE public.rapprochements_bancaires
        SET
          statut = 'valide',
          date_validation = CURRENT_DATE,
          valide_par = $1,
          updated_at = now()
        WHERE id = $2
          AND client_id = $3
      `,
      [actor.sub, id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Rapprochement bancaire introuvable');
    }
  }

  private async generateNextNumero(clientId: string): Promise<string> {
    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.rapprochements_bancaires
        WHERE client_id = $1
          AND numero LIKE 'RAP%'
        ORDER BY numero DESC
        LIMIT 1
      `,
      [clientId]
    );

    const lastNumero = result.rows[0]?.numero;
    const match = lastNumero?.match(/^RAP(\d+)$/);
    const next = match ? Number(match[1]) + 1 : 1;

    return `RAP${String(next).padStart(5, '0')}`;
  }

  private baseSelect(): string {
    return `
      SELECT
        rb.*,
        ct.code AS compte_code,
        ct.libelle AS compte_libelle,
        ct.type AS compte_type
      FROM public.rapprochements_bancaires rb
      LEFT JOIN public.comptes_tresorerie ct ON ct.id = rb.compte_id
    `;
  }

  private mapRowToView(row: RapprochementRow) {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      numero: row.numero,
      compteId: row.compte_id,
      dateDebut: this.toDateOnly(row.date_debut),
      dateFin: this.toDateOnly(row.date_fin),
      soldeReleve: Number(row.solde_releve ?? 0),
      soldeComptable: Number(row.solde_comptable ?? 0),
      ecart: Number(row.ecart ?? 0),
      statut: row.statut,
      dateValidation: row.date_validation ? this.toDateOnly(row.date_validation) : undefined,
      validePar: row.valide_par ?? undefined,
      observations: row.observations ?? undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: this.toIsoString(row.created_at),
      updatedAt: this.toIsoString(row.updated_at),
      compte:
        row.compte_code && row.compte_libelle && row.compte_type
          ? {
              code: row.compte_code,
              libelle: row.compte_libelle,
              type: row.compte_type
            }
          : undefined
    };
  }

  private toDateOnly(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return value.slice(0, 10);
  }

  private toIsoString(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }
}
