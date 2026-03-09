import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import { TresorerieService } from '../tresorerie/tresorerie.service';
import type {
  CreateInternalControlActionPlanDto,
  InternalControlActionPlanListQueryDto,
  UpdateInternalControlActionPlanDto,
} from './dto/controle-interne.dto';
import type { InternalControlActionPlanView, InternalControlPlanStatus } from './controle-interne.types';

interface ActionPlanRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  exercice_id: string;
  title: string;
  description: string | null;
  owner_user_id: string;
  due_date: Date | string;
  priority: string;
  status: InternalControlPlanStatus;
  source_type: string;
  source_id: string;
  entity_id: string | null;
  exception_id: string | null;
  correlation_id: string | null;
  evidence_refs: string[] | null;
  rejection_reason: string | null;
  resolution_note: string | null;
  created_by: string;
  updated_by: string;
  created_at: Date | string;
  updated_at: Date | string;
  total_count?: string | number;
}

interface ActionPlanEventRow extends QueryResultRow {
  id: string;
  action_plan_id: string;
  tenant_id: string;
  exercice_id: string;
  event_type: 'created' | 'updated' | 'status_changed';
  changed_by: string;
  reason: string | null;
  payload: Record<string, unknown>;
  created_at: Date | string;
}

@Injectable()
export class ControleInterneService {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly tresorerieService: TresorerieService
  ) {}

  async getWorkspace(actor: AuthenticatedUser, exerciceId: string) {
    const [supervision, audit, metrics] = await Promise.all([
      this.tresorerieService.getSupervision(actor, exerciceId),
      this.tresorerieService.getExceptionAudit(actor, { exerciceId, page: 1, pageSize: 10 }),
      this.getActionPlanMetrics(actor.tenantId, exerciceId),
    ]);

    return {
      exerciceId,
      generatedAt: new Date().toISOString(),
      roleStrategy: {
        requiredPermission: 'referentiels:audit:read',
        mappedRoles: ['auditeur', 'directeur_financier', 'admin_client', 'super_admin'],
        note: 'Le role metier "controleur interne" est mappe aux roles RBAC existants via la permission d audit.',
      },
      summary: {
        openDiscrepancies: supervision.qualifiedDiscrepancies + supervision.pendingReconciliations,
        activeExceptions: supervision.activeExceptions,
        overdueActionPlans: metrics.overdue,
        totalActionPlans: metrics.total,
      },
      controlItems: [
        ...supervision.alerts.map((alert) => ({
          id: `alert-${alert.key}`,
          itemType: 'ecart',
          severity: alert.severity,
          sourceType: 'tresorerie-supervision',
          sourceId: alert.code,
          label: alert.label,
          message: alert.message,
          status: 'open',
          createdAt: supervision.generatedAt,
        })),
        ...audit.items.map((item) => ({
          id: item.id,
          itemType: 'exception',
          severity: item.severity,
          sourceType: item.sourceType,
          sourceId: item.sourceId ?? item.id,
          exceptionId: item.id,
          correlationId: item.correlationId,
          label: item.motif,
          message: item.justification,
          status: item.status,
          createdAt: item.createdAt,
        })),
      ],
    };
  }

  async listActionPlans(actor: AuthenticatedUser, query: InternalControlActionPlanListQueryDto) {
    const values: unknown[] = [actor.tenantId, query.exerciceId];
    const where: string[] = ['tenant_id = $1', 'exercice_id = $2'];

    if (query.status) {
      values.push(query.status);
      where.push(`status = $${values.length}`);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    values.push(pageSize, offset);

    const result = await this.postgresService.query<ActionPlanRow>(
      `
        SELECT *, COUNT(*) OVER() AS total_count
        FROM public.internal_control_action_plans
        WHERE ${where.join(' AND ')}
        ORDER BY due_date ASC, created_at DESC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}
      `,
      values
    );

    const total = Number(result.rows[0]?.total_count ?? 0);

    return {
      items: result.rows.map((row) => this.mapActionPlan(row)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 1 : Math.ceil(total / pageSize),
      },
    };
  }

  async createActionPlan(actor: AuthenticatedUser, input: CreateInternalControlActionPlanDto) {
    if (input.status === 'rejete' && !input.rejectionReason?.trim()) {
      throw new BadRequestException('Le motif de rejet est obligatoire pour le statut rejete.');
    }

    const inserted = await this.postgresService.withTransaction(async (executor) => {
      const result = await executor.query<ActionPlanRow>(
        `
          INSERT INTO public.internal_control_action_plans (
            tenant_id,
            exercice_id,
            title,
            description,
            owner_user_id,
            due_date,
            priority,
            status,
            source_type,
            source_id,
            entity_id,
            exception_id,
            correlation_id,
            evidence_refs,
            rejection_reason,
            resolution_note,
            created_by,
            updated_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9, $10, $11, $12, $13, $14::text[], $15, $16, $17, $17
          )
          RETURNING *
        `,
        [
          actor.tenantId,
          input.exerciceId,
          input.title,
          input.description ?? null,
          input.ownerUserId,
          input.dueDate,
          input.priority,
          input.status,
          input.sourceType,
          input.sourceId,
          input.entityId ?? null,
          input.exceptionId ?? null,
          input.correlationId ?? null,
          input.evidenceRefs ?? [],
          input.rejectionReason ?? null,
          input.resolutionNote ?? null,
          actor.sub,
        ]
      );

      const row = result.rows[0];
      await executor.query(
        `
          INSERT INTO public.internal_control_action_plan_events (
            action_plan_id,
            tenant_id,
            exercice_id,
            event_type,
            changed_by,
            reason,
            payload
          ) VALUES ($1, $2, $3, 'created', $4, null, $5::jsonb)
        `,
        [row.id, row.tenant_id, row.exercice_id, actor.sub, JSON.stringify({ after: row })]
      );

      return row;
    });

    return this.mapActionPlan(inserted);
  }

  async listActionPlanEvents(actor: AuthenticatedUser, actionPlanId: string, exerciceId: string) {
    const exists = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.internal_control_action_plans
        WHERE id = $1
          AND tenant_id = $2
          AND exercice_id = $3
        LIMIT 1
      `,
      [actionPlanId, actor.tenantId, exerciceId]
    );

    if (exists.rowCount === 0) {
      throw new NotFoundException('Plan d action introuvable pour ce tenant/exercice.');
    }

    const events = await this.postgresService.query<ActionPlanEventRow>(
      `
        SELECT *
        FROM public.internal_control_action_plan_events
        WHERE action_plan_id = $1
          AND tenant_id = $2
          AND exercice_id = $3
        ORDER BY created_at DESC
      `,
      [actionPlanId, actor.tenantId, exerciceId]
    );

    return {
      items: events.rows.map((event) => ({
        id: event.id,
        actionPlanId: event.action_plan_id,
        tenantId: event.tenant_id,
        exerciceId: event.exercice_id,
        eventType: event.event_type,
        changedBy: event.changed_by,
        reason: event.reason ?? undefined,
        payload: event.payload,
        createdAt: this.toIsoString(event.created_at),
      })),
    };
  }

  async updateActionPlan(
    actor: AuthenticatedUser,
    actionPlanId: string,
    exerciceId: string,
    input: UpdateInternalControlActionPlanDto
  ) {
    if (input.status === 'rejete' && !input.rejectionReason?.trim()) {
      throw new BadRequestException('Le motif de rejet est obligatoire pour le statut rejete.');
    }

    const existingResult = await this.postgresService.query<ActionPlanRow>(
      `
        SELECT *
        FROM public.internal_control_action_plans
        WHERE id = $1
          AND tenant_id = $2
          AND exercice_id = $3
        LIMIT 1
      `,
      [actionPlanId, actor.tenantId, exerciceId]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      throw new NotFoundException('Plan d action introuvable pour ce tenant/exercice.');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    const pushUpdate = (column: string, value: unknown) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (typeof input.title === 'string') {
      pushUpdate('title', input.title);
    }
    if (typeof input.description === 'string') {
      pushUpdate('description', input.description);
    }
    if (typeof input.ownerUserId === 'string') {
      pushUpdate('owner_user_id', input.ownerUserId);
    }
    if (typeof input.dueDate === 'string') {
      pushUpdate('due_date', input.dueDate);
    }
    if (typeof input.priority === 'string') {
      pushUpdate('priority', input.priority);
    }
    if (typeof input.status === 'string') {
      pushUpdate('status', input.status);
    }
    if (Array.isArray(input.evidenceRefs)) {
      pushUpdate('evidence_refs', input.evidenceRefs);
    }
    if (typeof input.rejectionReason === 'string') {
      pushUpdate('rejection_reason', input.rejectionReason);
    }
    if (typeof input.resolutionNote === 'string') {
      pushUpdate('resolution_note', input.resolutionNote);
    }

    if (updates.length === 0) {
      throw new BadRequestException('Aucune mise a jour fournie.');
    }

    pushUpdate('updated_by', actor.sub);
    updates.push('updated_at = now()');

    values.push(actionPlanId, actor.tenantId, exerciceId);

    const updatedResult = await this.postgresService.withTransaction(async (executor) => {
      const updated = await executor.query<ActionPlanRow>(
        `
          UPDATE public.internal_control_action_plans
          SET ${updates.join(', ')}
          WHERE id = $${values.length - 2}
            AND tenant_id = $${values.length - 1}
            AND exercice_id = $${values.length}
          RETURNING *
        `,
        values
      );

      const row = updated.rows[0];
      const eventType = input.status && input.status !== existing.status ? 'status_changed' : 'updated';
      await executor.query(
        `
          INSERT INTO public.internal_control_action_plan_events (
            action_plan_id,
            tenant_id,
            exercice_id,
            event_type,
            changed_by,
            reason,
            payload
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        `,
        [
          row.id,
          row.tenant_id,
          row.exercice_id,
          eventType,
          actor.sub,
          input.reason ?? null,
          JSON.stringify({
            before: this.mapActionPlan(existing),
            after: this.mapActionPlan(row),
          }),
        ]
      );

      return row;
    });

    return this.mapActionPlan(updatedResult);
  }

  private async getActionPlanMetrics(tenantId: string, exerciceId: string) {
    const result = await this.postgresService.query<{
      total_count: string | number;
      overdue_count: string | number;
    }>(
      `
        SELECT
          COUNT(*) AS total_count,
          COUNT(*) FILTER (
            WHERE status IN ('a_traiter', 'en_cours')
              AND due_date < now()
          ) AS overdue_count
        FROM public.internal_control_action_plans
        WHERE tenant_id = $1
          AND exercice_id = $2
      `,
      [tenantId, exerciceId]
    );

    return {
      total: Number(result.rows[0]?.total_count ?? 0),
      overdue: Number(result.rows[0]?.overdue_count ?? 0),
    };
  }

  private mapActionPlan(row: ActionPlanRow): InternalControlActionPlanView {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      exerciceId: row.exercice_id,
      title: row.title,
      description: row.description ?? undefined,
      ownerUserId: row.owner_user_id,
      dueDate: this.toIsoString(row.due_date),
      priority: row.priority as InternalControlActionPlanView['priority'],
      status: row.status,
      sourceType: row.source_type,
      sourceId: row.source_id,
      entityId: row.entity_id ?? undefined,
      exceptionId: row.exception_id ?? undefined,
      correlationId: row.correlation_id ?? undefined,
      evidenceRefs: row.evidence_refs ?? [],
      rejectionReason: row.rejection_reason ?? undefined,
      resolutionNote: row.resolution_note ?? undefined,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: this.toIsoString(row.created_at),
      updatedAt: this.toIsoString(row.updated_at),
    };
  }

  private toIsoString(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }
}
