import type { OfflineSyncItem, OfflineSyncStatus, SyncOfflineItemRequest } from '@/types/offline-sync.types';

const STORAGE_PREFIX = 'agilys.offlineSync.queue';
const STORAGE_SCHEMA_VERSION = 1;

interface PersistedQueue {
  version: number;
  items: OfflineSyncItem[];
}

const toIsoNow = () => new Date().toISOString();

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const buildStorageKey = (tenantId: string, exerciceId: string): string =>
  `${STORAGE_PREFIX}:${tenantId}:${exerciceId}`;

const parsePersistedQueue = (raw: string | null): PersistedQueue => {
  if (!raw) {
    return { version: STORAGE_SCHEMA_VERSION, items: [] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedQueue>;
    const version = typeof parsed.version === 'number' ? parsed.version : 0;
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    if (version < STORAGE_SCHEMA_VERSION) {
      return {
        version: STORAGE_SCHEMA_VERSION,
        items: items.map((item) => ({
          ...item,
          maxRetries: typeof item.maxRetries === 'number' ? item.maxRetries : 5,
          retryCount: typeof item.retryCount === 'number' ? item.retryCount : 0,
          status: (item.status as OfflineSyncStatus) ?? 'queued',
        })) as OfflineSyncItem[],
      };
    }

    return { version, items: items as OfflineSyncItem[] };
  } catch {
    return { version: STORAGE_SCHEMA_VERSION, items: [] };
  }
};

const savePersistedQueue = (tenantId: string, exerciceId: string, queue: PersistedQueue): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(buildStorageKey(tenantId, exerciceId), JSON.stringify(queue));
};

export const offlineSyncQueue = {
  list(tenantId: string, exerciceId: string): OfflineSyncItem[] {
    const storage = getStorage();
    if (!storage) {
      return [];
    }

    const queue = parsePersistedQueue(storage.getItem(buildStorageKey(tenantId, exerciceId)));
    return [...queue.items].sort((a, b) => {
      if (a.entityType !== b.entityType) {
        return a.entityType.localeCompare(b.entityType);
      }
      if (a.entityId !== b.entityId) {
        return a.entityId.localeCompare(b.entityId);
      }
      return new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime();
    });
  },

  enqueue(input: SyncOfflineItemRequest): OfflineSyncItem {
    const queue = this.list(input.tenantId, input.exerciceId);
    const existing = queue.find(
      (item) =>
        item.localId === input.localId &&
        item.operationType === input.operationType &&
        item.exerciceId === input.exerciceId &&
        item.tenantId === input.tenantId
    );

    if (existing) {
      return existing;
    }

    const nextItem: OfflineSyncItem = {
      localId: input.localId,
      operationType: input.operationType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload,
      correlationId: input.correlationId,
      tenantId: input.tenantId,
      exerciceId: input.exerciceId,
      queuedAt: input.queuedAt ?? toIsoNow(),
      retryCount: input.retryCount ?? 0,
      maxRetries: 5,
      status: 'queued',
    };

    savePersistedQueue(input.tenantId, input.exerciceId, {
      version: STORAGE_SCHEMA_VERSION,
      items: [...queue, nextItem],
    });

    return nextItem;
  },

  updateStatus(
    tenantId: string,
    exerciceId: string,
    localId: string,
    status: OfflineSyncStatus,
    extra?: Pick<OfflineSyncItem, 'lastAttemptAt' | 'syncedAt' | 'retryCount' | 'conflictCode' | 'conflictMessage'>
  ): void {
    const queue = this.list(tenantId, exerciceId).map((item) => {
      if (item.localId !== localId) {
        return item;
      }

      return {
        ...item,
        status,
        lastAttemptAt: extra?.lastAttemptAt ?? item.lastAttemptAt,
        syncedAt: extra?.syncedAt ?? item.syncedAt,
        retryCount: extra?.retryCount ?? item.retryCount,
        conflictCode: extra?.conflictCode,
        conflictMessage: extra?.conflictMessage,
      };
    });

    savePersistedQueue(tenantId, exerciceId, {
      version: STORAGE_SCHEMA_VERSION,
      items: queue,
    });
  },

  pruneSynced(tenantId: string, exerciceId: string): void {
    const queue = this.list(tenantId, exerciceId).filter((item) => item.status !== 'synced');

    savePersistedQueue(tenantId, exerciceId, {
      version: STORAGE_SCHEMA_VERSION,
      items: queue,
    });
  },
};
