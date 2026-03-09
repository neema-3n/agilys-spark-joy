import { expect, test } from '@playwright/test';
import { offlineSyncQueue } from '../src/services/offline/offline-sync-queue';
import { offlineSyncService } from '../src/services/api/offline-sync.service';
import { httpClient } from '../src/services/api/http-client';

class MockStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

test.describe('offline sync queue + api client', () => {
  test('persiste une file locale et met a jour les statuts', async () => {
    const originalWindow = (globalThis as { window?: unknown }).window;
    const localStorage = new MockStorage();

    Object.defineProperty(globalThis, 'window', {
      value: { localStorage },
      configurable: true,
    });

    try {
      const item = offlineSyncQueue.enqueue({
        exerciceId: '11111111-1111-1111-1111-111111111111',
        tenantId: 'tenant-1',
        localId: 'loc-1',
        operationType: 'depense.create',
        entityType: 'depense',
        entityId: 'dep-1',
        correlationId: 'corr-1',
        payload: { montant: 1000 },
      });

      expect(item.status).toBe('queued');
      expect(offlineSyncQueue.list('tenant-1', '11111111-1111-1111-1111-111111111111')).toHaveLength(1);

      offlineSyncQueue.updateStatus('tenant-1', '11111111-1111-1111-1111-111111111111', 'loc-1', 'syncing', {
        lastAttemptAt: '2026-03-09T12:00:00.000Z',
      });
      expect(offlineSyncQueue.list('tenant-1', '11111111-1111-1111-1111-111111111111')[0]?.status).toBe('syncing');

      offlineSyncQueue.updateStatus('tenant-1', '11111111-1111-1111-1111-111111111111', 'loc-1', 'synced', {
        syncedAt: '2026-03-09T12:01:00.000Z',
      });
      expect(offlineSyncQueue.list('tenant-1', '11111111-1111-1111-1111-111111111111')[0]?.status).toBe('synced');

      offlineSyncQueue.pruneSynced('tenant-1', '11111111-1111-1111-1111-111111111111');
      expect(offlineSyncQueue.list('tenant-1', '11111111-1111-1111-1111-111111111111')).toHaveLength(0);
    } finally {
      if (originalWindow === undefined) {
        Reflect.deleteProperty(globalThis, 'window');
      } else {
        Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
      }
    }
  });

  test('service offline-sync appelle les endpoints API unifies', async () => {
    const originalRequest = httpClient.request;
    const seenPaths: string[] = [];

    httpClient.request = (async (path: string) => {
      seenPaths.push(path);

      if (path.startsWith('/offline-sync/items/') && path.endsWith('/retry')) {
        return new Response(
          JSON.stringify({
            id: 'evt-1',
            tenantId: 'tenant-1',
            exerciceId: '11111111-1111-1111-1111-111111111111',
            localId: 'loc-1',
            operationType: 'depense.create',
            entityType: 'depense',
            entityId: 'dep-1',
            idempotencyKey: 'tenant-1:11111111-1111-1111-1111-111111111111:loc-1:depense.create',
            correlationId: 'corr-1',
            payload: {},
            status: 'synced',
            retryCount: 1,
            maxRetries: 5,
            queuedAt: '2026-03-09T10:00:00.000Z',
            syncedAt: '2026-03-09T10:02:00.000Z',
            createdAt: '2026-03-09T10:00:00.000Z',
            updatedAt: '2026-03-09T10:02:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (path.startsWith('/offline-sync/supervision')) {
        return new Response(
          JSON.stringify({
            items: [],
            metrics: {
              queued: 0,
              syncing: 0,
              synced: 1,
              failed: 0,
              conflict: 0,
              averageRecoveryMs: 1000,
              p95RecoveryMs: 1000,
            },
            counters: { retries: 1, conflicts: 0 },
            pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (path.startsWith('/offline-sync/health')) {
        return new Response(
          JSON.stringify({ status: 'ok', timestamp: '2026-03-09T10:00:00.000Z', exerciceId: '11111111-1111-1111-1111-111111111111' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          idempotent: false,
          item: {
            id: 'evt-1',
            tenantId: 'tenant-1',
            exerciceId: '11111111-1111-1111-1111-111111111111',
            localId: 'loc-1',
            operationType: 'depense.create',
            entityType: 'depense',
            entityId: 'dep-1',
            idempotencyKey: 'tenant-1:11111111-1111-1111-1111-111111111111:loc-1:depense.create',
            correlationId: 'corr-1',
            payload: {},
            status: 'synced',
            retryCount: 0,
            maxRetries: 5,
            queuedAt: '2026-03-09T10:00:00.000Z',
            syncedAt: '2026-03-09T10:01:00.000Z',
            createdAt: '2026-03-09T10:00:00.000Z',
            updatedAt: '2026-03-09T10:01:00.000Z',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof httpClient.request;

    try {
      const synced = await offlineSyncService.syncItem({
        exerciceId: '11111111-1111-1111-1111-111111111111',
        tenantId: 'tenant-1',
        localId: 'loc-1',
        operationType: 'depense.create',
        entityType: 'depense',
        entityId: 'dep-1',
        correlationId: 'corr-1',
        payload: {},
      });

      expect(synced.item.status).toBe('synced');
      await offlineSyncService.getSupervision('11111111-1111-1111-1111-111111111111');
      await offlineSyncService.retry('evt-1', {
        exerciceId: '11111111-1111-1111-1111-111111111111',
      });
      await offlineSyncService.health('11111111-1111-1111-1111-111111111111');

      expect(seenPaths.some((path) => path === '/offline-sync/items')).toBeTruthy();
      expect(seenPaths.some((path) => path.startsWith('/offline-sync/supervision?'))).toBeTruthy();
      expect(seenPaths.some((path) => path.endsWith('/retry'))).toBeTruthy();
      expect(seenPaths.some((path) => path.startsWith('/offline-sync/health?'))).toBeTruthy();
    } finally {
      httpClient.request = originalRequest;
    }
  });
});
