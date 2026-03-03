import { createHash } from 'crypto';
import type {
  ActionEntity,
  AllocationEntity,
  DecisionVersionEntity,
  EnveloppeEntity,
  ExerciceEntity,
  ProgrammeEntity,
  SectionEntity
} from '../../budget-referentiels/budget-referentiels.types';
import type {
  BatchRunResult,
  BatchTotals,
  BudgetReferentielsSnapshot,
  LotBDomain,
  LotBRepository,
  RunOptions,
  UpsertResult
} from './types';

type DomainRows = {
  exercices: ExerciceEntity;
  enveloppes: EnveloppeEntity;
  sections: SectionEntity;
  programmes: ProgrammeEntity;
  actions: ActionEntity;
  allocations: AllocationEntity;
  decisionVersions: DecisionVersionEntity;
};

export const DEFAULT_CHUNK_SIZE = 100;
export const DEFAULT_MAX_RETRIES = 2;

export const buildBatchId = (lotName: 'lot-b', tenantHint: string): string => {
  const normalizedTenant = tenantHint.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const random = createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 8);
  return `${lotName}-${normalizedTenant || 'tenant-unknown'}-${timestamp}-${random}`;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const buckets: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    buckets.push(items.slice(index, index + size));
  }
  return buckets;
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(',')}}`;
};

const hashRows = (rows: unknown[]): string => {
  const payload = rows.map((row) => stableStringify(row)).join('|');
  return createHash('sha256').update(payload).digest('hex');
};

const watermarkFor = (domain: LotBDomain, index: number, total: number): string => `${domain}:${index + 1}/${total}`;

const emptyTotals = (): BatchTotals => ({
  inserts: 0,
  updates: 0,
  rejects: 0,
  retries: 0,
  errors: 0,
  durationMs: 0
});

const mergeTotals = (totals: BatchTotals, result: UpsertResult): void => {
  totals.inserts += result.inserts;
  totals.updates += result.updates;
  totals.rejects += result.rejects;
};

const readRowsByDomain = (snapshot: BudgetReferentielsSnapshot): { domain: LotBDomain; rows: unknown[] }[] => [
  { domain: 'exercices', rows: snapshot.exercices },
  { domain: 'enveloppes', rows: snapshot.enveloppes },
  { domain: 'sections', rows: snapshot.sections },
  { domain: 'programmes', rows: snapshot.programmes },
  { domain: 'actions', rows: snapshot.actions },
  { domain: 'allocations', rows: snapshot.allocations },
  { domain: 'decisionVersions', rows: snapshot.decisionVersions }
];

const getHandler = (repository: LotBRepository, domain: LotBDomain): ((rows: unknown[]) => Promise<UpsertResult>) => {
  switch (domain) {
    case 'exercices':
      return (rows) => repository.upsertExercices(rows as ExerciceEntity[]);
    case 'enveloppes':
      return (rows) => repository.upsertEnveloppes(rows as EnveloppeEntity[]);
    case 'sections':
      return (rows) => repository.upsertSections(rows as SectionEntity[]);
    case 'programmes':
      return (rows) => repository.upsertProgrammes(rows as ProgrammeEntity[]);
    case 'actions':
      return (rows) => repository.upsertActions(rows as ActionEntity[]);
    case 'allocations':
      return (rows) => repository.upsertAllocations(rows as AllocationEntity[]);
    case 'decisionVersions':
      return (rows) => repository.upsertDecisionVersions(rows as DecisionVersionEntity[]);
    default:
      throw new Error(`Unsupported domain: ${domain satisfies never}`);
  }
};

export class LotBBackfillRunner {
  constructor(private readonly repository: LotBRepository) {}

  async run(snapshot: BudgetReferentielsSnapshot, options: RunOptions): Promise<BatchRunResult> {
    const start = Date.now();
    const totals = emptyTotals();
    const errors: string[] = [];

    await this.repository.startBatch({
      batchId: options.batchId,
      lotName: options.lotName,
      sourcePath: options.sourcePath,
      actorId: options.actorId,
      startedAt: start
    });

    try {
      for (const { domain, rows } of readRowsByDomain(snapshot)) {
        const rowChunks = chunk(rows, options.chunkSize);
        const totalChunks = rowChunks.length;

        for (const [index, subRows] of rowChunks.entries()) {
          const watermark = watermarkFor(domain, index, totalChunks);
          const sourceHash = hashRows(subRows);
          const existing = options.resume ? await this.repository.getSubLot(options.batchId, domain, watermark) : null;

          if (existing?.status === 'success' && existing.sourceHash === sourceHash) {
            continue;
          }

          const handler = getHandler(this.repository, domain);
          const subLotStartedAt = Date.now();
          let success = false;

          for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
            try {
              const result = await this.repository.runSubLot(
                {
                  batchId: options.batchId,
                  domain,
                  watermark,
                  sourceHash,
                  retryCount: attempt,
                  startedAt: subLotStartedAt
                },
                subRows,
                handler
              );

              if (result.rejects > 0) {
                const anomalySample = result.anomalies.slice(0, 3).join(' | ');
                const anomalyText = anomalySample ? ` Details: ${anomalySample}` : '';
                throw new Error(`Sub-lot rejected ${result.rejects} row(s).${anomalyText}`);
              }

              await this.repository.recordSubLotSuccess({
                batchId: options.batchId,
                domain,
                watermark,
                sourceHash,
                retryCount: attempt,
                startedAt: subLotStartedAt,
                result,
                durationMs: Date.now() - subLotStartedAt
              });

              mergeTotals(totals, result);
              totals.retries += attempt;
              success = true;
              break;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);

              if (attempt < options.maxRetries) {
                continue;
              }

              totals.errors += 1;
              totals.retries += attempt;
              errors.push(`${domain} ${watermark}: ${errorMessage}`);

              await this.repository.recordSubLotFailure({
                batchId: options.batchId,
                domain,
                watermark,
                sourceHash,
                retryCount: attempt,
                startedAt: subLotStartedAt,
                error: errorMessage,
                durationMs: Date.now() - subLotStartedAt
              });

              throw new Error(
                `Backfill interruption on ${domain} (${watermark}). Resume with --batch-id ${options.batchId} --resume true.`
              );
            }
          }

          if (!success) {
            throw new Error(`Unexpected state: sub-lot ${domain} ${watermark} not marked as success`);
          }
        }
      }

      totals.durationMs = Date.now() - start;
      await this.repository.finishBatch({
        batchId: options.batchId,
        status: 'success',
        totals,
        errorSummary: errors
      });

      return {
        status: 'success',
        batchId: options.batchId,
        lotName: 'lot-b',
        totals
      };
    } catch (error) {
      totals.durationMs = Date.now() - start;
      if (errors.length === 0 && error instanceof Error) {
        errors.push(error.message);
      }

      await this.repository.finishBatch({
        batchId: options.batchId,
        status: 'failed',
        totals,
        errorSummary: errors
      });

      throw error;
    }
  }
}
