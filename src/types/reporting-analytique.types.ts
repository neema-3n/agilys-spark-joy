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

export type ReportingAnalytiqueView = 'tableau-croise' | 'dashboard';
export type ReportingAnalytiqueExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ReportingAnalytiqueFilters {
  exerciceId: string;
  periode: string;
  entite?: string;
  axeAnalytique?: string;
  composanteBudgetaire?: string;
  fournisseurId?: string;
  statut?: string;
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
