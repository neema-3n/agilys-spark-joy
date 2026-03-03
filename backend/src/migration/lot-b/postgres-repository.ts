import { Pool, PoolClient } from 'pg';
import type {
  ActionEntity,
  AllocationEntity,
  DecisionVersionEntity,
  EnveloppeEntity,
  ExerciceEntity,
  ProgrammeEntity,
  SectionEntity
} from '../../budget-referentiels/budget-referentiels.types';
import type { BatchTotals, LotBDomain, LotBRepository, SubLotContext, SubLotRecord, UpsertResult } from './types';

const toDateOnly = (isoDate: string): string => {
  if (!isoDate) {
    return new Date().toISOString().slice(0, 10);
  }

  return isoDate.slice(0, 10);
};

const sha256 = async (payload: string): Promise<string> => {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(payload).digest('hex');
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const sorted = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
  return `{${sorted.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
};

const businessKeyForExercice = (row: ExerciceEntity): string => `${row.clientId}|${row.code}`;
const businessKeyForEnveloppe = (row: EnveloppeEntity): string => `${row.clientId}|${row.exerciceId}|${row.code}`;
const businessKeyForSection = (row: SectionEntity): string => `${row.clientId}|${row.exerciceId}|${row.code}`;
const businessKeyForProgramme = (row: ProgrammeEntity): string => `${row.sectionId}|${row.code}`;
const businessKeyForAction = (row: ActionEntity): string => `${row.programmeId}|${row.code}`;
const businessKeyForAllocation = (row: AllocationEntity): string => `${row.clientId}|${row.exerciceId}|${row.numero}`;
const businessKeyForDecisionVersion = (row: DecisionVersionEntity): string => `${row.allocationId}|${row.version}`;

const operationTypeToModificationType = (operationType: AllocationEntity['operationType']): 'augmentation' | 'virement' => {
  if (operationType === 'allocation') {
    return 'augmentation';
  }

  return 'virement';
};

const createEmptyResult = (): UpsertResult => ({
  inserts: 0,
  updates: 0,
  rejects: 0,
  anomalies: []
});

interface DbQueryRunner {
  query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

export class PostgresLotBRepository implements LotBRepository {
  private client: PoolClient | null = null;

  constructor(private readonly pool: Pool) {}

  async close(): Promise<void> {
    await this.pool.end();
  }

  async startBatch(context: {
    batchId: string;
    lotName: 'lot-b';
    sourcePath: string;
    actorId: string;
    startedAt: number;
  }): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO public.migration_batches (
          id,
          lot_name,
          status,
          source_path,
          actor_id,
          started_at
        )
        VALUES ($1, $2, 'running', $3, $4, to_timestamp($5::double precision / 1000.0))
        ON CONFLICT (id)
        DO UPDATE SET
          status = 'running',
          source_path = EXCLUDED.source_path,
          actor_id = EXCLUDED.actor_id,
          started_at = EXCLUDED.started_at,
          ended_at = NULL,
          duration_ms = NULL,
          total_inserts = 0,
          total_updates = 0,
          total_rejects = 0,
          total_errors = 0,
          retry_count = 0,
          error_summary = '[]'::jsonb
      `,
      [context.batchId, context.lotName, context.sourcePath, context.actorId, context.startedAt]
    );
  }

  async finishBatch(input: {
    batchId: string;
    status: 'success' | 'failed';
    totals: BatchTotals;
    errorSummary: string[];
  }): Promise<void> {
    await this.pool.query(
      `
        UPDATE public.migration_batches
        SET
          status = $2,
          ended_at = now(),
          duration_ms = $3,
          total_inserts = $4,
          total_updates = $5,
          total_rejects = $6,
          total_errors = $7,
          retry_count = $8,
          error_summary = $9::jsonb
        WHERE id = $1
      `,
      [
        input.batchId,
        input.status,
        input.totals.durationMs,
        input.totals.inserts,
        input.totals.updates,
        input.totals.rejects,
        input.totals.errors,
        input.totals.retries,
        JSON.stringify(input.errorSummary)
      ]
    );
  }

  async getSubLot(batchId: string, domain: LotBDomain, watermark: string): Promise<SubLotRecord | null> {
    const result = await this.pool.query<{ status: 'success' | 'failed'; source_hash: string }>(
      `
        SELECT status, source_hash
        FROM public.migration_batch_sub_lots
        WHERE batch_id = $1 AND domain = $2 AND watermark = $3
        LIMIT 1
      `,
      [batchId, domain, watermark]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      status: row.status,
      sourceHash: row.source_hash
    };
  }

  async runSubLot(
    context: SubLotContext,
    rows: unknown[],
    handler: (rows: unknown[]) => Promise<UpsertResult>
  ): Promise<UpsertResult> {
    this.client = await this.pool.connect();
    try {
      await this.client.query('BEGIN');
      const result = await handler(rows);
      await this.client.query('COMMIT');
      return result;
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw error;
    } finally {
      this.client.release();
      this.client = null;
      void context;
    }
  }

  async recordSubLotSuccess(input: {
    batchId: string;
    domain: LotBDomain;
    watermark: string;
    sourceHash: string;
    retryCount: number;
    startedAt: number;
    result: UpsertResult;
    durationMs: number;
  }): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO public.migration_batch_sub_lots (
          batch_id,
          domain,
          watermark,
          status,
          source_hash,
          started_at,
          ended_at,
          duration_ms,
          inserts_count,
          updates_count,
          rejects_count,
          retry_count,
          anomalies
        )
        VALUES (
          $1,
          $2,
          $3,
          'success',
          $4,
          to_timestamp($5::double precision / 1000.0),
          now(),
          $6,
          $7,
          $8,
          $9,
          $10,
          $11::jsonb
        )
        ON CONFLICT (batch_id, domain, watermark)
        DO UPDATE SET
          status = EXCLUDED.status,
          source_hash = EXCLUDED.source_hash,
          started_at = EXCLUDED.started_at,
          ended_at = EXCLUDED.ended_at,
          duration_ms = EXCLUDED.duration_ms,
          inserts_count = EXCLUDED.inserts_count,
          updates_count = EXCLUDED.updates_count,
          rejects_count = EXCLUDED.rejects_count,
          retry_count = EXCLUDED.retry_count,
          anomalies = EXCLUDED.anomalies,
          error_message = NULL
      `,
      [
        input.batchId,
        input.domain,
        input.watermark,
        input.sourceHash,
        input.startedAt,
        input.durationMs,
        input.result.inserts,
        input.result.updates,
        input.result.rejects,
        input.retryCount,
        JSON.stringify(input.result.anomalies)
      ]
    );
  }

  async recordSubLotFailure(input: {
    batchId: string;
    domain: LotBDomain;
    watermark: string;
    sourceHash: string;
    retryCount: number;
    startedAt: number;
    error: string;
    durationMs: number;
  }): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO public.migration_batch_sub_lots (
          batch_id,
          domain,
          watermark,
          status,
          source_hash,
          started_at,
          ended_at,
          duration_ms,
          inserts_count,
          updates_count,
          rejects_count,
          retry_count,
          error_message,
          anomalies
        )
        VALUES (
          $1,
          $2,
          $3,
          'failed',
          $4,
          to_timestamp($5::double precision / 1000.0),
          now(),
          $6,
          0,
          0,
          0,
          $7,
          $8,
          '[]'::jsonb
        )
        ON CONFLICT (batch_id, domain, watermark)
        DO UPDATE SET
          status = EXCLUDED.status,
          source_hash = EXCLUDED.source_hash,
          started_at = EXCLUDED.started_at,
          ended_at = EXCLUDED.ended_at,
          duration_ms = EXCLUDED.duration_ms,
          retry_count = EXCLUDED.retry_count,
          error_message = EXCLUDED.error_message,
          anomalies = EXCLUDED.anomalies
      `,
      [
        input.batchId,
        input.domain,
        input.watermark,
        input.sourceHash,
        input.startedAt,
        input.durationMs,
        input.retryCount,
        input.error
      ]
    );
  }

  async upsertExercices(rows: ExerciceEntity[]): Promise<UpsertResult> {
    return this.upsertRows(rows, {
      domain: 'exercices',
      businessKey: businessKeyForExercice,
      businessPayload: (row) => ({
        clientId: row.clientId,
        code: row.code,
        libelle: row.libelle,
        dateDebut: row.dateDebut,
        dateFin: row.dateFin,
        statut: row.statut
      }),
      upsert: async (runner, row, hash) => {
        const state = await this.resolveRowState(runner, 'exercices', businessKeyForExercice(row), hash);
        if (state === 'same') {
          return 'same';
        }

        await runner.query(
          `
            INSERT INTO public.exercices (
              id,
              client_id,
              code,
              libelle,
              date_debut,
              date_fin,
              statut,
              created_at,
              updated_at,
              created_by
            )
            VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8::timestamptz, $9::timestamptz, NULLIF($10, '')::uuid)
            ON CONFLICT (client_id, code)
            DO UPDATE SET
              libelle = EXCLUDED.libelle,
              date_debut = EXCLUDED.date_debut,
              date_fin = EXCLUDED.date_fin,
              statut = EXCLUDED.statut,
              updated_at = EXCLUDED.updated_at
          `,
          [
            row.id,
            row.clientId,
            row.code,
            row.libelle,
            row.dateDebut,
            row.dateFin,
            row.statut,
            row.createdAt,
            row.updatedAt,
            row.createdBy
          ]
        );

        return state;
      }
    });
  }

  async upsertEnveloppes(rows: EnveloppeEntity[]): Promise<UpsertResult> {
    return this.upsertRows(rows, {
      domain: 'enveloppes',
      businessKey: businessKeyForEnveloppe,
      businessPayload: (row) => ({
        clientId: row.clientId,
        exerciceId: row.exerciceId,
        code: row.code,
        nom: row.nom,
        sourceFinancement: row.sourceFinancement,
        montantAlloue: row.montantAlloue,
        montantConsomme: row.montantConsomme,
        statut: row.statut
      }),
      upsert: async (runner, row, hash) => {
        const state = await this.resolveRowState(runner, 'enveloppes', businessKeyForEnveloppe(row), hash);
        if (state === 'same') {
          return 'same';
        }

        await runner.query(
          `
            INSERT INTO public.enveloppes (
              id,
              client_id,
              exercice_id,
              code,
              nom,
              source_financement,
              montant_alloue,
              montant_consomme,
              statut,
              created_at,
              updated_at,
              created_by
            )
            VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10::timestamptz, $11::timestamptz, NULLIF($12, '')::uuid)
            ON CONFLICT (client_id, exercice_id, code)
            DO UPDATE SET
              nom = EXCLUDED.nom,
              source_financement = EXCLUDED.source_financement,
              montant_alloue = EXCLUDED.montant_alloue,
              montant_consomme = EXCLUDED.montant_consomme,
              statut = EXCLUDED.statut,
              updated_at = EXCLUDED.updated_at
          `,
          [
            row.id,
            row.clientId,
            row.exerciceId,
            row.code,
            row.nom,
            row.sourceFinancement,
            row.montantAlloue,
            row.montantConsomme,
            row.statut,
            row.createdAt,
            row.updatedAt,
            row.createdBy
          ]
        );

        return state;
      }
    });
  }

  async upsertSections(rows: SectionEntity[]): Promise<UpsertResult> {
    return this.upsertRows(rows, {
      domain: 'sections',
      businessKey: businessKeyForSection,
      businessPayload: (row) => ({
        clientId: row.clientId,
        exerciceId: row.exerciceId,
        code: row.code,
        libelle: row.libelle,
        ordre: row.ordre,
        statut: row.statut
      }),
      upsert: async (runner, row, hash) => {
        const state = await this.resolveRowState(runner, 'sections', businessKeyForSection(row), hash);
        if (state === 'same') {
          return 'same';
        }

        await runner.query(
          `
            INSERT INTO public.sections (
              id,
              client_id,
              exercice_id,
              code,
              libelle,
              ordre,
              statut,
              created_at,
              updated_at,
              created_by
            )
            VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, NULLIF($10, '')::uuid)
            ON CONFLICT (client_id, exercice_id, code)
            DO UPDATE SET
              libelle = EXCLUDED.libelle,
              ordre = EXCLUDED.ordre,
              statut = EXCLUDED.statut,
              updated_at = EXCLUDED.updated_at
          `,
          [
            row.id,
            row.clientId,
            row.exerciceId,
            row.code,
            row.libelle,
            row.ordre,
            row.statut,
            row.createdAt,
            row.updatedAt,
            row.createdBy
          ]
        );

        return state;
      }
    });
  }

  async upsertProgrammes(rows: ProgrammeEntity[]): Promise<UpsertResult> {
    return this.upsertRows(rows, {
      domain: 'programmes',
      businessKey: businessKeyForProgramme,
      businessPayload: (row) => ({
        sectionId: row.sectionId,
        code: row.code,
        libelle: row.libelle,
        ordre: row.ordre,
        statut: row.statut
      }),
      upsert: async (runner, row, hash) => {
        const state = await this.resolveRowState(runner, 'programmes', businessKeyForProgramme(row), hash);
        if (state === 'same') {
          return 'same';
        }

        await runner.query(
          `
            INSERT INTO public.programmes (
              id,
              section_id,
              client_id,
              exercice_id,
              code,
              libelle,
              ordre,
              statut,
              created_at,
              updated_at,
              created_by
            )
            VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, NULLIF($11, '')::uuid)
            ON CONFLICT (section_id, code)
            DO UPDATE SET
              libelle = EXCLUDED.libelle,
              ordre = EXCLUDED.ordre,
              statut = EXCLUDED.statut,
              updated_at = EXCLUDED.updated_at
          `,
          [
            row.id,
            row.sectionId,
            row.clientId,
            row.exerciceId,
            row.code,
            row.libelle,
            row.ordre,
            row.statut,
            row.createdAt,
            row.updatedAt,
            row.createdBy
          ]
        );

        return state;
      }
    });
  }

  async upsertActions(rows: ActionEntity[]): Promise<UpsertResult> {
    return this.upsertRows(rows, {
      domain: 'actions',
      businessKey: businessKeyForAction,
      businessPayload: (row) => ({
        programmeId: row.programmeId,
        code: row.code,
        libelle: row.libelle,
        ordre: row.ordre,
        statut: row.statut
      }),
      upsert: async (runner, row, hash) => {
        const state = await this.resolveRowState(runner, 'actions', businessKeyForAction(row), hash);
        if (state === 'same') {
          return 'same';
        }

        await runner.query(
          `
            INSERT INTO public.actions (
              id,
              programme_id,
              client_id,
              exercice_id,
              code,
              libelle,
              ordre,
              statut,
              created_at,
              updated_at,
              created_by
            )
            VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, NULLIF($11, '')::uuid)
            ON CONFLICT (programme_id, code)
            DO UPDATE SET
              libelle = EXCLUDED.libelle,
              ordre = EXCLUDED.ordre,
              statut = EXCLUDED.statut,
              updated_at = EXCLUDED.updated_at
          `,
          [
            row.id,
            row.programmeId,
            row.clientId,
            row.exerciceId,
            row.code,
            row.libelle,
            row.ordre,
            row.statut,
            row.createdAt,
            row.updatedAt,
            row.createdBy
          ]
        );

        return state;
      }
    });
  }

  async upsertAllocations(rows: AllocationEntity[]): Promise<UpsertResult> {
    return this.upsertRows(rows, {
      domain: 'allocations',
      businessKey: businessKeyForAllocation,
      businessPayload: (row) => ({
        clientId: row.clientId,
        exerciceId: row.exerciceId,
        numero: row.numero,
        operationType: row.operationType,
        sourceAxeId: row.sourceAxeId,
        destinationAxeId: row.destinationAxeId,
        montant: row.montant,
        motif: row.motif,
        effectiveAt: row.effectiveAt,
        dateValidation: row.dateValidation,
        validePar: row.validePar
      }),
      upsert: async (runner, row, hash) => {
        const state = await this.resolveRowState(runner, 'allocations', businessKeyForAllocation(row), hash);
        if (state === 'same') {
          return 'same';
        }

        const type = operationTypeToModificationType(row.operationType);

        await runner.query(
          `
            INSERT INTO public.modifications_budgetaires (
              id,
              client_id,
              exercice_id,
              numero,
              type,
              ligne_source_id,
              ligne_destination_id,
              montant,
              motif,
              statut,
              date_creation,
              date_validation,
              valide_par,
              created_at,
              updated_at
            )
            VALUES (
              $1::uuid,
              $2,
              $3::uuid,
              $4,
              $5,
              NULLIF($6, '')::uuid,
              NULLIF($7, '')::uuid,
              $8,
              $9,
              'validee',
              $10::date,
              $11::date,
              NULLIF($12, '')::uuid,
              $13::timestamptz,
              $14::timestamptz
            )
            ON CONFLICT (client_id, exercice_id, numero)
            DO UPDATE SET
              type = EXCLUDED.type,
              ligne_source_id = EXCLUDED.ligne_source_id,
              ligne_destination_id = EXCLUDED.ligne_destination_id,
              montant = EXCLUDED.montant,
              motif = EXCLUDED.motif,
              statut = EXCLUDED.statut,
              date_validation = EXCLUDED.date_validation,
              valide_par = EXCLUDED.valide_par,
              updated_at = EXCLUDED.updated_at
          `,
          [
            row.id,
            row.clientId,
            row.exerciceId,
            row.numero,
            type,
            row.sourceAxeId,
            row.destinationAxeId,
            row.montant,
            row.motif,
            toDateOnly(row.effectiveAt),
            toDateOnly(row.dateValidation),
            row.validePar,
            row.createdAt,
            row.updatedAt
          ]
        );

        return state;
      }
    });
  }

  async upsertDecisionVersions(rows: DecisionVersionEntity[]): Promise<UpsertResult> {
    return this.upsertRows(rows, {
      domain: 'decisionVersions',
      businessKey: businessKeyForDecisionVersion,
      businessPayload: (row) => ({
        allocationId: row.allocationId,
        version: row.version,
        statutDecision: row.statutDecision,
        motif: row.motif,
        auteur: row.auteur,
        horodatage: row.horodatage,
        snapshotAvant: row.snapshotAvant,
        snapshotApres: row.snapshotApres
      }),
      upsert: async (runner, row, hash) => {
        const state = await this.resolveRowState(runner, 'decisionVersions', businessKeyForDecisionVersion(row), hash);
        if (state === 'same') {
          return 'same';
        }

        await runner.query(
          `
            INSERT INTO public.budget_decision_versions (
              id,
              client_id,
              exercice_id,
              allocation_id,
              decision_id,
              version,
              statut_decision,
              motif,
              auteur,
              horodatage,
              snapshot_avant,
              snapshot_apres,
              business_hash,
              created_at,
              updated_at,
              created_by
            )
            VALUES (
              $1::uuid,
              $2,
              $3::uuid,
              $4::uuid,
              $5::uuid,
              $6,
              $7,
              $8,
              $9,
              $10::timestamptz,
              $11::jsonb,
              $12::jsonb,
              $13,
              $14::timestamptz,
              $15::timestamptz,
              NULLIF($16, '')::uuid
            )
            ON CONFLICT (allocation_id, version)
            DO UPDATE SET
              statut_decision = EXCLUDED.statut_decision,
              motif = EXCLUDED.motif,
              auteur = EXCLUDED.auteur,
              horodatage = EXCLUDED.horodatage,
              snapshot_avant = EXCLUDED.snapshot_avant,
              snapshot_apres = EXCLUDED.snapshot_apres,
              business_hash = EXCLUDED.business_hash,
              updated_at = EXCLUDED.updated_at,
              created_by = EXCLUDED.created_by
          `,
          [
            row.id,
            row.clientId,
            row.exerciceId,
            row.allocationId,
            row.decisionId,
            row.version,
            row.statutDecision,
            row.motif,
            row.auteur,
            row.horodatage,
            JSON.stringify(row.snapshotAvant),
            JSON.stringify(row.snapshotApres),
            hash,
            row.createdAt,
            row.updatedAt,
            row.createdBy
          ]
        );

        return state;
      }
    });
  }

  private runner(): DbQueryRunner {
    if (this.client) {
      return this.client;
    }

    return this.pool;
  }

  private async upsertRows<T>(
    rows: T[],
    input: {
      domain: LotBDomain;
      businessKey: (row: T) => string;
      businessPayload: (row: T) => unknown;
      upsert: (runner: DbQueryRunner, row: T, hash: string) => Promise<'inserted' | 'updated' | 'same'>;
    }
  ): Promise<UpsertResult> {
    const result = createEmptyResult();
    const runner = this.runner();

    for (const row of rows) {
      try {
        const payload = input.businessPayload(row);
        const hash = await sha256(stableStringify(payload));
        const state = await input.upsert(runner, row, hash);

        if (state === 'inserted') {
          result.inserts += 1;
        }

        if (state === 'updated') {
          result.updates += 1;
        }

        await this.upsertBusinessHash(runner, input.domain, input.businessKey(row), hash);
      } catch (error) {
        result.rejects += 1;
        result.anomalies.push(`${input.domain}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  }

  private async resolveRowState(
    runner: DbQueryRunner,
    domain: LotBDomain,
    businessKey: string,
    hash: string
  ): Promise<'inserted' | 'updated' | 'same'> {
    const current = await runner.query<{ business_hash: string }>(
      `
        SELECT business_hash
        FROM public.migration_business_hash_registry
        WHERE domain = $1 AND business_key = $2
        LIMIT 1
      `,
      [domain, businessKey]
    );

    const currentHash = current.rows[0]?.business_hash;
    if (!currentHash) {
      return 'inserted';
    }

    if (currentHash === hash) {
      return 'same';
    }

    return 'updated';
  }

  private async upsertBusinessHash(runner: DbQueryRunner, domain: LotBDomain, businessKey: string, hash: string): Promise<void> {
    await runner.query(
      `
        INSERT INTO public.migration_business_hash_registry (
          domain,
          business_key,
          business_hash,
          updated_at
        )
        VALUES ($1, $2, $3, now())
        ON CONFLICT (domain, business_key)
        DO UPDATE SET
          business_hash = EXCLUDED.business_hash,
          updated_at = EXCLUDED.updated_at
      `,
      [domain, businessKey, hash]
    );
  }
}
