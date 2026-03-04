import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { CreateRecetteDto, UpdateRecetteDto } from './dto/recettes.dto';

interface RecetteRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  date_recette: Date | string;
  montant: string | number;
  compte_destination_id: string;
  source_recette: string;
  categorie: string | null;
  beneficiaire: string | null;
  reference: string | null;
  libelle: string;
  observations: string | null;
  statut: 'validee' | 'annulee';
  motif_annulation: string | null;
  date_annulation: Date | string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  compte_destination_code: string | null;
  compte_destination_libelle: string | null;
  compte_destination_type: string | null;
}

interface RecetteView {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateRecette: string;
  montant: number;
  compteDestinationId: string;
  sourceRecette: string;
  categorie?: string;
  beneficiaire?: string;
  reference?: string;
  libelle: string;
  observations?: string;
  statut: 'validee' | 'annulee';
  motifAnnulation?: string;
  dateAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  compteDestination?: {
    code: string;
    libelle: string;
    type: string;
  };
}

interface RecetteStatsRow {
  nombre_total: string | number;
  nombre_validees: string | number;
  nombre_annulees: string | number;
  montant_total: string | number;
  montant_validees: string | number;
  montant_aujourdhui: string | number;
  montant_ce_mois: string | number;
}

interface RecetteStatsView {
  nombreTotal: number;
  nombreValidees: number;
  nombreAnnulees: number;
  montantTotal: number;
  montantValidees: number;
  montantAujourdhui: number;
  montantCeMois: number;
  repartitionParSource: Array<{
    source: string;
    nombre: number;
    montant: number;
  }>;
}

@Injectable()
export class RecettesService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser, exerciceId: string): Promise<RecetteView[]> {
    const result = await this.postgresService.query<RecetteRow>(
      `
        SELECT
          r.*,
          ct.code AS compte_destination_code,
          ct.libelle AS compte_destination_libelle,
          ct.type AS compte_destination_type
        FROM public.recettes r
        LEFT JOIN public.comptes_tresorerie ct ON ct.id = r.compte_destination_id
        WHERE r.client_id = $1
          AND r.exercice_id = $2
        ORDER BY r.date_recette DESC, r.numero DESC
      `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<RecetteView> {
    const result = await this.postgresService.query<RecetteRow>(
      `
        SELECT
          r.*,
          ct.code AS compte_destination_code,
          ct.libelle AS compte_destination_libelle,
          ct.type AS compte_destination_type
        FROM public.recettes r
        LEFT JOIN public.comptes_tresorerie ct ON ct.id = r.compte_destination_id
        WHERE r.id = $1
          AND r.client_id = $2
        LIMIT 1
      `,
      [id, actor.tenantId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Recette introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateRecetteDto): Promise<RecetteView> {
    const numero = await this.generateNextNumero(actor.tenantId, payload.exerciceId);

    const result = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.recettes (
          client_id,
          exercice_id,
          numero,
          date_recette,
          montant,
          compte_destination_id,
          source_recette,
          categorie,
          beneficiaire,
          reference,
          libelle,
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
          'validee',
          $13
        )
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.exerciceId,
        numero,
        payload.dateRecette,
        payload.montant,
        payload.compteDestinationId,
        payload.sourceRecette,
        payload.categorie ?? null,
        payload.beneficiaire ?? null,
        payload.reference ?? null,
        payload.libelle,
        payload.observations ?? null,
        actor.sub
      ]
    );

    const insertedId = result.rows[0]?.id;
    if (!insertedId) {
      throw new NotFoundException('Impossible de créer la recette');
    }

    return this.getById(actor, insertedId);
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateRecetteDto): Promise<void> {
    const keys = Object.keys(payload) as Array<keyof UpdateRecetteDto>;
    if (keys.length === 0) {
      return;
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

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query(
      `
        UPDATE public.recettes
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
      `,
      values
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Recette introuvable');
    }
  }

  async annuler(actor: AuthenticatedUser, id: string, motif: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        UPDATE public.recettes
        SET
          statut = 'annulee',
          motif_annulation = $1,
          date_annulation = CURRENT_DATE,
          updated_at = now()
        WHERE id = $2
          AND client_id = $3
      `,
      [motif, id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Recette introuvable');
    }
  }

  async getStats(actor: AuthenticatedUser, exerciceId: string): Promise<RecetteStatsView> {
    const totalsResult = await this.postgresService.query<RecetteStatsRow>(
      `
        SELECT
          COUNT(*) AS nombre_total,
          COUNT(*) FILTER (WHERE statut = 'validee') AS nombre_validees,
          COUNT(*) FILTER (WHERE statut = 'annulee') AS nombre_annulees,
          COALESCE(SUM(montant) FILTER (WHERE statut = 'validee'), 0) AS montant_total,
          COALESCE(SUM(montant) FILTER (WHERE statut = 'validee'), 0) AS montant_validees,
          COALESCE(SUM(montant) FILTER (WHERE statut = 'validee' AND date_recette = CURRENT_DATE), 0) AS montant_aujourdhui,
          COALESCE(
            SUM(montant) FILTER (
              WHERE statut = 'validee'
                AND date_trunc('month', date_recette) = date_trunc('month', CURRENT_DATE)
            ),
            0
          ) AS montant_ce_mois
        FROM public.recettes
        WHERE client_id = $1
          AND exercice_id = $2
      `,
      [actor.tenantId, exerciceId]
    );

    const repartitionResult = await this.postgresService.query<{
      source_recette: string;
      nombre: string | number;
      montant: string | number;
    }>(
      `
        SELECT
          source_recette,
          COUNT(*) AS nombre,
          COALESCE(SUM(montant), 0) AS montant
        FROM public.recettes
        WHERE client_id = $1
          AND exercice_id = $2
          AND statut = 'validee'
        GROUP BY source_recette
        ORDER BY source_recette ASC
      `,
      [actor.tenantId, exerciceId]
    );

    const totals = totalsResult.rows[0];

    return {
      nombreTotal: Number(totals?.nombre_total ?? 0),
      nombreValidees: Number(totals?.nombre_validees ?? 0),
      nombreAnnulees: Number(totals?.nombre_annulees ?? 0),
      montantTotal: Number(totals?.montant_total ?? 0),
      montantValidees: Number(totals?.montant_validees ?? 0),
      montantAujourdhui: Number(totals?.montant_aujourdhui ?? 0),
      montantCeMois: Number(totals?.montant_ce_mois ?? 0),
      repartitionParSource: repartitionResult.rows.map((row) => ({
        source: row.source_recette,
        nombre: Number(row.nombre ?? 0),
        montant: Number(row.montant ?? 0)
      }))
    };
  }

  private async generateNextNumero(clientId: string, exerciceId: string): Promise<string> {
    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.recettes
        WHERE client_id = $1
          AND exercice_id = $2
          AND numero LIKE 'REC%'
        ORDER BY numero DESC
        LIMIT 1
      `,
      [clientId, exerciceId]
    );

    const lastNumero = result.rows[0]?.numero;
    const match = lastNumero?.match(/^REC(\d+)$/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `REC${String(nextNumber).padStart(5, '0')}`;
  }

  private mapUpdateKeyToColumn(key: keyof UpdateRecetteDto): string {
    const map: Record<keyof UpdateRecetteDto, string> = {
      dateRecette: 'date_recette',
      montant: 'montant',
      compteDestinationId: 'compte_destination_id',
      sourceRecette: 'source_recette',
      categorie: 'categorie',
      beneficiaire: 'beneficiaire',
      reference: 'reference',
      libelle: 'libelle',
      observations: 'observations'
    };

    return map[key];
  }

  private mapRowToView(row: RecetteRow): RecetteView {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      numero: row.numero,
      dateRecette: this.toDateOnly(row.date_recette),
      montant: Number(row.montant ?? 0),
      compteDestinationId: row.compte_destination_id,
      sourceRecette: row.source_recette,
      categorie: row.categorie ?? undefined,
      beneficiaire: row.beneficiaire ?? undefined,
      reference: row.reference ?? undefined,
      libelle: row.libelle,
      observations: row.observations ?? undefined,
      statut: row.statut,
      motifAnnulation: row.motif_annulation ?? undefined,
      dateAnnulation: row.date_annulation ? this.toDateOnly(row.date_annulation) : undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      compteDestination:
        row.compte_destination_code && row.compte_destination_libelle && row.compte_destination_type
          ? {
              code: row.compte_destination_code,
              libelle: row.compte_destination_libelle,
              type: row.compte_destination_type
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
