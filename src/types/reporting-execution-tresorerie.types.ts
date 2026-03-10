export type ReportingExecutionTresorerieView = 'execution-budgetaire' | 'tresorerie';
export type ReportingExecutionTresorerieExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ReportingExecutionTresorerieFilters {
  exerciceId: string;
  periode: string;
  entite?: string;
  axeAnalytique?: string;
  seuil?: number;
  page?: number;
  pageSize?: number;
  correlationId?: string;
}

export interface ExecutionBudgetaireRow {
  ligneId: string;
  ligneLibelle: string;
  composante: string;
  axeAnalytique: string;
  budgetInitial: number;
  budgetModifie: number;
  engage: number;
  paye: number;
  disponible: number;
  ecartPrevisionExecution: number;
  alerteSeuil: boolean;
}

export interface ExecutionBudgetaireResponse {
  view: 'execution-budgetaire';
  filters: {
    exerciceId: string;
    periode: string;
    dateDebut: string;
    dateFin: string;
    entite?: string;
    axeAnalytique?: string;
    seuil: number;
    page: number;
    pageSize: number;
    correlationId?: string;
  };
  summary: {
    count: number;
    totalBudgetModifie: number;
    totalPaye: number;
    totalEcart: number;
    totalAlertes: number;
  };
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
  rows: ExecutionBudgetaireRow[];
}

export interface JournalFluxRow {
  id: string;
  numero: string;
  dateOperation: string;
  typeOperation: 'encaissement' | 'decaissement' | 'transfert';
  libelle: string;
  referenceBancaire: string | null;
  compte: string;
  montant: number;
  statut: string;
  rapproche: boolean;
}

export interface SituationCompteRow {
  compteId: string;
  compte: string;
  soldeActuel: number;
  totalEncaissements: number;
  totalDecaissements: number;
  totalTransferts: number;
}

export interface PrevisionTresorerieRow {
  periode: string;
  decaissementsPrevus: number;
  soldeProjection: number;
}

export interface EtatPaiementRow {
  statut: string;
  count: number;
  montant: number;
}

export interface EtatRapprochementRow {
  statut: string;
  count: number;
  ecartTotal: number;
}

export interface AlerteTresorerieRow {
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  active: boolean;
}

export interface TresorerieResponse {
  view: 'tresorerie';
  filters: {
    exerciceId: string;
    periode: string;
    dateDebut: string;
    dateFin: string;
    entite?: string;
    axeAnalytique?: string;
    seuil: number;
    page: number;
    pageSize: number;
    correlationId?: string;
  };
  summary: {
    positionCourante: number;
    projectionSolde: number;
    totalFlux: number;
    totalAlertes: number;
  };
  journalFlux: JournalFluxRow[];
  situationComptes: SituationCompteRow[];
  previsions: PrevisionTresorerieRow[];
  alertes: AlerteTresorerieRow[];
  etatPaiements: EtatPaiementRow[];
  etatRapprochements: EtatRapprochementRow[];
}

export interface ReportingExecutionTresorerieExportRequest extends ReportingExecutionTresorerieFilters {
  view: ReportingExecutionTresorerieView;
  format: ReportingExecutionTresorerieExportFormat;
}

export interface ReportingExecutionTresorerieExportStartResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ReportingExecutionTresorerieExportStatusResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  filename?: string;
  errorMessage?: string;
}
