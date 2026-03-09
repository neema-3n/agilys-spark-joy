import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import {
  ListOfflineSyncItemsQueryDto,
  RetryOfflineSyncItemDto,
  SyncOfflineItemDto,
} from './dto/offline-sync.dto';
import type {
  OfflineSyncConflictCode,
  OfflineSyncItemView,
  OfflineSyncStatus,
  OfflineSyncSupervisionResult,
} from './offline-sync.types';

interface OfflineSyncRow {
  id: string;
  tenant_id: string;
  exercice_id: string;
  local_id: string;
  operation_type: string;
  entity_type: string;
  entity_id: string;
  idempotency_key: string;
  correlation_id: string;
  payload: Record<string, unknown>;
  status: OfflineSyncStatus;
  conflict_code: OfflineSyncConflictCode | null;
  conflict_message: string | null;
  retry_count: number;
  max_retries: number;
  queued_at: string | Date;
  last_attempt_at: string | Date | null;
  synced_at: string | Date | null;
  next_retry_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  total_count?: number;
}

interface RecoveryStatRow {
  recovery_ms: number | null;
}

interface CounterRow {
  retries: number | null;
  conflicts: number | null;
}

@Injectable()
export class OfflineSyncService {
  constructor(private readonly postgresService: PostgresService) {}

  async syncItem(actor: AuthenticatedUser, dto: SyncOfflineItemDto): Promise<{ idempotent: boolean; item: OfflineSyncItemView }> {
    await this.assertExerciceBelongsToTenant(actor.tenantId, dto.exerciceId);

    if (dto.tenantId !== actor.tenantId) {
      throw new BadRequestException('Tenant payload invalide pour le scope courant.');
    }

    const idempotencyKey = this.buildIdempotencyKey(dto);

    const existing = await this.findByIdempotencyKey(actor.tenantId, dto.exerciceId, idempotencyKey);
    if (existing) {
      return {
        idempotent: true,
        item: this.mapEvent(existing),
      };
    }

    const inserted = await this.insertQueued(actor, dto, idempotencyKey);
    await this.recordAttempt(inserted, actor.sub, inserted.status, 'QUEUED', 'Elément placé dans la file offline.');

    const processed = await this.processQueued(actor, inserted, dto);

    return {
      idempotent: false,
      item: this.mapEvent(processed),
    };
  }

  async list(actor: AuthenticatedUser, query: ListOfflineSyncItemsQueryDto): Promise<OfflineSyncSupervisionResult> {
    await this.assertExerciceBelongsToTenant(actor.tenantId, query.exerciceId);

    const values: unknown[] = [actor.tenantId, query.exerciceId];
    const where: string[] = ['tenant_id = $1', 'exercice_id = $2'];

    if (query.status) {
      values.push(query.status);
      where.push(`status = $${values.length}`);
    }

    if (query.correlationId) {
      values.push(query.correlationId);
      where.push(`correlation_id = $${values.length}`);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    values.push(pageSize, offset);

    const rows = await this.postgresService.query<OfflineSyncRow>(
      `
        SELECT *, COUNT(*) OVER() AS total_count
        FROM public.offline_sync_events
        WHERE ${where.join(' AND ')}
        ORDER BY queued_at ASC, entity_type ASC, entity_id ASC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}
      `,
      values
    );

    const total = Number(rows.rows[0]?.total_count ?? 0);

    const metrics = await this.computeMetrics(actor.tenantId, query.exerciceId);

    return {
      items: rows.rows.map((row) => this.mapEvent(row)),
      metrics,
      counters: {
        retries: metrics.retries,
        conflicts: metrics.conflicts,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 1 : Math.ceil(total / pageSize),
      },
    };
  }

  async retry(actor: AuthenticatedUser, id: string, dto: RetryOfflineSyncItemDto): Promise<OfflineSyncItemView> {
    await this.assertExerciceBelongsToTenant(actor.tenantId, dto.exerciceId);

    const row = await this.findById(actor.tenantId, dto.exerciceId, id);
    if (!row) {
      throw new NotFoundException('Item offline introuvable.');
    }

    if (row.status !== 'failed' && row.status !== 'conflict') {
      throw new BadRequestException(`Retry non autorisé pour le statut ${row.status}.`);
    }

    const promoted = await this.postgresService.query<OfflineSyncRow>(
      `
        UPDATE public.offline_sync_events
        SET
          status = 'queued',
          conflict_code = NULL,
          conflict_message = NULL,
          next_retry_at = now(),
          updated_by = $1,
          updated_at = now()
        WHERE id = $2
          AND tenant_id = $3
          AND exercice_id = $4
        RETURNING *
      `,
      [actor.sub, id, actor.tenantId, dto.exerciceId]
    );

    const queued = promoted.rows[0];
    if (!queued) {
      throw new NotFoundException('Item offline introuvable après retry.');
    }

    await this.recordAttempt(queued, actor.sub, 'queued', 'MANUAL_RETRY', dto.reasonMessage ?? 'Relance manuelle.');

    const processed = await this.processQueued(actor, queued, {
      exerciceId: queued.exercice_id,
      tenantId: queued.tenant_id,
      localId: queued.local_id,
      operationType: queued.operation_type,
      entityType: queued.entity_type,
      entityId: queued.entity_id,
      correlationId: queued.correlation_id,
      queuedAt: this.toIso(queued.queued_at),
      retryCount: queued.retry_count,
      payload: queued.payload,
    });

    return this.mapEvent(processed);
  }

  async health(actor: AuthenticatedUser, exerciceId: string): Promise<{ status: 'ok'; timestamp: string; exerciceId: string }> {
    await this.assertExerciceBelongsToTenant(actor.tenantId, exerciceId);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      exerciceId,
    };
  }

  private async processQueued(actor: AuthenticatedUser, row: OfflineSyncRow, dto: SyncOfflineItemDto): Promise<OfflineSyncRow> {
    const syncing = await this.postgresService.query<OfflineSyncRow>(
      `
        UPDATE public.offline_sync_events
        SET
          status = 'syncing',
          last_attempt_at = now(),
          updated_by = $1,
          updated_at = now()
        WHERE id = $2
          AND tenant_id = $3
          AND exercice_id = $4
        RETURNING *
      `,
      [actor.sub, row.id, actor.tenantId, dto.exerciceId]
    );

    const syncingRow = syncing.rows[0];
    if (!syncingRow) {
      throw new NotFoundException('Impossible de passer en statut syncing.');
    }

    await this.recordAttempt(syncingRow, actor.sub, 'syncing', 'SYNC_START', 'Tentative de synchronisation démarrée.');

    const conflict = this.qualifyConflict(actor, dto);
    if (conflict) {
      const updated = await this.postgresService.query<OfflineSyncRow>(
        `
          UPDATE public.offline_sync_events
          SET
            status = 'conflict',
            conflict_code = $1,
            conflict_message = $2,
            retry_count = retry_count + 1,
            next_retry_at = NULL,
            updated_by = $3,
            updated_at = now()
          WHERE id = $4
            AND tenant_id = $5
            AND exercice_id = $6
          RETURNING *
        `,
        [conflict.code, conflict.message, actor.sub, row.id, actor.tenantId, dto.exerciceId]
      );
      const conflictRow = updated.rows[0];
      if (!conflictRow) {
        throw new NotFoundException('Impossible de qualifier le conflit.');
      }

      await this.recordAttempt(conflictRow, actor.sub, 'conflict', conflict.code, conflict.message);
      return conflictRow;
    }

    const shouldFail = this.shouldSimulateFailure(dto.payload);
    if (shouldFail) {
      const nextRetryAt = this.computeNextRetryAt(syncingRow.retry_count + 1);
      const failed = await this.postgresService.query<OfflineSyncRow>(
        `
          UPDATE public.offline_sync_events
          SET
            status = 'failed',
            retry_count = retry_count + 1,
            conflict_code = NULL,
            conflict_message = $1,
            next_retry_at = $2,
            updated_by = $3,
            updated_at = now()
          WHERE id = $4
            AND tenant_id = $5
            AND exercice_id = $6
          RETURNING *
        `,
        [
          'Synchronisation impossible: erreur réseau simulée côté backend. Relancez après stabilisation.',
          nextRetryAt,
          actor.sub,
          row.id,
          actor.tenantId,
          dto.exerciceId,
        ]
      );

      const failedRow = failed.rows[0];
      if (!failedRow) {
        throw new NotFoundException('Impossible de passer en statut failed.');
      }

      await this.recordAttempt(
        failedRow,
        actor.sub,
        'failed',
        'RETRYABLE_NETWORK_FAILURE',
        'Synchronisation impossible: erreur réseau simulée côté backend. Relancez après stabilisation.'
      );

      return failedRow;
    }

    const synced = await this.postgresService.query<OfflineSyncRow>(
      `
        UPDATE public.offline_sync_events
        SET
          status = 'synced',
          conflict_code = NULL,
          conflict_message = NULL,
          synced_at = now(),
          next_retry_at = NULL,
          updated_by = $1,
          updated_at = now()
        WHERE id = $2
          AND tenant_id = $3
          AND exercice_id = $4
        RETURNING *
      `,
      [actor.sub, row.id, actor.tenantId, dto.exerciceId]
    );

    const syncedRow = synced.rows[0];
    if (!syncedRow) {
      throw new NotFoundException('Impossible de passer en statut synced.');
    }

    await this.recordAttempt(syncedRow, actor.sub, 'synced', 'SYNC_OK', 'Synchronisation terminée avec succès.');
    return syncedRow;
  }

  private qualifyConflict(
    actor: AuthenticatedUser,
    dto: SyncOfflineItemDto
  ): { code: OfflineSyncConflictCode; message: string } | null {
    if (dto.tenantId !== actor.tenantId) {
      return {
        code: 'cross_tenant_scope',
        message: 'Conflit de scope: tenant mismatch avec la session courante.',
      };
    }

    const payload = dto.payload;
    if (payload['staleVersion'] === true) {
      return {
        code: 'stale_version',
        message: 'Conflit de version: la version locale est obsolète, rechargez avant relance.',
      };
    }

    if (payload['forbiddenTransition'] === true) {
      return {
        code: 'forbidden_transition',
        message: 'Transition interdite: l état cible n est pas autorisé pour cette entité.',
      };
    }

    if (payload['missingDependency'] === true) {
      return {
        code: 'missing_dependency',
        message: 'Dépendance manquante: synchronisez d abord l élément parent requis.',
      };
    }

    return null;
  }

  private shouldSimulateFailure(payload: Record<string, unknown>): boolean {
    return payload['simulateNetworkFailure'] === true;
  }

  private buildIdempotencyKey(dto: SyncOfflineItemDto): string {
    return `${dto.tenantId}:${dto.exerciceId}:${dto.localId}:${dto.operationType}`;
  }

  private async insertQueued(actor: AuthenticatedUser, dto: SyncOfflineItemDto, idempotencyKey: string): Promise<OfflineSyncRow> {
    const result = await this.postgresService.query<OfflineSyncRow>(
      `
        INSERT INTO public.offline_sync_events (
          tenant_id,
          exercice_id,
          local_id,
          operation_type,
          entity_type,
          entity_id,
          idempotency_key,
          correlation_id,
          payload,
          status,
          retry_count,
          max_retries,
          queued_at,
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
          $8,
          $9::jsonb,
          'queued',
          $10,
          5,
          COALESCE($11::timestamptz, now()),
          $12,
          $13
        )
        RETURNING *
      `,
      [
        actor.tenantId,
        dto.exerciceId,
        dto.localId,
        dto.operationType,
        dto.entityType,
        dto.entityId,
        idempotencyKey,
        dto.correlationId,
        JSON.stringify(dto.payload),
        dto.retryCount ?? 0,
        dto.queuedAt ?? null,
        actor.sub,
        actor.sub,
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Impossible de créer l item offline.');
    }

    return row;
  }

  private async findByIdempotencyKey(
    tenantId: string,
    exerciceId: string,
    idempotencyKey: string
  ): Promise<OfflineSyncRow | null> {
    const result = await this.postgresService.query<OfflineSyncRow>(
      `
        SELECT *
        FROM public.offline_sync_events
        WHERE tenant_id = $1
          AND exercice_id = $2
          AND idempotency_key = $3
        LIMIT 1
      `,
      [tenantId, exerciceId, idempotencyKey]
    );

    return result.rows[0] ?? null;
  }

  private async findById(tenantId: string, exerciceId: string, id: string): Promise<OfflineSyncRow | null> {
    const result = await this.postgresService.query<OfflineSyncRow>(
      `
        SELECT *
        FROM public.offline_sync_events
        WHERE tenant_id = $1
          AND exercice_id = $2
          AND id = $3
        LIMIT 1
      `,
      [tenantId, exerciceId, id]
    );

    return result.rows[0] ?? null;
  }

  private async recordAttempt(
    row: OfflineSyncRow,
    userId: string,
    status: OfflineSyncStatus,
    reasonCode: string,
    reasonMessage: string
  ): Promise<void> {
    await this.postgresService.query(
      `
        INSERT INTO public.offline_sync_attempts (
          event_id,
          tenant_id,
          exercice_id,
          status,
          retry_count,
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
          $8::jsonb,
          $9
        )
      `,
      [
        row.id,
        row.tenant_id,
        row.exercice_id,
        status,
        row.retry_count,
        reasonCode,
        reasonMessage,
        JSON.stringify({
          correlationId: row.correlation_id,
          operationType: row.operation_type,
          entityType: row.entity_type,
          entityId: row.entity_id,
        }),
        userId,
      ]
    );
  }

  private async computeMetrics(
    tenantId: string,
    exerciceId: string
  ): Promise<OfflineSyncSupervisionResult['metrics'] & { retries: number; conflicts: number }> {
    const statusResult = await this.postgresService.query<{ status: OfflineSyncStatus; count: string }>(
      `
        SELECT status, COUNT(*)::text AS count
        FROM public.offline_sync_events
        WHERE tenant_id = $1
          AND exercice_id = $2
        GROUP BY status
      `,
      [tenantId, exerciceId]
    );

    const statusCounts: Record<OfflineSyncStatus, number> = {
      queued: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
      conflict: 0,
    };

    for (const row of statusResult.rows) {
      statusCounts[row.status] = Number(row.count);
    }

    const recoveryRows = await this.postgresService.query<RecoveryStatRow>(
      `
        SELECT EXTRACT(EPOCH FROM (synced_at - queued_at)) * 1000 AS recovery_ms
        FROM public.offline_sync_events
        WHERE tenant_id = $1
          AND exercice_id = $2
          AND synced_at IS NOT NULL
      `,
      [tenantId, exerciceId]
    );

    const recoveryValues = recoveryRows.rows
      .map((row) => Number(row.recovery_ms ?? 0))
      .filter((value) => Number.isFinite(value) && value >= 0)
      .sort((a, b) => a - b);

    const averageRecoveryMs =
      recoveryValues.length === 0
        ? 0
        : Math.round(recoveryValues.reduce((acc, value) => acc + value, 0) / recoveryValues.length);

    const p95RecoveryMs =
      recoveryValues.length === 0
        ? 0
        : recoveryValues[Math.min(recoveryValues.length - 1, Math.ceil(recoveryValues.length * 0.95) - 1)] ?? 0;

    const counterRow = await this.postgresService.query<CounterRow>(
      `
        SELECT
          COALESCE(SUM(retry_count), 0) AS retries,
          COALESCE(SUM(CASE WHEN status = 'conflict' THEN 1 ELSE 0 END), 0) AS conflicts
        FROM public.offline_sync_events
        WHERE tenant_id = $1
          AND exercice_id = $2
      `,
      [tenantId, exerciceId]
    );

    return {
      ...statusCounts,
      averageRecoveryMs,
      p95RecoveryMs,
      retries: Number(counterRow.rows[0]?.retries ?? 0),
      conflicts: Number(counterRow.rows[0]?.conflicts ?? 0),
    };
  }

  private computeNextRetryAt(nextRetryCount: number): string {
    const baseDelayMs = 20_000;
    const maxDelayMs = 10 * 60_000;
    const exponent = Math.max(0, nextRetryCount - 1);
    const delayMs = Math.min(baseDelayMs * 2 ** exponent, maxDelayMs);
    return new Date(Date.now() + delayMs).toISOString();
  }

  private mapEvent(row: OfflineSyncRow): OfflineSyncItemView {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      exerciceId: row.exercice_id,
      localId: row.local_id,
      operationType: row.operation_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      idempotencyKey: row.idempotency_key,
      correlationId: row.correlation_id,
      payload: row.payload ?? {},
      status: row.status,
      conflictCode: row.conflict_code ?? undefined,
      conflictMessage: row.conflict_message ?? undefined,
      retryCount: Number(row.retry_count),
      maxRetries: Number(row.max_retries),
      queuedAt: this.toIso(row.queued_at),
      lastAttemptAt: row.last_attempt_at ? this.toIso(row.last_attempt_at) : undefined,
      syncedAt: row.synced_at ? this.toIso(row.synced_at) : undefined,
      nextRetryAt: row.next_retry_at ? this.toIso(row.next_retry_at) : undefined,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
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
      throw new BadRequestException('Exercice hors périmètre du tenant courant.');
    }
  }

  private toIso(value: string | Date): string {
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }

    return value.toISOString();
  }
}
