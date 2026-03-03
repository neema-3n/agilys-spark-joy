import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  anomaliesToCsv,
  reconcileBeforeAfter,
  renderReconciliationMarkdown,
  type ReconciliationInput,
  type ReconciliationSample,
  type ReconciliationThresholds
} from './reconciliation';

interface CliArgs {
  batchId: string;
  inputPath: string;
  outputDir: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertNonEmptyString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid reconciliation input: ${fieldName} must be a non-empty string`);
  }

  return value;
};

const assertFiniteNonNegativeNumber = (value: unknown, fieldName: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid reconciliation input: ${fieldName} must be a finite non-negative number`);
  }

  return value;
};

const parseCriticalEntities = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid reconciliation input: criticalEntities must be a non-empty array');
  }

  return value.map((entity, index) => assertNonEmptyString(entity, `criticalEntities[${index}]`));
};

const parseCardinalityMap = (value: unknown, fieldName: string): Record<string, number> => {
  if (!isRecord(value)) {
    throw new Error(`Invalid reconciliation input: ${fieldName} must be an object`);
  }

  const parsed: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    parsed[key] = assertFiniteNonNegativeNumber(entry, `${fieldName}.${key}`);
  }

  return parsed;
};

const parseForeignKeys = (value: unknown, fieldName: string): Record<string, string | null | undefined> | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new Error(`Invalid reconciliation input: ${fieldName} must be an object when provided`);
  }

  const parsed: Record<string, string | null | undefined> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== null && entry !== undefined && typeof entry !== 'string') {
      throw new Error(`Invalid reconciliation input: ${fieldName}.${key} must be string | null | undefined`);
    }

    parsed[key] = entry as string | null | undefined;
  }

  return parsed;
};

const parseSample = (value: unknown, fieldName: string): ReconciliationSample => {
  if (!isRecord(value)) {
    throw new Error(`Invalid reconciliation input: ${fieldName} must contain objects`);
  }

  const entity = assertNonEmptyString(value.entity, `${fieldName}.entity`);
  const businessKey = assertNonEmptyString(value.businessKey, `${fieldName}.businessKey`);
  const status = value.status;
  if (status !== undefined && status !== null && typeof status !== 'string') {
    throw new Error(`Invalid reconciliation input: ${fieldName}.status must be a string | null when provided`);
  }

  const amount = value.amount;
  if (amount !== undefined && amount !== null && (typeof amount !== 'number' || !Number.isFinite(amount))) {
    throw new Error(`Invalid reconciliation input: ${fieldName}.amount must be a finite number | null when provided`);
  }

  return {
    entity,
    businessKey,
    amount: (amount ?? null) as number | null,
    status: (status ?? null) as string | null,
    foreignKeys: parseForeignKeys(value.foreignKeys, `${fieldName}.foreignKeys`)
  };
};

const parseSamples = (value: unknown, fieldName: string): ReconciliationSample[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid reconciliation input: ${fieldName} must be an array`);
  }

  return value.map((sample, index) => parseSample(sample, `${fieldName}[${index}]`));
};

const parseThresholds = (value: unknown): Partial<ReconciliationThresholds> => {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error('Invalid reconciliation input: thresholds must be an object when provided');
  }

  const parsed: Partial<ReconciliationThresholds> = {};
  const allowedKeys = new Set([
    'maxCriticalCardinalityDiff',
    'maxAmountDelta',
    'maxCriticalAnomalies',
    'maxHighAnomalies'
  ]);
  for (const [key, entry] of Object.entries(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Invalid reconciliation input: thresholds.${key} is not supported`);
    }

    parsed[key as keyof ReconciliationThresholds] = assertFiniteNonNegativeNumber(
      entry,
      `thresholds.${key}`
    );
  }

  return parsed;
};

const parseArgs = (): CliArgs => {
  const args = process.argv.slice(2);
  const parsed: Partial<CliArgs> = {
    outputDir: '../_bmad-output/implementation-artifacts'
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    const next = args[index + 1];

    switch (token) {
      case '--':
        break;
      case '--batch-id':
        parsed.batchId = next;
        index += 1;
        break;
      case '--input':
        parsed.inputPath = next;
        index += 1;
        break;
      case '--output-dir':
        parsed.outputDir = next;
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!parsed.batchId) {
    throw new Error('Missing required argument --batch-id <migration_batch_id>');
  }

  if (!parsed.inputPath) {
    throw new Error('Missing required argument --input <reconciliation-input.json>');
  }

  return parsed as CliArgs;
};

export const parseInputPayload = (payload: unknown, batchId: string): ReconciliationInput => {
  assertNonEmptyString(batchId, 'batchId');

  if (!isRecord(payload)) {
    throw new Error('Invalid reconciliation input: payload must be a JSON object');
  }

  return {
    batchId,
    criticalEntities: parseCriticalEntities(payload.criticalEntities),
    cardinalitySource: parseCardinalityMap(payload.cardinalitySource, 'cardinalitySource'),
    cardinalityTarget: parseCardinalityMap(payload.cardinalityTarget, 'cardinalityTarget'),
    samplesSource: parseSamples(payload.samplesSource, 'samplesSource'),
    samplesTarget: parseSamples(payload.samplesTarget, 'samplesTarget'),
    thresholds: parseThresholds(payload.thresholds)
  };
};

export const readInput = (inputPath: string, batchId: string): ReconciliationInput => {
  const absolutePath = resolve(process.cwd(), inputPath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Input file not found: ${absolutePath}`);
  }

  const raw = readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  return parseInputPayload(parsed, batchId);
};

const formatDate = (isoDate: string): string => isoDate.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const main = (): void => {
  const args = parseArgs();
  const input = readInput(args.inputPath, args.batchId);

  const result = reconcileBeforeAfter(input);

  const outputDir = resolve(process.cwd(), args.outputDir);
  mkdirSync(outputDir, { recursive: true });

  const runDate = formatDate(result.runAt);
  const baseName = `migration-reconciliation-${result.batchId}-${runDate}`;

  const jsonPath = resolve(outputDir, `${baseName}.json`);
  const csvPath = resolve(outputDir, `${baseName}.csv`);
  const mdPath = resolve(outputDir, `${baseName}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  writeFileSync(csvPath, `${anomaliesToCsv(result.anomalies)}\n`, 'utf8');
  writeFileSync(mdPath, renderReconciliationMarkdown(result), 'utf8');

  const summary = {
    batchId: result.batchId,
    decision: result.decision,
    anomalies: result.anomalies.length,
    critical: result.anomalyBySeverity.critical,
    high: result.anomalyBySeverity.high,
    medium: result.anomalyBySeverity.medium,
    files: {
      json: jsonPath,
      csv: csvPath,
      markdown: mdPath
    }
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Lot B reconciliation failed: ${message}\n`);
    process.exitCode = 1;
  }
}
