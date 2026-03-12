import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { SchemaPrerequisiteColumn } from '../common/postgres.service';
import { PostgresService } from '../common/postgres.service';
import { hasConfiguredPostgresRuntime } from '../config/runtime-env';
import {
  ConsumeIncomingIntegrationEventDto,
  CreateOutgoingIntegrationEventDto,
  IntegrationDispatchQueryDto,
  ListIntegrationEventsQueryDto,
  RemediateIntegrationEventDto,
  RetryIntegrationEventDto,
} from './dto/integration-legacy.dto';
import { IntegrationLegacyTransport } from './integration-legacy.transport';
import type {
  IntegrationCanonicalEvent,
  IntegrationEventDirection,
  IntegrationEventPriority,
  IntegrationRemediationAction,
  IntegrationEventSeverity,
  IntegrationEventStatus,
  IntegrationTreatmentStatus,
  IntegrationEventView,
} from './integration-legacy.types';

interface IntegrationEventRow {
  id: string;
  tenant_id: string;
  exercice_id: string;
  direction: IntegrationEventDirection;
  event_type: string;
  correlation_id: string;
  source_type: string;
  source_id: string;
  payload: Record<string, unknown>;
  schema_version: string;
  status: IntegrationEventStatus;
  severity: IntegrationEventSeverity;
  priority: IntegrationEventPriority;
  treatment_status: IntegrationTreatmentStatus;
  reason_code: string | null;
  reason_message: string | null;
  owner: string | null;
  detected_at: string | Date | null;
  resolved_at: string | Date | null;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | Date | null;
  dead_lettered_at: string | Date | null;
  occurred_at: string | Date;
  created_by: string;
  updated_by: string;
  created_at: string | Date;
  updated_at: string | Date;
  total_count?: number;
}

interface IntegrationCounterRow {
  status: IntegrationEventStatus;
  priority: IntegrationEventPriority;
  total: string;
}

const INTEGRATION_REQUIRED_RELATIONS = [
  'public.integration_async_event_attempts',
  'public.integration_async_events',
] as const;

const INTEGRATION_REQUIRED_COLUMNS: readonly SchemaPrerequisiteColumn[] = [
  { table: 'public.integration_async_events', column: 'detected_at' },
  { table: 'public.integration_async_events', column: 'owner' },
  { table: 'public.integration_async_events', column: 'priority' },
  { table: 'public.integration_async_events', column: 'resolved_at' },
  { table: 'public.integration_async_events', column: 'treatment_status' },
] as const;

@Injectable()
export class IntegrationLegacyService implements OnModuleInit, OnModuleDestroy {
  private static readonly DISPATCH_WORKER_USER = 'integration-legacy-worker';
  private static readonly DETECTION_SLA_MS = 5 * 60 * 1000; // NFR23
  private static readonly RECOVERY_SLA_MS = 15 * 60 * 1000; // NFR22
  private readonly logger = new Logger(IntegrationLegacyService.name);
  private dispatchWorkerTimer: NodeJS.Timeout | null = null;
  private dispatchWorkerRunning = false;

  constructor(
    private readonly postgresService: PostgresService,
    private readonly transport: IntegrationLegacyTransport
  ) {}

  async onModuleInit(): Promise<void> {
    const intervalMs = this.resolveWorkerIntervalMs();
    if (intervalMs <= 0) {
      return;
    }

    if (!hasConfiguredPostgresRuntime()) {
      this.logger.warn(
        'Skipping integration legacy bootstrap because PostgreSQL runtime is not configured.'
      );
      return;
    }

    await this.assertIntegrationSchemaReady();

    this.dispatchWorkerTimer = setInterval(() => {
      void this.drainQueuedEventsWorker();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (!this.dispatchWorkerTimer) {
      return;
    }

    clearInterval(this.dispatchWorkerTimer);
    this.dispatchWorkerTimer = null;
  }

  async createOutgoing(actor: AuthenticatedUser, dto: CreateOutgoingIntegrationEventDto): Promise<IntegrationEventView> {
    await this.assertExerciceBelongsToTenant(actor.tenantId, dto.exerciceId);
    const canonical = this.buildCanonicalEvent(actor, dto);
    const row = await this.insertEvent({
      actor,
      canonical,
      direction: 'outgoing',
      status: 'queued',
      severity: 'info',
      maxAttempts: dto.maxAttempts ?? 5,
    });

    await this.recordAttempt({
      eventId: row.id,
      tenantId: actor.tenantId,
      exerciceId: dto.exerciceId,
      direction: 'outgoing',
      attemptNumber: 0,
      action: 'dispatch',
      status: 'queued',
      reasonCode: 'OUTBOX_QUEUED',
      reasonMessage: 'Message placé en outbox avant dispatch.',
      metadata: { eventType: canonical.eventType },
      createdBy: actor.sub,
    });

    return this.mapEvent(row);
  }

  async dispatchQueued(actor: AuthenticatedUser, query: IntegrationDispatchQueryDto) {
    await this.assertExerciceBelongsToTenant(actor.tenantId, query.exerciceId);
    return this.dispatchQueuedForScope(actor.tenantId, query.exerciceId, query.limit, actor.sub);
  }

  async consumeIncoming(actor: AuthenticatedUser, dto: ConsumeIncomingIntegrationEventDto) {
    await this.assertExerciceBelongsToTenant(actor.tenantId, dto.exerciceId);
    const canonical = this.buildCanonicalEvent(actor, dto);
    const insertResult = await this.postgresService.query<IntegrationEventRow>(
      `
        INSERT INTO public.integration_async_events (
          tenant_id,
          exercice_id,
          direction,
          event_type,
          correlation_id,
          source_type,
          source_id,
          payload,
          schema_version,
          status,
          severity,
          priority,
          treatment_status,
          reason_code,
          reason_message,
          owner,
          detected_at,
          resolved_at,
          attempt_count,
          max_attempts,
          occurred_at,
          created_by,
          updated_by
        )
        VALUES (
          $1,
          $2,
          'incoming',
          $3,
          $4,
          $5,
          $6,
          $7::jsonb,
          $8,
          'received',
          'info',
          'P3',
          'open',
          NULL,
          NULL,
          NULL,
          now(),
          NULL,
          0,
          5,
          $9::timestamptz,
          $10,
          $11
        )
        ON CONFLICT (tenant_id, exercice_id, direction, correlation_id, event_type)
        DO NOTHING
        RETURNING *
      `,
      [
        actor.tenantId,
        dto.exerciceId,
        canonical.eventType,
        canonical.correlationId,
        canonical.sourceType,
        canonical.sourceId,
        JSON.stringify(canonical.payload),
        canonical.schemaVersion,
        canonical.occurredAt,
        actor.sub,
        actor.sub,
      ]
    );

    if (insertResult.rows.length === 0) {
      const existing = await this.getEventByDedup(actor.tenantId, dto.exerciceId, canonical.correlationId, canonical.eventType, 'incoming');
      if (!existing) {
        throw new NotFoundException('Evénement entrant non retrouvé après déduplication.');
      }

      await this.recordAttempt({
        eventId: existing.id,
        tenantId: actor.tenantId,
        exerciceId: dto.exerciceId,
        direction: 'incoming',
        attemptNumber: existing.attempt_count,
        action: 'ingest',
        status: 'duplicate',
        reasonCode: 'IDEMPOTENT_DUPLICATE',
        reasonMessage: 'Message entrant déjà traité auparavant.',
        metadata: { correlationId: canonical.correlationId, eventType: canonical.eventType },
        createdBy: actor.sub,
      });

      return {
        idempotent: true,
        event: this.mapEvent(existing),
      };
    }

    const inserted = insertResult.rows[0];
    const processed = await this.processIncoming(inserted, actor.sub);

    return {
      idempotent: false,
      event: this.mapEvent(processed),
    };
  }

  async getSupervision(actor: AuthenticatedUser, query: ListIntegrationEventsQueryDto) {
    await this.assertExerciceBelongsToTenant(actor.tenantId, query.exerciceId);
    const scope = this.buildSupervisionScope(actor.tenantId, query);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const values = [...scope.values, pageSize, offset];

    const result = await this.postgresService.query<IntegrationEventRow>(
      `
        SELECT *, COUNT(*) OVER() AS total_count
        FROM public.integration_async_events
        WHERE ${scope.where.join(' AND ')}
        ORDER BY
          CASE priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END ASC,
          created_at DESC,
          id DESC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}
      `,
      values
    );

    const total = Number(result.rows[0]?.total_count ?? 0);
    const countersResult = await this.postgresService.query<IntegrationCounterRow>(
      `
        SELECT status, priority, COUNT(*)::text AS total
        FROM public.integration_async_events
        WHERE ${scope.where.join(' AND ')}
        GROUP BY status, priority
      `,
      scope.values
    );

    const counters = countersResult.rows.reduce(
      (acc, row) => {
        acc.byStatus[row.status] = (acc.byStatus[row.status] ?? 0) + Number(row.total);
        acc.byPriority[row.priority] = (acc.byPriority[row.priority] ?? 0) + Number(row.total);
        return acc;
      },
      {
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
      }
    );

    return {
      items: result.rows.map((row) => this.mapEvent(row)),
      counters,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 1 : Math.ceil(total / pageSize),
      },
    };
  }

  async exportSupervision(actor: AuthenticatedUser, query: ListIntegrationEventsQueryDto) {
    await this.assertExerciceBelongsToTenant(actor.tenantId, query.exerciceId);
    const scope = this.buildSupervisionScope(actor.tenantId, query);
    const result = await this.postgresService.query<IntegrationEventRow>(
      `
        SELECT *
        FROM public.integration_async_events
        WHERE ${scope.where.join(' AND ')}
        ORDER BY
          CASE priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END ASC,
          created_at DESC,
          id DESC
      `,
      scope.values
    );

    const header = [
      'id',
      'correlationId',
      'tenantId',
      'exerciceId',
      'eventType',
      'status',
      'treatmentStatus',
      'priority',
      'severity',
      'owner',
      'reasonCode',
      'detectedAt',
      'resolvedAt',
      'detectionDelayMs',
      'recoveryDelayMs',
      'atRiskSla',
      'createdAt',
      'updatedAt',
    ];
    const rows = result.rows.map((row) => {
      const event = this.mapEvent(row);
      return [
        event.id,
        event.correlationId,
        event.tenantId,
        event.exerciceId,
        event.eventType,
        event.status,
        event.treatmentStatus,
        event.priority,
        event.severity,
        event.owner ?? '',
        event.reasonCode ?? '',
        event.detectedAt ?? '',
        event.resolvedAt ?? '',
        event.detectionDelayMs?.toString() ?? '',
        event.recoveryDelayMs?.toString() ?? '',
        event.atRiskSla ?? 'none',
        event.createdAt,
        event.updatedAt,
      ];
    });

    const csv = [header, ...rows]
      .map((line) => line.map((value) => this.escapeCsvValue(value)).join(','))
      .join('\n');

    return {
      filename: `integration-supervision-${query.exerciceId}-${new Date().toISOString().slice(0, 10)}.csv`,
      mimeType: 'text/csv; charset=utf-8',
      content: Buffer.from(csv, 'utf-8'),
    };
  }

  async retryEvent(actor: AuthenticatedUser, id: string, dto: RetryIntegrationEventDto) {
    await this.assertExerciceBelongsToTenant(actor.tenantId, dto.exerciceId);
    const current = await this.getEventById(actor.tenantId, dto.exerciceId, id);
    if (!current) {
      throw new NotFoundException('Evénement introuvable pour retry.');
    }

    if (!['failed', 'dead_letter', 'queued', 'replayed'].includes(current.status)) {
      throw new BadRequestException(`Retry non autorisé pour le statut ${current.status}.`);
    }

    const updateResult = await this.postgresService.query<IntegrationEventRow>(
      `
        UPDATE public.integration_async_events
        SET
          status = 'replayed',
          reason_code = COALESCE($1, reason_code),
          reason_message = COALESCE($2, reason_message),
          next_retry_at = now(),
          updated_by = $3,
          updated_at = now()
        WHERE id = $4
          AND tenant_id = $5
          AND exercice_id = $6
        RETURNING *
      `,
      [dto.reasonCode ?? null, dto.reasonMessage ?? null, actor.sub, id, actor.tenantId, dto.exerciceId]
    );

    const updated = updateResult.rows[0];
    if (!updated) {
      throw new NotFoundException('Evénement introuvable après mise à jour retry.');
    }

    await this.recordAttempt({
      eventId: updated.id,
      tenantId: actor.tenantId,
      exerciceId: dto.exerciceId,
      direction: updated.direction,
      attemptNumber: updated.attempt_count,
      action: 'manual-retry',
      status: 'replayed',
      reasonCode: dto.reasonCode ?? 'MANUAL_RETRY',
      reasonMessage: dto.reasonMessage ?? 'Retry manuel déclenché.',
      metadata: {},
      createdBy: actor.sub,
    });

    const dispatchedStatus = await this.dispatchSingle(actor.tenantId, actor.sub, updated);
    const latest = await this.getEventById(actor.tenantId, dto.exerciceId, id);

    return {
      dispatchedStatus,
      event: latest ? this.mapEvent(latest) : this.mapEvent(updated),
    };
  }

  async remediateEvent(actor: AuthenticatedUser, id: string, dto: RemediateIntegrationEventDto) {
    await this.assertExerciceBelongsToTenant(actor.tenantId, dto.exerciceId);
    const current = await this.getEventById(actor.tenantId, dto.exerciceId, id);
    if (!current) {
      throw new NotFoundException('Evénement introuvable pour remediation.');
    }

    if (dto.action === 'retry') {
      return this.retryEvent(actor, id, {
        exerciceId: dto.exerciceId,
        reasonCode: dto.reasonCode,
        reasonMessage: dto.reasonMessage,
      });
    }

    const nextTreatmentStatus: IntegrationTreatmentStatus =
      dto.treatmentStatus
      ?? (dto.action === 'escalate' ? 'triaged' : 'resolved');
    const nextPriority: IntegrationEventPriority =
      dto.priority
      ?? (dto.action === 'escalate' ? 'P1' : current.priority);
    const resolvedAt = nextTreatmentStatus === 'resolved' || nextTreatmentStatus === 'closed' ? new Date().toISOString() : null;
    const reasonCode =
      dto.reasonCode
      ?? (dto.action === 'escalate' ? 'MANUAL_ESCALATION' : 'MANUAL_RECONCILIATION');
    const reasonMessage =
      dto.reasonMessage
      ?? (dto.action === 'escalate' ? 'Escalade manuelle opérateur.' : 'Réconciliation manuelle opérateur.');

    const updateResult = await this.postgresService.query<IntegrationEventRow>(
      `
        UPDATE public.integration_async_events
        SET
          priority = $1,
          treatment_status = $2,
          owner = COALESCE($3, owner),
          reason_code = $4,
          reason_message = $5,
          resolved_at = CASE
            WHEN $2 IN ('resolved', 'closed') THEN COALESCE($6::timestamptz, resolved_at)
            ELSE NULL
          END,
          updated_by = $7,
          updated_at = now()
        WHERE id = $8
          AND tenant_id = $9
          AND exercice_id = $10
        RETURNING *
      `,
      [nextPriority, nextTreatmentStatus, dto.owner ?? null, reasonCode, reasonMessage, resolvedAt, actor.sub, id, actor.tenantId, dto.exerciceId]
    );

    const updated = updateResult.rows[0];
    if (!updated) {
      throw new NotFoundException('Evénement introuvable après remediation.');
    }

    const action: IntegrationRemediationAction = dto.action === 'escalate' ? 'escalate' : 'reconcile-manual';
    await this.recordAttempt({
      eventId: updated.id,
      tenantId: actor.tenantId,
      exerciceId: dto.exerciceId,
      direction: updated.direction,
      attemptNumber: updated.attempt_count,
      action,
      status: updated.status,
      reasonCode,
      reasonMessage,
      metadata: {
        owner: dto.owner ?? updated.owner ?? undefined,
        treatmentStatus: nextTreatmentStatus,
        priority: nextPriority,
      },
      createdBy: actor.sub,
    });

    return { event: this.mapEvent(updated) };
  }

  private buildCanonicalEvent(
    actor: AuthenticatedUser,
    dto: CreateOutgoingIntegrationEventDto | ConsumeIncomingIntegrationEventDto
  ): IntegrationCanonicalEvent {
    const correlationId = dto.correlationId?.trim() || `corr-${randomUUID()}`;

    return {
      eventType: dto.eventType,
      correlationId,
      tenantId: actor.tenantId,
      exerciceId: dto.exerciceId,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      payload: dto.payload,
      occurredAt: dto.occurredAt,
      schemaVersion: dto.schemaVersion ?? '1.0.0',
    };
  }

  private async insertEvent(input: {
    actor: AuthenticatedUser;
    canonical: IntegrationCanonicalEvent;
    direction: IntegrationEventDirection;
    status: IntegrationEventStatus;
    severity: IntegrationEventSeverity;
    maxAttempts: number;
  }): Promise<IntegrationEventRow> {
    const result = await this.postgresService.query<IntegrationEventRow>(
      `
        INSERT INTO public.integration_async_events (
          tenant_id,
          exercice_id,
          direction,
          event_type,
          correlation_id,
          source_type,
          source_id,
          payload,
          schema_version,
          status,
          severity,
          priority,
          treatment_status,
          reason_code,
          reason_message,
          owner,
          detected_at,
          resolved_at,
          attempt_count,
          max_attempts,
          occurred_at,
          created_by,
          updated_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8::jsonb,
          $9,
          $10,
          $11,
          'P3',
          'open',
          NULL,
          NULL,
          NULL,
          now(),
          NULL,
          0,
          $12,
          $13::timestamptz,
          $14,
          $15
        )
        RETURNING *
      `,
      [
        input.actor.tenantId,
        input.canonical.exerciceId,
        input.direction,
        input.canonical.eventType,
        input.canonical.correlationId,
        input.canonical.sourceType,
        input.canonical.sourceId,
        JSON.stringify(input.canonical.payload),
        input.canonical.schemaVersion,
        input.status,
        input.severity,
        input.maxAttempts,
        input.canonical.occurredAt,
        input.actor.sub,
        input.actor.sub,
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Impossible d'insérer l'événement d'intégration.");
    }

    return row;
  }

  private async dispatchSingle(tenantId: string, actorUserId: string, event: IntegrationEventRow): Promise<IntegrationEventStatus> {
    const canonical: IntegrationCanonicalEvent = {
      eventType: event.event_type,
      correlationId: event.correlation_id,
      tenantId: event.tenant_id,
      exerciceId: event.exercice_id,
      sourceType: event.source_type,
      sourceId: event.source_id,
      payload: event.payload ?? {},
      occurredAt: this.toIso(event.occurred_at),
      schemaVersion: event.schema_version,
    };

    const nextAttempt = Number(event.attempt_count) + 1;

    const transportResult = await this.transport.send(canonical);
    if (transportResult.acked) {
      const status: IntegrationEventStatus = 'acked';
      const updateResult = await this.postgresService.query<IntegrationEventRow>(
        `
          UPDATE public.integration_async_events
          SET
            status = $1,
            attempt_count = $2,
            next_retry_at = NULL,
            reason_code = NULL,
            reason_message = NULL,
            updated_by = $3,
            updated_at = now()
          WHERE id = $4
            AND tenant_id = $5
          RETURNING *
        `,
        [status, nextAttempt, actorUserId, event.id, tenantId]
      );

      const updated = updateResult.rows[0];
      if (!updated) {
        throw new NotFoundException('Evénement sortant introuvable pendant dispatch.');
      }

      await this.recordAttempt({
        eventId: event.id,
        tenantId,
        exerciceId: event.exercice_id,
        direction: 'outgoing',
        attemptNumber: nextAttempt,
        action: 'dispatch',
        status,
        reasonCode: transportResult.code,
        reasonMessage: transportResult.message,
        metadata: {},
        createdBy: actorUserId,
      });

      return status;
    }

    const failedStatus = nextAttempt >= event.max_attempts ? 'dead_letter' : 'failed';
    const nextRetryAt = failedStatus === 'dead_letter' ? null : this.computeNextRetryAt(nextAttempt);

    const failedUpdate = await this.postgresService.query<IntegrationEventRow>(
      `
        UPDATE public.integration_async_events
        SET
          status = $1,
          severity = 'error',
          attempt_count = $2,
          next_retry_at = $3,
          dead_lettered_at = CASE WHEN $1 = 'dead_letter' THEN now() ELSE dead_lettered_at END,
          reason_code = $4,
          reason_message = $5,
          updated_by = $6,
          updated_at = now()
        WHERE id = $7
          AND tenant_id = $8
        RETURNING *
      `,
      [
        failedStatus,
        nextAttempt,
        nextRetryAt,
        transportResult.code ?? 'LEGACY_DISPATCH_FAILED',
        transportResult.message ?? 'Echec de livraison vers legacy.',
        actorUserId,
        event.id,
        tenantId,
      ]
    );

    if (!failedUpdate.rows[0]) {
      throw new NotFoundException('Evénement sortant introuvable pendant gestion échec dispatch.');
    }

    await this.recordAttempt({
      eventId: event.id,
      tenantId,
      exerciceId: event.exercice_id,
      direction: 'outgoing',
      attemptNumber: nextAttempt,
      action: 'dispatch',
      status: failedStatus,
      reasonCode: transportResult.code ?? 'LEGACY_DISPATCH_FAILED',
      reasonMessage: transportResult.message ?? 'Echec de livraison vers legacy.',
      metadata: { nextRetryAt },
      createdBy: actorUserId,
    });

    return failedStatus;
  }

  private async processIncoming(event: IntegrationEventRow, actorUserId: string): Promise<IntegrationEventRow> {
    const nextAttempt = Number(event.attempt_count) + 1;

    try {
      if (event.payload?.['forceIncomingFailure'] === true) {
        throw new Error('Traitement entrant simulé en échec.');
      }

      const updatedResult = await this.postgresService.query<IntegrationEventRow>(
        `
          UPDATE public.integration_async_events
          SET
            status = 'processed',
            attempt_count = attempt_count + 1,
            reason_code = NULL,
            reason_message = NULL,
            next_retry_at = NULL,
            updated_by = $1,
            updated_at = now()
          WHERE id = $2
            AND tenant_id = $3
          RETURNING *
        `,
        [actorUserId, event.id, event.tenant_id]
      );

      const updated = updatedResult.rows[0];
      if (!updated) {
        throw new NotFoundException('Evénement entrant introuvable pendant traitement.');
      }

      await this.recordAttempt({
        eventId: event.id,
        tenantId: event.tenant_id,
        exerciceId: event.exercice_id,
        direction: 'incoming',
        attemptNumber: updated.attempt_count,
        action: 'ingest',
        status: 'processed',
        reasonCode: 'INCOMING_PROCESSED',
        reasonMessage: 'Message entrant traité de manière idempotente.',
        metadata: {},
        createdBy: actorUserId,
      });

      return updated;
    } catch (error) {
      const failedStatus: IntegrationEventStatus = nextAttempt >= event.max_attempts ? 'dead_letter' : 'failed';
      const nextRetryAt = failedStatus === 'dead_letter' ? null : this.computeNextRetryAt(nextAttempt);
      const reasonMessage = error instanceof Error ? error.message : 'Echec de traitement du message entrant.';

      const failedResult = await this.postgresService.query<IntegrationEventRow>(
        `
          UPDATE public.integration_async_events
          SET
            status = $1,
            severity = 'error',
            attempt_count = $2,
            next_retry_at = $3,
            dead_lettered_at = CASE WHEN $1 = 'dead_letter' THEN now() ELSE dead_lettered_at END,
            reason_code = 'INCOMING_PROCESSING_FAILED',
            reason_message = $4,
            updated_by = $5,
            updated_at = now()
          WHERE id = $6
            AND tenant_id = $7
          RETURNING *
        `,
        [failedStatus, nextAttempt, nextRetryAt, reasonMessage, actorUserId, event.id, event.tenant_id]
      );

      const failed = failedResult.rows[0];
      if (!failed) {
        throw new NotFoundException("Evénement entrant introuvable pendant gestion d'échec.");
      }

      await this.recordAttempt({
        eventId: event.id,
        tenantId: event.tenant_id,
        exerciceId: event.exercice_id,
        direction: 'incoming',
        attemptNumber: nextAttempt,
        action: 'ingest',
        status: failedStatus,
        reasonCode: 'INCOMING_PROCESSING_FAILED',
        reasonMessage,
        metadata: { nextRetryAt },
        createdBy: actorUserId,
      });

      return failed;
    }
  }

  private async dispatchQueuedForScope(tenantId: string, exerciceId: string, limit: number, actorUserId: string) {
    const queuedResult = await this.postgresService.query<IntegrationEventRow>(
      `
        SELECT *
        FROM public.integration_async_events
        WHERE tenant_id = $1
          AND exercice_id = $2
          AND direction = 'outgoing'
          AND status IN ('queued', 'failed', 'replayed')
          AND (next_retry_at IS NULL OR next_retry_at <= now())
        ORDER BY source_id ASC, occurred_at ASC, created_at ASC
        LIMIT $3
      `,
      [tenantId, exerciceId, limit]
    );

    let sent = 0;
    let failed = 0;
    let deadLettered = 0;

    for (const event of queuedResult.rows) {
      const outcome = await this.dispatchSingle(tenantId, actorUserId, event);
      if (outcome === 'sent' || outcome === 'acked') {
        sent += 1;
      } else if (outcome === 'dead_letter') {
        deadLettered += 1;
      } else {
        failed += 1;
      }
    }

    return {
      exerciceId,
      processed: queuedResult.rows.length,
      sent,
      failed,
      deadLettered,
    };
  }

  private async drainQueuedEventsWorker(): Promise<void> {
    if (this.dispatchWorkerRunning) {
      return;
    }

    this.dispatchWorkerRunning = true;
    try {
      const scopesResult = await this.postgresService.query<{ tenant_id: string; exercice_id: string }>(
        `
          SELECT DISTINCT tenant_id, exercice_id
          FROM public.integration_async_events
          WHERE direction = 'outgoing'
            AND status IN ('queued', 'failed', 'replayed')
            AND (next_retry_at IS NULL OR next_retry_at <= now())
          ORDER BY tenant_id ASC, exercice_id ASC
          LIMIT 50
        `
      );

      for (const scope of scopesResult.rows) {
        await this.dispatchQueuedForScope(
          scope.tenant_id,
          scope.exercice_id,
          100,
          IntegrationLegacyService.DISPATCH_WORKER_USER
        );
      }
    } finally {
      this.dispatchWorkerRunning = false;
    }
  }

  private resolveWorkerIntervalMs(): number {
    const raw = process.env.INTEGRATION_LEGACY_DISPATCH_INTERVAL_MS;
    if (!raw) {
      return 15_000;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 15_000;
    }

    return Math.floor(parsed);
  }

  private async assertIntegrationSchemaReady(): Promise<void> {
    const prerequisiteCheck = await this.postgresService.assertSchemaPrerequisites({
      relations: [...INTEGRATION_REQUIRED_RELATIONS],
      columns: [...INTEGRATION_REQUIRED_COLUMNS],
    });

    const missingItems = [
      ...prerequisiteCheck.missingRelations,
      ...prerequisiteCheck.missingColumns.map(({ table, column }) => `${table}.${column}`),
    ];

    if (missingItems.length === 0) {
      return;
    }

    throw new Error(
      `Integration schema prerequisites missing: ${missingItems.join(', ')}. `
      + 'Apply integration schema migrations before starting the backend.'
    );
  }

  private async assertExerciceBelongsToTenant(tenantId: string, exerciceId: string): Promise<void> {
    const result = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.exercices
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [exerciceId, tenantId]
    );

    if (!result.rows[0]) {
      throw new BadRequestException("Exercice hors périmètre du tenant courant.");
    }
  }

  private computeNextRetryAt(attemptNumber: number): string {
    const baseDelayMs = 30_000;
    const maxDelayMs = 15 * 60_000;
    const exponent = Math.max(0, attemptNumber - 1);
    const delayMs = Math.min(baseDelayMs * 2 ** exponent, maxDelayMs);
    return new Date(Date.now() + delayMs).toISOString();
  }

  private async recordAttempt(input: {
    eventId: string;
    tenantId: string;
    exerciceId: string;
    direction: IntegrationEventDirection;
    attemptNumber: number;
    action: IntegrationRemediationAction;
    status: IntegrationEventStatus | 'duplicate';
    reasonCode?: string | null;
    reasonMessage?: string | null;
    metadata: Record<string, unknown>;
    createdBy: string;
  }) {
    await this.postgresService.query(
      `
        INSERT INTO public.integration_async_event_attempts (
          event_id,
          tenant_id,
          exercice_id,
          direction,
          attempt_number,
          action,
          status,
          reason_code,
          reason_message,
          metadata,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::jsonb,
          $11
        )
      `,
      [
        input.eventId,
        input.tenantId,
        input.exerciceId,
        input.direction,
        input.attemptNumber,
        input.action,
        input.status,
        input.reasonCode ?? null,
        input.reasonMessage ?? null,
        JSON.stringify(input.metadata),
        input.createdBy,
      ]
    );
  }

  private async getEventById(tenantId: string, exerciceId: string, id: string): Promise<IntegrationEventRow | null> {
    const result = await this.postgresService.query<IntegrationEventRow>(
      `
        SELECT *
        FROM public.integration_async_events
        WHERE id = $1
          AND tenant_id = $2
          AND exercice_id = $3
        LIMIT 1
      `,
      [id, tenantId, exerciceId]
    );

    return result.rows[0] ?? null;
  }

  private async getEventByDedup(
    tenantId: string,
    exerciceId: string,
    correlationId: string,
    eventType: string,
    direction: IntegrationEventDirection
  ): Promise<IntegrationEventRow | null> {
    const result = await this.postgresService.query<IntegrationEventRow>(
      `
        SELECT *
        FROM public.integration_async_events
        WHERE tenant_id = $1
          AND exercice_id = $2
          AND direction = $3
          AND correlation_id = $4
          AND event_type = $5
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [tenantId, exerciceId, direction, correlationId, eventType]
    );

    return result.rows[0] ?? null;
  }

  private buildSupervisionScope(tenantId: string, query: ListIntegrationEventsQueryDto): { values: unknown[]; where: string[] } {
    const values: unknown[] = [tenantId, query.exerciceId];
    const where: string[] = ['tenant_id = $1', 'exercice_id = $2'];

    if (query.status) {
      values.push(query.status);
      where.push(`status = $${values.length}`);
    } else {
      where.push("status IN ('failed', 'dead_letter', 'received', 'processed', 'replayed', 'acked', 'sent')");
    }

    if (query.severity) {
      values.push(query.severity);
      where.push(`severity = $${values.length}`);
    }

    if (query.priority) {
      values.push(query.priority);
      where.push(`priority = $${values.length}`);
    }

    if (query.treatmentStatus) {
      values.push(query.treatmentStatus);
      where.push(`treatment_status = $${values.length}`);
    }

    if (query.correlationId) {
      values.push(query.correlationId);
      where.push(`correlation_id = $${values.length}`);
    }

    if (query.owner) {
      values.push(query.owner);
      where.push(`owner = $${values.length}`);
    }

    if (query.fromDate) {
      values.push(query.fromDate);
      where.push(`created_at >= $${values.length}::timestamptz`);
    }

    if (query.toDate) {
      values.push(query.toDate);
      where.push(`created_at < ($${values.length}::date + interval '1 day')`);
    }

    return { values, where };
  }

  private mapEvent(row: IntegrationEventRow): IntegrationEventView {
    const nowIso = new Date().toISOString();
    const detectedAt = row.detected_at ? this.toIso(row.detected_at) : undefined;
    const resolvedAt = row.resolved_at ? this.toIso(row.resolved_at) : undefined;
    const detectionDelayMs = detectedAt ? this.computeDelayMs(row.occurred_at, detectedAt) : undefined;
    const recoveryDelayMs = detectedAt ? this.computeDelayMs(detectedAt, resolvedAt ?? nowIso) : undefined;
    const atRiskSla = this.computeSlaRisk(detectionDelayMs, recoveryDelayMs, row.treatment_status);

    return {
      id: row.id,
      direction: row.direction,
      status: row.status,
      severity: row.severity,
      priority: row.priority ?? 'P3',
      treatmentStatus: row.treatment_status ?? 'open',
      tenantId: row.tenant_id,
      exerciceId: row.exercice_id,
      eventType: row.event_type,
      correlationId: row.correlation_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      payload: row.payload ?? {},
      schemaVersion: row.schema_version,
      occurredAt: this.toIso(row.occurred_at),
      attemptCount: Number(row.attempt_count ?? 0),
      maxAttempts: Number(row.max_attempts ?? 5),
      nextRetryAt: row.next_retry_at ? this.toIso(row.next_retry_at) : undefined,
      deadLetteredAt: row.dead_lettered_at ? this.toIso(row.dead_lettered_at) : undefined,
      reasonCode: row.reason_code ?? undefined,
      reasonMessage: row.reason_message ?? undefined,
      owner: row.owner ?? undefined,
      detectedAt,
      resolvedAt,
      detectionDelayMs,
      recoveryDelayMs,
      atRiskSla,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private escapeCsvValue(value: string): string {
    const normalized = value.replaceAll('"', '""');
    return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
  }

  private computeDelayMs(start: string | Date, end: string): number {
    const from = typeof start === 'string' ? new Date(start).getTime() : start.getTime();
    const to = new Date(end).getTime();
    return Math.max(0, to - from);
  }

  private computeSlaRisk(
    detectionDelayMs: number | undefined,
    recoveryDelayMs: number | undefined,
    treatmentStatus: IntegrationTreatmentStatus | undefined
  ): 'none' | 'detection' | 'recovery' | 'breach' {
    const unresolved = treatmentStatus !== 'resolved' && treatmentStatus !== 'closed';
    if (detectionDelayMs !== undefined && detectionDelayMs > IntegrationLegacyService.DETECTION_SLA_MS) {
      return 'breach';
    }
    if (recoveryDelayMs !== undefined && recoveryDelayMs > IntegrationLegacyService.RECOVERY_SLA_MS) {
      return 'breach';
    }
    if (unresolved && detectionDelayMs !== undefined && detectionDelayMs > Math.floor(IntegrationLegacyService.DETECTION_SLA_MS * 0.8)) {
      return 'detection';
    }
    if (unresolved && recoveryDelayMs !== undefined && recoveryDelayMs > Math.floor(IntegrationLegacyService.RECOVERY_SLA_MS * 0.8)) {
      return 'recovery';
    }
    return 'none';
  }

  private toIso(value: string | Date): string {
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }

    return value.toISOString();
  }
}
