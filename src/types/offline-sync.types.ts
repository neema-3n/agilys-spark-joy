export type OfflineSyncStatus = 'queued' | 'syncing' | 'synced' | 'failed' | 'conflict';

export type OfflineSyncConflictCode =
  | 'stale_version'
  | 'forbidden_transition'
  | 'missing_dependency'
  | 'cross_tenant_scope';

export interface OfflineSyncItem {
  localId: string;
  operationType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  correlationId: string;
  tenantId: string;
  exerciceId: string;
  queuedAt: string;
  lastAttemptAt?: string;
  syncedAt?: string;
  retryCount: number;
  maxRetries: number;
  status: OfflineSyncStatus;
  conflictCode?: OfflineSyncConflictCode;
  conflictMessage?: string;
}

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

export interface SyncOfflineItemRequest {
  exerciceId: string;
  tenantId: string;
  localId: string;
  operationType: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  queuedAt?: string;
  retryCount?: number;
  payload: Record<string, unknown>;
}
