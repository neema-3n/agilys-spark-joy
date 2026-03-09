import type { TresorerieAlertSeverity } from './tresorerie.types';

export type InternalControlActionPlanPriority = 'basse' | 'moyenne' | 'haute' | 'critique';
export type InternalControlActionPlanStatus = 'a_traiter' | 'en_cours' | 'resolu' | 'rejete' | 'cloture';

export interface InternalControlWorkspace {
  exerciceId: string;
  generatedAt: string;
  roleStrategy: {
    requiredPermission: string;
    mappedRoles: string[];
    note: string;
  };
  summary: {
    openDiscrepancies: number;
    activeExceptions: number;
    overdueActionPlans: number;
    totalActionPlans: number;
  };
  controlItems: Array<{
    id: string;
    itemType: 'ecart' | 'exception';
    severity: TresorerieAlertSeverity;
    sourceType: string;
    sourceId: string;
    exceptionId?: string;
    correlationId?: string;
    label: string;
    message: string;
    status: string;
    createdAt: string;
  }>;
}

export interface InternalControlActionPlan {
  id: string;
  tenantId: string;
  exerciceId: string;
  title: string;
  description?: string;
  ownerUserId: string;
  dueDate: string;
  priority: InternalControlActionPlanPriority;
  status: InternalControlActionPlanStatus;
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

export interface InternalControlActionPlanList {
  items: InternalControlActionPlan[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface InternalControlActionPlanEvent {
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

export interface InternalControlActionPlanEventList {
  items: InternalControlActionPlanEvent[];
}

export interface CreateInternalControlActionPlanInput {
  exerciceId: string;
  title: string;
  description?: string;
  ownerUserId: string;
  dueDate: string;
  priority: InternalControlActionPlanPriority;
  status: InternalControlActionPlanStatus;
  sourceType: string;
  sourceId: string;
  entityId?: string;
  exceptionId?: string;
  correlationId?: string;
  evidenceRefs?: string[];
  rejectionReason?: string;
  resolutionNote?: string;
}

export interface UpdateInternalControlActionPlanInput {
  title?: string;
  description?: string;
  ownerUserId?: string;
  dueDate?: string;
  priority?: InternalControlActionPlanPriority;
  status?: InternalControlActionPlanStatus;
  evidenceRefs?: string[];
  rejectionReason?: string;
  resolutionNote?: string;
  reason?: string;
}
