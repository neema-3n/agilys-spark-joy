import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import type { IntegrationLegacyTransport } from './integration-legacy.transport';
import { IntegrationLegacyService } from './integration-legacy.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['admin_client'],
};

const makeScopeRow = () => ({ id: '11111111-1111-1111-1111-111111111111' });

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> =>
  ({
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: [],
  }) as QueryResult<T>;

const makeEventRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  tenant_id: actor.tenantId,
  exercice_id: '11111111-1111-1111-1111-111111111111',
  direction: 'outgoing',
  event_type: 'paiement.executed',
  correlation_id: 'corr-1',
  source_type: 'paiement',
  source_id: 'pay-1',
  payload: { amount: 1200 },
  schema_version: '1.0.0',
  status: 'queued',
  severity: 'info',
  priority: 'P3',
  treatment_status: 'open',
  reason_code: null,
  reason_message: null,
  owner: null,
  detected_at: '2026-03-09T10:00:00.000Z',
  resolved_at: null,
  attempt_count: 0,
  max_attempts: 5,
  next_retry_at: null,
  dead_lettered_at: null,
  occurred_at: '2026-03-09T10:00:00.000Z',
  created_by: actor.sub,
  updated_by: actor.sub,
  created_at: '2026-03-09T10:00:00.000Z',
  updated_at: '2026-03-09T10:00:00.000Z',
  ...overrides,
});

describe('IntegrationLegacyService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const transport = { send: jest.fn() } as unknown as IntegrationLegacyTransport;
  const service = new IntegrationLegacyService(postgresService, transport);

  beforeEach(() => {
    query.mockReset();
    query.mockImplementation(async () => makeResult([]));
    (transport.send as jest.Mock).mockReset();
  });

  it('place un événement sortant en outbox avec correlationId', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeScopeRow()]))
      .mockResolvedValueOnce(makeResult([makeEventRow()]))
      .mockResolvedValueOnce(makeResult([]));

    const created = await service.createOutgoing(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      eventType: 'paiement.executed',
      sourceType: 'paiement',
      sourceId: 'pay-1',
      payload: { amount: 1200 },
      occurredAt: '2026-03-09T10:00:00.000Z',
    });

    expect(created.status).toBe('queued');
    expect(created.correlationId).toBeTruthy();
  });

  it('dispatch nominal: queued -> acked', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeScopeRow()]))
      .mockResolvedValueOnce(makeResult([makeEventRow()]))
      .mockResolvedValueOnce(makeResult([makeEventRow({ status: 'acked', attempt_count: 1 })]))
      .mockResolvedValueOnce(makeResult([]));
    (transport.send as jest.Mock).mockResolvedValue({ acked: true, code: 'ACK', message: 'ok' });

    const result = await service.dispatchQueued(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      limit: 10,
    });

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('dispatch échec: failed puis dead_letter après max attempts', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeScopeRow()]))
      .mockResolvedValueOnce(makeResult([makeEventRow({ attempt_count: 4, max_attempts: 5 })]))
      .mockResolvedValueOnce(makeResult([makeEventRow({ status: 'dead_letter', attempt_count: 5 })]))
      .mockResolvedValueOnce(makeResult([]));
    (transport.send as jest.Mock).mockResolvedValue({ acked: false, code: 'LEGACY_TIMEOUT', message: 'timeout' });

    const result = await service.dispatchQueued(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      limit: 10,
    });

    expect(result.deadLettered).toBe(1);
  });

  it('ingestion idempotente: second message marqué duplicate', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeScopeRow()]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([makeEventRow({ direction: 'incoming', status: 'processed', attempt_count: 1 })]))
      .mockResolvedValueOnce(makeResult([]));

    const consumed = await service.consumeIncoming(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      eventType: 'legacy.ack',
      sourceType: 'paiement',
      sourceId: 'pay-1',
      payload: { ack: true },
      occurredAt: '2026-03-09T10:00:00.000Z',
      correlationId: 'corr-ack-1',
    });

    expect(consumed.idempotent).toBe(true);
    expect(consumed.event.status).toBe('processed');
  });

  it('retry manuel rejette un statut non retryable', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeScopeRow()]))
      .mockResolvedValueOnce(makeResult([makeEventRow({ status: 'processed', direction: 'incoming' })]));

    await expect(
      service.retryEvent(actor, 'evt-1', {
        exerciceId: '11111111-1111-1111-1111-111111111111',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('retry manuel échoue si event absent dans le tenant/exercice', async () => {
    query.mockResolvedValueOnce(makeResult([makeScopeRow()])).mockResolvedValueOnce(makeResult([]));

    await expect(
      service.retryEvent(actor, 'evt-missing', {
        exerciceId: '11111111-1111-1111-1111-111111111111',
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remediation escalate met à jour priorité/statut de traitement', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeScopeRow()]))
      .mockResolvedValueOnce(
        makeResult([
          makeEventRow({
            status: 'failed',
            treatment_status: 'open',
            priority: 'P3',
          }),
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          makeEventRow({
            status: 'failed',
            treatment_status: 'triaged',
            priority: 'P1',
            reason_code: 'MANUAL_ESCALATION',
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([]));

    const result = await service.remediateEvent(actor, 'evt-1', {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      action: 'escalate',
      reasonMessage: 'Escalade support N2',
    });

    expect(result.event.priority).toBe('P1');
    expect(result.event.treatmentStatus).toBe('triaged');
  });

  it('supervision expose items paginés et compteurs', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeScopeRow()]))
      .mockResolvedValueOnce(
        makeResult([
          makeEventRow({
            status: 'failed',
            priority: 'P1',
            treatment_status: 'triaged',
            total_count: 2,
          }),
          makeEventRow({
            id: 'evt-2',
            status: 'dead_letter',
            priority: 'P2',
            treatment_status: 'open',
            total_count: 2,
          }),
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          { status: 'failed', priority: 'P1', total: '1' },
          { status: 'dead_letter', priority: 'P2', total: '1' },
        ])
      );

    const result = await service.getSupervision(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      page: 1,
      pageSize: 20,
    });

    expect(result.items).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.counters.byStatus.failed).toBe(1);
    expect(result.counters.byPriority.P1).toBe(1);
  });

  it('supervision calcule un risque de reprise pour divergence non résolue', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeScopeRow()]))
      .mockResolvedValueOnce(
        makeResult([
          makeEventRow({
            status: 'failed',
            priority: 'P1',
            treatment_status: 'in_progress',
            detected_at: '2026-03-09T09:30:00.000Z',
            resolved_at: null,
            total_count: 1,
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([{ status: 'failed', priority: 'P1', total: '1' }]));

    const result = await service.getSupervision(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      page: 1,
      pageSize: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.recoveryDelayMs).toBeDefined();
    expect(result.items[0]?.atRiskSla).toBe('breach');
  });

  it("rejette l'utilisation d'un exercice hors tenant", async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await expect(
      service.createOutgoing(actor, {
        exerciceId: '99999999-9999-9999-9999-999999999999',
        eventType: 'paiement.executed',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        payload: { amount: 1200 },
        occurredAt: '2026-03-09T10:00:00.000Z',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('réouverture remediation nettoie resolvedAt', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeScopeRow()]))
      .mockResolvedValueOnce(
        makeResult([
          makeEventRow({
            status: 'failed',
            treatment_status: 'resolved',
            resolved_at: '2026-03-09T10:15:00.000Z',
          }),
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          makeEventRow({
            status: 'failed',
            treatment_status: 'triaged',
            resolved_at: null,
            reason_code: 'MANUAL_ESCALATION',
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([]));

    const result = await service.remediateEvent(actor, 'evt-1', {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      action: 'escalate',
      treatmentStatus: 'triaged',
    });

    expect(result.event.treatmentStatus).toBe('triaged');
    expect(result.event.resolvedAt).toBeUndefined();
  });

  it('ingestion entrante: journalise failed en cas erreur de traitement', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeScopeRow()]))
      .mockResolvedValueOnce(
        makeResult([
          makeEventRow({
            direction: 'incoming',
            status: 'received',
            payload: { forceIncomingFailure: true },
          }),
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          makeEventRow({
            direction: 'incoming',
            status: 'failed',
            severity: 'error',
            attempt_count: 1,
            reason_code: 'INCOMING_PROCESSING_FAILED',
            reason_message: 'Traitement entrant simulé en échec.',
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([]));

    const consumed = await service.consumeIncoming(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      eventType: 'legacy.rejet',
      sourceType: 'paiement',
      sourceId: 'pay-1',
      payload: { forceIncomingFailure: true },
      occurredAt: '2026-03-09T10:00:00.000Z',
      correlationId: 'corr-ack-fail-1',
    });

    expect(consumed.idempotent).toBe(false);
    expect(consumed.event.status).toBe('failed');
    expect(consumed.event.reasonCode).toBe('INCOMING_PROCESSING_FAILED');
  });
});
