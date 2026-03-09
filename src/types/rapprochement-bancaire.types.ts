export type StatutRapprochement = 'en_cours' | 'valide' | 'annule';
export type StatutRapprochementDetaille = 'a_traiter' | 'en_attente_validation' | 'valide' | 'annule';
export type ModeGenerationRapprochement = 'auto' | 'manuel' | 'mixte';
export type CategorieEcartRapprochement =
  | 'timing'
  | 'montant'
  | 'reference'
  | 'operation_manquante'
  | 'anomalie_externe';
export type StatutLigneRapprochement =
  | 'proposition_unique'
  | 'ambigu'
  | 'sans_match'
  | 'rapprochee_auto'
  | 'rapprochee_manuelle'
  | 'ecart_qualifie';
export type StatutCandidatRapprochement = 'propose' | 'selectionne' | 'rejete';
export type ActionDecisionRapprochement = 'select_candidate' | 'reject_candidate' | 'qualify_discrepancy';

export interface RapprochementBancaire {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  compteId: string;
  dateDebut: string;
  dateFin: string;
  soldeReleve: number;
  soldeComptable: number;
  ecart: number;
  statut: StatutRapprochement;
  statutDetaille: StatutRapprochementDetaille;
  modeGeneration: ModeGenerationRapprochement;
  scoreGlobal?: number;
  categorieEcart?: CategorieEcartRapprochement;
  motifQualification?: string;
  metadataAudit: Record<string, unknown>;
  totalLignes: number;
  totalPropositionsAuto: number;
  totalEcartsQualifies: number;
  dateValidation?: string;
  validePar?: string;
  observations?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  compte?: {
    code: string;
    libelle: string;
    type: string;
  };
}

export interface RapprochementBancaireFormData {
  compteId: string;
  dateDebut: string;
  dateFin: string;
  soldeReleve: number;
  observations?: string;
  statementLines: StatementLineFormData[];
}

export interface StatementLineFormData {
  dateOperation: string;
  libelle: string;
  referenceBancaire?: string;
  montant: number;
  typeFlux: 'encaissement' | 'decaissement';
}

export interface RapprochementBancaireCandidate {
  id: string;
  operationTresorerieId: string;
  score: number;
  statut: StatutCandidatRapprochement;
  raisons: string[];
  metadata: Record<string, unknown>;
}

export interface RapprochementBancaireLine {
  id: string;
  ordre: number;
  dateOperation: string;
  libelle: string;
  referenceBancaire?: string;
  montant: number;
  typeFlux: 'encaissement' | 'decaissement';
  statut: StatutLigneRapprochement;
  score?: number;
  reglesAppliquees: string[];
  operationTresorerieId?: string;
  categorieEcart?: CategorieEcartRapprochement;
  motifQualification?: string;
  metadata: Record<string, unknown>;
  candidates: RapprochementBancaireCandidate[];
}

export interface RapprochementBancaireDecision {
  id: string;
  lineId: string;
  candidateId?: string;
  action: ActionDecisionRapprochement;
  previousStatus?: string;
  nextStatus: string;
  justification: string;
  category?: CategorieEcartRapprochement;
  actorUserId?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface RapprochementBancaireDetail extends RapprochementBancaire {
  lines: RapprochementBancaireLine[];
  decisions: RapprochementBancaireDecision[];
  invalidationKeys: Array<readonly string[]>;
}

export interface ManualRapprochementDecisionInput {
  lineId: string;
  action: ActionDecisionRapprochement;
  candidateId?: string;
  justification: string;
  category?: CategorieEcartRapprochement;
}
