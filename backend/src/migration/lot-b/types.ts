import type {
  ActionEntity,
  AllocationEntity,
  DecisionVersionEntity,
  EnveloppeEntity,
  ExerciceEntity,
  ProgrammeEntity,
  SectionEntity
} from '../../budget-referentiels/budget-referentiels.types';

export interface BudgetReferentielsSnapshot {
  exercices: ExerciceEntity[];
  enveloppes: EnveloppeEntity[];
  sections: SectionEntity[];
  programmes: ProgrammeEntity[];
  actions: ActionEntity[];
  allocations: AllocationEntity[];
  decisionVersions: DecisionVersionEntity[];
}

export type LotBDomain =
  | 'exercices'
  | 'enveloppes'
  | 'sections'
  | 'programmes'
  | 'actions'
  | 'allocations'
  | 'decisionVersions';

export interface RunOptions {
  batchId: string;
  lotName: 'lot-b';
  sourcePath: string;
  chunkSize: number;
  maxRetries: number;
  actorId: string;
  resume: boolean;
}

export interface BatchTotals {
  inserts: number;
  updates: number;
  rejects: number;
  retries: number;
  errors: number;
  durationMs: number;
}

export interface BatchRunResult {
  status: 'success' | 'failed';
  batchId: string;
  lotName: 'lot-b';
  totals: BatchTotals;
}

export interface UpsertResult {
  inserts: number;
  updates: number;
  rejects: number;
  anomalies: string[];
}

export interface SubLotRecord {
  status: 'success' | 'failed';
  sourceHash: string;
}

export interface BatchContext {
  batchId: string;
  lotName: 'lot-b';
  sourcePath: string;
  actorId: string;
  startedAt: number;
}

export interface SubLotContext {
  batchId: string;
  domain: LotBDomain;
  watermark: string;
  sourceHash: string;
  retryCount: number;
  startedAt: number;
}

export interface LotBRepository {
  startBatch(context: BatchContext): Promise<void>;
  finishBatch(input: {
    batchId: string;
    status: 'success' | 'failed';
    totals: BatchTotals;
    errorSummary: string[];
  }): Promise<void>;
  getSubLot(batchId: string, domain: LotBDomain, watermark: string): Promise<SubLotRecord | null>;
  runSubLot(
    context: SubLotContext,
    rows: unknown[],
    handler: (rows: unknown[]) => Promise<UpsertResult>
  ): Promise<UpsertResult>;
  recordSubLotSuccess(input: {
    batchId: string;
    domain: LotBDomain;
    watermark: string;
    sourceHash: string;
    retryCount: number;
    startedAt: number;
    result: UpsertResult;
    durationMs: number;
  }): Promise<void>;
  recordSubLotFailure(input: {
    batchId: string;
    domain: LotBDomain;
    watermark: string;
    sourceHash: string;
    retryCount: number;
    startedAt: number;
    error: string;
    durationMs: number;
  }): Promise<void>;
  upsertExercices(rows: ExerciceEntity[]): Promise<UpsertResult>;
  upsertEnveloppes(rows: EnveloppeEntity[]): Promise<UpsertResult>;
  upsertSections(rows: SectionEntity[]): Promise<UpsertResult>;
  upsertProgrammes(rows: ProgrammeEntity[]): Promise<UpsertResult>;
  upsertActions(rows: ActionEntity[]): Promise<UpsertResult>;
  upsertAllocations(rows: AllocationEntity[]): Promise<UpsertResult>;
  upsertDecisionVersions(rows: DecisionVersionEntity[]): Promise<UpsertResult>;
}
