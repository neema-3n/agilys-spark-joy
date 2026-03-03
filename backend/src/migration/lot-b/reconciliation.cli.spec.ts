import { parseInputPayload } from './reconciliation.cli';

describe('parseInputPayload', () => {
  it('rejects payloads with missing required arrays', () => {
    expect(() =>
      parseInputPayload(
        {
          cardinalitySource: {},
          cardinalityTarget: {},
          samplesSource: [],
          samplesTarget: []
        },
        'lot-b-client-demo-20260303150000-abcd1234'
      )
    ).toThrow('Invalid reconciliation input: criticalEntities must be a non-empty array');
  });

  it('rejects payloads with invalid cardinality object', () => {
    expect(() =>
      parseInputPayload(
        {
          criticalEntities: ['allocations'],
          cardinalitySource: [],
          cardinalityTarget: { allocations: 1 },
          samplesSource: [],
          samplesTarget: []
        },
        'lot-b-client-demo-20260303150000-abcd1234'
      )
    ).toThrow('Invalid reconciliation input: cardinalitySource must be an object');
  });

  it('rejects criticalEntities entries that are not non-empty strings', () => {
    expect(() =>
      parseInputPayload(
        {
          criticalEntities: ['allocations', 12],
          cardinalitySource: { allocations: 1 },
          cardinalityTarget: { allocations: 1 },
          samplesSource: [],
          samplesTarget: []
        },
        'lot-b-client-demo-20260303150000-abcd1234'
      )
    ).toThrow('Invalid reconciliation input: criticalEntities[1] must be a non-empty string');
  });

  it('rejects invalid threshold values', () => {
    expect(() =>
      parseInputPayload(
        {
          criticalEntities: ['allocations'],
          cardinalitySource: { allocations: 1 },
          cardinalityTarget: { allocations: 1 },
          samplesSource: [],
          samplesTarget: [],
          thresholds: {
            maxHighAnomalies: -1
          }
        },
        'lot-b-client-demo-20260303150000-abcd1234'
      )
    ).toThrow('Invalid reconciliation input: thresholds.maxHighAnomalies must be a finite non-negative number');
  });

  it('rejects malformed sample rows', () => {
    expect(() =>
      parseInputPayload(
        {
          criticalEntities: ['allocations'],
          cardinalitySource: { allocations: 1 },
          cardinalityTarget: { allocations: 1 },
          samplesSource: [
            {
              entity: 'allocations',
              businessKey: '',
              amount: 100
            }
          ],
          samplesTarget: []
        },
        'lot-b-client-demo-20260303150000-abcd1234'
      )
    ).toThrow('Invalid reconciliation input: samplesSource[0].businessKey must be a non-empty string');
  });

  it('parses a valid payload with strict typing', () => {
    const input = parseInputPayload(
      {
        criticalEntities: ['allocations'],
        cardinalitySource: { allocations: 1 },
        cardinalityTarget: { allocations: 1 },
        samplesSource: [
          {
            entity: 'allocations',
            businessKey: 'alloc-001',
            amount: 100,
            status: 'validee',
            foreignKeys: { exerciceId: '111' }
          }
        ],
        samplesTarget: [
          {
            entity: 'allocations',
            businessKey: 'alloc-001',
            amount: 100,
            status: 'validee',
            foreignKeys: { exerciceId: '111' }
          }
        ],
        thresholds: {
          maxAmountDelta: 0
        }
      },
      'lot-b-client-demo-20260303150000-abcd1234'
    );

    expect(input.criticalEntities).toEqual(['allocations']);
    expect(input.samplesSource[0].businessKey).toBe('alloc-001');
  });
});
