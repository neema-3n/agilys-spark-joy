export type ReferentielEntityType =
  | 'exercice'
  | 'enveloppe'
  | 'section'
  | 'programme'
  | 'action'
  | 'allocation'
  | 'ligne_budgetaire'
  | 'decision_version';

export interface EntityBase {
  id: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  archivedAt?: string | null;
}

export interface ExerciceEntity extends EntityBase {
  libelle: string;
  code: string;
  dateDebut: string;
  dateFin: string;
  statut: 'ouvert' | 'cloture';
}

export interface EnveloppeEntity extends EntityBase {
  exerciceId: string;
  code: string;
  nom: string;
  sourceFinancement: string;
  montantAlloue: number;
  montantConsomme: number;
  statut: 'actif' | 'cloture';
}

export interface SectionEntity extends EntityBase {
  exerciceId: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
}

export interface ProgrammeEntity extends EntityBase {
  clientId: string;
  exerciceId: string;
  sectionId: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
}

export interface ActionEntity extends EntityBase {
  clientId: string;
  exerciceId: string;
  programmeId: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
}

export type AllocationOperationType = 'allocation' | 'reallocation';

export interface AllocationEntity extends EntityBase {
  exerciceId: string;
  numero: string;
  operationType: AllocationOperationType;
  sourceAxeId: string | null;
  destinationAxeId: string;
  montant: number;
  motif: string;
  effectiveAt: string;
  statut: 'validee';
  dateValidation: string;
  validePar: string;
}

export interface LigneBudgetaireEntity extends EntityBase {
  exerciceId: string;
  actionId: string;
  compteId: string;
  enveloppeId: string | null;
  libelle: string;
  montantInitial: number;
  montantModifie: number;
  montantEngage: number;
  montantLiquide: number;
  montantPaye: number;
  disponible: number;
  statut: 'actif' | 'cloture';
}

export type BudgetDecisionStatus = 'validated' | 'rejected';

export interface DecisionSnapshot {
  operationType: AllocationOperationType;
  sourceAxeId: string | null;
  destinationAxeId: string;
  montant: number;
  statutDecision: BudgetDecisionStatus;
  motif: string;
  auteur: string;
  horodatage: string;
  soldes: {
    sourceAvant: number | null;
    sourceApres: number | null;
    destinationAvant: number;
    destinationApres: number;
  };
}

export interface DecisionVersionEntity extends EntityBase {
  decisionId: string;
  allocationId: string;
  exerciceId: string;
  version: number;
  statutDecision: BudgetDecisionStatus;
  motif: string;
  auteur: string;
  horodatage: string;
  snapshotAvant: DecisionSnapshot;
  snapshotApres: DecisionSnapshot;
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  entityType: ReferentielEntityType;
  entityId: string;
  action:
    | 'create'
    | 'update'
    | 'archive'
    | 'allocate'
    | 'reallocate'
    | 'decision_validate'
    | 'decision_reject'
    | 'decision_compare'
    | 'decision_history_read'
    | 'decision_scope_denied';
  timestamp: string;
  authorId: string;
  before: unknown | null;
  after: unknown | null;
}
