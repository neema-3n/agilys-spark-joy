export const CASH_RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type CashRiskLevel = (typeof CASH_RISK_LEVELS)[number];

export const CASH_RISK_DECISIONS = ['allow', 'block'] as const;
export type CashRiskDecisionValue = (typeof CASH_RISK_DECISIONS)[number];

export const CASH_RISK_TRANSITIONS = [
  'engagement:create',
  'engagement:validate',
  'paiement:execute',
  'paiement:reprendre',
  'depense:ordonnancer',
] as const;
export type CashRiskTransition = (typeof CASH_RISK_TRANSITIONS)[number];

export interface CashRiskSnapshot {
  transition: CashRiskTransition;
  availableCash: number;
  projectedExposure: number;
  projectedGap: number;
  remainingEngagements: number;
  outstandingDepenses: number;
  nonReconciledOperations: number;
}

export interface CashRiskDecision {
  riskLevel: CashRiskLevel;
  riskScore: number;
  decision: CashRiskDecisionValue;
  reasons: string[];
  snapshot: CashRiskSnapshot;
}
