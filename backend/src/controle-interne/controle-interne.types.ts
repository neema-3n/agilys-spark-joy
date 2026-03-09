export const INTERNAL_CONTROL_PLAN_PRIORITIES = ['basse', 'moyenne', 'haute', 'critique'] as const;
export type InternalControlPlanPriority = (typeof INTERNAL_CONTROL_PLAN_PRIORITIES)[number];

export const INTERNAL_CONTROL_PLAN_STATUSES = [
  'a_traiter',
  'en_cours',
  'resolu',
  'rejete',
  'cloture',
] as const;
export type InternalControlPlanStatus = (typeof INTERNAL_CONTROL_PLAN_STATUSES)[number];

export interface InternalControlActionPlanView {
  id: string;
  tenantId: string;
  exerciceId: string;
  title: string;
  description?: string;
  ownerUserId: string;
  dueDate: string;
  priority: InternalControlPlanPriority;
  status: InternalControlPlanStatus;
  sourceType: string;
  sourceId: string;
  entityId?: string;
  exceptionId?: string;
  correlationId?: string;
  evidenceRefs: string[];
  rejectionReason?: string;
  resolutionNote?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InternalControlActionPlanEventView {
  id: string;
  actionPlanId: string;
  tenantId: string;
  exerciceId: string;
  eventType: 'created' | 'updated' | 'status_changed';
  changedBy: string;
  reason?: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
