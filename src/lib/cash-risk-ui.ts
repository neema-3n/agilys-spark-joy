import type { ApiError } from '@/services/api/api-utils';
import type { CashRiskDecision, CashRiskTransition } from '@/types/cash-risk.types';

export interface CashRiskBlockedInfo {
  title: string;
  summary: string;
  transitionLabel: string;
  riskLevelLabel: string;
  riskScoreLabel: string;
  reasons: string[];
  remediations: string[];
  decision: CashRiskDecision;
  snapshot: {
    availableCash: string;
    projectedExposure: string;
    projectedGap: string;
    remainingEngagements: string;
    outstandingDepenses: string;
    nonReconciledOperations: string;
  };
}

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
});

const formatAmount = (value: number): string => numberFormatter.format(Number.isFinite(value) ? value : 0);
const formatCount = (value: number): string => integerFormatter.format(Number.isFinite(value) ? value : 0);

const transitionLabelMap: Record<CashRiskTransition, string> = {
  'engagement:create': "Création d'engagement",
  'engagement:validate': "Validation d'engagement",
  'paiement:execute': 'Exécution de paiement',
  'paiement:reprendre': 'Reprise de paiement',
  'depense:ordonnancer': "Ordonnancement de dépense",
};

const riskLevelLabelMap = {
  low: 'Faible',
  medium: 'Modéré',
  high: 'Élevé',
  critical: 'Critique',
} as const;

const sanitizeReasons = (reasons: string[]): string[] => {
  const humanizeReason = (reason: string): string => {
    const lowered = reason.toLowerCase();

    if (lowered.includes('gap de trésorerie projeté positif')) {
      return "La trésorerie projetée devient insuffisante après cette action.";
    }

    if (lowered.includes('opérations bancaires') && lowered.includes('non rapproch')) {
      return 'Certaines opérations bancaires restent à rapprocher, ce qui réduit la visibilité de trésorerie.';
    }

    if (lowered.includes('seuil de risque cash')) {
      return 'Le niveau de risque de trésorerie dépasse le seuil autorisé.';
    }

    return reason;
  };

  const normalized = reasons
    .map((reason) => humanizeReason(reason.trim()))
    .filter((reason) => reason.length > 0);
  return normalized.length > 0 ? normalized : ['Le moteur de risque indique un blocage de trésorerie.'];
};

const buildTransitionSpecificRemediation = (transition: CashRiskTransition): string => {
  if (transition.startsWith('engagement:')) {
    return "Réduire le montant de l'engagement ou le rephaser sur une période où la trésorerie sera disponible.";
  }

  if (transition.startsWith('paiement:')) {
    return 'Décaler le paiement, fractionner la sortie de cash ou privilégier une facture prioritaire.';
  }

  return "Réordonner la dépense après traitement des éléments bloquants pour limiter l'exposition cash immédiate.";
};

const deriveRemediations = (decision: CashRiskDecision): string[] => {
  const remediations: string[] = [];
  const snapshot = decision.snapshot;

  if (snapshot.projectedGap > 0) {
    remediations.push(buildTransitionSpecificRemediation(snapshot.transition));
  }

  if (snapshot.remainingEngagements > 0) {
    remediations.push('Traiter les engagements déjà ouverts pour réduire le reste engagé avant de lancer une nouvelle transition.');
  }

  if (snapshot.outstandingDepenses > 0) {
    remediations.push('Prioriser la liquidation des dépenses en attente afin de clarifier les besoins de trésorerie réels.');
  }

  if (snapshot.nonReconciledOperations > 0) {
    remediations.push('Rapprocher les opérations non lettrées pour fiabiliser la vision de trésorerie disponible.');
  }

  remediations.push("Préparer une demande d'exception gouvernée si aucune correction immédiate n'est possible.");

  return [...new Set(remediations)];
};

export const buildCashRiskBlockedInfo = (decision: CashRiskDecision): CashRiskBlockedInfo => {
  const reasons = sanitizeReasons(decision.reasons);
  const transitionLabel = transitionLabelMap[decision.snapshot.transition];

  return {
    title: 'Action bloquée par le contrôle de risque cash',
    summary: reasons[0] ?? 'La transition a été refusée pour protéger la trésorerie.',
    transitionLabel,
    riskLevelLabel: riskLevelLabelMap[decision.riskLevel],
    riskScoreLabel: numberFormatter.format(decision.riskScore),
    reasons,
    remediations: deriveRemediations(decision),
    decision,
    snapshot: {
      availableCash: formatAmount(decision.snapshot.availableCash),
      projectedExposure: formatAmount(decision.snapshot.projectedExposure),
      projectedGap: formatAmount(decision.snapshot.projectedGap),
      remainingEngagements: formatCount(decision.snapshot.remainingEngagements),
      outstandingDepenses: formatCount(decision.snapshot.outstandingDepenses),
      nonReconciledOperations: formatCount(decision.snapshot.nonReconciledOperations),
    },
  };
};

export const toCashRiskBlockedInfo = (error: ApiError): CashRiskBlockedInfo | null => {
  if (error.code !== 'CASH_RISK_BLOCKED' || !error.riskDecision) {
    return null;
  }

  return buildCashRiskBlockedInfo(error.riskDecision);
};
