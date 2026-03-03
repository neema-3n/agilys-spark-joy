import { createHash } from 'crypto';

export type Severity = 'critical' | 'high' | 'medium';
export type CardinalitySeverity = Severity | 'info';
export type Decision = 'GO' | 'NO_GO';

export interface ReconciliationThresholds {
  maxCriticalCardinalityDiff: number;
  maxAmountDelta: number;
  maxCriticalAnomalies: number;
  maxHighAnomalies: number;
}

export interface ReconciliationAnomaly {
  code:
    | 'CARDINALITY_MISMATCH'
    | 'AMOUNT_MISMATCH'
    | 'AMOUNT_SUM_MISMATCH'
    | 'DUPLICATE_SAMPLE'
    | 'STATUS_MISMATCH'
    | 'FK_MISMATCH'
    | 'MISSING_IN_TARGET'
    | 'UNEXPECTED_IN_TARGET';
  severity: Severity;
  entity: string;
  businessKey?: string;
  message: string;
  sourceValue?: string | number | null;
  targetValue?: string | number | null;
}

export interface CardinalityReconciliation {
  entity: string;
  sourceCount: number;
  targetCount: number;
  delta: number;
  severity: CardinalitySeverity;
}

export interface ReconciliationSample {
  entity: string;
  businessKey: string;
  amount?: number | null;
  status?: string | null;
  foreignKeys?: Record<string, string | null | undefined>;
}

export interface ReconciliationInput {
  batchId: string;
  criticalEntities: string[];
  cardinalitySource: Record<string, number>;
  cardinalityTarget: Record<string, number>;
  samplesSource: ReconciliationSample[];
  samplesTarget: ReconciliationSample[];
  thresholds?: Partial<ReconciliationThresholds>;
}

export interface ReconciliationResult {
  batchId: string;
  runAt: string;
  criticalEntities: string[];
  thresholds: ReconciliationThresholds;
  cardinality: CardinalityReconciliation[];
  anomalies: ReconciliationAnomaly[];
  anomalyBySeverity: Record<Severity, number>;
  decision: Decision;
  causes: string[];
  resolutions: string[];
  signature: {
    business: string;
    technical: string;
  };
  reproducibilityHash: string;
}

const DEFAULT_THRESHOLDS: ReconciliationThresholds = {
  maxCriticalCardinalityDiff: 0,
  maxAmountDelta: 0,
  maxCriticalAnomalies: 0,
  maxHighAnomalies: 0
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

const severityOrder = (severity: Severity): number => {
  switch (severity) {
    case 'critical':
      return 0;
    case 'high':
      return 1;
    case 'medium':
      return 2;
    default:
      return 99;
  }
};

const sortAnomalies = (anomalies: ReconciliationAnomaly[]): ReconciliationAnomaly[] =>
  [...anomalies].sort((left, right) => {
    const severityDelta = severityOrder(left.severity) - severityOrder(right.severity);
    if (severityDelta !== 0) {
      return severityDelta;
    }

    const entityDelta = left.entity.localeCompare(right.entity);
    if (entityDelta !== 0) {
      return entityDelta;
    }

    return (left.businessKey ?? '').localeCompare(right.businessKey ?? '');
  });

interface SampleIndex {
  map: Map<string, ReconciliationSample>;
  duplicates: Array<{ entity: string; businessKey: string; count: number }>;
}

const toSampleIndex = (samples: ReconciliationSample[]): SampleIndex => {
  const map = new Map<string, ReconciliationSample>();
  const duplicateByKey = new Map<string, { entity: string; businessKey: string; count: number }>();

  for (const sample of samples) {
    const key = `${sample.entity}::${sample.businessKey}`;
    if (map.has(key)) {
      const duplicate = duplicateByKey.get(key);
      if (duplicate) {
        duplicate.count += 1;
      } else {
        duplicateByKey.set(key, {
          entity: sample.entity,
          businessKey: sample.businessKey,
          count: 2
        });
      }
      continue;
    }

    map.set(key, sample);
  }

  return {
    map,
    duplicates: [...duplicateByKey.values()]
  };
};

const addAnomaly = (anomalies: ReconciliationAnomaly[], anomaly: ReconciliationAnomaly): void => {
  anomalies.push(anomaly);
};

const normalizedNumber = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return Number(value.toFixed(2));
};

const normalizedStatus = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase();
};

const normalizedFk = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value.trim();
};

const assertFiniteNonNegativeInteger = (value: unknown, fieldName: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid reconciliation input: ${fieldName} must be a finite non-negative integer`);
  }

  return value;
};

const assertFiniteNonNegativeNumber = (value: unknown, fieldName: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid reconciliation input: ${fieldName} must be a finite non-negative number`);
  }

  return value;
};

const normalizeThresholds = (inputThresholds?: Partial<ReconciliationThresholds>): ReconciliationThresholds => {
  const merged: ReconciliationThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...inputThresholds
  };

  return {
    maxCriticalCardinalityDiff: assertFiniteNonNegativeInteger(
      merged.maxCriticalCardinalityDiff,
      'thresholds.maxCriticalCardinalityDiff'
    ),
    maxAmountDelta: assertFiniteNonNegativeNumber(merged.maxAmountDelta, 'thresholds.maxAmountDelta'),
    maxCriticalAnomalies: assertFiniteNonNegativeInteger(
      merged.maxCriticalAnomalies,
      'thresholds.maxCriticalAnomalies'
    ),
    maxHighAnomalies: assertFiniteNonNegativeInteger(merged.maxHighAnomalies, 'thresholds.maxHighAnomalies')
  };
};

const reconcileCardinality = (
  entities: string[],
  source: Record<string, number>,
  target: Record<string, number>,
  thresholds: ReconciliationThresholds,
  anomalies: ReconciliationAnomaly[]
): CardinalityReconciliation[] => {
  const result: CardinalityReconciliation[] = [];

  for (const entity of entities) {
    const sourceCount = source[entity] ?? 0;
    const targetCount = target[entity] ?? 0;
    const delta = targetCount - sourceCount;

    const anomalySeverity: Severity = Math.abs(delta) > thresholds.maxCriticalCardinalityDiff ? 'critical' : 'medium';
    const severity: CardinalitySeverity =
      delta === 0 ? 'info' : Math.abs(delta) > thresholds.maxCriticalCardinalityDiff ? 'critical' : 'medium';

    result.push({ entity, sourceCount, targetCount, delta, severity });

    if (delta !== 0) {
      addAnomaly(anomalies, {
        code: 'CARDINALITY_MISMATCH',
        severity: anomalySeverity,
        entity,
        message: `Cardinalite differente: source=${sourceCount}, cible=${targetCount}, ecart=${delta}`,
        sourceValue: sourceCount,
        targetValue: targetCount
      });
    }
  }

  return result;
};

const amountTotalByEntity = (samples: Iterable<ReconciliationSample>): Record<string, number> => {
  const totals: Record<string, number> = {};

  for (const sample of samples) {
    const normalized = normalizedNumber(sample.amount);
    if (normalized === null) {
      continue;
    }

    totals[sample.entity] = Number(((totals[sample.entity] ?? 0) + normalized).toFixed(2));
  }

  return totals;
};

const reconcileAmountSums = (
  entities: string[],
  sourceByKey: Map<string, ReconciliationSample>,
  targetByKey: Map<string, ReconciliationSample>,
  thresholds: ReconciliationThresholds,
  anomalies: ReconciliationAnomaly[]
): void => {
  const sourceTotals = amountTotalByEntity(sourceByKey.values());
  const targetTotals = amountTotalByEntity(targetByKey.values());

  for (const entity of entities) {
    const sourceTotal = sourceTotals[entity] ?? 0;
    const targetTotal = targetTotals[entity] ?? 0;
    const delta = Number((targetTotal - sourceTotal).toFixed(2));
    if (Math.abs(delta) > thresholds.maxAmountDelta) {
      addAnomaly(anomalies, {
        code: 'AMOUNT_SUM_MISMATCH',
        severity: 'critical',
        entity,
        message: `Somme montants incoherente: source=${sourceTotal}, cible=${targetTotal}, ecart=${delta}`,
        sourceValue: sourceTotal,
        targetValue: targetTotal
      });
    }
  }
};

const reconcileSamples = (
  criticalEntities: string[],
  sourceSamples: ReconciliationSample[],
  targetSamples: ReconciliationSample[],
  thresholds: ReconciliationThresholds,
  anomalies: ReconciliationAnomaly[]
): void => {
  const sourceIndex = toSampleIndex(sourceSamples);
  const targetIndex = toSampleIndex(targetSamples);
  const sourceByKey = sourceIndex.map;
  const targetByKey = targetIndex.map;

  for (const duplicate of sourceIndex.duplicates) {
    addAnomaly(anomalies, {
      code: 'DUPLICATE_SAMPLE',
      severity: 'high',
      entity: duplicate.entity,
      businessKey: duplicate.businessKey,
      message: `Doublon detecte dans la source pour ${duplicate.entity}::${duplicate.businessKey} (${duplicate.count} occurrences)`,
      sourceValue: duplicate.count
    });
  }

  for (const duplicate of targetIndex.duplicates) {
    addAnomaly(anomalies, {
      code: 'DUPLICATE_SAMPLE',
      severity: 'high',
      entity: duplicate.entity,
      businessKey: duplicate.businessKey,
      message: `Doublon detecte dans la cible pour ${duplicate.entity}::${duplicate.businessKey} (${duplicate.count} occurrences)`,
      targetValue: duplicate.count
    });
  }

  for (const source of sourceSamples) {
    const key = `${source.entity}::${source.businessKey}`;
    const target = targetByKey.get(key);

    if (!target) {
      addAnomaly(anomalies, {
        code: 'MISSING_IN_TARGET',
        severity: 'critical',
        entity: source.entity,
        businessKey: source.businessKey,
        message: 'Echantillon present dans la source mais absent de la cible'
      });
      continue;
    }

    const sourceAmount = normalizedNumber(source.amount);
    const targetAmount = normalizedNumber(target.amount);

    if (sourceAmount === null && targetAmount === null) {
      // Ignore only when amount is absent on both sides.
    } else if (sourceAmount === null || targetAmount === null) {
      addAnomaly(anomalies, {
        code: 'AMOUNT_MISMATCH',
        severity: 'critical',
        entity: source.entity,
        businessKey: source.businessKey,
        message: `Montant absent d'un cote: source=${sourceAmount ?? 'null'}, cible=${targetAmount ?? 'null'}`,
        sourceValue: sourceAmount,
        targetValue: targetAmount
      });
    } else {
      const delta = Number((targetAmount - sourceAmount).toFixed(2));
      if (Math.abs(delta) > thresholds.maxAmountDelta) {
        addAnomaly(anomalies, {
          code: 'AMOUNT_MISMATCH',
          severity: 'critical',
          entity: source.entity,
          businessKey: source.businessKey,
          message: `Montant incoherent: source=${sourceAmount}, cible=${targetAmount}, ecart=${delta}`,
          sourceValue: sourceAmount,
          targetValue: targetAmount
        });
      }
    }

    const sourceStatus = normalizedStatus(source.status);
    const targetStatus = normalizedStatus(target.status);
    if (sourceStatus !== targetStatus) {
      addAnomaly(anomalies, {
        code: 'STATUS_MISMATCH',
        severity: 'high',
        entity: source.entity,
        businessKey: source.businessKey,
        message: `Statut incoherent: source=${sourceStatus ?? 'null'}, cible=${targetStatus ?? 'null'}`,
        sourceValue: sourceStatus,
        targetValue: targetStatus
      });
    }

    const sourceFks = source.foreignKeys ?? {};
    const targetFks = target.foreignKeys ?? {};
    const fkKeys = Array.from(new Set([...Object.keys(sourceFks), ...Object.keys(targetFks)])).sort((left, right) =>
      left.localeCompare(right)
    );

    for (const fkKey of fkKeys) {
      const sourceFk = normalizedFk(sourceFks[fkKey]);
      const targetFk = normalizedFk(targetFks[fkKey]);
      if (sourceFk !== targetFk) {
        addAnomaly(anomalies, {
          code: 'FK_MISMATCH',
          severity: 'high',
          entity: source.entity,
          businessKey: source.businessKey,
          message: `FK incoherente (${fkKey}): source=${sourceFk ?? 'null'}, cible=${targetFk ?? 'null'}`,
          sourceValue: sourceFk,
          targetValue: targetFk
        });
      }
    }
  }

  for (const target of targetSamples) {
    const key = `${target.entity}::${target.businessKey}`;
    if (!sourceByKey.has(key)) {
      addAnomaly(anomalies, {
        code: 'UNEXPECTED_IN_TARGET',
        severity: 'high',
        entity: target.entity,
        businessKey: target.businessKey,
        message: 'Echantillon present dans la cible mais absent de la source'
      });
    }
  }

  reconcileAmountSums(criticalEntities, sourceByKey, targetByKey, thresholds, anomalies);
};

const countBySeverity = (anomalies: ReconciliationAnomaly[]): Record<Severity, number> => ({
  critical: anomalies.filter((anomaly) => anomaly.severity === 'critical').length,
  high: anomalies.filter((anomaly) => anomaly.severity === 'high').length,
  medium: anomalies.filter((anomaly) => anomaly.severity === 'medium').length
});

const computeDecision = (
  anomalyBySeverity: Record<Severity, number>,
  thresholds: ReconciliationThresholds
): { decision: Decision; causes: string[]; resolutions: string[] } => {
  const causes: string[] = [];

  if (anomalyBySeverity.critical > thresholds.maxCriticalAnomalies) {
    causes.push(
      `Anomalies critiques ${anomalyBySeverity.critical} > seuil ${thresholds.maxCriticalAnomalies}`
    );
  }

  if (anomalyBySeverity.high > thresholds.maxHighAnomalies) {
    causes.push(`Anomalies high ${anomalyBySeverity.high} > seuil ${thresholds.maxHighAnomalies}`);
  }

  if (causes.length > 0) {
    return {
      decision: 'NO_GO',
      causes,
      resolutions: [
        'Corriger les ecarts critiques dans la source ou le mapping',
        'Relancer le lot avec le meme batch_id pour verifier la rejouabilite',
        'Valider les statuts/FK avec controle metier avant cutover'
      ]
    };
  }

  return {
    decision: 'GO',
    causes: ['Aucun ecart bloquant detecte'],
    resolutions: ['Signer le rapport metier/technique et autoriser la progression du lot']
  };
};

const assertValidInput = (input: ReconciliationInput): void => {
  if (!input.batchId?.trim()) {
    throw new Error('Invalid reconciliation input: batchId is required');
  }

  if (!Array.isArray(input.criticalEntities) || input.criticalEntities.length === 0) {
    throw new Error('Invalid reconciliation input: criticalEntities must contain at least one entity');
  }

  for (const [index, entity] of input.criticalEntities.entries()) {
    if (typeof entity !== 'string' || entity.trim().length === 0) {
      throw new Error(`Invalid reconciliation input: criticalEntities[${index}] must be a non-empty string`);
    }
  }

  if (!Array.isArray(input.samplesSource) || !Array.isArray(input.samplesTarget)) {
    throw new Error('Invalid reconciliation input: samplesSource and samplesTarget must be arrays');
  }

  const missingCardinality = input.criticalEntities.filter(
    (entity) =>
      !Object.prototype.hasOwnProperty.call(input.cardinalitySource, entity)
      || !Object.prototype.hasOwnProperty.call(input.cardinalityTarget, entity)
  );

  if (missingCardinality.length > 0) {
    throw new Error(
      `Invalid reconciliation input: missing cardinality counts for ${missingCardinality.join(', ')}`
    );
  }

  for (const entity of input.criticalEntities) {
    assertFiniteNonNegativeInteger(input.cardinalitySource[entity], `cardinalitySource.${entity}`);
    assertFiniteNonNegativeInteger(input.cardinalityTarget[entity], `cardinalityTarget.${entity}`);
  }
};

export const reconcileBeforeAfter = (input: ReconciliationInput): ReconciliationResult => {
  assertValidInput(input);

  const thresholds = normalizeThresholds(input.thresholds);

  const anomalies: ReconciliationAnomaly[] = [];
  const cardinality = reconcileCardinality(
    [...input.criticalEntities].sort((left, right) => left.localeCompare(right)),
    input.cardinalitySource,
    input.cardinalityTarget,
    thresholds,
    anomalies
  );

  reconcileSamples(input.criticalEntities, input.samplesSource, input.samplesTarget, thresholds, anomalies);

  const orderedAnomalies = sortAnomalies(anomalies);
  const anomalyBySeverity = countBySeverity(orderedAnomalies);
  const { decision, causes, resolutions } = computeDecision(anomalyBySeverity, thresholds);

  const runAt = new Date().toISOString();
  const payloadForHash = {
    batchId: input.batchId,
    criticalEntities: [...input.criticalEntities].sort((left, right) => left.localeCompare(right)),
    thresholds,
    cardinality,
    anomalies: orderedAnomalies,
    decision
  };

  const reproducibilityHash = createHash('sha256').update(stableStringify(payloadForHash)).digest('hex');

  return {
    batchId: input.batchId,
    runAt,
    criticalEntities: [...input.criticalEntities].sort((left, right) => left.localeCompare(right)),
    thresholds,
    cardinality,
    anomalies: orderedAnomalies,
    anomalyBySeverity,
    decision,
    causes,
    resolutions,
    signature: {
      business: 'A signer',
      technical: 'A signer'
    },
    reproducibilityHash
  };
};

const csvEscape = (value: string | number | null | undefined): string => {
  const text = value === null || value === undefined ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

export const anomaliesToCsv = (anomalies: ReconciliationAnomaly[]): string => {
  const header = ['code', 'severity', 'entity', 'business_key', 'message', 'source_value', 'target_value'];
  const rows = anomalies.map((anomaly) =>
    [
      anomaly.code,
      anomaly.severity,
      anomaly.entity,
      anomaly.businessKey ?? '',
      anomaly.message,
      anomaly.sourceValue ?? '',
      anomaly.targetValue ?? ''
    ]
      .map((value) => csvEscape(value))
      .join(',')
  );

  return `${header.join(',')}\n${rows.join('\n')}`;
};

export const renderReconciliationMarkdown = (result: ReconciliationResult): string => {
  const cardinalityRows = result.cardinality
    .map(
      (entry) =>
        `| ${entry.entity} | ${entry.sourceCount} | ${entry.targetCount} | ${entry.delta} | ${entry.severity.toUpperCase()} |`
    )
    .join('\n');

  const anomalyRows =
    result.anomalies.length === 0
      ? '| - | - | - | - | - |\n'
      : result.anomalies
          .map(
            (entry) =>
              `| ${entry.code} | ${entry.severity.toUpperCase()} | ${entry.entity} | ${entry.businessKey ?? '-'} | ${entry.message} |`
          )
          .join('\n');

  return `# Migration Reconciliation Report - ${result.batchId}\n\n- Date: ${result.runAt}\n- Decision: **${result.decision}**\n- Critical entities: ${result.criticalEntities.join(', ')}\n- Reproducibility hash: \`${result.reproducibilityHash}\`\n\n## Cardinalite source/cible\n\n| Entite | Source | Cible | Ecart | Severite |\n|---|---:|---:|---:|---|\n${cardinalityRows}\n\n## Coherence metier (echantillons)\n\n| Code | Severite | Entite | Business Key | Message |\n|---|---|---|---|---|\n${anomalyRows}\n\n## Seuils et blocage\n\n- maxCriticalCardinalityDiff: ${result.thresholds.maxCriticalCardinalityDiff}\n- maxAmountDelta: ${result.thresholds.maxAmountDelta}\n- maxCriticalAnomalies: ${result.thresholds.maxCriticalAnomalies}\n- maxHighAnomalies: ${result.thresholds.maxHighAnomalies}\n\n## Resume de decision\n\n- Causes:\n${result.causes.map((cause) => `  - ${cause}`).join('\n')}\n- Resolutions:\n${result.resolutions.map((resolution) => `  - ${resolution}`).join('\n')}\n\n## Signature\n\n- Metier: ${result.signature.business}\n- Technique: ${result.signature.technical}\n`;
};
