import { createHash } from 'node:crypto';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CashRiskDecision, CashRiskLevel } from '../cash-risk/cash-risk.types';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import {
  type AuditDossierStatus,
  type CloseoutDossierQueryDto,
  type CloseoutDossierStatus,
  type CloseoutDossierType,
  type TresorerieAuditDossierQueryDto,
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
  pending_reconciliations: string | number;
  qualified_discrepancies: string | number;
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

interface ExerciceClotureEventRow {
  id: string;
  event_type: 'pre_cloture' | 'cloture' | 'reouverture';
  status_from: string | null;
  status_to: string | null;
  decision: 'accepted' | 'blocked' | 'rejected';
  actor_user_id: string;
  payload: Record<string, unknown> | null;
  checklist: Record<string, unknown> | null;
  created_at: Date | string;
}

interface CloseoutEvidenceRequirement {
  id: string;
  section: 'evidences' | 'reconciliation' | 'decision_log' | 'exceptions' | 'signatures' | 'manifest';
  description: string;
  sourceType: 'artifact' | 'cloture_event' | 'audit_exception';
  critical: boolean;
  patterns?: RegExp[];
}

interface CloseoutEvidenceEntry {
  requirementId: string;
  section: CloseoutEvidenceRequirement['section'];
  description: string;
  sourceType: CloseoutEvidenceRequirement['sourceType'];
  source: string;
  checksum: string;
  sizeBytes: number;
  timestamp: string;
  scope: {
    tenantId: string;
    exerciceId: string;
    migrationBatchId?: string;
  };
  authorUserId?: string;
  status: 'covered' | 'missing';
}

interface CloseoutReconciliationSummary {
  found: boolean;
  batchId?: string;
  decision?: 'GO' | 'NO_GO';
  anomalies?: {
    critical: number;
    high: number;
    medium: number;
  };
  scopeValidated: boolean;
  scopeIssues: string[];
  reportFiles: string[];
}

interface ExceptionAuditDossierEvidenceEntry {
  id: string;
  section: 'scope' | 'timeline' | 'decision_log' | 'evidences' | 'coverage' | 'manifest' | 'deliverables';
  objective: string;
  sourceType: 'audit_exception' | 'audit_event' | 'audit_vote' | 'artifact';
  sourceId: string;
  correlationId: string;
  status: 'covered' | 'partial' | 'missing';
  reason?: string;
  authorUserId?: string;
  timestamp: string;
}

interface ExceptionAuditDossierCoverageEntry {
  section: ExceptionAuditDossierEvidenceEntry['section'];
  objective: string;
  status: 'covered' | 'partial' | 'missing';
  critical: boolean;
  evidenceIds: string[];
  reason?: string;
}

interface ExceptionAuditDossierManifestEntry {
  section: ExceptionAuditDossierEvidenceEntry['section'];
  fileName: string;
  checksum: string;
  sizeBytes: number;
  generatedAt: string;
}

const CLOSEOUT_EVIDENCE_REQUIREMENTS: CloseoutEvidenceRequirement[] = [
  {
    id: 'EV-64-CHECKLIST',
    section: 'evidences',
    description: 'Checklist pre-cloture et journal de decisions de cloture/reouverture',
    sourceType: 'cloture_event',
    critical: true,
  },
  {
    id: 'EV-65-SUPERVISION',
    section: 'exceptions',
    description: 'Signaux de supervision tresorerie et ecarts qualifies',
    sourceType: 'audit_exception',
    critical: true,
  },
  {
    id: 'EV-M23-RECONCILIATION',
    section: 'reconciliation',
    description: 'Rapports migration reconciliation avant/apres (JSON/CSV/Markdown)',
    sourceType: 'artifact',
    critical: true,
    patterns: [/^migration-reconciliation-.*\.(json|csv|md)$/],
  },
  {
    id: 'EV-M42-AUDIT-MANIFEST',
    section: 'manifest',
    description: 'Pattern manifeste SHA-256 et package d audit migration',
    sourceType: 'artifact',
    critical: false,
    patterns: [/^m4-2-audit-manifest-.*\.json$/, /^m4-2-audit-package-.*\.zip$/],
  },
];

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
          ),
          rapprochements_en_attente AS (
            SELECT COUNT(*) AS pending_reconciliations
            FROM public.rapprochements_bancaires rb
            WHERE rb.client_id = $1
              AND rb.exercice_id = $2
              AND rb.statut != 'annule'
              AND rb.statut_detaille IN ('a_traiter', 'en_attente_validation')
          ),
          ecarts_qualifies AS (
            SELECT COUNT(*) AS qualified_discrepancies
            FROM public.rapprochement_bancaire_lignes rbl
            WHERE rbl.client_id = $1
              AND rbl.exercice_id = $2
              AND rbl.statut = 'ecart_qualifie'
          )
          SELECT
            COALESCE((SELECT SUM(solde_actuel) FROM public.comptes_tresorerie WHERE client_id = $1 AND statut = 'actif'), 0) AS available_cash,
            depenses_pending.pending_disbursements,
            depenses_pending.pending_disbursements_count,
            engagements_remaining.remaining_engagements,
            engagements_remaining.remaining_engagements_count,
            operations_non_rapprochees.non_reconciled_operations,
            rapprochements_en_attente.pending_reconciliations,
            ecarts_qualifies.qualified_discrepancies
          FROM depenses_pending, engagements_remaining, operations_non_rapprochees, rapprochements_en_attente, ecarts_qualifies
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
    const pendingReconciliations = Number(row?.pending_reconciliations ?? 0);
    const qualifiedDiscrepancies = Number(row?.qualified_discrepancies ?? 0);
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
      pendingReconciliations,
      qualifiedDiscrepancies,
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
      pendingReconciliations,
      qualifiedDiscrepancies,
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
    if (query.correlationId) {
      values.push(query.correlationId);
      where.push(`e.correlation_id = $${values.length}`);
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

  async getExceptionAuditDossier(actor: AuthenticatedUser, query: TresorerieAuditDossierQueryDto) {
    const startedAt = Date.now();
    const generatedAt = new Date().toISOString();
    const dossierId = query.dossierId ?? `audit-dossier-${query.exerciceId}-${generatedAt.slice(0, 10)}`;
    const pageSize = Math.min(query.pageSize ?? 50, 100);
    const audit = await this.collectAllExceptionAuditEntries(actor, query, pageSize);
    const deliverables = this.buildExceptionAuditDeliverables(query.exerciceId, generatedAt, dossierId);
    const timeline = audit.items.map((entry) => ({
      id: entry.id,
      correlationId: entry.correlationId,
      actorUserId: entry.requestedBy,
      status: entry.status,
      transition: entry.transition,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId ?? null,
      createdAt: entry.createdAt,
      approvedAt: entry.approvedAt ?? null,
      decidedAt: entry.decidedAt ?? null,
      consumedAt: entry.consumedAt ?? null,
    }));
    const decisionLog = audit.items.map((entry) => ({
      id: entry.id,
      correlationId: entry.correlationId,
      decision: entry.decision,
      severity: entry.severity,
      reasons: entry.reasons,
      actorUserId: entry.requestedBy,
      timestamp: entry.decidedAt ?? entry.approvedAt ?? entry.createdAt,
    }));
    const baseEvidenceEntries = this.buildExceptionAuditEvidenceEntries({
      actor,
      entries: audit.items,
      generatedAt,
      exerciceId: query.exerciceId,
      dossierId,
    });
    const manifestEntries = this.buildExceptionAuditManifestEntries({
      generatedAt,
      dossierId,
      deliverables,
      scope: {
        tenantId: actor.tenantId,
        exerciceId: query.exerciceId,
        filters: {
          fromDate: query.fromDate ?? null,
          toDate: query.toDate ?? null,
          sourceType: query.sourceType ?? null,
          sourceId: query.sourceId ?? null,
          entityId: query.entityId ?? null,
          correlationId: query.correlationId ?? null,
        },
      },
      timeline,
      decisionLog,
      evidences: baseEvidenceEntries,
    });
    const packagingEvidenceEntries = this.buildExceptionAuditPackagingEvidence({
      entries: audit.items,
      generatedAt,
      manifestEntries,
      deliverables,
    });
    const evidenceEntries = [...baseEvidenceEntries, ...packagingEvidenceEntries];
    const coverage = this.buildExceptionAuditCoverage(evidenceEntries);
    const coverageEvidenceEntry: ExceptionAuditDossierEvidenceEntry = {
      id: `coverage-${dossierId}`,
      section: 'coverage',
      objective: 'Rendre explicite le statut covered/partial/missing',
      sourceType: 'artifact',
      sourceId: 'coverage-matrix',
      correlationId: this.resolveDossierCorrelationId(audit.items),
      status: 'covered',
      reason: undefined,
      authorUserId: actor.sub,
      timestamp: generatedAt,
    };
    const evidenceEntriesWithCoverage = [...evidenceEntries, coverageEvidenceEntry];
    const finalCoverage = this.buildExceptionAuditCoverage(evidenceEntriesWithCoverage);
    const coverageManifestEntry: ExceptionAuditDossierManifestEntry = {
      section: 'coverage',
      fileName: `${dossierId}/coverage.json`,
      checksum: this.computeSha256Hex(JSON.stringify(finalCoverage)),
      sizeBytes: Buffer.byteLength(JSON.stringify(finalCoverage), 'utf8'),
      generatedAt,
    };
    const manifestEntriesWithCoverage = [...manifestEntries, coverageManifestEntry];
    const archiveChecksum = this.computeSha256Hex(
      manifestEntriesWithCoverage
        .map((entry) => `${entry.fileName}:${entry.checksum}`)
        .join('|')
    );
    const missingCritical = finalCoverage
      .filter((item) => item.critical && item.status !== 'covered')
      .map((item) => ({
        section: item.section,
        objective: item.objective,
        reason: item.reason ?? 'critical_evidence_missing',
      }));
    const durationMs = Date.now() - startedAt;
    const status = this.deriveExceptionAuditDossierStatus(missingCritical.length);

    return {
      generatedAt,
      dossierId,
      scope: {
        tenantId: actor.tenantId,
        exerciceId: query.exerciceId,
        filters: {
          fromDate: query.fromDate ?? null,
          toDate: query.toDate ?? null,
          sourceType: query.sourceType ?? null,
          sourceId: query.sourceId ?? null,
          entityId: query.entityId ?? null,
          correlationId: query.correlationId ?? null,
        },
      },
      status,
      timeline,
      decisionLog,
      evidences: evidenceEntriesWithCoverage,
      coverage: finalCoverage,
      manifest: {
        generatedAt,
        durationMs,
        durationWithinSla: durationMs <= 60_000,
        totalEntries: audit.pagination.total,
        missingCritical,
        entries: manifestEntriesWithCoverage,
        archive: {
          fileName: deliverables.archiveZipFileName,
          checksumAlgorithm: 'sha256',
          checksum: archiveChecksum,
        },
      },
      deliverables,
    };
  }

  async getExceptionAuditDossierExportPrep(actor: AuthenticatedUser, query: TresorerieAuditDossierQueryDto) {
    const dossier = await this.getExceptionAuditDossier(actor, query);
    return {
      generatedAt: dossier.generatedAt,
      scope: dossier.scope,
      status: dossier.status,
      dossierId: dossier.dossierId,
      sections: ['scope', 'timeline', 'decisionLog', 'evidences', 'coverage', 'manifest', 'deliverables'],
      blockedByMissingCriticalEvidence: dossier.manifest.missingCritical.length > 0,
      preview: dossier,
    };
  }

  async getCloseoutDossier(actor: AuthenticatedUser, query: CloseoutDossierQueryDto) {
    const dossierType: CloseoutDossierType = query.dossierType ?? 'cloture_exercice';
    const startedAt = Date.now();
    const [clotureEvents, supervision, auditPreview, reconciliationSummary, artifactEvidenceEntries] = await Promise.all([
      this.loadExerciceClotureEvents(actor, query.exerciceId),
      this.getSupervision(actor, query.exerciceId),
      this.getExceptionAudit(actor, { exerciceId: query.exerciceId, page: 1, pageSize: 1 }),
      this.loadReconciliationSummary(actor, query.exerciceId, query.migrationBatchId),
      this.collectCloseoutEvidence(actor, query.exerciceId, query.migrationBatchId),
    ]);
    const evidenceEntries = this.buildCloseoutEvidenceEntries({
      actor,
      exerciceId: query.exerciceId,
      migrationBatchId: query.migrationBatchId,
      clotureEvents,
      supervision,
      artifactEvidenceEntries,
    });
    const missingCritical = await this.collectMissingCriticalEvidence(actor, query.exerciceId, query.migrationBatchId, {
      clotureEvents,
      auditEntriesTotal: auditPreview.pagination.total,
      reconciliation: reconciliationSummary,
      supervision,
    });

    const globalStatus = this.deriveCloseoutStatus(missingCritical, reconciliationSummary);
    const durationMs = Date.now() - startedAt;
    const generatedAt = new Date().toISOString();
    const coverage = this.computeRequirementsCoverage(evidenceEntries, missingCritical);

    return {
      generatedAt,
      dossierType,
      status: globalStatus,
      scope: {
        tenantId: actor.tenantId,
        exerciceId: query.exerciceId,
        migrationBatchId: query.migrationBatchId,
      },
      decisionLog: clotureEvents.map((event) => ({
        id: event.id,
        type: event.event_type,
        decision: event.decision,
        statusFrom: event.status_from,
        statusTo: event.status_to,
        actorUserId: event.actor_user_id,
        createdAt: this.toIsoString(event.created_at),
      })),
      evidences: evidenceEntries,
      reconciliation: reconciliationSummary,
      exceptions: {
        supervision,
      },
      manifest: {
        generatedAt,
        durationMs,
        durationWithinSla: durationMs <= 60_000,
        requirementsCoverage: coverage,
        missingCritical,
      },
    };
  }

  async getCloseoutDossierExportPrep(actor: AuthenticatedUser, query: CloseoutDossierQueryDto) {
    const dossier = await this.getCloseoutDossier(actor, query);

    return {
      generatedAt: dossier.generatedAt,
      scope: dossier.scope,
      status: dossier.status,
      suggestedFileName: `closeout-dossier-${query.exerciceId}-${new Date().toISOString().slice(0, 10)}.json`,
      sections: ['scope', 'decisionLog', 'evidences', 'reconciliation', 'exceptions', 'manifest'],
      blockedByMissingCriticalEvidence: dossier.manifest.missingCritical.length > 0,
      preview: dossier,
    };
  }

  private async loadExerciceClotureEvents(actor: AuthenticatedUser, exerciceId: string) {
    const result = await this.postgresService.query<ExerciceClotureEventRow>(
      `
        SELECT id, event_type, status_from, status_to, decision, actor_user_id, payload, checklist, created_at
        FROM public.exercice_cloture_events
        WHERE tenant_id = $1
          AND exercice_id = $2
        ORDER BY created_at DESC
      `,
      [actor.tenantId, exerciceId]
    );

    return result.rows;
  }

  private async resolveImplementationArtifactsDir() {
    const candidates = [
      process.env.IMPLEMENTATION_ARTIFACTS_DIR,
      path.resolve(process.cwd(), '_bmad-output', 'implementation-artifacts'),
      path.resolve(process.cwd(), '..', '_bmad-output', 'implementation-artifacts'),
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
      try {
        await access(candidate);
        return candidate;
      } catch {
        // Try next candidate.
      }
    }

    return null;
  }

  private async loadReconciliationSummary(
    actor: AuthenticatedUser,
    exerciceId: string,
    migrationBatchId?: string
  ): Promise<CloseoutReconciliationSummary> {
    const artifactsDir = await this.resolveImplementationArtifactsDir();
    if (!artifactsDir) {
      return { found: false, scopeValidated: false, scopeIssues: ['artifacts_dir_missing'], reportFiles: [] };
    }

    const files = await readdir(artifactsDir);
    const reportFiles = files.filter(
      (name) =>
        /^migration-reconciliation-.*\.(json|csv|md)$/.test(name)
        && (!migrationBatchId || name.includes(`-${migrationBatchId}-`))
    );
    const relativeReportFiles = reportFiles.map((fileName) => this.normalizePath(path.join(artifactsDir, fileName)));

    const latestJson = [...reportFiles]
      .filter((fileName) => fileName.endsWith('.json'))
      .sort((left, right) => right.localeCompare(left))[0];
    if (!latestJson) {
      return {
        found: reportFiles.length > 0,
        scopeValidated: false,
        scopeIssues: ['reconciliation_json_missing'],
        reportFiles: relativeReportFiles,
      };
    }

    try {
      const raw = await readFile(path.join(artifactsDir, latestJson), 'utf8');
      const parsed = JSON.parse(raw) as {
        batchId?: string;
        decision?: 'GO' | 'NO_GO';
        anomalyBySeverity?: { critical?: number; high?: number; medium?: number };
        tenantId?: string;
        clientId?: string;
        exerciceId?: string;
        scope?: {
          tenantId?: string;
          clientId?: string;
          exerciceId?: string;
          batchId?: string;
        };
      };
      const scopeTenantId = parsed.tenantId ?? parsed.clientId ?? parsed.scope?.tenantId ?? parsed.scope?.clientId;
      const scopeExerciceId = parsed.exerciceId ?? parsed.scope?.exerciceId;
      const scopeBatchId = parsed.batchId ?? parsed.scope?.batchId;

      const scopeIssues: string[] = [];
      if (!scopeTenantId) {
        scopeIssues.push('tenant_scope_missing');
      } else if (scopeTenantId !== actor.tenantId) {
        scopeIssues.push('tenant_scope_mismatch');
      }
      if (!scopeExerciceId) {
        scopeIssues.push('exercice_scope_missing');
      } else if (scopeExerciceId !== exerciceId) {
        scopeIssues.push('exercice_scope_mismatch');
      }
      if (migrationBatchId) {
        if (!scopeBatchId) {
          scopeIssues.push('batch_scope_missing');
        } else if (scopeBatchId !== migrationBatchId) {
          scopeIssues.push('batch_scope_mismatch');
        }
      }
      const scopeValidated = scopeIssues.length === 0;
      return {
        found: true,
        batchId: scopeBatchId,
        decision: scopeValidated ? parsed.decision : undefined,
        anomalies: {
          critical: Number(parsed.anomalyBySeverity?.critical ?? 0),
          high: Number(parsed.anomalyBySeverity?.high ?? 0),
          medium: Number(parsed.anomalyBySeverity?.medium ?? 0),
        },
        scopeValidated,
        scopeIssues,
        reportFiles: relativeReportFiles,
      };
    } catch {
      return {
        found: true,
        scopeValidated: false,
        scopeIssues: ['reconciliation_json_parse_error'],
        reportFiles: relativeReportFiles,
      };
    }
  }

  private async collectCloseoutEvidence(
    actor: AuthenticatedUser,
    exerciceId: string,
    migrationBatchId?: string
  ): Promise<CloseoutEvidenceEntry[]> {
    const artifactsDir = await this.resolveImplementationArtifactsDir();
    const entries: CloseoutEvidenceEntry[] = [];
    if (!artifactsDir) {
      return entries;
    }

    const files = await readdir(artifactsDir);

    for (const requirement of CLOSEOUT_EVIDENCE_REQUIREMENTS) {
      if (requirement.sourceType !== 'artifact' || !requirement.patterns?.length) {
        continue;
      }

      const matched = files.filter((fileName) => {
        if (migrationBatchId && requirement.id === 'EV-M23-RECONCILIATION' && !fileName.includes(`-${migrationBatchId}-`)) {
          return false;
        }
        return requirement.patterns?.some((pattern) => pattern.test(fileName)) ?? false;
      });

      for (const fileName of matched) {
        const absolutePath = path.join(artifactsDir, fileName);
        const [fileBuffer, fileStats] = await Promise.all([readFile(absolutePath), stat(absolutePath)]);
        entries.push({
          requirementId: requirement.id,
          section: requirement.section,
          description: requirement.description,
          sourceType: requirement.sourceType,
          source: this.normalizePath(absolutePath),
          checksum: createHash('sha256').update(fileBuffer).digest('hex'),
          sizeBytes: fileStats.size,
          timestamp: fileStats.mtime.toISOString(),
          scope: {
            tenantId: actor.tenantId,
            exerciceId,
            migrationBatchId,
          },
          authorUserId: 'system',
          status: 'covered',
        });
      }
    }

    return entries.sort((left, right) => left.requirementId.localeCompare(right.requirementId));
  }

  private buildCloseoutEvidenceEntries(input: {
    actor: AuthenticatedUser;
    exerciceId: string;
    migrationBatchId?: string;
    clotureEvents: ExerciceClotureEventRow[];
    supervision: Awaited<ReturnType<TresorerieService['getSupervision']>>;
    artifactEvidenceEntries: CloseoutEvidenceEntry[];
  }): CloseoutEvidenceEntry[] {
    const entries = [...input.artifactEvidenceEntries];
    const sharedScope = {
      tenantId: input.actor.tenantId,
      exerciceId: input.exerciceId,
      migrationBatchId: input.migrationBatchId,
    };
    for (const event of input.clotureEvents) {
      const eventPayload = JSON.stringify({
        eventType: event.event_type,
        statusFrom: event.status_from,
        statusTo: event.status_to,
        decision: event.decision,
        payload: event.payload,
        checklist: event.checklist,
      });
      entries.push({
        requirementId: 'EV-64-CHECKLIST',
        section: 'evidences',
        description: 'Checklist pre-cloture et journal de decisions de cloture/reouverture',
        sourceType: 'cloture_event',
        source: `db:public.exercice_cloture_events/${event.id}`,
        checksum: createHash('sha256').update(eventPayload).digest('hex'),
        sizeBytes: Buffer.byteLength(eventPayload, 'utf8'),
        timestamp: this.toIsoString(event.created_at),
        scope: sharedScope,
        authorUserId: event.actor_user_id,
        status: 'covered',
      });
    }

    const supervisionSignals =
      input.supervision.alerts.length
      + input.supervision.activeExceptions
      + input.supervision.expiredExceptions
      + input.supervision.qualifiedDiscrepancies;
    if (supervisionSignals > 0) {
      const supervisionPayload = JSON.stringify({
        generatedAt: input.supervision.generatedAt,
        activeExceptions: input.supervision.activeExceptions,
        expiredExceptions: input.supervision.expiredExceptions,
        qualifiedDiscrepancies: input.supervision.qualifiedDiscrepancies,
        alerts: input.supervision.alerts.map((alert) => alert.key),
      });
      entries.push({
        requirementId: 'EV-65-SUPERVISION',
        section: 'exceptions',
        description: 'Signaux de supervision tresorerie et ecarts qualifies',
        sourceType: 'audit_exception',
        source: `db:public.workflow_exceptions?tenantId=${input.actor.tenantId}&exerciceId=${input.exerciceId}`,
        checksum: createHash('sha256').update(supervisionPayload).digest('hex'),
        sizeBytes: Buffer.byteLength(supervisionPayload, 'utf8'),
        timestamp: input.supervision.generatedAt,
        scope: sharedScope,
        authorUserId: 'system',
        status: 'covered',
      });
    }

    return entries.sort((left, right) => {
      const byRequirement = left.requirementId.localeCompare(right.requirementId);
      if (byRequirement !== 0) {
        return byRequirement;
      }
      return left.source.localeCompare(right.source);
    });
  }

  private async collectMissingCriticalEvidence(
    actor: AuthenticatedUser,
    exerciceId: string,
    migrationBatchId?: string,
    preloaded?: {
      clotureEvents?: ExerciceClotureEventRow[];
      auditEntriesTotal?: number;
      reconciliation?: CloseoutReconciliationSummary;
      supervision?: Awaited<ReturnType<TresorerieService['getSupervision']>>;
    }
  ): Promise<Array<{ requirementId: string; description: string }>> {
    const artifactsDir = await this.resolveImplementationArtifactsDir();
    const files = artifactsDir ? await readdir(artifactsDir) : [];
    const [clotureEvents, reconciliation, supervision, auditEntriesTotal] = await Promise.all([
      preloaded?.clotureEvents ? Promise.resolve(preloaded.clotureEvents) : this.loadExerciceClotureEvents(actor, exerciceId),
      preloaded?.reconciliation
        ? Promise.resolve(preloaded.reconciliation)
        : this.loadReconciliationSummary(actor, exerciceId, migrationBatchId),
      preloaded?.supervision ? Promise.resolve(preloaded.supervision) : this.getSupervision(actor, exerciceId),
      typeof preloaded?.auditEntriesTotal === 'number'
        ? Promise.resolve(preloaded.auditEntriesTotal)
        : this.getExceptionAudit(actor, { exerciceId, page: 1, pageSize: 1 }).then((result) => result.pagination.total),
    ]);

    const missing: Array<{ requirementId: string; description: string }> = [];

    for (const requirement of CLOSEOUT_EVIDENCE_REQUIREMENTS.filter((item) => item.critical)) {
      if (requirement.sourceType === 'cloture_event') {
        if (clotureEvents.length === 0) {
          missing.push({ requirementId: requirement.id, description: requirement.description });
        }
        continue;
      }

      if (requirement.sourceType === 'audit_exception') {
        const supervisionSignals =
          supervision.alerts.length
          + supervision.activeExceptions
          + supervision.expiredExceptions
          + supervision.qualifiedDiscrepancies;
        if (auditEntriesTotal <= 0 && supervisionSignals <= 0) {
          missing.push({ requirementId: requirement.id, description: requirement.description });
        }
        continue;
      }

      if (requirement.sourceType === 'artifact') {
        const matches = files.filter((fileName) => {
          if (migrationBatchId && requirement.id === 'EV-M23-RECONCILIATION' && !fileName.includes(`-${migrationBatchId}-`)) {
            return false;
          }
          return requirement.patterns?.some((pattern) => pattern.test(fileName)) ?? false;
        });
        if (matches.length === 0) {
          missing.push({ requirementId: requirement.id, description: requirement.description });
          continue;
        }
        if (requirement.id === 'EV-M23-RECONCILIATION' && (!reconciliation.found || !reconciliation.decision)) {
          missing.push({
            requirementId: requirement.id,
            description: `${requirement.description} (decision manquante)`,
          });
        }
        if (requirement.id === 'EV-M23-RECONCILIATION' && !reconciliation.scopeValidated) {
          missing.push({
            requirementId: requirement.id,
            description: `${requirement.description} (scope tenant/exercice/lot non verifie)`,
          });
        }
      }
    }

    return missing;
  }

  private computeRequirementsCoverage(
    evidenceEntries: CloseoutEvidenceEntry[],
    missingCritical: Array<{ requirementId: string; description: string }>
  ) {
    const coveredRequirementIds = new Set(
      evidenceEntries.filter((entry) => entry.status === 'covered').map((entry) => entry.requirementId)
    );
    for (const missing of missingCritical) {
      coveredRequirementIds.delete(missing.requirementId);
    }
    const total = CLOSEOUT_EVIDENCE_REQUIREMENTS.length;
    const covered = coveredRequirementIds.size;

    return {
      total,
      covered,
      missing: total - covered,
    };
  }

  private deriveCloseoutStatus(
    missingCritical: Array<{ requirementId: string; description: string }>,
    reconciliation: CloseoutReconciliationSummary
  ): CloseoutDossierStatus {
    if (missingCritical.length > 0) {
      return 'blocked';
    }
    if (reconciliation.decision === 'NO_GO') {
      return 'no_go';
    }
    if (reconciliation.decision === 'GO') {
      return 'go';
    }
    return 'ready';
  }

  private deriveExceptionAuditDossierStatus(missingCriticalCount: number): AuditDossierStatus {
    if (missingCriticalCount > 0) {
      return 'blocked';
    }
    return 'ready';
  }

  private buildExceptionAuditDeliverables(exerciceId: string, generatedAt: string, dossierId: string) {
    const dateLabel = generatedAt.slice(0, 10);
    return {
      suggestedFileName: `${dossierId}.json`,
      archiveZipFileName: `audit-dossier-${exerciceId}-${dateLabel}.zip`,
      indexFileName: `${dossierId}-index.md`,
      printableFileName: `${dossierId}-index.html`,
      pdfStrategy: 'printable-html-first',
    };
  }

  private async collectAllExceptionAuditEntries(
    actor: AuthenticatedUser,
    query: TresorerieAuditDossierQueryDto,
    pageSize: number
  ) {
    const firstPage = await this.getExceptionAudit(actor, { ...query, page: 1, pageSize });
    if (firstPage.pagination.totalPages <= 1) {
      return firstPage;
    }

    const pageRequests = Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
      this.getExceptionAudit(actor, { ...query, page: index + 2, pageSize })
    );
    const remainingPages = await Promise.all(pageRequests);

    return {
      items: [firstPage.items, ...remainingPages.map((page) => page.items)].flat(),
      pagination: firstPage.pagination,
    };
  }

  private buildExceptionAuditEvidenceEntries(input: {
    actor: AuthenticatedUser;
    entries: Array<ReturnType<TresorerieService['mapAuditRow']>>;
    generatedAt: string;
    exerciceId: string;
    dossierId: string;
  }): ExceptionAuditDossierEvidenceEntry[] {
    const dossierCorrelationId = this.resolveDossierCorrelationId(input.entries);
    const scopeEvidence: ExceptionAuditDossierEvidenceEntry = {
      id: `scope-${input.dossierId}`,
      section: 'scope',
      objective: 'Scope tenant/exercice explicite',
      sourceType: 'artifact',
      sourceId: `${input.actor.tenantId}/${input.exerciceId}`,
      correlationId: dossierCorrelationId,
      status: 'covered',
      authorUserId: input.actor.sub,
      timestamp: input.generatedAt,
    };

    if (input.entries.length === 0) {
      return [
        scopeEvidence,
        {
          id: `timeline-missing-${input.dossierId}`,
          section: 'timeline',
          objective: 'Relier les etapes de decision et execution',
          sourceType: 'artifact',
          sourceId: 'audit-exception-empty-scope',
          correlationId: dossierCorrelationId,
          status: 'missing',
          reason: 'audit_entries_missing',
          authorUserId: input.actor.sub,
          timestamp: input.generatedAt,
        },
        {
          id: `decision-missing-${input.dossierId}`,
          section: 'decision_log',
          objective: 'Journaliser decision/risk et raisons associees',
          sourceType: 'artifact',
          sourceId: 'audit-exception-empty-scope',
          correlationId: dossierCorrelationId,
          status: 'missing',
          reason: 'audit_entries_missing',
          authorUserId: input.actor.sub,
          timestamp: input.generatedAt,
        },
        {
          id: `evidence-missing-${input.dossierId}`,
          section: 'evidences',
          objective: 'Prouver l exception avec correlationId, auteur et horodatage',
          sourceType: 'artifact',
          sourceId: 'audit-exception-empty-scope',
          correlationId: dossierCorrelationId,
          status: 'missing',
          reason: 'audit_entries_missing',
          authorUserId: input.actor.sub,
          timestamp: input.generatedAt,
        },
      ];
    }

    const entryEvidence = input.entries.flatMap((entry) => {
      const primary: ExceptionAuditDossierEvidenceEntry = {
        id: `evidence-${entry.id}`,
        section: 'evidences',
        objective: 'Prouver l exception avec correlationId, auteur et horodatage',
        sourceType: 'audit_exception',
        sourceId: entry.id,
        correlationId: entry.correlationId,
        status: 'covered',
        authorUserId: entry.requestedBy,
        timestamp: entry.createdAt,
      };
      const timeline: ExceptionAuditDossierEvidenceEntry = {
        id: `timeline-${entry.id}`,
        section: 'timeline',
        objective: 'Relier les etapes de decision et execution',
        sourceType: 'audit_event',
        sourceId: entry.id,
        correlationId: entry.correlationId,
        status: entry.decidedAt || entry.approvedAt || entry.consumedAt ? 'covered' : 'partial',
        reason: entry.decidedAt || entry.approvedAt || entry.consumedAt ? undefined : 'decision_timestamps_missing',
        authorUserId: entry.requestedBy,
        timestamp: entry.updatedAt,
      };
      const decision: ExceptionAuditDossierEvidenceEntry = {
        id: `decision-${entry.id}`,
        section: 'decision_log',
        objective: 'Journaliser decision/risk et raisons associees',
        sourceType: 'audit_vote',
        sourceId: entry.id,
        correlationId: entry.correlationId,
        status: entry.reasons.length > 0 ? 'covered' : 'partial',
        reason: entry.reasons.length > 0 ? undefined : 'decision_reasons_missing',
        authorUserId: entry.requestedBy,
        timestamp: entry.decidedAt ?? entry.createdAt,
      };
      return [primary, timeline, decision];
    });

    return [scopeEvidence, ...entryEvidence];
  }

  private buildExceptionAuditManifestEntries(input: {
    generatedAt: string;
    dossierId: string;
    deliverables: {
      suggestedFileName: string;
      archiveZipFileName: string;
      indexFileName: string;
      printableFileName: string;
      pdfStrategy: string;
    };
    scope: {
      tenantId: string;
      exerciceId: string;
      filters: {
        fromDate: string | null;
        toDate: string | null;
        sourceType: string | null;
        sourceId: string | null;
        entityId: string | null;
        correlationId: string | null;
      };
    };
    timeline: Array<Record<string, unknown>>;
    decisionLog: Array<Record<string, unknown>>;
    evidences: ExceptionAuditDossierEvidenceEntry[];
  }): ExceptionAuditDossierManifestEntry[] {
    const sections = [
      { section: 'scope', fileName: `${input.dossierId}/scope.json`, payload: JSON.stringify(input.scope) },
      { section: 'timeline', fileName: `${input.dossierId}/timeline.json`, payload: JSON.stringify(input.timeline) },
      { section: 'decision_log', fileName: `${input.dossierId}/decision-log.json`, payload: JSON.stringify(input.decisionLog) },
      { section: 'evidences', fileName: `${input.dossierId}/evidences.json`, payload: JSON.stringify(input.evidences) },
      {
        section: 'deliverables',
        fileName: `${input.dossierId}/deliverables.json`,
        payload: JSON.stringify({
          ...input.deliverables,
          archiveMembers: [
            `${input.dossierId}/scope.json`,
            `${input.dossierId}/timeline.json`,
            `${input.dossierId}/decision-log.json`,
            `${input.dossierId}/evidences.json`,
            `${input.dossierId}/coverage.json`,
            `${input.dossierId}/manifest.json`,
            `${input.dossierId}/${input.deliverables.indexFileName}`,
            `${input.dossierId}/${input.deliverables.printableFileName}`,
          ],
        }),
      },
    ] as const;

    return sections.map((section) => ({
      section: section.section,
      fileName: section.fileName,
      checksum: this.computeSha256Hex(section.payload),
      sizeBytes: Buffer.byteLength(section.payload, 'utf8'),
      generatedAt: input.generatedAt,
    }));
  }

  private buildExceptionAuditPackagingEvidence(input: {
    entries: Array<ReturnType<TresorerieService['mapAuditRow']>>;
    generatedAt: string;
    manifestEntries: ExceptionAuditDossierManifestEntry[];
    deliverables: {
      archiveZipFileName: string;
      indexFileName: string;
      printableFileName: string;
    };
  }): ExceptionAuditDossierEvidenceEntry[] {
    const dossierCorrelationId = this.resolveDossierCorrelationId(input.entries);
    const manifestChecksum = this.computeSha256Hex(
      input.manifestEntries.map((entry) => `${entry.fileName}:${entry.checksum}`).join('|')
    );

    return [
      {
        id: `manifest-${dossierCorrelationId}`,
        section: 'manifest',
        objective: 'Manifeste de tracabilite',
        sourceType: 'artifact',
        sourceId: 'manifest.json',
        correlationId: dossierCorrelationId,
        status: 'covered',
        reason: undefined,
        authorUserId: input.entries[0]?.requestedBy,
        timestamp: input.generatedAt,
      },
      {
        id: `deliverables-${dossierCorrelationId}`,
        section: 'deliverables',
        objective: 'Livrables exportables identifies',
        sourceType: 'artifact',
        sourceId: input.deliverables.archiveZipFileName,
        correlationId: dossierCorrelationId,
        status: manifestChecksum.length > 0 ? 'covered' : 'missing',
        reason: manifestChecksum.length > 0 ? undefined : 'manifest_checksum_missing',
        authorUserId: input.entries[0]?.requestedBy,
        timestamp: input.generatedAt,
      },
    ];
  }

  private buildExceptionAuditCoverage(entries: ExceptionAuditDossierEvidenceEntry[]) {
    const bySection = new Map<ExceptionAuditDossierEvidenceEntry['section'], ExceptionAuditDossierEvidenceEntry[]>();
    for (const entry of entries) {
      const collection = bySection.get(entry.section) ?? [];
      collection.push(entry);
      bySection.set(entry.section, collection);
    }

    const definitions: Array<{
      section: ExceptionAuditDossierEvidenceEntry['section'];
      objective: string;
      critical: boolean;
    }> = [
      { section: 'scope', objective: 'Scope tenant/exercice explicite', critical: true },
      { section: 'timeline', objective: 'Timeline des evenements', critical: true },
      { section: 'decision_log', objective: 'Decision log exploitable', critical: true },
      { section: 'evidences', objective: 'Preuves rattachables', critical: true },
      { section: 'coverage', objective: 'Statut de couverture explicite', critical: false },
      { section: 'manifest', objective: 'Manifeste de tracabilite', critical: false },
      { section: 'deliverables', objective: 'Livrables exportables identifies', critical: false },
    ];

    return definitions.map<ExceptionAuditDossierCoverageEntry>((definition) => {
      const sectionEntries = bySection.get(definition.section) ?? [];
      if (sectionEntries.length === 0) {
        return {
          section: definition.section,
          objective: definition.objective,
          status: 'missing',
          critical: definition.critical,
          evidenceIds: [],
          reason: 'section_without_evidence',
        };
      }

      const hasMissing = sectionEntries.some((entry) => entry.status === 'missing');
      const hasPartial = sectionEntries.some((entry) => entry.status === 'partial');
      return {
        section: definition.section,
        objective: definition.objective,
        status: hasMissing ? 'missing' : hasPartial ? 'partial' : 'covered',
        critical: definition.critical,
        evidenceIds: sectionEntries.map((entry) => entry.id),
        reason: hasMissing ? 'missing_evidence_entries' : hasPartial ? 'partial_evidence_entries' : undefined,
      };
    });
  }

  private resolveDossierCorrelationId(entries: Array<ReturnType<TresorerieService['mapAuditRow']>>) {
    return entries[0]?.correlationId ?? 'no-correlation-id';
  }

  private computeSha256Hex(payload: string) {
    return createHash('sha256').update(payload).digest('hex');
  }

  private normalizePath(absolutePath: string) {
    return path.relative(process.cwd(), absolutePath).replaceAll(path.sep, '/');
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
    pendingReconciliations: number;
    qualifiedDiscrepancies: number;
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

    if (input.pendingReconciliations > 0) {
      alerts.push({
        key: 'pending-reconciliations',
        severity: input.pendingReconciliations >= 5 ? 'high' : 'medium',
        code: 'PENDING_RECONCILIATIONS',
        label: 'Rapprochements en attente',
        message: `${input.pendingReconciliations} workflow(s) attendent une décision ou une validation finale.`,
        value: input.pendingReconciliations,
        threshold: 0,
      });
    }

    if (input.qualifiedDiscrepancies > 0) {
      alerts.push({
        key: 'qualified-discrepancies',
        severity: 'medium',
        code: 'QUALIFIED_DISCREPANCIES',
        label: 'Écarts qualifiés',
        message: `${input.qualifiedDiscrepancies} écart(s) qualifié(s) restent ouverts pour le reporting.`,
        value: input.qualifiedDiscrepancies,
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
