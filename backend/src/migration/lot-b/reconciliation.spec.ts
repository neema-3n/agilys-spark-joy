import { anomaliesToCsv, reconcileBeforeAfter, renderReconciliationMarkdown, type ReconciliationInput } from './reconciliation';

const baseInput = (): ReconciliationInput => ({
  batchId: 'lot-b-client-demo-20260303120000-abcd1234',
  criticalEntities: ['allocations', 'decisionVersions', 'exercices'],
  cardinalitySource: {
    exercices: 1,
    allocations: 2,
    decisionVersions: 2
  },
  cardinalityTarget: {
    exercices: 1,
    allocations: 2,
    decisionVersions: 2
  },
  samplesSource: [
    {
      entity: 'allocations',
      businessKey: 'alloc-001',
      amount: 120000,
      status: 'validee',
      foreignKeys: {
        exerciceId: '11111111-1111-1111-1111-111111111111'
      }
    },
    {
      entity: 'decisionVersions',
      businessKey: 'dec-001-v1',
      amount: 120000,
      status: 'validated',
      foreignKeys: {
        allocationId: '22222222-2222-2222-2222-222222222222'
      }
    }
  ],
  samplesTarget: [
    {
      entity: 'allocations',
      businessKey: 'alloc-001',
      amount: 120000,
      status: 'validee',
      foreignKeys: {
        exerciceId: '11111111-1111-1111-1111-111111111111'
      }
    },
    {
      entity: 'decisionVersions',
      businessKey: 'dec-001-v1',
      amount: 120000,
      status: 'validated',
      foreignKeys: {
        allocationId: '22222222-2222-2222-2222-222222222222'
      }
    }
  ]
});

describe('reconcileBeforeAfter', () => {
  it('returns GO when cardinality and business controls are consistent', () => {
    const result = reconcileBeforeAfter(baseInput());

    expect(result.decision).toBe('GO');
    expect(result.anomalies).toHaveLength(0);
    expect(result.causes).toContain('Aucun ecart bloquant detecte');

    const report = renderReconciliationMarkdown(result);
    expect(report).toContain('Decision: **GO**');
  });

  it('returns NO_GO when critical mismatches are detected', () => {
    const input = baseInput();
    input.cardinalityTarget.allocations = 1;
    input.samplesTarget[0] = {
      entity: 'allocations',
      businessKey: 'alloc-001',
      amount: 100000,
      status: 'rejetee',
      foreignKeys: {
        exerciceId: '33333333-3333-3333-3333-333333333333'
      }
    };

    const result = reconcileBeforeAfter(input);

    expect(result.decision).toBe('NO_GO');
    expect(result.anomalyBySeverity.critical).toBeGreaterThan(0);
    expect(result.anomalies.some((item) => item.code === 'CARDINALITY_MISMATCH')).toBe(true);
    expect(result.anomalies.some((item) => item.code === 'AMOUNT_MISMATCH')).toBe(true);

    const csv = anomaliesToCsv(result.anomalies);
    expect(csv).toContain('CARDINALITY_MISMATCH');
    expect(csv).toContain('AMOUNT_MISMATCH');
  });

  it('returns NO_GO when amount exists on one side only', () => {
    const input = baseInput();
    input.samplesTarget[0] = {
      entity: 'allocations',
      businessKey: 'alloc-001',
      status: 'validee',
      foreignKeys: {
        exerciceId: '11111111-1111-1111-1111-111111111111'
      }
    };

    const result = reconcileBeforeAfter(input);

    expect(result.decision).toBe('NO_GO');
    expect(result.anomalies.some((item) => item.code === 'AMOUNT_MISMATCH')).toBe(true);
  });

  it('returns NO_GO when duplicate business keys are present in samples', () => {
    const input = baseInput();
    input.samplesTarget.push({
      entity: 'allocations',
      businessKey: 'alloc-001',
      amount: 120000,
      status: 'validee',
      foreignKeys: {
        exerciceId: '11111111-1111-1111-1111-111111111111'
      }
    });

    const result = reconcileBeforeAfter(input);

    expect(result.decision).toBe('NO_GO');
    expect(result.anomalies.some((item) => item.code === 'DUPLICATE_SAMPLE')).toBe(true);
  });

  it('throws when criticalEntities is empty', () => {
    const input = baseInput();
    input.criticalEntities = [];

    expect(() => reconcileBeforeAfter(input)).toThrow(
      'Invalid reconciliation input: criticalEntities must contain at least one entity'
    );
  });

  it('is deterministic for a same batch and same input payload', () => {
    const input = baseInput();

    const first = reconcileBeforeAfter(input);
    const second = reconcileBeforeAfter(input);

    expect(first.reproducibilityHash).toEqual(second.reproducibilityHash);
    expect(first.decision).toEqual(second.decision);
    expect(first.anomalies).toEqual(second.anomalies);
  });
});
