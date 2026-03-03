import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { DatabaseError } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { resolveAuthStorageMode } from '../auth/auth-storage-mode';
import { PostgresService } from '../common/postgres.service';
import { UsersService } from '../users/users.service';
import type { UpdateRetentionPolicyDto } from './dto/retention-policy.dto';
import type { RetentionPolicyAuditEvent, RetentionPolicyRecord, RetentionPolicyView } from './tenant-policies.types';

const POLICY_KEY = 'default';
const DEFAULT_RETENTION_DAYS = 365;

@Injectable()
export class TenantPoliciesService {
  private readonly storageMode = resolveAuthStorageMode();
  private readonly logger = new Logger('TenantPoliciesAudit');
  private readonly memoryStore = new Map<string, RetentionPolicyRecord[]>();

  constructor(
    private readonly postgresService: PostgresService,
    private readonly usersService: UsersService
  ) {}

  async getRetentionPolicy(actor: AuthenticatedUser, requestedTenantId?: string): Promise<RetentionPolicyView> {
    const targetTenantId = await this.resolveTargetTenantId(actor, requestedTenantId, 'retention_policy_read');

    const policy = this.storageMode === 'memory'
      ? this.getCurrentFromMemory(targetTenantId)
      : await this.getCurrentFromPostgres(targetTenantId);

    const resolved = policy ?? this.buildDefaultPolicy(targetTenantId);
    this.logAudit({
      tenantId: targetTenantId,
      actorId: actor.sub,
      action: 'retention_policy_read',
      decision: 'allow',
      version: resolved.version,
      reason: null
    });

    return resolved;
  }

  async updateRetentionPolicy(actor: AuthenticatedUser, payload: UpdateRetentionPolicyDto): Promise<RetentionPolicyView> {
    const targetTenantId = await this.resolveTargetTenantId(actor, payload.tenantId, 'retention_policy_update');

    const policy = this.storageMode === 'memory'
      ? this.upsertInMemory(targetTenantId, actor, payload)
      : await this.upsertInPostgres(targetTenantId, actor, payload);

    this.logAudit({
      tenantId: targetTenantId,
      actorId: actor.sub,
      action: 'retention_policy_update',
      decision: 'allow',
      version: policy.version,
      reason: null
    });

    return policy;
  }

  private async resolveTargetTenantId(
    actor: AuthenticatedUser,
    requestedTenantId: string | undefined,
    action: RetentionPolicyAuditEvent['action']
  ): Promise<string> {
    const targetTenantId = requestedTenantId?.trim() || actor.tenantId;
    const isSuperAdmin = actor.roles.includes('super_admin');
    const isCrossTenant = targetTenantId !== actor.tenantId;
    const canBypassCrossTenant = action === 'retention_policy_update' && isSuperAdmin;

    if (isCrossTenant && !canBypassCrossTenant) {
      this.logAudit({
        tenantId: targetTenantId,
        actorId: actor.sub,
        action,
        decision: 'deny',
        version: null,
        reason: 'Access hors tenant refuse'
      });
      throw new ForbiddenException('Access hors tenant refuse');
    }

    const tenantExists = await this.usersService.existsByTenantId(targetTenantId);
    if (!tenantExists) {
      this.logAudit({
        tenantId: targetTenantId,
        actorId: actor.sub,
        action,
        decision: 'deny',
        version: null,
        reason: 'Tenant cible introuvable'
      });
      throw new NotFoundException('Tenant cible introuvable');
    }

    return targetTenantId;
  }

  private getCurrentFromMemory(tenantId: string): RetentionPolicyView | null {
    const history = this.memoryStore.get(tenantId) ?? [];
    const current = history.find((item) => item.isCurrent);
    if (!current) {
      return null;
    }

    return {
      tenantId: current.tenantId,
      version: current.version,
      retentionDays: current.retentionDays,
      legalHoldEnabled: current.legalHoldEnabled,
      updatedBy: current.updatedBy,
      updatedAt: current.updatedAt
    };
  }

  private upsertInMemory(
    tenantId: string,
    actor: AuthenticatedUser,
    payload: UpdateRetentionPolicyDto
  ): RetentionPolicyView {
    const history = this.memoryStore.get(tenantId) ?? [];
    const current = history.find((item) => item.isCurrent);
    if (current) {
      current.isCurrent = false;
      current.updatedAt = new Date().toISOString();
    }

    const now = new Date().toISOString();
    const nextVersion = (current?.version ?? 0) + 1;
    const record: RetentionPolicyRecord = {
      id: randomUUID(),
      tenantId,
      policyKey: POLICY_KEY,
      version: nextVersion,
      retentionDays: payload.retentionDays,
      legalHoldEnabled: payload.legalHoldEnabled,
      isCurrent: true,
      updatedBy: actor.sub,
      createdAt: now,
      updatedAt: now
    };

    history.push(record);
    this.memoryStore.set(tenantId, history);

    return {
      tenantId: record.tenantId,
      version: record.version,
      retentionDays: record.retentionDays,
      legalHoldEnabled: record.legalHoldEnabled,
      updatedBy: record.updatedBy,
      updatedAt: record.updatedAt
    };
  }

  private async getCurrentFromPostgres(tenantId: string): Promise<RetentionPolicyView | null> {
    const result = await this.runPostgresQuery<{
      tenant_id: string;
      version: number;
      retention_days: number;
      legal_hold_enabled: boolean;
      updated_by: string;
      updated_at: Date;
    }>(
      `
        SELECT tenant_id, version, retention_days, legal_hold_enabled, updated_by, updated_at
        FROM public.tenant_retention_policies
        WHERE tenant_id = $1
          AND policy_key = $2
          AND is_current = true
        LIMIT 1
      `,
      [tenantId, POLICY_KEY]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      tenantId: row.tenant_id,
      version: row.version,
      retentionDays: row.retention_days,
      legalHoldEnabled: row.legal_hold_enabled,
      updatedBy: row.updated_by,
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  private async upsertInPostgres(
    tenantId: string,
    actor: AuthenticatedUser,
    payload: UpdateRetentionPolicyDto
  ): Promise<RetentionPolicyView> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const recordId = randomUUID();
        const result = await this.runPostgresQuery<{
          tenant_id: string;
          version: number;
          retention_days: number;
          legal_hold_enabled: boolean;
          updated_by: string;
          updated_at: Date;
        }>(
          `
            WITH lock_tenant_policy AS (
              SELECT pg_advisory_xact_lock(hashtext($1 || ':' || $2))
            ), current_version AS (
              SELECT COALESCE(MAX(version), 0) AS version
              FROM public.tenant_retention_policies
              WHERE tenant_id = $1 AND policy_key = $2
            ), close_current AS (
              UPDATE public.tenant_retention_policies
              SET is_current = false,
                  updated_at = now()
              WHERE tenant_id = $1
                AND policy_key = $2
                AND is_current = true
            )
            INSERT INTO public.tenant_retention_policies (
              id,
              tenant_id,
              policy_key,
              version,
              retention_days,
              legal_hold_enabled,
              is_current,
              updated_by
            )
            SELECT
              $3,
              $1,
              $2,
              current_version.version + 1,
              $4,
              $5,
              true,
              $6
            FROM current_version, lock_tenant_policy
            RETURNING tenant_id, version, retention_days, legal_hold_enabled, updated_by, updated_at
          `,
          [tenantId, POLICY_KEY, recordId, payload.retentionDays, payload.legalHoldEnabled, actor.sub]
        );

        const row = result.rows[0];

        return {
          tenantId: row.tenant_id,
          version: row.version,
          retentionDays: row.retention_days,
          legalHoldEnabled: row.legal_hold_enabled,
          updatedBy: row.updated_by,
          updatedAt: new Date(row.updated_at).toISOString()
        };
      } catch (error) {
        const dbError = error as DatabaseError;
        if (
          dbError.code === '23505' &&
          dbError.constraint?.startsWith('uq_tenant_retention_policies') &&
          attempt < maxAttempts
        ) {
          continue;
        }

        if (dbError.code === '23505' && dbError.constraint?.startsWith('uq_tenant_retention_policies')) {
          throw new ConflictException('Conflit de version sur la politique de retention. Reessayez.');
        }

        throw error;
      }
    }

    throw new ConflictException('Conflit de version sur la politique de retention. Reessayez.');
  }

  private buildDefaultPolicy(tenantId: string): RetentionPolicyView {
    return {
      tenantId,
      version: 0,
      retentionDays: DEFAULT_RETENTION_DAYS,
      legalHoldEnabled: false,
      updatedBy: null,
      updatedAt: null
    };
  }

  private logAudit(event: RetentionPolicyAuditEvent): void {
    this.logger.log(
      JSON.stringify({
        tenantId: event.tenantId,
        actorId: event.actorId,
        action: event.action,
        decision: event.decision,
        version: event.version,
        reason: event.reason,
        timestamp: new Date().toISOString()
      })
    );
  }

  private async runPostgresQuery<T extends object>(
    text: string,
    values: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const result = await this.postgresService.query<T>(text, values);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } catch (error) {
      const dbError = error as DatabaseError;
      if (dbError.code === '42P01') {
        throw new Error(
          'Missing tenant_retention_policies table. Run `pnpm run db:migrate` before starting tenant policy storage in postgres mode.'
        );
      }

      throw error;
    }
  }
}
