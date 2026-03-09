import { requestJson } from '@/services/api/api-utils';
import type {
  OfflineSyncItemView,
  OfflineSyncSupervisionResult,
  SyncOfflineItemRequest,
} from '@/types/offline-sync.types';

interface RetryOfflineSyncRequest {
  exerciceId: string;
  reasonMessage?: string;
}

export const offlineSyncService = {
  syncItem(input: SyncOfflineItemRequest) {
    return requestJson<{ idempotent: boolean; item: OfflineSyncItemView }>(
      '/offline-sync/items',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      'Erreur lors de la synchronisation offline'
    );
  },

  getSupervision(exerciceId: string, filters?: { status?: string; correlationId?: string; page?: number; pageSize?: number }) {
    const params = new URLSearchParams({ exerciceId });

    if (filters?.status) {
      params.set('status', filters.status);
    }
    if (filters?.correlationId) {
      params.set('correlationId', filters.correlationId);
    }
    if (filters?.page) {
      params.set('page', String(filters.page));
    }
    if (filters?.pageSize) {
      params.set('pageSize', String(filters.pageSize));
    }

    return requestJson<OfflineSyncSupervisionResult>(
      `/offline-sync/supervision?${params.toString()}`,
      { method: 'GET' },
      'Erreur lors du chargement de la supervision offline'
    );
  },

  retry(id: string, input: RetryOfflineSyncRequest) {
    return requestJson<OfflineSyncItemView>(
      `/offline-sync/items/${encodeURIComponent(id)}/retry`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      'Erreur lors de la relance manuelle offline'
    );
  },

  health(exerciceId: string) {
    return requestJson<{ status: 'ok'; timestamp: string; exerciceId: string }>(
      `/offline-sync/health?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors du heartbeat offline'
    );
  },
};
