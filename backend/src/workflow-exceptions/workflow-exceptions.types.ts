import type { CashRiskDecision, CashRiskInput, CashRiskTransition } from '../cash-risk/cash-risk.types';

export const WORKFLOW_EXCEPTION_STATUSES = ['soumise', 'approuvee', 'rejetee', 'expiree', 'consommee'] as const;
export type WorkflowExceptionStatus = (typeof WORKFLOW_EXCEPTION_STATUSES)[number];

export const WORKFLOW_EXCEPTION_URGENCIES = ['faible', 'normale', 'haute', 'critique'] as const;
export type WorkflowExceptionUrgency = (typeof WORKFLOW_EXCEPTION_URGENCIES)[number];

export const WORKFLOW_EXCEPTION_VOTE_DECISIONS = ['approuver', 'rejeter'] as const;
export type WorkflowExceptionVoteDecision = (typeof WORKFLOW_EXCEPTION_VOTE_DECISIONS)[number];

export interface WorkflowExceptionTransitionInput {
  exerciceId: string;
  transition: CashRiskTransition;
  sourceType: CashRiskInput['sourceType'];
  sourceId?: string;
  entityId?: string;
  amount: number;
}

export interface WorkflowExceptionVoteView {
  id: string;
  actorUserId: string;
  actorRoles: string[];
  decision: WorkflowExceptionVoteDecision;
  commentaire?: string;
  createdAt: string;
}

export interface WorkflowExceptionEventView {
  id: string;
  actorUserId: string;
  actorRoles: string[];
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowExceptionView {
  id: string;
  tenantId: string;
  exerciceId: string;
  status: WorkflowExceptionStatus;
  transition: CashRiskTransition;
  sourceType: CashRiskInput['sourceType'];
  sourceId?: string;
  entityId?: string;
  correlationId: string;
  motif: string;
  justification: string;
  urgence: WorkflowExceptionUrgency;
  quorumRequired: number;
  expiresAt: string;
  requestedBy: string;
  approvedAt?: string;
  decidedAt?: string;
  consumedAt?: string;
  consumedBy?: string;
  consumedTransition?: CashRiskTransition;
  createdAt: string;
  updatedAt: string;
  riskDecision: CashRiskDecision;
  votes: WorkflowExceptionVoteView[];
  events: WorkflowExceptionEventView[];
}
