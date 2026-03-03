import { buildBatchId, LotBBackfillRunner } from './runner';
import type {
  BatchContext,
  BatchTotals,
  BudgetReferentielsSnapshot,
  LotBDomain,
  LotBRepository,
  SubLotContext,
  SubLotRecord,
  UpsertResult
} from './types';

class InMemoryRepository implements LotBRepository {
  public readonly subLots = new Map<string, SubLotRecord>();
  public readonly counters = {
    upsertExercices: 0,
    upsertEnveloppes: 0,
    upsertSections: 0,
    upsertProgrammes: 0,
    upsertActions: 0,
    upsertAllocations: 0,
    upsertDecisionVersions: 0
  };

  public failOnceOn: LotBDomain | null = null;
  public rejectOnceOn: LotBDomain | null = null;
  public batchStatus: 'success' | 'failed' | null = null;

  async startBatch(_context: BatchContext): Promise<void> {}

  async finishBatch(input: {
    batchId: string;
    status: 'success' | 'failed';
    totals: BatchTotals;
    errorSummary: string[];
  }): Promise<void> {
    this.batchStatus = input.status;
  }

  async getSubLot(batchId: string, domain: LotBDomain, watermark: string): Promise<SubLotRecord | null> {
    const key = `${batchId}:${domain}:${watermark}`;
    return this.subLots.get(key) ?? null;
  }

  async runSubLot(
    context: SubLotContext,
    rows: unknown[],
    handler: (rows: unknown[]) => Promise<UpsertResult>
  ): Promise<UpsertResult> {
    if (this.failOnceOn === context.domain) {
      this.failOnceOn = null;
      throw new Error(`forced failure ${context.domain}`);
    }

    return handler(rows);
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
    const key = `${input.batchId}:${input.domain}:${input.watermark}`;
    this.subLots.set(key, {
      status: 'success',
      sourceHash: input.sourceHash
    });
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
    const key = `${input.batchId}:${input.domain}:${input.watermark}`;
    this.subLots.set(key, {
      status: 'failed',
      sourceHash: input.sourceHash
    });
  }

  async upsertExercices(rows: unknown[]): Promise<UpsertResult> {
    this.counters.upsertExercices += rows.length;
    if (this.rejectOnceOn === 'exercices') {
      this.rejectOnceOn = null;
      return { inserts: 0, updates: 0, rejects: rows.length, anomalies: ['invalid exercice payload'] };
    }
    return { inserts: rows.length, updates: 0, rejects: 0, anomalies: [] };
  }

  async upsertEnveloppes(rows: unknown[]): Promise<UpsertResult> {
    this.counters.upsertEnveloppes += rows.length;
    return { inserts: rows.length, updates: 0, rejects: 0, anomalies: [] };
  }

  async upsertSections(rows: unknown[]): Promise<UpsertResult> {
    this.counters.upsertSections += rows.length;
    return { inserts: rows.length, updates: 0, rejects: 0, anomalies: [] };
  }

  async upsertProgrammes(rows: unknown[]): Promise<UpsertResult> {
    this.counters.upsertProgrammes += rows.length;
    return { inserts: rows.length, updates: 0, rejects: 0, anomalies: [] };
  }

  async upsertActions(rows: unknown[]): Promise<UpsertResult> {
    this.counters.upsertActions += rows.length;
    return { inserts: rows.length, updates: 0, rejects: 0, anomalies: [] };
  }

  async upsertAllocations(rows: unknown[]): Promise<UpsertResult> {
    this.counters.upsertAllocations += rows.length;
    return { inserts: rows.length, updates: 0, rejects: 0, anomalies: [] };
  }

  async upsertDecisionVersions(rows: unknown[]): Promise<UpsertResult> {
    this.counters.upsertDecisionVersions += rows.length;
    return { inserts: rows.length, updates: 0, rejects: 0, anomalies: [] };
  }
}

const snapshot: BudgetReferentielsSnapshot = {
  exercices: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      clientId: 'client-demo',
      code: 'EX-2026',
      libelle: 'Exercice 2026',
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
      statut: 'ouvert',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: '00000000-0000-0000-0000-000000000001',
      archivedAt: null
    }
  ],
  enveloppes: [],
  sections: [],
  programmes: [],
  actions: [],
  allocations: [],
  decisionVersions: []
};

describe('LotBBackfillRunner', () => {
  it('builds a migration batch id with expected format', () => {
    const batchId = buildBatchId('lot-b', 'Client Demo');
    expect(batchId).toMatch(/^lot-b-client-demo-\d{14}-[a-f0-9]{8}$/);
  });

  it('does not duplicate successful sub-lots when rerunning with same batch', async () => {
    const repository = new InMemoryRepository();
    const runner = new LotBBackfillRunner(repository);

    const options = {
      batchId: 'lot-b-client-demo-20260302120000-aaaa1111',
      lotName: 'lot-b' as const,
      sourcePath: '/tmp/source.json',
      chunkSize: 1,
      maxRetries: 1,
      actorId: 'migration-bot',
      resume: true
    };

    await runner.run(snapshot, options);
    await runner.run(snapshot, options);

    expect(repository.counters.upsertExercices).toBe(1);
    expect(repository.batchStatus).toBe('success');
  });

  it('resumes only failed sub-lots on rerun', async () => {
    const repository = new InMemoryRepository();
    const runner = new LotBBackfillRunner(repository);

    const options = {
      batchId: 'lot-b-client-demo-20260302120000-bbbb2222',
      lotName: 'lot-b' as const,
      sourcePath: '/tmp/source.json',
      chunkSize: 1,
      maxRetries: 0,
      actorId: 'migration-bot',
      resume: true
    };

    repository.failOnceOn = 'exercices';

    await expect(runner.run(snapshot, options)).rejects.toThrow('Resume with --batch-id');
    expect(repository.batchStatus).toBe('failed');
    expect(repository.counters.upsertExercices).toBe(0);

    await runner.run(snapshot, options);

    expect(repository.counters.upsertExercices).toBe(1);
    expect(repository.batchStatus).toBe('success');
  });

  it('fails sub-lot when row rejects are reported and allows replay on resume', async () => {
    const repository = new InMemoryRepository();
    const runner = new LotBBackfillRunner(repository);

    const options = {
      batchId: 'lot-b-client-demo-20260302120000-cccc3333',
      lotName: 'lot-b' as const,
      sourcePath: '/tmp/source.json',
      chunkSize: 1,
      maxRetries: 0,
      actorId: 'migration-bot',
      resume: true
    };

    repository.rejectOnceOn = 'exercices';

    await expect(runner.run(snapshot, options)).rejects.toThrow('Backfill interruption on exercices');
    expect(repository.batchStatus).toBe('failed');

    const failedSubLot = await repository.getSubLot(options.batchId, 'exercices', 'exercices:1/1');
    expect(failedSubLot?.status).toBe('failed');

    await runner.run(snapshot, options);

    expect(repository.batchStatus).toBe('success');
    expect(repository.counters.upsertExercices).toBe(2);
  });
});
