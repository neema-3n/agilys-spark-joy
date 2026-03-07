import { Injectable, Logger } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import { CashRiskBlockedException } from './cash-risk-blocked.exception';
import type { CashRiskDecision, CashRiskInput, CashRiskLevel, CashRiskTransition } from './cash-risk.types';

interface TreasuryBalanceRow {
  available_cash: string | number;
}

interface ExposureRow {
  outstanding_depenses: string | number;
  pending_depenses: string | number;
  remaining_engagements: string | number;
  pending_engagements: string | number;
}

interface TreasuryOperationsRow {
  non_reconciled_count: string | number;
}

interface CashRiskScope {
  params: string[];
  depensesFilter: string;
  depensesRollupFilter: string;
  engagementsFilter: string;
  operationsFilter: string;
  scopeKey: string;
}

const THRESHOLDS_BY_TRANSITION: Record<CashRiskTransition, number> = {
  'engagement:create': 70,
  'engagement:validate': 68,
  'paiement:execute': 60,
  'paiement:reprendre': 58,
  'depense:ordonnancer': 64,
};

const TRANSITION_RISK_OFFSET: Record<CashRiskTransition, number> = {
  'engagement:create': 8,
  'engagement:validate': 12,
  'paiement:execute': 18,
  'paiement:reprendre': 16,
  'depense:ordonnancer': 14,
};

@Injectable()
export class CashRiskService {
  private readonly logger = new Logger('CashRiskAudit');

  constructor(private readonly postgresService: PostgresService) {}

  async evaluate(actor: AuthenticatedUser, input: CashRiskInput): Promise<CashRiskDecision> {
    const normalizedAmount = this.normalizeAmount(input.amount);
    const scope = this.buildScope(input);
    const correlationId = this.buildCorrelationId(actor.tenantId, input, normalizedAmount, scope.scopeKey);

    const [balanceResult, exposureResult, operationsResult] = await Promise.all([
      this.postgresService.query<TreasuryBalanceRow>(
        `
          SELECT COALESCE(SUM(solde_actuel), 0) AS available_cash
          FROM public.comptes_tresorerie
          WHERE client_id = $1
            AND statut = 'actif'
        `,
        [actor.tenantId]
      ),
      this.postgresService.query<ExposureRow>(
        `
          WITH depenses_outstanding AS (
            SELECT
              COALESCE(SUM(GREATEST(d.montant - d.montant_paye, 0)), 0) AS outstanding_depenses,
              COUNT(*) FILTER (WHERE GREATEST(d.montant - d.montant_paye, 0) > 0) AS pending_depenses
            FROM public.depenses d
            WHERE d.client_id = $1
              AND d.exercice_id = $2
              AND d.statut IN ('validee', 'ordonnancee', 'partiellement_payee')
              ${scope.depensesFilter}
          ),
          engagements_remaining AS (
            SELECT
              COALESCE(SUM(GREATEST(e.montant - COALESCE(dep.total_depenses, 0), 0)), 0) AS remaining_engagements,
              COUNT(*) FILTER (WHERE GREATEST(e.montant - COALESCE(dep.total_depenses, 0), 0) > 0) AS pending_engagements
            FROM public.engagements e
            LEFT JOIN (
              SELECT engagement_id, SUM(montant) AS total_depenses
              FROM public.depenses
              WHERE client_id = $1
                AND exercice_id = $2
                AND statut != 'annulee'
                AND engagement_id IS NOT NULL
                ${scope.depensesRollupFilter}
              GROUP BY engagement_id
            ) dep ON dep.engagement_id = e.id
            WHERE e.client_id = $1
              AND e.exercice_id = $2
              AND e.statut = 'valide'
              ${scope.engagementsFilter}
          )
          SELECT
            depenses_outstanding.outstanding_depenses,
            depenses_outstanding.pending_depenses,
            engagements_remaining.remaining_engagements,
            engagements_remaining.pending_engagements
          FROM depenses_outstanding, engagements_remaining
        `,
        [actor.tenantId, input.exerciceId, ...scope.params]
      ),
      this.postgresService.query<TreasuryOperationsRow>(
        `
          SELECT COUNT(*) FILTER (WHERE rapproche = false) AS non_reconciled_count
          FROM public.operations_tresorerie
          WHERE client_id = $1
            AND exercice_id = $2
            AND statut != 'annulee'
            ${scope.operationsFilter}
        `,
        [actor.tenantId, input.exerciceId, ...scope.params]
      ),
    ]);

    const availableCash = Number(balanceResult.rows[0]?.available_cash ?? 0);
    const outstandingDepenses = Number(exposureResult.rows[0]?.outstanding_depenses ?? 0);
    const remainingEngagements = Number(exposureResult.rows[0]?.remaining_engagements ?? 0);
    const pendingDepenses = Number(exposureResult.rows[0]?.pending_depenses ?? 0);
    const pendingEngagements = Number(exposureResult.rows[0]?.pending_engagements ?? 0);
    const nonReconciledOperations = Number(operationsResult.rows[0]?.non_reconciled_count ?? 0);
    const projectedExposure = outstandingDepenses + remainingEngagements + normalizedAmount;
    const projectedGap = projectedExposure - availableCash;
    const threshold = THRESHOLDS_BY_TRANSITION[input.transition];
    const coverageBase = Math.max(availableCash, 1);
    const exposureRatio = projectedExposure / coverageBase;
    const shortfallRatio = Math.max(projectedGap, 0) / coverageBase;

    const riskScore = this.clampScore(
      Math.round(
        exposureRatio * 34 +
          shortfallRatio * 42 +
          Math.min(nonReconciledOperations * 3, 12) +
          TRANSITION_RISK_OFFSET[input.transition]
      )
    );
    const riskLevel = this.resolveRiskLevel(riskScore);
    const reasons = this.buildReasons({
      availableCash,
      normalizedAmount,
      outstandingDepenses,
      remainingEngagements,
      projectedGap,
      nonReconciledOperations,
      pendingDepenses,
      pendingEngagements,
      transition: input.transition,
    });
    const decision: CashRiskDecision = {
      riskLevel,
      riskScore,
      decision: projectedGap > 0 || riskScore >= threshold ? 'block' : 'allow',
      reasons,
      snapshot: {
        tenantId: actor.tenantId,
        exerciceId: input.exerciceId,
        transition: input.transition,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        entityId: input.entityId,
        projectedAmount: normalizedAmount,
        availableCash,
        outstandingDepenses,
        remainingEngagements,
        projectedExposure,
        projectedGap,
        nonReconciledOperations,
        threshold,
        correlationId,
      },
    };

    this.logger.log(
      JSON.stringify({
        userId: actor.sub,
        tenantId: actor.tenantId,
        decision: decision.decision,
        riskLevel,
        riskScore,
        transition: input.transition,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        entityId: input.entityId ?? null,
        reasons,
        threshold: decision.snapshot.threshold,
        projectedExposure: decision.snapshot.projectedExposure,
        projectedGap: decision.snapshot.projectedGap,
        availableCash: decision.snapshot.availableCash,
        correlationId,
        snapshot: decision.snapshot,
        timestamp: new Date().toISOString(),
      })
    );

    return decision;
  }

  async assertAllowed(actor: AuthenticatedUser, input: CashRiskInput): Promise<CashRiskDecision> {
    const decision = await this.evaluate(actor, input);

    if (decision.decision === 'block') {
      throw new CashRiskBlockedException(decision);
    }

    return decision;
  }

  async evaluateOrdonnancementRisk(
    actor: AuthenticatedUser,
    exerciceId: string,
    amount: number,
    sourceId?: string
  ): Promise<CashRiskDecision> {
    return this.evaluate(actor, {
      exerciceId,
      transition: 'depense:ordonnancer',
      sourceType: 'depense',
      sourceId,
      entityId: sourceId,
      amount,
    });
  }

  private normalizeAmount(value: number): number {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, score));
  }

  private resolveRiskLevel(score: number): CashRiskLevel {
    if (score >= 75) {
      return 'critical';
    }

    if (score >= 55) {
      return 'high';
    }

    if (score >= 30) {
      return 'medium';
    }

    return 'low';
  }

  private buildReasons(input: {
    transition: CashRiskTransition;
    availableCash: number;
    normalizedAmount: number;
    outstandingDepenses: number;
    remainingEngagements: number;
    projectedGap: number;
    nonReconciledOperations: number;
    pendingDepenses: number;
    pendingEngagements: number;
  }): string[] {
    const reasons: string[] = [];

    if (input.availableCash <= 0) {
      reasons.push('Aucune trésorerie active disponible pour couvrir cette transition.');
    }

    if (input.projectedGap > 0) {
      reasons.push(
        `Le besoin projeté dépasse la trésorerie disponible de ${input.projectedGap.toFixed(2)} FCFA après la transition ${input.transition}.`
      );
    }

    if (input.remainingEngagements > 0) {
      reasons.push(
        `${input.pendingEngagements} engagement(s) validé(s) restent à couvrir pour ${input.remainingEngagements.toFixed(2)} FCFA.`
      );
    }

    if (input.outstandingDepenses > 0) {
      reasons.push(
        `${input.pendingDepenses} dépense(s) ordonnancée(s) ou validée(s) restent à décaisser pour ${input.outstandingDepenses.toFixed(2)} FCFA.`
      );
    }

    if (input.nonReconciledOperations > 0) {
      reasons.push(
        `${input.nonReconciledOperations} opération(s) de trésorerie non rapprochée(s) augmentent l'incertitude du solde disponible.`
      );
    }

    if (reasons.length === 0 && input.normalizedAmount > 0) {
      reasons.push('La trésorerie disponible couvre la transition demandée sans dépasser le seuil configuré.');
    }

    return reasons.slice(0, 4);
  }

  private buildScope(input: CashRiskInput): CashRiskScope {
    if (input.sourceType === 'engagement' && input.entityId) {
      return {
        params: [input.entityId],
        depensesFilter: 'AND d.ligne_budgetaire_id = $3',
        depensesRollupFilter: 'AND ligne_budgetaire_id = $3',
        engagementsFilter: 'AND e.ligne_budgetaire_id = $3',
        operationsFilter: `
          AND depense_id IN (
            SELECT id
            FROM public.depenses
            WHERE client_id = $1
              AND exercice_id = $2
              AND ligne_budgetaire_id = $3
          )
        `,
        scopeKey: `ligne-budgetaire:${input.entityId}`,
      };
    }

    if ((input.sourceType === 'paiement' || input.sourceType === 'depense') && input.entityId) {
      return {
        params: [input.entityId],
        depensesFilter: 'AND d.id = $3',
        depensesRollupFilter: 'AND id = $3',
        engagementsFilter: `
          AND e.id = (
            SELECT d.engagement_id
            FROM public.depenses d
            WHERE d.client_id = $1
              AND d.exercice_id = $2
              AND d.id = $3
            LIMIT 1
          )
        `,
        operationsFilter: 'AND depense_id = $3',
        scopeKey: `depense:${input.entityId}`,
      };
    }

    return {
      params: [],
      depensesFilter: '',
      depensesRollupFilter: '',
      engagementsFilter: '',
      operationsFilter: '',
      scopeKey: `global:${input.sourceType}`,
    };
  }

  private buildCorrelationId(
    tenantId: string,
    input: CashRiskInput,
    normalizedAmount: number,
    scopeKey: string
  ): string {
    const sourceId = input.sourceId ?? 'na';
    return `cash-risk:${tenantId}:${input.exerciceId}:${input.transition}:${scopeKey}:${sourceId}:${normalizedAmount.toFixed(2)}`;
  }
}
