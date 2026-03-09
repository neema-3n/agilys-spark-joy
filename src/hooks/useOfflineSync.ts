import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { isApiError } from '@/services/api/api-utils';
import { offlineSyncService } from '@/services/api/offline-sync.service';
import { offlineSyncQueue } from '@/services/offline/offline-sync-queue';
import type { OfflineSyncItem, OfflineSyncStatus } from '@/types/offline-sync.types';

interface OfflineSyncFilters {
  status?: OfflineSyncStatus;
  correlationId?: string;
  page?: number;
  pageSize?: number;
}

const useOfflineScope = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();

  return {
    exerciceId: currentExercice?.id,
    tenantId: currentClient?.id,
    enabled: Boolean(currentExercice?.id && currentClient?.id),
  };
};

const buildQueueKey = (tenantId: string, exerciceId: string) => `${tenantId}:${exerciceId}`;

const processOfflineQueue = async (tenantId: string, exerciceId: string): Promise<void> => {
  const items = offlineSyncQueue
    .list(tenantId, exerciceId)
    .filter((item) => (item.status === 'queued' || item.status === 'failed') && item.retryCount < item.maxRetries);

  for (const item of items) {
    offlineSyncQueue.updateStatus(tenantId, exerciceId, item.localId, 'syncing', {
      lastAttemptAt: new Date().toISOString(),
      retryCount: item.retryCount,
    });

    try {
      const result = await offlineSyncService.syncItem({
        exerciceId,
        tenantId,
        localId: item.localId,
        operationType: item.operationType,
        entityType: item.entityType,
        entityId: item.entityId,
        correlationId: item.correlationId,
        payload: item.payload,
        queuedAt: item.queuedAt,
        retryCount: item.retryCount,
      });

      if (result.item.status === 'synced') {
        offlineSyncQueue.updateStatus(tenantId, exerciceId, item.localId, 'synced', {
          lastAttemptAt: result.item.lastAttemptAt ?? new Date().toISOString(),
          syncedAt: result.item.syncedAt ?? new Date().toISOString(),
          retryCount: result.item.retryCount,
        });
      } else {
        offlineSyncQueue.updateStatus(tenantId, exerciceId, item.localId, result.item.status, {
          lastAttemptAt: result.item.lastAttemptAt ?? new Date().toISOString(),
          retryCount: result.item.retryCount,
          conflictCode: result.item.conflictCode,
          conflictMessage: result.item.conflictMessage,
        });
      }
    } catch (error) {
      const nextRetryCount = item.retryCount + 1;
      const message = isApiError(error)
        ? error.message
        : 'Synchronisation impossible: connectivité insuffisante. Relance automatique planifiée.';

      offlineSyncQueue.updateStatus(tenantId, exerciceId, item.localId, 'failed', {
        lastAttemptAt: new Date().toISOString(),
        retryCount: nextRetryCount,
        conflictMessage: message,
      });
    }
  }
};

export const useOfflineSyncSupervision = (filters: OfflineSyncFilters = {}) => {
  const scope = useOfflineScope();

  return useQuery({
    queryKey: ['offline-sync-supervision', scope.tenantId, scope.exerciceId, filters],
    queryFn: () => {
      if (!scope.exerciceId) {
        throw new Error('Exercice non défini');
      }

      return offlineSyncService.getSupervision(scope.exerciceId, filters);
    },
    enabled: scope.enabled,
    refetchInterval: 30_000,
  });
};

export const useOfflineSyncQueueItems = () => {
  const scope = useOfflineScope();
  const [items, setItems] = useState<OfflineSyncItem[]>([]);

  const queueKey = useMemo(
    () => (scope.tenantId && scope.exerciceId ? buildQueueKey(scope.tenantId, scope.exerciceId) : null),
    [scope.tenantId, scope.exerciceId]
  );

  useEffect(() => {
    if (!scope.tenantId || !scope.exerciceId || !queueKey) {
      setItems([]);
      return;
    }

    const refresh = () => {
      setItems(offlineSyncQueue.list(scope.tenantId!, scope.exerciceId!));
    };

    refresh();
    const timer = window.setInterval(refresh, 2_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [scope.tenantId, scope.exerciceId, queueKey]);

  return {
    items,
    pruneSynced: () => {
      if (!scope.tenantId || !scope.exerciceId) {
        return;
      }
      offlineSyncQueue.pruneSynced(scope.tenantId, scope.exerciceId);
      setItems(offlineSyncQueue.list(scope.tenantId, scope.exerciceId));
    },
  };
};

export const useRetryOfflineSyncItem = () => {
  const scope = useOfflineScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; reasonMessage?: string }) => {
      if (!scope.exerciceId) {
        throw new Error('Exercice non défini');
      }

      return offlineSyncService.retry(input.id, {
        exerciceId: scope.exerciceId,
        reasonMessage: input.reasonMessage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-sync-supervision'] });
    },
  });
};

export const useOfflineSyncRuntime = () => {
  const scope = useOfflineScope();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!scope.enabled || !scope.tenantId || !scope.exerciceId) {
      return;
    }

    let stopped = false;

    const runSync = async () => {
      if (stopped) {
        return;
      }

      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return;
        }

        await offlineSyncService.health(scope.exerciceId);
        await processOfflineQueue(scope.tenantId, scope.exerciceId);
        queryClient.invalidateQueries({ queryKey: ['offline-sync-supervision'] });
      } catch {
        // Pas de throw: la reprise automatique doit rester best-effort.
      }
    };

    const handleOnline = () => {
      void runSync();
    };

    const interval = window.setInterval(() => {
      void runSync();
    }, 30_000);

    window.addEventListener('online', handleOnline);
    void runSync();

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [scope.enabled, scope.tenantId, scope.exerciceId, queryClient]);
};
