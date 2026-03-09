import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { OfflineSyncService } from './offline-sync.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['admin_client'],
};

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> =>
  ({ rows, rowCount, command: 'SELECT', oid: 0, fields: [] }) as QueryResult<T>;

const scopeRow = { id: '11111111-1111-1111-1111-111111111111' };

const makeOfflineRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'offline-1',
  tenant_id: actor.tenantId,
  exercice_id: '11111111-1111-1111-1111-111111111111',
  local_id: 'loc-1',
  operation_type: 'depense.create',
  entity_type: 'depense',
  entity_id: 'dep-1',
  idempotency_key: 'tenant-1:11111111-1111-1111-1111-111111111111:loc-1:depense.create',
  correlation_id: 'corr-1',
  payload: {},
  status: 'queued',
  conflict_code: null,
  conflict_message: null,
  retry_count: 0,
  max_retries: 5,
  queued_at: '2026-03-09T10:00:00.000Z',
  last_attempt_at: null,
  synced_at: null,
  next_retry_at: null,
  created_at: '2026-03-09T10:00:00.000Z',
  updated_at: '2026-03-09T10:00:00.000Z',
  ...overrides,
});

describe('OfflineSyncService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new OfflineSyncService(postgresService);

  beforeEach(() => {
    query.mockReset();
    query.mockImplementation(async () => makeResult([]));
  });

  it('synchronise nominalement un item en statut synced', async () => {
    query
      .mockResolvedValueOnce(makeResult([scopeRow]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([makeOfflineRow()]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([makeOfflineRow({ status: 'syncing', last_attempt_at: '2026-03-09T10:01:00.000Z' })]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([makeOfflineRow({ status: 'synced', synced_at: '2026-03-09T10:02:00.000Z' })]))
      .mockResolvedValueOnce(makeResult([]));

    const result = await service.syncItem(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      tenantId: actor.tenantId,
      localId: 'loc-1',
      operationType: 'depense.create',
      entityType: 'depense',
      entityId: 'dep-1',
      correlationId: 'corr-1',
      payload: {},
    });

    expect(result.idempotent).toBe(false);
    expect(result.item.status).toBe('synced');
  });

  it('retourne idempotent=true quand la cle existe deja', async () => {
    query
      .mockResolvedValueOnce(makeResult([scopeRow]))
      .mockResolvedValueOnce(makeResult([makeOfflineRow({ status: 'synced' })]));

    const result = await service.syncItem(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      tenantId: actor.tenantId,
      localId: 'loc-1',
      operationType: 'depense.create',
      entityType: 'depense',
      entityId: 'dep-1',
      correlationId: 'corr-1',
      payload: {},
    });

    expect(result.idempotent).toBe(true);
    expect(result.item.status).toBe('synced');
  });

  it('qualifie un conflit stale_version', async () => {
    query
      .mockResolvedValueOnce(makeResult([scopeRow]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([makeOfflineRow()]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([makeOfflineRow({ status: 'syncing' })]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(
        makeResult([
          makeOfflineRow({
            status: 'conflict',
            conflict_code: 'stale_version',
            conflict_message: 'Conflit de version: la version locale est obsolète, rechargez avant relance.',
            retry_count: 1,
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([]));

    const result = await service.syncItem(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      tenantId: actor.tenantId,
      localId: 'loc-1',
      operationType: 'depense.create',
      entityType: 'depense',
      entityId: 'dep-1',
      correlationId: 'corr-1',
      payload: { staleVersion: true },
    });

    expect(result.item.status).toBe('conflict');
    expect(result.item.conflictCode).toBe('stale_version');
  });

  it('place en failed et propose un retry si erreur reseau simulee', async () => {
    query
      .mockResolvedValueOnce(makeResult([scopeRow]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([makeOfflineRow()]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([makeOfflineRow({ status: 'syncing' })]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(
        makeResult([
          makeOfflineRow({
            status: 'failed',
            retry_count: 1,
            conflict_message: 'Synchronisation impossible: erreur réseau simulée côté backend. Relancez après stabilisation.',
            next_retry_at: '2026-03-09T10:05:00.000Z',
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([]));

    const result = await service.syncItem(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      tenantId: actor.tenantId,
      localId: 'loc-1',
      operationType: 'depense.create',
      entityType: 'depense',
      entityId: 'dep-1',
      correlationId: 'corr-1',
      payload: { simulateNetworkFailure: true },
    });

    expect(result.item.status).toBe('failed');
    expect(result.item.nextRetryAt).toBeTruthy();
  });

  it('retry manuel echoue pour un item introuvable', async () => {
    query.mockResolvedValueOnce(makeResult([scopeRow])).mockResolvedValueOnce(makeResult([]));

    await expect(
      service.retry(actor, 'missing-id', {
        exerciceId: '11111111-1111-1111-1111-111111111111',
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejette un exercice hors scope tenant', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await expect(
      service.syncItem(actor, {
        exerciceId: '99999999-9999-9999-9999-999999999999',
        tenantId: actor.tenantId,
        localId: 'loc-1',
        operationType: 'depense.create',
        entityType: 'depense',
        entityId: 'dep-1',
        correlationId: 'corr-1',
        payload: {},
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
