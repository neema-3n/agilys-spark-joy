import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CashRiskBlockedException } from '../cash-risk/cash-risk-blocked.exception';
import { CashRiskService } from '../cash-risk/cash-risk.service';
import type { CashRiskDecision, CashRiskInput, CashRiskTransition } from '../cash-risk/cash-risk.types';
import { PostgresService } from '../common/postgres.service';
import { CreateWorkflowExceptionDto } from './dto/create-workflow-exception.dto';
import { ListWorkflowExceptionsDto } from './dto/list-workflow-exceptions.dto';
import { VoteWorkflowExceptionDto } from './dto/vote-workflow-exception.dto';
import {
  WorkflowExceptionBusinessException,
  WorkflowExceptionForbiddenException,
} from './workflow-exceptions.errors';
import type {
  WorkflowExceptionEventView,
  WorkflowExceptionStatus,
  WorkflowExceptionTransitionInput,
  WorkflowExceptionView,
  WorkflowExceptionVoteDecision,
  WorkflowExceptionVoteView,
} from './workflow-exceptions.types';

interface WorkflowExceptionRow {
  id: string;
  tenant_id: string;
  exercice_id: string;
  status: WorkflowExceptionStatus;
  transition: CashRiskTransition;
  source_type: CashRiskInput['sourceType'];
  source_id: string | null;
  entity_id: string | null;
  correlation_id: string;
  motif: string;
  justification: string;
  urgence: 'faible' | 'normale' | 'haute' | 'critique';
  quorum_required: number;
  expires_at: string | Date;
  requested_by: string;
  approved_at: string | Date | null;
  decided_at: string | Date | null;
  consumed_at: string | Date | null;
  consumed_by: string | null;
  consumed_transition: CashRiskTransition | null;
  risk_decision: CashRiskDecision;
  created_at: string | Date;
  updated_at: string | Date;
}

interface WorkflowExceptionVoteRow {
  id: string;
  actor_user_id: string;
  actor_roles: string[];
  decision: WorkflowExceptionVoteDecision;
  commentaire: string | null;
  created_at: string | Date;
}

interface WorkflowExceptionEventRow {
  id: string;
  actor_user_id: string;
  actor_roles: string[];
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string | Date;
}

const DEFAULT_QUORUM = 2;
const APPROVER_ROLES = new Set(['super_admin', 'admin_client', 'directeur_financier', 'comptable']);

@Injectable()
export class WorkflowExceptionsService {
  private readonly logger = new Logger('WorkflowExceptionsAudit');

  constructor(
    private readonly postgresService: PostgresService,
    private readonly cashRiskService: CashRiskService
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateWorkflowExceptionDto): Promise<WorkflowExceptionView> {
    const motif = dto.motif?.trim();
    const justification = dto.justification?.trim();
    if (!motif || !justification) {
      throw new WorkflowExceptionBusinessException(
        'TRANSITION_CIBLE_INCOHERENTE',
        'Le motif et la justification sont obligatoires pour soumettre une exception.'
      );
    }

    const expiresAt = new Date(dto.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new WorkflowExceptionBusinessException(
        'TRANSITION_CIBLE_INCOHERENTE',
        "La date d'expiration doit être strictement future."
      );
    }

    const decision = await this.cashRiskService.evaluate(actor, {
      exerciceId: dto.exerciceId,
      transition: dto.transition,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      entityId: dto.entityId,
      amount: dto.amount,
    });

    if (decision.decision !== 'block') {
      throw new WorkflowExceptionBusinessException(
        'TRANSITION_CIBLE_INCOHERENTE',
        "La transition cible n'est pas actuellement bloquée par le moteur cash-risk."
      );
    }

    if (dto.correlationId && dto.correlationId !== decision.snapshot.correlationId) {
      throw new WorkflowExceptionBusinessException(
        'TRANSITION_CIBLE_INCOHERENTE',
        'Le correlationId fourni ne correspond pas à la décision de blocage courante.'
      );
    }

    const quorumRequired = await this.resolveQuorumRequired(actor.tenantId);
    const insertResult = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.workflow_exceptions (
          tenant_id,
          exercice_id,
          status,
          transition,
          source_type,
          source_id,
          entity_id,
          correlation_id,
          motif,
          justification,
          urgence,
          quorum_required,
          expires_at,
          requested_by,
          risk_decision
        )
        VALUES (
          $1,
          $2,
          'soumise',
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14::jsonb
        )
        RETURNING id
      `,
      [
        actor.tenantId,
        dto.exerciceId,
        dto.transition,
        dto.sourceType,
        dto.sourceId ?? null,
        dto.entityId ?? null,
        decision.snapshot.correlationId,
        motif,
        justification,
        dto.urgence,
        quorumRequired,
        expiresAt.toISOString(),
        actor.sub,
        JSON.stringify(decision),
      ]
    );

    const id = insertResult.rows[0]?.id;
    if (!id) {
      throw new NotFoundException("Impossible de créer la demande d'exception.");
    }

    await this.insertEvent(id, actor, 'soumise', {
      commentaire: 'Demande créée',
      quorumRequired,
      correlationId: decision.snapshot.correlationId,
    });

    return this.getById(actor, id, dto.exerciceId);
  }

  async list(actor: AuthenticatedUser, query: ListWorkflowExceptionsDto): Promise<WorkflowExceptionView[]> {
    const values: unknown[] = [actor.tenantId, query.exerciceId];
    const where: string[] = ['tenant_id = $1', 'exercice_id = $2'];

    if (query.status) {
      values.push(query.status);
      where.push(`status = $${values.length}`);
    }

    if (query.transition) {
      values.push(query.transition);
      where.push(`transition = $${values.length}`);
    }

    const rowsResult = await this.postgresService.query<WorkflowExceptionRow>(
      `
        SELECT *
        FROM public.workflow_exceptions
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC
      `,
      values
    );

    return Promise.all(rowsResult.rows.map((row) => this.mapExceptionRow(actor, row)));
  }

  async getById(actor: AuthenticatedUser, id: string, exerciceId?: string): Promise<WorkflowExceptionView> {
    const values: unknown[] = [id, actor.tenantId];
    const extraExerciceFilter = exerciceId ? ` AND exercice_id = $3` : '';
    if (exerciceId) {
      values.push(exerciceId);
    }

    const result = await this.postgresService.query<WorkflowExceptionRow>(
      `
        SELECT *
        FROM public.workflow_exceptions
        WHERE id = $1
          AND tenant_id = $2
          ${extraExerciceFilter}
        LIMIT 1
      `,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Demande d\'exception introuvable');
    }

    return this.mapExceptionRow(actor, row);
  }

  async vote(actor: AuthenticatedUser, id: string, dto: VoteWorkflowExceptionDto): Promise<WorkflowExceptionView> {
    this.assertEligibleApprover(actor);

    const current = await this.getById(actor, id, dto.exerciceId);
    if (current.status !== 'soumise') {
      throw this.buildStatusError(current.status);
    }

    if (new Date(current.expiresAt).getTime() <= Date.now()) {
      await this.markExpired(id, actor, 'Expiration atteinte avant vote');
      throw new WorkflowExceptionBusinessException(
        'EXCEPTION_EXPIREE',
        "La demande d'exception est expirée et ne peut plus être votée."
      );
    }

    const existingVoteResult = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.workflow_exception_votes
        WHERE exception_id = $1
          AND actor_user_id = $2
        LIMIT 1
      `,
      [id, actor.sub]
    );

    if (existingVoteResult.rows.length > 0) {
      throw new WorkflowExceptionBusinessException('DOUBLE_VOTE', 'Un même utilisateur ne peut voter qu\'une seule fois.');
    }

    await this.postgresService.query(
      `
        INSERT INTO public.workflow_exception_votes (
          exception_id,
          actor_user_id,
          actor_roles,
          decision,
          commentaire
        )
        VALUES ($1, $2, $3::text[], $4, $5)
      `,
      [id, actor.sub, actor.roles, dto.decision, dto.commentaire ?? null]
    );

    await this.insertEvent(id, actor, 'vote', {
      decision: dto.decision,
      commentaire: dto.commentaire ?? null,
      actorRoles: actor.roles,
    });

    if (dto.decision === 'rejeter') {
      await this.postgresService.query(
        `
          UPDATE public.workflow_exceptions
          SET
            status = 'rejetee',
            decided_at = now(),
            updated_at = now()
          WHERE id = $1
            AND tenant_id = $2
        `,
        [id, actor.tenantId]
      );

      await this.insertEvent(id, actor, 'rejetee', {
        commentaire: dto.commentaire ?? 'Demande rejetée',
      });

      return this.getById(actor, id, dto.exerciceId);
    }

    const quorumResult = await this.postgresService.query<{
      approvals: number;
      approvals_from_others: number;
      quorum_required: number;
    }>(
      `
        SELECT
          COUNT(*) FILTER (WHERE v.decision = 'approuver')::int AS approvals,
          COUNT(*) FILTER (
            WHERE v.decision = 'approuver'
              AND v.actor_user_id <> e.requested_by
          )::int AS approvals_from_others,
          e.quorum_required
        FROM public.workflow_exceptions e
        LEFT JOIN public.workflow_exception_votes v ON v.exception_id = e.id
        WHERE e.id = $1
          AND e.tenant_id = $2
        GROUP BY e.quorum_required
      `,
      [id, actor.tenantId]
    );

    const quorum = quorumResult.rows[0];
    const approvals = Number(quorum?.approvals ?? 0);
    const approvalsFromOthers = Number(quorum?.approvals_from_others ?? 0);
    const quorumRequired = Number(quorum?.quorum_required ?? DEFAULT_QUORUM);

    if (approvals >= quorumRequired && approvalsFromOthers >= 1) {
      await this.postgresService.query(
        `
          UPDATE public.workflow_exceptions
          SET
            status = 'approuvee',
            approved_at = now(),
            decided_at = now(),
            updated_at = now()
          WHERE id = $1
            AND tenant_id = $2
        `,
        [id, actor.tenantId]
      );

      await this.insertEvent(id, actor, 'approuvee', {
        approvals,
        approvalsFromOthers,
        quorumRequired,
      });
    } else if (dto.decision === 'approuver' && current.requestedBy === actor.sub && approvals >= quorumRequired) {
      throw new WorkflowExceptionBusinessException(
        'UTILISATEUR_NON_ELIGIBLE',
        'Le demandeur ne peut pas approuver seul sa propre exception.'
      );
    }

    return this.getById(actor, id, dto.exerciceId);
  }

  async assertTransitionAllowed(actor: AuthenticatedUser, input: WorkflowExceptionTransitionInput): Promise<CashRiskDecision> {
    const decision = await this.cashRiskService.evaluate(actor, input);

    if (decision.decision === 'allow') {
      return decision;
    }

    const existing = await this.findMatchingException(
      actor.tenantId,
      input.exerciceId,
      input.transition,
      input.sourceType,
      input.sourceId,
      input.entityId,
      decision.snapshot.correlationId
    );

    if (!existing) {
      throw new CashRiskBlockedException(decision);
    }

    if (existing.correlation_id !== decision.snapshot.correlationId) {
      throw new WorkflowExceptionBusinessException(
        'TRANSITION_CIBLE_INCOHERENTE',
        'La demande d\'exception ne correspond plus à la décision de blocage active.',
        {
          expectedCorrelationId: decision.snapshot.correlationId,
          exceptionCorrelationId: existing.correlation_id,
        }
      );
    }

    if (existing.status === 'soumise') {
      throw new WorkflowExceptionBusinessException(
        'QUORUM_INCOMPLET',
        "Le quorum d'approbation n'est pas atteint: l'override reste bloqué."
      );
    }

    if (existing.status === 'rejetee') {
      throw new WorkflowExceptionBusinessException('EXCEPTION_REJETEE', "La demande d'exception a été rejetée.");
    }

    if (existing.status === 'expiree') {
      throw new WorkflowExceptionBusinessException('EXCEPTION_EXPIREE', "La demande d'exception est expirée.");
    }

    if (existing.status === 'consommee') {
      throw new WorkflowExceptionBusinessException(
        'EXCEPTION_DEJA_CONSOMMEE',
        "La demande d'exception a déjà été consommée."
      );
    }

    if (new Date(existing.expires_at).getTime() <= Date.now()) {
      await this.markExpired(existing.id, actor, 'Expiration atteinte avant consommation');
      throw new WorkflowExceptionBusinessException('EXCEPTION_EXPIREE', "La demande d'exception est expirée.");
    }

    const consumeResult = await this.postgresService.query<{ id: string }>(
      `
        UPDATE public.workflow_exceptions
        SET
          status = 'consommee',
          consumed_at = now(),
          consumed_by = $2,
          consumed_transition = $3,
          updated_at = now()
        WHERE id = $1
          AND tenant_id = $4
          AND status = 'approuvee'
          AND consumed_at IS NULL
        RETURNING id
      `,
      [existing.id, actor.sub, input.transition, actor.tenantId]
    );

    if ((consumeResult.rowCount ?? 0) === 0) {
      throw new WorkflowExceptionBusinessException(
        'EXCEPTION_DEJA_CONSOMMEE',
        "La demande d'exception est déjà consommée ou n'est plus approuvée."
      );
    }

    await this.insertEvent(existing.id, actor, 'consommee', {
      transition: input.transition,
      sourceId: input.sourceId ?? null,
      entityId: input.entityId ?? null,
      correlationId: decision.snapshot.correlationId,
    });

    this.logger.log(
      JSON.stringify({
        tenantId: actor.tenantId,
        userId: actor.sub,
        action: 'exception_consumed',
        exceptionId: existing.id,
        transition: input.transition,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        entityId: input.entityId ?? null,
        correlationId: decision.snapshot.correlationId,
        timestamp: new Date().toISOString(),
      })
    );

    return decision;
  }

  private async mapExceptionRow(actor: AuthenticatedUser, row: WorkflowExceptionRow): Promise<WorkflowExceptionView> {
    const votesResult = await this.postgresService.query<WorkflowExceptionVoteRow>(
      `
        SELECT id, actor_user_id, actor_roles, decision, commentaire, created_at
        FROM public.workflow_exception_votes
        WHERE exception_id = $1
        ORDER BY created_at ASC
      `,
      [row.id]
    );

    const eventsResult = await this.postgresService.query<WorkflowExceptionEventRow>(
      `
        SELECT id, actor_user_id, actor_roles, event_type, payload, created_at
        FROM public.workflow_exception_events
        WHERE exception_id = $1
        ORDER BY created_at ASC
      `,
      [row.id]
    );

    return {
      id: row.id,
      tenantId: row.tenant_id,
      exerciceId: row.exercice_id,
      status: row.status,
      transition: row.transition,
      sourceType: row.source_type,
      sourceId: row.source_id ?? undefined,
      entityId: row.entity_id ?? undefined,
      correlationId: row.correlation_id,
      motif: row.motif,
      justification: row.justification,
      urgence: row.urgence,
      quorumRequired: Number(row.quorum_required ?? DEFAULT_QUORUM),
      expiresAt: this.toIso(row.expires_at),
      requestedBy: row.requested_by,
      approvedAt: row.approved_at ? this.toIso(row.approved_at) : undefined,
      decidedAt: row.decided_at ? this.toIso(row.decided_at) : undefined,
      consumedAt: row.consumed_at ? this.toIso(row.consumed_at) : undefined,
      consumedBy: row.consumed_by ?? undefined,
      consumedTransition: row.consumed_transition ?? undefined,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
      riskDecision: row.risk_decision,
      votes: votesResult.rows.map((vote): WorkflowExceptionVoteView => ({
        id: vote.id,
        actorUserId: vote.actor_user_id,
        actorRoles: vote.actor_roles,
        decision: vote.decision,
        commentaire: vote.commentaire ?? undefined,
        createdAt: this.toIso(vote.created_at),
      })),
      events: eventsResult.rows.map((event): WorkflowExceptionEventView => ({
        id: event.id,
        actorUserId: event.actor_user_id,
        actorRoles: event.actor_roles,
        eventType: event.event_type,
        payload: event.payload ?? {},
        createdAt: this.toIso(event.created_at),
      })),
    };
  }

  private async findMatchingException(
    tenantId: string,
    exerciceId: string,
    transition: CashRiskTransition,
    sourceType: CashRiskInput['sourceType'],
    sourceId?: string,
    entityId?: string,
    correlationId?: string
  ): Promise<WorkflowExceptionRow | null> {
    const result = await this.postgresService.query<WorkflowExceptionRow>(
      `
        SELECT *
        FROM public.workflow_exceptions
        WHERE tenant_id = $1
          AND exercice_id = $2
          AND transition = $3
          AND source_type = $4
          AND COALESCE(source_id, '') = COALESCE($5, '')
          AND COALESCE(entity_id, '') = COALESCE($6, '')
          AND ($7::text IS NULL OR correlation_id = $7)
        ORDER BY
          CASE status
            WHEN 'approuvee' THEN 0
            WHEN 'soumise' THEN 1
            WHEN 'rejetee' THEN 2
            WHEN 'expiree' THEN 3
            WHEN 'consommee' THEN 4
            ELSE 5
          END,
          created_at DESC
        LIMIT 1
      `,
      [tenantId, exerciceId, transition, sourceType, sourceId ?? null, entityId ?? null, correlationId ?? null]
    );

    return result.rows[0] ?? null;
  }

  private buildStatusError(status: WorkflowExceptionStatus): Error {
    if (status === 'expiree') {
      return new WorkflowExceptionBusinessException('EXCEPTION_EXPIREE', "La demande d'exception est expirée.");
    }

    if (status === 'consommee') {
      return new WorkflowExceptionBusinessException('EXCEPTION_DEJA_CONSOMMEE', "La demande d'exception est déjà consommée.");
    }

    if (status === 'rejetee') {
      return new WorkflowExceptionBusinessException('EXCEPTION_REJETEE', "La demande d'exception a été rejetée.");
    }

    return new WorkflowExceptionBusinessException('TRANSITION_CIBLE_INCOHERENTE', 'Statut de demande incompatible avec cette action.');
  }

  private assertEligibleApprover(actor: AuthenticatedUser): void {
    const canVote = actor.roles.some((role) => APPROVER_ROLES.has(role));
    if (!canVote) {
      throw new WorkflowExceptionForbiddenException(
        'Utilisateur non éligible: rôle insuffisant pour voter sur une exception.'
      );
    }
  }

  private async resolveQuorumRequired(tenantId: string): Promise<number> {
    const result = await this.postgresService.query<{ quorum_required: number | null }>(
      `
        SELECT quorum_required
        FROM public.workflow_exception_tenant_settings
        WHERE tenant_id = $1
        LIMIT 1
      `,
      [tenantId]
    );

    const quorumRequired = Number(result.rows[0]?.quorum_required ?? DEFAULT_QUORUM);
    return Number.isFinite(quorumRequired) && quorumRequired >= 1 ? quorumRequired : DEFAULT_QUORUM;
  }

  private async markExpired(exceptionId: string, actor: AuthenticatedUser, reason: string): Promise<void> {
    await this.postgresService.query(
      `
        UPDATE public.workflow_exceptions
        SET
          status = 'expiree',
          decided_at = COALESCE(decided_at, now()),
          updated_at = now()
        WHERE id = $1
          AND tenant_id = $2
          AND status IN ('soumise', 'approuvee')
      `,
      [exceptionId, actor.tenantId]
    );

    await this.insertEvent(exceptionId, actor, 'expiree', {
      commentaire: reason,
    });
  }

  private async insertEvent(
    exceptionId: string,
    actor: Pick<AuthenticatedUser, 'sub' | 'roles' | 'tenantId'>,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await this.postgresService.query(
      `
        INSERT INTO public.workflow_exception_events (
          exception_id,
          tenant_id,
          actor_user_id,
          actor_roles,
          event_type,
          payload
        )
        VALUES ($1, $2, $3, $4::text[], $5, $6::jsonb)
      `,
      [exceptionId, actor.tenantId, actor.sub, actor.roles, eventType, JSON.stringify(payload)]
    );
  }

  private toIso(value: string | Date): string {
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }

    return value.toISOString();
  }
}
