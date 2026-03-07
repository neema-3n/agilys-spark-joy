import type { CashRiskDecision, CashRiskTransition } from '@/types/cash-risk.types';

export type WorkflowExceptionStatus = 'soumise' | 'approuvee' | 'rejetee' | 'expiree' | 'consommee';
export type WorkflowExceptionUrgence = 'faible' | 'normale' | 'haute' | 'critique';
export type WorkflowExceptionVoteDecision = 'approuver' | 'rejeter';

export interface WorkflowExceptionVote {
  id: string;
  actorUserId: string;
  actorRoles: string[];
  decision: WorkflowExceptionVoteDecision;
  commentaire?: string;
  createdAt: string;
}

export interface WorkflowExceptionEvent {
  id: string;
  actorUserId: string;
  actorRoles: string[];
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowException {
  id: string;
  tenantId: string;
  exerciceId: string;
  status: WorkflowExceptionStatus;
  transition: CashRiskTransition;
  sourceType: 'engagement' | 'paiement' | 'depense';
  sourceId?: string;
  entityId?: string;
  correlationId: string;
  motif: string;
  justification: string;
  urgence: WorkflowExceptionUrgence;
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
  votes: WorkflowExceptionVote[];
  events: WorkflowExceptionEvent[];
}

export interface CreateWorkflowExceptionInput {
  exerciceId: string;
  transition: CashRiskTransition;
  sourceType: 'engagement' | 'paiement' | 'depense';
  sourceId?: string;
  entityId?: string;
  amount: number;
  motif: string;
  justification: string;
  urgence: WorkflowExceptionUrgence;
  expiresAt: string;
  correlationId?: string;
}

export interface VoteWorkflowExceptionInput {
  exerciceId: string;
  decision: WorkflowExceptionVoteDecision;
  commentaire?: string;
}
