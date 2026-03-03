import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';
import { buildBatchId, DEFAULT_CHUNK_SIZE, DEFAULT_MAX_RETRIES, LotBBackfillRunner } from './runner';
import { PostgresLotBRepository } from './postgres-repository';
import type { BudgetReferentielsSnapshot, RunOptions } from './types';

interface CliArgs {
  source: string;
  batchId?: string;
  chunkSize: number;
  maxRetries: number;
  actorId: string;
  resume: boolean;
}

const parseBoolean = (value: string): boolean => value.toLowerCase() === 'true';

const parseArgs = (): CliArgs => {
  const args = process.argv.slice(2);
  const parsed: Partial<CliArgs> = {
    chunkSize: DEFAULT_CHUNK_SIZE,
    maxRetries: DEFAULT_MAX_RETRIES,
    actorId: process.env.MIGRATION_ACTOR_ID ?? 'migration-bot',
    resume: true
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    const next = args[index + 1];

    switch (token) {
      case '--source':
        parsed.source = next;
        index += 1;
        break;
      case '--batch-id':
        parsed.batchId = next;
        index += 1;
        break;
      case '--chunk-size':
        parsed.chunkSize = Number(next);
        index += 1;
        break;
      case '--max-retries':
        parsed.maxRetries = Number(next);
        index += 1;
        break;
      case '--actor-id':
        parsed.actorId = next;
        index += 1;
        break;
      case '--resume':
        parsed.resume = parseBoolean(next);
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!parsed.source) {
    throw new Error('Missing required argument --source <path-to-budget-referentiels.json>');
  }

  if (parsed.chunkSize === undefined || Number.isNaN(parsed.chunkSize) || parsed.chunkSize < 1) {
    throw new Error('--chunk-size must be a positive integer');
  }

  if (parsed.maxRetries === undefined || Number.isNaN(parsed.maxRetries) || parsed.maxRetries < 0) {
    throw new Error('--max-retries must be >= 0');
  }

  return parsed as CliArgs;
};

const readSnapshot = (sourcePath: string): BudgetReferentielsSnapshot => {
  const absolutePath = resolve(process.cwd(), sourcePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Source file not found: ${absolutePath}`);
  }

  const payload = readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(payload) as BudgetReferentielsSnapshot;

  return {
    exercices: parsed.exercices ?? [],
    enveloppes: parsed.enveloppes ?? [],
    sections: parsed.sections ?? [],
    programmes: parsed.programmes ?? [],
    actions: parsed.actions ?? [],
    allocations: parsed.allocations ?? [],
    decisionVersions: parsed.decisionVersions ?? []
  };
};

const inferTenantHint = (snapshot: BudgetReferentielsSnapshot): string => {
  const firstClient = snapshot.exercices[0]?.clientId
    ?? snapshot.enveloppes[0]?.clientId
    ?? snapshot.sections[0]?.clientId
    ?? snapshot.programmes[0]?.clientId
    ?? snapshot.actions[0]?.clientId
    ?? snapshot.allocations[0]?.clientId
    ?? snapshot.decisionVersions[0]?.clientId;

  return firstClient ?? 'tenant-unknown';
};

const createPool = (): Pool => {
  const host = process.env.POSTGRES_HOST ?? '127.0.0.1';
  const port = Number(process.env.POSTGRES_PORT ?? 5432);
  const database = process.env.POSTGRES_DB ?? 'agilys';
  const user = process.env.POSTGRES_USER ?? 'agilys_app';
  const password = process.env.POSTGRES_PASSWORD ?? process.env.PGPASSWORD;

  if (!password) {
    throw new Error('Missing database password: set POSTGRES_PASSWORD (or PGPASSWORD).');
  }

  return new Pool({ host, port, database, user, password, max: 4 });
};

const main = async (): Promise<void> => {
  const args = parseArgs();
  const snapshot = readSnapshot(args.source);
  const batchId = args.batchId ?? buildBatchId('lot-b', inferTenantHint(snapshot));

  const options: RunOptions = {
    batchId,
    lotName: 'lot-b',
    sourcePath: resolve(process.cwd(), args.source),
    chunkSize: args.chunkSize,
    maxRetries: args.maxRetries,
    actorId: args.actorId,
    resume: args.resume
  };

  const pool = createPool();
  const repository = new PostgresLotBRepository(pool);
  const runner = new LotBBackfillRunner(repository);

  try {
    const result = await runner.run(snapshot, options);

    const summary = {
      migration_batch_id: result.batchId,
      status: result.status,
      inserts: result.totals.inserts,
      updates: result.totals.updates,
      rejects: result.totals.rejects,
      retries: result.totals.retries,
      errors: result.totals.errors,
      duration_ms: result.totals.durationMs
    };

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await repository.close();
  }
};

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Lot B backfill failed: ${message}\n`);
  process.exitCode = 1;
});
