import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type { EcrituresComptablesQueryDto } from './dto/ecritures-comptables.dto';

type TypeOperation = 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';

interface GenerateEcrituresSqlResult {
  success?: boolean;
  status?: 'created' | 'already_generated' | 'error';
  code?: string;
  message?: string;
  ecritures_count?: number;
}

export interface GenerateEcrituresResult {
  success: boolean;
  status: 'created' | 'already_generated' | 'error';
  code?: string;
  message?: string;
  ecrituresCount: number;
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
  type_operation: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';
  source_id: string;
  regle_comptable_id: string | null;
  statut_ecriture: 'validee' | 'contrepassation' | null;
  ecriture_origine_id: string | null;
  created_at: Date | string;
  created_by: string | null;
  updated_at: Date | string;
  compte_debit_numero: string | null;
  compte_debit_libelle: string | null;
  compte_credit_numero: string | null;
  compte_credit_libelle: string | null;
  regle_code: string | null;
  regle_nom: string | null;
  regle_version_group_id: string | null;
  regle_version_number: number | null;
  regle_version_status: 'draft' | 'published' | 'archived' | null;
  regle_date_debut: Date | string | null;
  regle_date_fin: Date | string | null;
}

interface StatsRow {
  type_operation: TypeOperation;
  nombre: string | number;
  montant: string | number;
}

@Injectable()
export class EcrituresComptablesService {
  private readonly logger = new Logger(EcrituresComptablesService.name);

  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser, filters: EcrituresComptablesQueryDto) {
    const values: unknown[] = [actor.tenantId];
    let index = 2;

    const conditions: string[] = ['ec.client_id = $1'];

    if (filters.exerciceId) {
      conditions.push(`ec.exercice_id = $${index}`);
      values.push(filters.exerciceId);
      index += 1;
    }

    if (filters.dateDebut) {
      conditions.push(`ec.date_ecriture >= $${index}`);
      values.push(filters.dateDebut);
      index += 1;
    }

    if (filters.dateFin) {
      conditions.push(`ec.date_ecriture <= $${index}`);
      values.push(filters.dateFin);
      index += 1;
    }

    if (filters.typeOperation) {
      conditions.push(`ec.type_operation = $${index}`);
      values.push(filters.typeOperation);
      index += 1;
    }

    if (filters.numeroPiece?.trim()) {
      conditions.push(`ec.numero_piece ILIKE $${index}`);
      values.push(`%${filters.numeroPiece.trim()}%`);
      index += 1;
    }

    if (filters.compteId) {
      conditions.push(`(ec.compte_debit_id = $${index} OR ec.compte_credit_id = $${index})`);
      values.push(filters.compteId);
      index += 1;
    }

    const whereSql = `WHERE ${conditions.join('\n  AND ')}`;

    const result = await this.postgresService.query<EcritureRow>(
      this.baseSelect() +
        `
${whereSql}
ORDER BY ec.date_ecriture DESC, ec.numero_piece DESC, ec.numero_ligne ASC
        `,
      values
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getBySource(
    actor: AuthenticatedUser,
    typeOperation: TypeOperation,
    sourceId: string
  ) {
    const result = await this.postgresService.query<EcritureRow>(
      this.baseSelect() +
        `
          WHERE ec.client_id = $1
            AND ec.type_operation = $2
            AND ec.source_id = $3
          ORDER BY ec.numero_ligne ASC
        `,
      [actor.tenantId, typeOperation, sourceId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getStats(actor: AuthenticatedUser, exerciceId?: string) {
    const values: unknown[] = [actor.tenantId];
    let index = 2;

    let whereSql = 'WHERE client_id = $1';
    if (exerciceId) {
      whereSql += `\n  AND exercice_id = $${index}`;
      values.push(exerciceId);
      index += 1;
    }

    const totalResult = await this.postgresService.query<{ nombre_total: string | number; montant_total: string | number }>(
      `
        SELECT
          COUNT(*) AS nombre_total,
          COALESCE(SUM(montant), 0) AS montant_total
        FROM public.ecritures_comptables
        ${whereSql}
      `,
      values
    );

    const byTypeResult = await this.postgresService.query<StatsRow>(
      `
        SELECT
          type_operation,
          COUNT(*) AS nombre,
          COALESCE(SUM(montant), 0) AS montant
        FROM public.ecritures_comptables
        ${whereSql}
        GROUP BY type_operation
      `,
      values
    );

    const statsByType: Record<string, { nombre: number; montant: number }> = {
      reservation: { nombre: 0, montant: 0 },
      engagement: { nombre: 0, montant: 0 },
      bon_commande: { nombre: 0, montant: 0 },
      facture: { nombre: 0, montant: 0 },
      depense: { nombre: 0, montant: 0 },
      paiement: { nombre: 0, montant: 0 }
    };

    for (const row of byTypeResult.rows) {
      statsByType[row.type_operation] = {
        nombre: Number(row.nombre ?? 0),
        montant: Number(row.montant ?? 0)
      };
    }

    const total = totalResult.rows[0];

    return {
      nombreTotal: Number(total?.nombre_total ?? 0),
      montantTotalDebit: Number(total?.montant_total ?? 0),
      montantTotalCredit: Number(total?.montant_total ?? 0),
      parTypeOperation: statsByType
    };
  }

  async generateForOperation(
    actor: AuthenticatedUser,
    typeOperation: TypeOperation,
    sourceId: string,
    exerciceId: string
  ): Promise<GenerateEcrituresResult> {
    const operationResult = await this.postgresService.query<Record<string, unknown>>(
      `
        SELECT *
        FROM public.${this.resolveTableName(typeOperation)}
        WHERE id = $1
          AND client_id = $2
          AND exercice_id = $3::uuid
        LIMIT 1
      `,
      [sourceId, actor.tenantId, exerciceId]
    );

    const operation = operationResult.rows[0];
    if (!operation) {
      throw new NotFoundException('Source comptable introuvable');
    }

    const montant = Number((operation['montant_ttc'] ?? operation['montant']) as number | string | undefined) || 0;
    const numeroPiece =
      (operation['numero'] as string | undefined) ||
      (operation['numero_piece'] as string | undefined) ||
      `AUTO-${sourceId}`;
    const dateOperation =
      (operation['date_facture'] as string | undefined) ||
      (operation['date_depense'] as string | undefined) ||
      (operation['date_paiement'] as string | undefined) ||
      (operation['date_commande'] as string | undefined) ||
      (operation['date_creation'] as string | undefined) ||
      new Date().toISOString().slice(0, 10);
    const result = await this.postgresService.query<{ generate_ecritures_comptables: GenerateEcrituresSqlResult | null }>(
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
        ) AS generate_ecritures_comptables
      `,
      [
        actor.tenantId,
        exerciceId,
        typeOperation,
        sourceId,
        numeroPiece,
        dateOperation,
        montant,
        JSON.stringify(operation),
        actor.sub
      ]
    );

    const normalized = this.normalizeGenerationResult(result.rows[0]?.generate_ecritures_comptables ?? null);

    if (!normalized.success) {
      this.logger.warn(
        `Generation comptable en erreur: ${typeOperation}/${sourceId} [${normalized.code ?? 'SANS_CODE'}] ${normalized.message ?? ''}`
      );
    }

    return normalized;
  }

  async ensureGeneratedForOperation(
    actor: AuthenticatedUser,
    typeOperation: TypeOperation,
    sourceId: string,
    exerciceId: string
  ): Promise<GenerateEcrituresResult> {
    const result = await this.generateForOperation(actor, typeOperation, sourceId, exerciceId);

    if (!result.success) {
      throw new BadRequestException(result.message ?? 'La generation des ecritures comptables a echoue');
    }

    return result;
  }

  private resolveTableName(typeOperation: TypeOperation): string {
    switch (typeOperation) {
      case 'reservation':
        return 'reservations_credits';
      case 'engagement':
        return 'engagements';
      case 'bon_commande':
        return 'bons_commande';
      case 'facture':
        return 'factures';
      case 'depense':
        return 'depenses';
      case 'paiement':
        return 'paiements';
      default:
        return 'ecritures_comptables';
    }
  }

  private baseSelect(): string {
    return `
      SELECT
        ec.*,
        cd.numero AS compte_debit_numero,
        cd.libelle AS compte_debit_libelle,
        cc.numero AS compte_credit_numero,
        cc.libelle AS compte_credit_libelle,
        rc.code AS regle_code,
        rc.nom AS regle_nom,
        rc.version_group_id AS regle_version_group_id,
        rc.version_number AS regle_version_number,
        rc.version_status AS regle_version_status,
        rc.date_debut AS regle_date_debut,
        rc.date_fin AS regle_date_fin
      FROM public.ecritures_comptables ec
      LEFT JOIN public.comptes cd ON cd.id = ec.compte_debit_id
      LEFT JOIN public.comptes cc ON cc.id = ec.compte_credit_id
      LEFT JOIN public.regles_comptables rc ON rc.id = ec.regle_comptable_id
    `;
  }

  private mapRowToView(row: EcritureRow) {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      numeroPiece: row.numero_piece,
      numeroLigne: Number(row.numero_ligne ?? 0),
      dateEcriture: this.toDateOnly(row.date_ecriture),
      compteDebitId: row.compte_debit_id,
      compteCreditId: row.compte_credit_id,
      montant: Number(row.montant ?? 0),
      libelle: row.libelle,
      typeOperation: row.type_operation,
      sourceId: row.source_id,
      regleComptableId: row.regle_comptable_id ?? undefined,
      statutEcriture: (row.statut_ecriture as 'validee' | 'contrepassation') || 'validee',
      ecritureOrigineId: row.ecriture_origine_id ?? undefined,
      createdAt: this.toIsoString(row.created_at),
      createdBy: row.created_by ?? undefined,
      updatedAt: this.toIsoString(row.updated_at),
      compteDebit:
        row.compte_debit_numero && row.compte_debit_libelle
          ? {
              numero: row.compte_debit_numero,
              libelle: row.compte_debit_libelle
            }
          : undefined,
      compteCredit:
        row.compte_credit_numero && row.compte_credit_libelle
          ? {
              numero: row.compte_credit_numero,
              libelle: row.compte_credit_libelle
            }
          : undefined,
      regleComptable:
        row.regle_code && row.regle_nom
          ? {
              code: row.regle_code,
              nom: row.regle_nom,
              versionGroupId: row.regle_version_group_id ?? undefined,
              versionNumber: row.regle_version_number ?? undefined,
              versionStatus: row.regle_version_status ?? undefined,
              dateDebut: row.regle_date_debut ? this.toDateOnly(row.regle_date_debut) : undefined,
              dateFin: row.regle_date_fin ? this.toDateOnly(row.regle_date_fin) : undefined
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

  private normalizeGenerationResult(payload: GenerateEcrituresSqlResult | null): GenerateEcrituresResult {
    return {
      success: payload?.success ?? true,
      status: payload?.status ?? 'created',
      code: payload?.code,
      message: payload?.message,
      ecrituresCount: Number(payload?.ecritures_count ?? 0)
    };
  }
}
