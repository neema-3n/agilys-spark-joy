import { CashRiskBlockedException } from './cash-risk-blocked.exception';
import type { CashRiskDecision } from './cash-risk.types';

describe('CashRiskBlockedException', () => {
  it('expose un payload stable et exploitable par le frontend', () => {
    const decision: CashRiskDecision = {
      riskLevel: 'critical',
      riskScore: 91.2,
      decision: 'block',
      reasons: ['Seuil de trésorerie dépassé.'],
      snapshot: {
        tenantId: 'tenant-1',
        exerciceId: 'ex-1',
        transition: 'engagement:create',
        sourceType: 'engagement',
        sourceId: 'eng-1',
        entityId: 'lb-1',
        projectedAmount: 500,
        availableCash: 100,
        outstandingDepenses: 2,
        remainingEngagements: 4,
        projectedExposure: 900,
        projectedGap: 800,
        nonReconciledOperations: 3,
        threshold: 0.75,
        correlationId: 'cash-risk:test',
      },
    };

    const exception = new CashRiskBlockedException(decision);
    const response = exception.getResponse() as Record<string, unknown>;

    expect(response.statusCode).toBe(400);
    expect(response.error).toBe('CashRiskBlocked');
    expect(response.code).toBe('CASH_RISK_BLOCKED');
    expect(response.message).toBe('Transition bloquée: Seuil de trésorerie dépassé.');
    expect(response.riskDecision).toEqual(decision);
  });
});
