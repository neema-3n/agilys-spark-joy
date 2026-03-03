import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { anomaliesToCsv, reconcileBeforeAfter, renderReconciliationMarkdown, type ReconciliationInput } from './reconciliation';

interface CliArgs {
  batchId: string;
  inputPath: string;
  outputDir: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
  if (!isRecord(payload)) {
    throw new Error('Invalid reconciliation input: payload must be a JSON object');
  }

  const criticalEntities = payload.criticalEntities;
  const cardinalitySource = payload.cardinalitySource;
  const cardinalityTarget = payload.cardinalityTarget;
  const samplesSource = payload.samplesSource;
  const samplesTarget = payload.samplesTarget;
  const thresholds = payload.thresholds;

  if (!Array.isArray(criticalEntities)) {
    throw new Error('Invalid reconciliation input: criticalEntities must be an array');
  }

  if (!isRecord(cardinalitySource)) {
    throw new Error('Invalid reconciliation input: cardinalitySource must be an object');
  }

  if (!isRecord(cardinalityTarget)) {
    throw new Error('Invalid reconciliation input: cardinalityTarget must be an object');
  }

  if (!Array.isArray(samplesSource)) {
    throw new Error('Invalid reconciliation input: samplesSource must be an array');
  }

  if (!Array.isArray(samplesTarget)) {
    throw new Error('Invalid reconciliation input: samplesTarget must be an array');
  }

  if (thresholds !== undefined && !isRecord(thresholds)) {
    throw new Error('Invalid reconciliation input: thresholds must be an object when provided');
  }

  return {
    batchId,
    criticalEntities: criticalEntities as string[],
    cardinalitySource: cardinalitySource as Record<string, number>,
    cardinalityTarget: cardinalityTarget as Record<string, number>,
    samplesSource: samplesSource as ReconciliationInput['samplesSource'],
    samplesTarget: samplesTarget as ReconciliationInput['samplesTarget'],
    thresholds: (thresholds ?? {}) as Partial<ReconciliationInput['thresholds']>
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
