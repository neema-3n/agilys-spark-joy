import { performance } from 'node:perf_hooks';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import { CashRiskService } from './cash-risk.service';
import type { CashRiskInput, CashRiskTransition } from './cash-risk.types';

interface BenchmarkArgs {
  tenantId: string;
  exerciceId: string;
  iterations: number;
  thresholdMs: number;
  amount: number;
  transition: CashRiskTransition;
  sourceType: CashRiskInput['sourceType'];
  sourceId?: string;
  entityId?: string;
  userId: string;
  roles: string[];
}

const DEFAULT_ITERATIONS = 25;
const DEFAULT_THRESHOLD_MS = 500;

const parseArgs = (): BenchmarkArgs => {
  const args = process.argv.slice(2);
  const parsed: Partial<BenchmarkArgs> = {
    iterations: DEFAULT_ITERATIONS,
    thresholdMs: DEFAULT_THRESHOLD_MS,
    amount: 1000,
    transition: 'engagement:validate',
    sourceType: 'engagement',
    userId: process.env.CASH_RISK_BENCH_USER_ID ?? 'cash-risk-bench',
    roles: (process.env.CASH_RISK_BENCH_ROLES ?? 'admin_client')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    const next = args[index + 1];

    switch (token) {
      case '--tenant-id':
        parsed.tenantId = next;
        index += 1;
        break;
      case '--exercice-id':
        parsed.exerciceId = next;
        index += 1;
        break;
      case '--iterations':
        parsed.iterations = Number(next);
        index += 1;
        break;
      case '--threshold-ms':
        parsed.thresholdMs = Number(next);
        index += 1;
        break;
      case '--amount':
        parsed.amount = Number(next);
        index += 1;
        break;
      case '--transition':
        parsed.transition = next as CashRiskTransition;
        index += 1;
        break;
      case '--source-type':
        parsed.sourceType = next as CashRiskInput['sourceType'];
        index += 1;
        break;
      case '--source-id':
        parsed.sourceId = next;
        index += 1;
        break;
      case '--entity-id':
        parsed.entityId = next;
        index += 1;
        break;
      case '--user-id':
        parsed.userId = next;
        index += 1;
        break;
      case '--roles':
        parsed.roles = next.split(',').map((value) => value.trim()).filter(Boolean);
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!parsed.tenantId) {
    throw new Error('Missing required argument --tenant-id <uuid>');
  }

  if (!parsed.exerciceId) {
    throw new Error('Missing required argument --exercice-id <uuid>');
  }

  if (parsed.iterations === undefined || Number.isNaN(parsed.iterations) || parsed.iterations < 1) {
    throw new Error('--iterations must be a positive integer');
  }

  if (parsed.thresholdMs === undefined || Number.isNaN(parsed.thresholdMs) || parsed.thresholdMs < 1) {
    throw new Error('--threshold-ms must be a positive number');
  }

  if (parsed.amount === undefined || Number.isNaN(parsed.amount) || parsed.amount < 0) {
    throw new Error('--amount must be a number >= 0');
  }

  return parsed as BenchmarkArgs;
};

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(Math.ceil(sorted.length * ratio) - 1, 0);
  return sorted[index] ?? 0;
};

const buildActor = (args: BenchmarkArgs): AuthenticatedUser => ({
  sub: args.userId,
  tenantId: args.tenantId,
  roles: args.roles,
});

const buildInput = (args: BenchmarkArgs): CashRiskInput => ({
  exerciceId: args.exerciceId,
  transition: args.transition,
  sourceType: args.sourceType,
  sourceId: args.sourceId,
  entityId: args.entityId,
  amount: args.amount,
});

const main = async (): Promise<void> => {
  const args = parseArgs();
  const actor = buildActor(args);
  const input = buildInput(args);
  const postgresService = new PostgresService();
  const cashRiskService = new CashRiskService(postgresService);
  const durations: number[] = [];

  try {
    for (let index = 0; index < args.iterations; index += 1) {
      const startedAt = performance.now();
      await cashRiskService.evaluate(actor, input);
      durations.push(performance.now() - startedAt);
    }
  } finally {
    await postgresService.onModuleDestroy();
  }

  const summary = {
    tenantId: args.tenantId,
    exerciceId: args.exerciceId,
    transition: args.transition,
    sourceType: args.sourceType,
    sourceId: args.sourceId ?? null,
    entityId: args.entityId ?? null,
    iterations: args.iterations,
    thresholdMs: args.thresholdMs,
    p50Ms: Number(percentile(durations, 0.5).toFixed(2)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
    maxMs: Number(Math.max(...durations).toFixed(2)),
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (summary.p95Ms > args.thresholdMs) {
    throw new Error(`Cash risk benchmark failed: p95 ${summary.p95Ms} ms > threshold ${args.thresholdMs} ms`);
  }
};

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Cash risk benchmark failed: ${message}\n`);
  process.exitCode = 1;
});
