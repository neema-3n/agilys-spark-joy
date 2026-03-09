export const INTEGRATION_EVENT_DIRECTIONS = ['outgoing', 'incoming'] as const;
export type IntegrationEventDirection = (typeof INTEGRATION_EVENT_DIRECTIONS)[number];

export const INTEGRATION_EVENT_STATUSES = [
  'queued',
  'sent',
  'acked',
  'received',
  'processed',
  'failed',
  'dead_letter',
  'replayed',
] as const;
export type IntegrationEventStatus = (typeof INTEGRATION_EVENT_STATUSES)[number];

export const INTEGRATION_EVENT_SEVERITIES = ['info', 'warning', 'error', 'critical'] as const;
export type IntegrationEventSeverity = (typeof INTEGRATION_EVENT_SEVERITIES)[number];

export interface IntegrationCanonicalEvent {
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

export interface IntegrationEventAttemptView {
  id: string;
  eventId: string;
  attemptNumber: number;
  action: 'dispatch' | 'ingest' | 'manual-retry';
  status: IntegrationEventStatus | 'duplicate';
  reasonCode?: string;
  reasonMessage?: string;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export interface IntegrationEventView {
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
