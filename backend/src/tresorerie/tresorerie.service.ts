import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CashRiskDecision, CashRiskLevel } from '../cash-risk/cash-risk.types';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import {
  type TresorerieAuditDetailQueryDto,
  type TresorerieAuditQueryDto,
  type TresorerieAuditStatus,
} from './dto/tresorerie.dto';

interface TresorerieAggregateRow {
  available_cash: string | number;
  pending_disbursements: string | number;
  pending_disbursements_count: string | number;
  remaining_engagements: string | number;
  remaining_engagements_count: string | number;
  non_reconciled_operations: string | number;
}

interface WorkflowExceptionAuditRow {
  id: string;
  exercice_id: string;
  status: 'soumise' | 'approuvee' | 'rejetee' | 'expiree' | 'consommee';
  transition: string;
  source_type: 'engagement' | 'paiement' | 'depense';
  source_id: string | null;
  entity_id: string | null;
  correlation_id: string;
  motif: string;
  justification: string;
  quorum_required: number;
  expires_at: Date | string;
  requested_by: string;
  approved_at: Date | string | null;
  decided_at: Date | string | null;
  consumed_at: Date | string | null;
  consumed_by: string | null;
  consumed_transition: string | null;
  risk_decision: CashRiskDecision;
  created_at: Date | string;
  updated_at: Date | string;
  approvers_json: Array<{
    actorUserId: string;
    decision: 'approuver' | 'rejeter';
    commentaire: string | null;
    createdAt: string;
  }> | null;
  total_count: string | number;
}

interface WorkflowExceptionEventRow {
  id: string;
  actor_user_id: string;
  actor_roles: string[];
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: Date | string;
}

interface WorkflowExceptionVoteRow {
  id: string;
  actor_user_id: string;
  actor_roles: string[];
  decision: 'approuver' | 'rejeter';
  commentaire: string | null;
  created_at: Date | string;
}

const ALERT_SEVERITY_ORDER: Record<CashRiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

@Injectable()
export class TresorerieService {
  constructor(private readonly postgresService: PostgresService) {}

  async getStats(actor: AuthenticatedUser, exerciceId: string) {
    const paiementsResult = await this.postgresService.query<{ montant: string | number; date_paiement: Date | string }>(
      `
        SELECT montant, date_paiement
        FROM public.paiements
        WHERE client_id = $1
          AND exercice_id = $2
          AND statut = 'valide'
      `,
      [actor.tenantId, exerciceId]
    );

    const paiements = paiementsResult.rows;
    const totalDecaissements = paiements.reduce((sum, p) => sum + Number(p.montant ?? 0), 0);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const decaissementsMoisEnCours = paiements
      .filter((p) => this.toDateOnly(p.date_paiement).startsWith(currentMonth))
      .reduce((sum, p) => sum + Number(p.montant ?? 0), 0);

    const totalEncaissements = totalDecaissements * 1.15;
    const encaissementsMoisEnCours = decaissementsMoisEnCours * 1.2;
    const soldeActuel = totalEncaissements - totalDecaissements;
    const soldePrevisionnel = soldeActuel * 1.05;
    const variationMensuelle = encaissementsMoisEnCours - decaissementsMoisEnCours;

    return {
      soldeActuel,
      totalEncaissements,
      totalDecaissements,
      soldePrevisionnel,
      variationMensuelle,
      encaissementsMoisEnCours,
      decaissementsMoisEnCours,
    };
  }

  async getFlux(actor: AuthenticatedUser, exerciceId: string) {
    const result = await this.postgresService.query<{
      id: string;
      client_id: string;
      exercice_id: string;
      numero: string;
      montant: string | number;
      date_paiement: Date | string;
      mode_paiement: string | null;
      observations: string | null;
      created_at: Date | string;
      updated_at: Date | string;
      depense_objet: string | null;
    }>(
      `
        SELECT
          p.id,
          p.client_id,
          p.exercice_id,
          p.numero,
          p.montant,
          p.date_paiement,
          p.mode_paiement,
          p.observations,
          p.created_at,
          p.updated_at,
          d.objet AS depense_objet
        FROM public.paiements p
        LEFT JOIN public.depenses d ON d.id = p.depense_id
        WHERE p.client_id = $1
          AND p.exercice_id = $2
          AND p.statut = 'valide'
        ORDER BY p.date_paiement DESC
      `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((p) => ({
      id: p.id,
      clientId: p.client_id,
      exerciceId: p.exercice_id,
      date: this.toDateOnly(p.date_paiement),
      type: 'decaissement' as const,
      categorie: p.mode_paiement || 'Autre',
      libelle: p.depense_objet || `Paiement ${p.numero}`,
      montant: Number(p.montant ?? 0),
      sourceType: 'paiement' as const,
      sourceId: p.id,
      observations: p.observations ?? undefined,
      createdAt: this.toIsoString(p.created_at),
      updatedAt: this.toIsoString(p.updated_at),
    }));
  }

  async getPrevisions(actor: AuthenticatedUser, exerciceId: string) {
    const result = await this.postgresService.query<{
      montant: string | number;
      montant_paye: string | number;
      date_depense: Date | string;
    }>(
      `
        SELECT montant, montant_paye, date_depense
        FROM public.depenses
        WHERE client_id = $1
          AND exercice_id = $2
          AND statut IN ('ordonnancee', 'validee')
      `,
      [actor.tenantId, exerciceId]
    );

    const map = new Map<string, { encaissements: number; decaissements: number }>();

    for (const depense of result.rows) {
      const month = this.toDateOnly(depense.date_depense).slice(0, 7);
      const restant = Number(depense.montant ?? 0) - Number(depense.montant_paye ?? 0);

      if (restant > 0) {
        const current = map.get(month) || { encaissements: 0, decaissements: 0 };
        current.decaissements += restant;
        map.set(month, current);
      }
    }

    let soldeCumul = 0;

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periode, { encaissements, decaissements }]) => {
        soldeCumul += encaissements - decaissements;

        return {
          periode,
          encaissementsPrevus: encaissements,
          decaissementsPrevus: decaissements,
          soldePrevisionnel: soldeCumul,
        };
      });
  }

  async getSupervision(actor: AuthenticatedUser, exerciceId: string) {
    const [aggregateResult, exceptionCounts] = await Promise.all([
      this.postgresService.query<TresorerieAggregateRow>(
        `
          WITH depenses_pending AS (
            SELECT
              COALESCE(SUM(GREATEST(d.montant - d.montant_paye, 0)), 0) AS pending_disbursements,
              COUNT(*) FILTER (WHERE GREATEST(d.montant - d.montant_paye, 0) > 0) AS pending_disbursements_count
            FROM public.depenses d
            WHERE d.client_id = $1
              AND d.exercice_id = $2
              AND d.statut IN ('validee', 'ordonnancee', 'partiellement_payee')
          ),
          engagements_remaining AS (
            SELECT
              COALESCE(SUM(GREATEST(e.montant - COALESCE(dep.total_depenses, 0), 0)), 0) AS remaining_engagements,
              COUNT(*) FILTER (WHERE GREATEST(e.montant - COALESCE(dep.total_depenses, 0), 0) > 0) AS remaining_engagements_count
            FROM public.engagements e
            LEFT JOIN (
              SELECT engagement_id, SUM(montant) AS total_depenses
              FROM public.depenses
              WHERE client_id = $1
                AND exercice_id = $2
                AND engagement_id IS NOT NULL
                AND statut != 'annulee'
              GROUP BY engagement_id
            ) dep ON dep.engagement_id = e.id
            WHERE e.client_id = $1
              AND e.exercice_id = $2
              AND e.statut = 'valide'
          ),
          operations_non_rapprochees AS (
            SELECT COUNT(*) AS non_reconciled_operations
            FROM public.operations_tresorerie ot
            WHERE ot.client_id = $1
              AND ot.exercice_id = $2
              AND ot.statut != 'annulee'
              AND ot.rapproche = false
          )
          SELECT
            COALESCE((SELECT SUM(solde_actuel) FROM public.comptes_tresorerie WHERE client_id = $1 AND statut = 'actif'), 0) AS available_cash,
            depenses_pending.pending_disbursements,
            depenses_pending.pending_disbursements_count,
            engagements_remaining.remaining_engagements,
            engagements_remaining.remaining_engagements_count,
            operations_non_rapprochees.non_reconciled_operations
          FROM depenses_pending, engagements_remaining, operations_non_rapprochees
        `,
        [actor.tenantId, exerciceId]
      ),
      this.postgresService.query<{
        active_exceptions: string | number;
        expired_exceptions: string | number;
        consumed_exceptions: string | number;
      }>(
        `
          SELECT
            COUNT(*) FILTER (WHERE status = 'approuvee') AS active_exceptions,
            COUNT(*) FILTER (WHERE status = 'expiree') AS expired_exceptions,
            COUNT(*) FILTER (WHERE status = 'consommee') AS consumed_exceptions
          FROM public.workflow_exceptions
          WHERE tenant_id = $1
            AND exercice_id = $2
        `,
        [actor.tenantId, exerciceId]
      ),
    ]);

    const row = aggregateResult.rows[0];
    const exceptionRow = exceptionCounts.rows[0];
    const currentPosition = Number(row?.available_cash ?? 0);
    const pendingDisbursements = Number(row?.pending_disbursements ?? 0);
    const remainingCommitments = Number(row?.remaining_engagements ?? 0);
    const nonReconciledOperations = Number(row?.non_reconciled_operations ?? 0);
    const projectedExposure = pendingDisbursements + remainingCommitments;
    const shortTermProjection = currentPosition - projectedExposure;
    const projectedGap = projectedExposure - currentPosition;
    const activeExceptions = Number(exceptionRow?.active_exceptions ?? 0);
    const expiredExceptions = Number(exceptionRow?.expired_exceptions ?? 0);
    const consumedExceptions = Number(exceptionRow?.consumed_exceptions ?? 0);

    const alerts = this.buildDeterministicAlerts({
      currentPosition,
      pendingDisbursements,
      remainingCommitments,
      nonReconciledOperations,
      projectedGap,
      activeExceptions,
      expiredExceptions,
    });

    return {
      exerciceId,
      generatedAt: new Date().toISOString(),
      currentPosition,
      shortTermProjection,
      pendingDisbursements,
      pendingDisbursementsCount: Number(row?.pending_disbursements_count ?? 0),
      remainingCommitments,
      remainingCommitmentsCount: Number(row?.remaining_engagements_count ?? 0),
      nonReconciledOperations,
      projectedExposure,
      projectedGap: Math.max(projectedGap, 0),
      activeExceptions,
      expiredExceptions,
      consumedExceptions,
      alerts,
    };
  }

  async getAlertJournal(actor: AuthenticatedUser, query: TresorerieAuditQueryDto) {
    const supervision = await this.getSupervision(actor, query.exerciceId);
    const audit = await this.getExceptionAudit(actor, query);

    return {
      exerciceId: query.exerciceId,
      generatedAt: supervision.generatedAt,
      alerts: supervision.alerts,
      linkedExceptions: audit.items.map((item) => ({
        id: item.id,
        status: item.status,
        severity: item.severity,
        transition: item.transition,
        correlationId: item.correlationId,
        createdAt: item.createdAt,
      })),
      pagination: audit.pagination,
    };
  }

  async getExceptionAudit(actor: AuthenticatedUser, query: TresorerieAuditQueryDto) {
    const values: unknown[] = [actor.tenantId, query.exerciceId];
    const where: string[] = ['e.tenant_id = $1', 'e.exercice_id = $2'];

    if (query.transition) {
      values.push(query.transition);
      where.push(`e.transition = $${values.length}`);
    }
    if (query.sourceType) {
      values.push(query.sourceType);
      where.push(`e.source_type = $${values.length}`);
    }
    if (query.sourceId) {
      values.push(query.sourceId);
      where.push(`e.source_id = $${values.length}`);
    }
    if (query.entityId) {
      values.push(query.entityId);
      where.push(`e.entity_id = $${values.length}`);
    }
    if (query.decision) {
      values.push(query.decision);
      where.push(`COALESCE(e.risk_decision->>'decision', 'block') = $${values.length}`);
    }
    if (query.severity) {
      values.push(query.severity);
      where.push(`COALESCE(e.risk_decision->>'riskLevel', 'medium') = $${values.length}`);
    }
    if (query.status) {
      values.push(query.status);
      where.push(
        `CASE
           WHEN e.status = 'soumise' THEN 'exception-requested'
           WHEN e.status = 'approuvee' THEN 'exception-approved'
           WHEN e.status = 'expiree' THEN 'exception-expired'
           WHEN e.status = 'consommee' THEN 'executed-under-exception'
           ELSE 'blocked'
         END = $${values.length}`
      );
    }
    if (query.fromDate) {
      values.push(query.fromDate);
      where.push(`e.created_at >= $${values.length}::timestamptz`);
    }
    if (query.toDate) {
      values.push(query.toDate);
      where.push(`e.created_at < ($${values.length}::date + INTERVAL '1 day')`);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    values.push(pageSize, offset);
    const limitParam = values.length - 1;
    const offsetParam = values.length;

    const result = await this.postgresService.query<WorkflowExceptionAuditRow>(
      `
        SELECT
          e.*,
          COALESCE(v.approvers_json, '[]'::jsonb) AS approvers_json,
          COUNT(*) OVER() AS total_count
        FROM public.workflow_exceptions e
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object(
              'actorUserId', actor_user_id,
              'decision', decision,
              'commentaire', commentaire,
              'createdAt', created_at
            )
            ORDER BY created_at ASC
          ) FILTER (WHERE decision = 'approuver') AS approvers_json
          FROM public.workflow_exception_votes v
          WHERE v.exception_id = e.id
        ) v ON TRUE
        WHERE ${where.join(' AND ')}
        ORDER BY e.created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values
    );

    const total = Number(result.rows[0]?.total_count ?? 0);
    const items = result.rows.map((row) => this.mapAuditRow(row));

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 1 : Math.ceil(total / pageSize),
      },
    };
  }

  async getExceptionAuditDetail(actor: AuthenticatedUser, query: TresorerieAuditDetailQueryDto) {
    if (!query.exceptionId && !query.correlationId) {
      throw new BadRequestException('exceptionId ou correlationId est requis.');
    }

    const values: unknown[] = [actor.tenantId, query.exerciceId];
    let identifierCondition = '';
    if (query.exceptionId) {
      values.push(query.exceptionId);
      identifierCondition = `e.id = $${values.length}`;
    } else if (query.correlationId) {
      values.push(query.correlationId);
      identifierCondition = `e.correlation_id = $${values.length}`;
    }

    const result = await this.postgresService.query<WorkflowExceptionAuditRow>(
      `
        SELECT
          e.*,
          COALESCE(v.approvers_json, '[]'::jsonb) AS approvers_json,
          1 AS total_count
        FROM public.workflow_exceptions e
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object(
              'actorUserId', actor_user_id,
              'decision', decision,
              'commentaire', commentaire,
              'createdAt', created_at
            )
            ORDER BY created_at ASC
          ) FILTER (WHERE decision = 'approuver') AS approvers_json
          FROM public.workflow_exception_votes v
          WHERE v.exception_id = e.id
        ) v ON TRUE
        WHERE e.tenant_id = $1
          AND e.exercice_id = $2
          AND ${identifierCondition}
        ORDER BY e.created_at DESC
        LIMIT 1
      `,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Aucune entrée d’audit trouvée pour cet identifiant.');
    }

    const [eventsResult, votesResult] = await Promise.all([
      this.postgresService.query<WorkflowExceptionEventRow>(
        `
          SELECT id, actor_user_id, actor_roles, event_type, payload, created_at
          FROM public.workflow_exception_events
          WHERE exception_id = $1
          ORDER BY created_at ASC
        `,
        [row.id]
      ),
      this.postgresService.query<WorkflowExceptionVoteRow>(
        `
          SELECT id, actor_user_id, actor_roles, decision, commentaire, created_at
          FROM public.workflow_exception_votes
          WHERE exception_id = $1
          ORDER BY created_at ASC
        `,
        [row.id]
      ),
    ]);

    return {
      ...this.mapAuditRow(row),
      votes: votesResult.rows.map((vote) => ({
        id: vote.id,
        actorUserId: vote.actor_user_id,
        actorRoles: vote.actor_roles ?? [],
        decision: vote.decision,
        commentaire: vote.commentaire ?? undefined,
        createdAt: this.toIsoString(vote.created_at),
      })),
      events: eventsResult.rows.map((event) => ({
        id: event.id,
        actorUserId: event.actor_user_id,
        actorRoles: event.actor_roles ?? [],
        eventType: event.event_type,
        payload: event.payload ?? {},
        createdAt: this.toIsoString(event.created_at),
      })),
    };
  }

  async getExceptionAuditExportPrep(actor: AuthenticatedUser, query: TresorerieAuditQueryDto) {
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const audit = await this.getExceptionAudit(actor, { ...query, page: 1, pageSize });

    return {
      generatedAt: new Date().toISOString(),
      scope: {
        exerciceId: query.exerciceId,
        tenantId: actor.tenantId,
      },
      suggestedFileName: `audit-exceptions-${query.exerciceId}-${new Date().toISOString().slice(0, 10)}.json`,
      fields: [
        'id',
        'status',
        'severity',
        'transition',
        'decision',
        'correlationId',
        'requestedBy',
        'approvedAt',
        'consumedAt',
        'createdAt',
      ],
      totalEntries: audit.pagination.total,
      preview: audit.items,
    };
  }

  private mapAuditRow(row: WorkflowExceptionAuditRow) {
    const status = this.mapAuditStatus(row.status);
    const severity = (row.risk_decision?.riskLevel ?? 'medium') as CashRiskLevel;
    const approvers = (row.approvers_json ?? []).map((entry) => ({
      actorUserId: entry.actorUserId,
      decision: entry.decision,
      commentaire: entry.commentaire ?? undefined,
      createdAt: this.toIsoString(entry.createdAt),
    }));

    return {
      id: row.id,
      exerciceId: row.exercice_id,
      status,
      severity,
      decision: row.risk_decision?.decision ?? 'block',
      transition: row.transition,
      sourceType: row.source_type,
      sourceId: row.source_id ?? undefined,
      entityId: row.entity_id ?? undefined,
      correlationId: row.correlation_id,
      motif: row.motif,
      justification: row.justification,
      quorumRequired: row.quorum_required,
      requestedBy: row.requested_by,
      approvedAt: row.approved_at ? this.toIsoString(row.approved_at) : undefined,
      decidedAt: row.decided_at ? this.toIsoString(row.decided_at) : undefined,
      consumedAt: row.consumed_at ? this.toIsoString(row.consumed_at) : undefined,
      consumedBy: row.consumed_by ?? undefined,
      consumedTransition: row.consumed_transition ?? undefined,
      expiresAt: this.toIsoString(row.expires_at),
      createdAt: this.toIsoString(row.created_at),
      updatedAt: this.toIsoString(row.updated_at),
      reasons: row.risk_decision?.reasons ?? [],
      snapshot: row.risk_decision?.snapshot,
      approvers,
    };
  }

  private mapAuditStatus(status: WorkflowExceptionAuditRow['status']): TresorerieAuditStatus {
    switch (status) {
      case 'soumise':
        return 'exception-requested';
      case 'approuvee':
        return 'exception-approved';
      case 'expiree':
        return 'exception-expired';
      case 'consommee':
        return 'executed-under-exception';
      default:
        return 'blocked';
    }
  }

  private buildDeterministicAlerts(input: {
    currentPosition: number;
    pendingDisbursements: number;
    remainingCommitments: number;
    projectedGap: number;
    nonReconciledOperations: number;
    activeExceptions: number;
    expiredExceptions: number;
  }) {
    const alerts: Array<{
      key: string;
      severity: CashRiskLevel;
      code: string;
      label: string;
      message: string;
      value: number;
      threshold: number;
    }> = [];

    if (input.projectedGap > 0) {
      alerts.push({
        key: 'liquidity-gap',
        severity: 'critical',
        code: 'LIQUIDITY_GAP',
        label: 'Tension de liquidité',
        message: `Le besoin projeté dépasse la position courante de ${input.projectedGap.toFixed(2)}.`,
        value: input.projectedGap,
        threshold: 0,
      });
    }

    if (input.nonReconciledOperations > 0) {
      alerts.push({
        key: 'non-reconciled',
        severity: input.nonReconciledOperations >= 10 ? 'high' : 'medium',
        code: 'NON_RECONCILED_OPERATIONS',
        label: 'Opérations non rapprochées',
        message: `${input.nonReconciledOperations} opération(s) non rapprochée(s) augmentent le risque de suivi.`,
        value: input.nonReconciledOperations,
        threshold: 0,
      });
    }

    if (input.currentPosition > 0 && input.remainingCommitments / input.currentPosition >= 0.7) {
      alerts.push({
        key: 'commitment-concentration',
        severity: 'high',
        code: 'COMMITMENT_CONCENTRATION',
        label: 'Concentration des engagements',
        message: 'Les engagements restants représentent au moins 70% de la position courante.',
        value: input.remainingCommitments,
        threshold: input.currentPosition * 0.7,
      });
    }

    if (input.activeExceptions > 0) {
      alerts.push({
        key: 'active-exceptions',
        severity: 'high',
        code: 'ACTIVE_EXCEPTIONS',
        label: 'Exceptions actives',
        message: `${input.activeExceptions} exception(s) approuvée(s) sont toujours actives.`,
        value: input.activeExceptions,
        threshold: 0,
      });
    }

    if (input.expiredExceptions > 0) {
      alerts.push({
        key: 'expired-exceptions',
        severity: 'critical',
        code: 'EXPIRED_EXCEPTIONS',
        label: 'Exceptions expirées',
        message: `${input.expiredExceptions} exception(s) ont expiré sans résolution complète.`,
        value: input.expiredExceptions,
        threshold: 0,
      });
    }

    return alerts.sort((a, b) => ALERT_SEVERITY_ORDER[b.severity] - ALERT_SEVERITY_ORDER[a.severity]);
  }

  private toDateOnly(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return value.slice(0, 10);
  }

  private toIsoString(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }
}
