export type ReportingAnalytiqueDimension =
  | 'periode'
  | 'entite'
  | 'axe-analytique'
  | 'composante-budgetaire'
  | 'fournisseur'
  | 'statut';

export type ReportingAnalytiqueMeasure =
  | 'montant-budget-modifie'
  | 'montant-engage'
  | 'montant-paye'
  | 'montant-depense'
  | 'count';

export type ReportingAnalytiqueCycleStage =
  | 'reservation-engagement'
  | 'engagement-bon-commande'
  | 'bon-commande-facture'
  | 'facture-depense'
  | 'depense-paiement';

export type ReportingAnalytiqueView = 'tableau-croise' | 'dashboard' | 'cycle-time';
export type ReportingAnalytiqueExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ReportingAnalytiqueFilters {
  exerciceId: string;
  periode: string;
  entite?: string;
  axeAnalytique?: string;
  composanteBudgetaire?: string;
  fournisseurId?: string;
  statut?: string;
  etape?: ReportingAnalytiqueCycleStage;
  seuilReservationEngagementHeures?: number;
  seuilEngagementBonCommandeHeures?: number;
  seuilBonCommandeFactureHeures?: number;
  seuilFactureDepenseHeures?: number;
  seuilDepensePaiementHeures?: number;
  seuilVariationPct?: number;
  rowDimension?: ReportingAnalytiqueDimension;
  columnDimension?: ReportingAnalytiqueDimension;
  measure?: ReportingAnalytiqueMeasure;
  page?: number;
  pageSize?: number;
  correlationId?: string;
}

export interface ReportingAnalytiqueTableauResponse {
  view: 'tableau-croise';
  filters: {
    exerciceId: string;
    periode: string;
    dateDebut: string;
    dateFin: string;
    entite?: string;
    axeAnalytique?: string;
    composanteBudgetaire?: string;
    fournisseurId?: string;
    statut?: string;
    rowDimension: ReportingAnalytiqueDimension;
    columnDimension: ReportingAnalytiqueDimension;
    measure: ReportingAnalytiqueMeasure;
    page: number;
    pageSize: number;
    correlationId?: string;
  };
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
  summary: {
    totalRows: number;
    totalColumns: number;
    grandTotal: number;
  };
  rowKeys: string[];
  columnKeys: string[];
  rows: Array<{
    rowKey: string;
    values: Array<{
      columnKey: string;
      value: number;
    }>;
  }>;
}

export interface ReportingAnalytiqueDashboardResponse {
  view: 'dashboard';
  filters: {
    exerciceId: string;
    periode: string;
    dateDebut: string;
    dateFin: string;
    entite?: string;
    axeAnalytique?: string;
    composanteBudgetaire?: string;
    fournisseurId?: string;
    statut?: string;
    rowDimension: ReportingAnalytiqueDimension;
    columnDimension: ReportingAnalytiqueDimension;
    measure: ReportingAnalytiqueMeasure;
    page: number;
    pageSize: number;
    correlationId?: string;
  };
  kpis: {
    totalMesure: number;
    volumeLignes: number;
    totalMontantBudgetModifie: number;
    totalMontantPaye: number;
  };
  topRows: Array<{ key: string; total: number }>;
  topColumns: Array<{ key: string; total: number }>;
  anomalies: Array<{
    entite: string;
    axeAnalytique: string;
    composanteBudgetaire: string;
    statut: string;
    ecart: number;
  }>;
  chart: {
    rowDimension: ReportingAnalytiqueDimension;
    measure: ReportingAnalytiqueMeasure;
    points: Array<{ key: string; total: number }>;
  };
}

export interface ReportingAnalytiqueCycleTimeResponse {
  view: 'cycle-time';
  filters: {
    exerciceId: string;
    periode: string;
    dateDebut: string;
    dateFin: string;
    entite?: string;
    axeAnalytique?: string;
    etape?: ReportingAnalytiqueCycleStage;
    seuilsHeures: Record<ReportingAnalytiqueCycleStage, number>;
    seuilVariationPct: number;
    correlationId?: string;
  };
  summary: {
    stages: number;
    volumeTotal: number;
    alerts: number;
  };
  metrics: Array<{
    stage: ReportingAnalytiqueCycleStage;
    stageLabel: string;
    p50: number;
    p95: number;
    volume: number;
    trend: Array<{
      period: string;
      p50: number;
      p95: number;
      volume: number;
    }>;
    variationPct: number;
    thresholds: {
      p95Hours: number;
      variationPct: number;
    };
    alert: {
      active: boolean;
      reasons: string[];
    };
  }>;
  alerts: Array<{
    stage: ReportingAnalytiqueCycleStage;
    stageLabel: string;
    reasons: string[];
  }>;
}

export interface ReportingAnalytiqueExportRequest extends ReportingAnalytiqueFilters {
  view: ReportingAnalytiqueView;
  format: ReportingAnalytiqueExportFormat;
}

export interface ReportingAnalytiqueExportStartResponse {
  exportId: string;
  status: 'completed';
}

export interface ReportingAnalytiqueExportStatusResponse {
  exportId: string;
  status: 'completed';
  downloadUrl: string;
  filename: string;
}
