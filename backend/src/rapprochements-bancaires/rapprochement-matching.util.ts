export const ECART_CATEGORIES = [
  'timing',
  'montant',
  'reference',
  'operation_manquante',
  'anomalie_externe',
] as const;

export const RAPPROCHEMENT_LIGNE_STATUSES = [
  'proposition_unique',
  'ambigu',
  'sans_match',
  'rapprochee_auto',
  'rapprochee_manuelle',
  'ecart_qualifie',
] as const;

export const RAPPROCHEMENT_CANDIDATE_STATUSES = ['propose', 'selectionne', 'rejete'] as const;
export const RAPPROCHEMENT_DECISION_ACTIONS = [
  'select_candidate',
  'reject_candidate',
  'qualify_discrepancy',
] as const;
export const RAPPROCHEMENT_DETAIL_STATUSES = ['a_traiter', 'en_attente_validation', 'valide', 'annule'] as const;

export type EcartCategory = (typeof ECART_CATEGORIES)[number];
export type RapprochementLigneStatus = (typeof RAPPROCHEMENT_LIGNE_STATUSES)[number];
export type RapprochementCandidateStatus = (typeof RAPPROCHEMENT_CANDIDATE_STATUSES)[number];
export type RapprochementDecisionAction = (typeof RAPPROCHEMENT_DECISION_ACTIONS)[number];
export type RapprochementDetailStatus = (typeof RAPPROCHEMENT_DETAIL_STATUSES)[number];

export interface StatementLineInput {
  id?: string;
  dateOperation: string;
  libelle: string;
  referenceBancaire?: string;
  montant: number;
  typeFlux: 'encaissement' | 'decaissement';
}

export interface MatchingOperationInput {
  id: string;
  numero: string;
  dateOperation: string;
  montant: number;
  referenceBancaire?: string;
  libelle: string;
  typeOperation: 'encaissement' | 'decaissement' | 'transfert';
}

export interface MatchingCandidate {
  operationId: string;
  score: number;
  reasons: string[];
  metadata: {
    numero: string;
    dateOperation: string;
    montant: number;
    referenceBancaire?: string;
    libelle: string;
    typeOperation: 'encaissement' | 'decaissement' | 'transfert';
  };
}

export interface MatchingResult {
  status: Extract<RapprochementLigneStatus, 'proposition_unique' | 'ambigu' | 'sans_match'>;
  bestScore: number | null;
  recommendedOperationId?: string;
  rules: string[];
  candidates: MatchingCandidate[];
}

const normalizeText = (value?: string): string => (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const differenceInCalendarDays = (left: string, right: string): number => {
  const leftDate = new Date(`${left}T00:00:00.000Z`);
  const rightDate = new Date(`${right}T00:00:00.000Z`);
  return Math.round(Math.abs(leftDate.getTime() - rightDate.getTime()) / 86_400_000);
};

const isTypeCompatible = (
  statementType: StatementLineInput['typeFlux'],
  operationType: MatchingOperationInput['typeOperation']
): boolean => {
  if (operationType === 'transfert') {
    return false;
  }

  return statementType === operationType;
};

export const buildRapprochementInvalidationKeys = (id?: string): Array<readonly string[]> => {
  const baseKeys = [
    ['rapprochements-bancaires'],
    ['operations-tresorerie'],
    ['tresorerie-supervision'],
  ] as const;

  if (!id) {
    return [...baseKeys];
  }

  return [...baseKeys, ['rapprochements-bancaires', 'detail', id]];
};

export const matchStatementLine = (
  statementLine: StatementLineInput,
  operations: MatchingOperationInput[]
): MatchingResult => {
  const normalizedReference = normalizeText(statementLine.referenceBancaire);
  const normalizedLabel = normalizeText(statementLine.libelle);

  const candidates = operations
    .filter((operation) => Number(operation.montant) === Number(statementLine.montant))
    .filter((operation) => isTypeCompatible(statementLine.typeFlux, operation.typeOperation))
    .map((operation) => {
      const reasons: string[] = ['Montant exact'];
      let score = 60;
      const dayDelta = differenceInCalendarDays(statementLine.dateOperation, operation.dateOperation);
      const operationReference = normalizeText(operation.referenceBancaire);
      const operationLabel = normalizeText(operation.libelle);

      if (dayDelta === 0) {
        score += 20;
        reasons.push('Date identique');
      } else if (dayDelta <= 2) {
        score += 10;
        reasons.push('Date proche');
      }

      if (normalizedReference && operationReference && normalizedReference === operationReference) {
        score += 20;
        reasons.push('Reference bancaire identique');
      }

      if (normalizedLabel && operationLabel && normalizedLabel === operationLabel) {
        score += 10;
        reasons.push('Libelle identique');
      }

      return {
        operationId: operation.id,
        score,
        reasons,
        metadata: {
          numero: operation.numero,
          dateOperation: operation.dateOperation,
          montant: Number(operation.montant),
          referenceBancaire: operation.referenceBancaire,
          libelle: operation.libelle,
          typeOperation: operation.typeOperation,
        },
      } satisfies MatchingCandidate;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.metadata.dateOperation !== right.metadata.dateOperation) {
        return left.metadata.dateOperation.localeCompare(right.metadata.dateOperation);
      }

      return left.metadata.numero.localeCompare(right.metadata.numero);
    });

  if (candidates.length === 0) {
    return {
      status: 'sans_match',
      bestScore: null,
      rules: ['Aucun candidat deterministe'],
      candidates: [],
    };
  }

  const bestScore = candidates[0]?.score ?? null;
  const topCandidates = candidates.filter((candidate) => candidate.score === bestScore);

  if (topCandidates.length === 1) {
    return {
      status: 'proposition_unique',
      bestScore,
      recommendedOperationId: topCandidates[0]?.operationId,
      rules: topCandidates[0]?.reasons ?? [],
      candidates,
    };
  }

  return {
    status: 'ambigu',
    bestScore,
    rules: ['Plusieurs candidats ont le meme score'],
    candidates,
  };
};
