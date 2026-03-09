export type IntegrationEventDirection = 'outgoing' | 'incoming';
export type IntegrationEventStatus =
  | 'queued'
  | 'sent'
  | 'acked'
  | 'received'
  | 'processed'
  | 'failed'
  | 'dead_letter'
  | 'replayed';

export type IntegrationEventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface IntegrationCanonicalEventPayload {
  eventType: string;
  correlationId: string;
  tenantId: string;
  exerciceId: string;
  sourceType: string;
  sourceId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  schemaVersion: string;
}

export interface IntegrationEvent {
  id: string;
  direction: IntegrationEventDirection;
  status: IntegrationEventStatus;
  severity: IntegrationEventSeverity;
  tenantId: string;
  exerciceId: string;
  eventType: string;
  correlationId: string;
  sourceType: string;
  sourceId: string;
  payload: Record<string, unknown>;
  schemaVersion: string;
  occurredAt: string;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: string;
  deadLetteredAt?: string;
  reasonCode?: string;
  reasonMessage?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationSupervisionFilters {
  status?: IntegrationEventStatus;
  severity?: IntegrationEventSeverity;
  correlationId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedIntegrationEvents {
  items: IntegrationEvent[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
