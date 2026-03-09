export const OFFLINE_SYNC_STATUSES = ['queued', 'syncing', 'synced', 'failed', 'conflict'] as const;
export type OfflineSyncStatus = (typeof OFFLINE_SYNC_STATUSES)[number];

export const OFFLINE_SYNC_CONFLICT_CODES = [
  'stale_version',
  'forbidden_transition',
  'missing_dependency',
  'cross_tenant_scope',
] as const;
export type OfflineSyncConflictCode = (typeof OFFLINE_SYNC_CONFLICT_CODES)[number];

export interface OfflineSyncItemView {
  id: string;
  tenantId: string;
  exerciceId: string;
  localId: string;
  operationType: string;
  entityType: string;
  entityId: string;
  idempotencyKey: string;
  correlationId: string;
  payload: Record<string, unknown>;
  status: OfflineSyncStatus;
  conflictCode?: OfflineSyncConflictCode;
  conflictMessage?: string;
  retryCount: number;
  maxRetries: number;
  queuedAt: string;
  lastAttemptAt?: string;
  syncedAt?: string;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSyncSupervisionResult {
  items: OfflineSyncItemView[];
  metrics: {
    queued: number;
    syncing: number;
    synced: number;
    failed: number;
    conflict: number;
    averageRecoveryMs: number;
    p95RecoveryMs: number;
  };
  counters: {
    retries: number;
    conflicts: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
