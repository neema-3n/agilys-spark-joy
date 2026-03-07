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

export interface CashRiskInput {
  exerciceId: string;
  transition: CashRiskTransition;
  sourceType: 'engagement' | 'paiement' | 'depense';
  sourceId?: string;
  amount: number;
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface CashRiskSnapshot {
  tenantId: string;
  exerciceId: string;
  transition: CashRiskTransition;
  sourceType: CashRiskInput['sourceType'];
  sourceId?: string;
  entityId?: string;
  projectedAmount: number;
  availableCash: number;
  outstandingDepenses: number;
  remainingEngagements: number;
  projectedExposure: number;
  projectedGap: number;
  nonReconciledOperations: number;
  threshold: number;
  correlationId: string;
}

export interface CashRiskDecision {
  riskLevel: CashRiskLevel;
  riskScore: number;
  decision: CashRiskDecisionValue;
  reasons: string[];
  snapshot: CashRiskSnapshot;
}
