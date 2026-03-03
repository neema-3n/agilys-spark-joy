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
    ).toThrow('Invalid reconciliation input: criticalEntities must be an array');
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
});
