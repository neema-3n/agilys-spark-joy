export type ReportingFournisseursView = 'etat-dettes-fournisseurs' | 'etat-avances-regularisations';
export type ReportingFournisseursExportFormat = 'csv' | 'xlsx' | 'pdf';
export type ReportingFournisseursAgingBucket = 'J0-30' | 'J31-60' | 'J61-90' | 'J90+';

export interface ReportingFournisseursFilters {
  periode: string;
  entite?: string;
  fournisseurId?: string;
  statut?: string;
  agingBucket?: ReportingFournisseursAgingBucket;
  page?: number;
  pageSize?: number;
}

export interface EtatDettesFournisseursRow {
  factureId: string;
  factureNumero: string;
  dateFacture: string;
  dateEcheance: string | null;
  fournisseurId: string;
  fournisseurCode: string;
  fournisseurNom: string;
  statut: string;
  agingBucket: ReportingFournisseursAgingBucket;
  joursRetard: number;
  montantFacture: number;
  montantLiquide: number;
  montantPaye: number;
  resteAPayer: number;
  ecartRegularisation: number;
  statutRegularisation: 'regularisee' | 'partielle' | 'a-regulariser';
  dernierPaiement: string | null;
  nombrePaiements: number;
  ecrituresAssociees: number;
}

export interface EtatAvancesRegularisationsRow {
  fournisseurId: string;
  fournisseurCode: string;
  fournisseurNom: string;
  avanceInitiale: number;
  consommation: number;
  ecart: number;
  statutRegularisation: 'regularisee' | 'surconsommation' | 'a-regulariser';
  depensesCount: number;
  ecrituresAssociees: number;
  derniereActivite: string | null;
}

export interface ReportingFournisseursSummary {
  count: number;
  totalMontant: number;
  totalResteOuEcart: number;
}

export interface ReportingFournisseursPagedResponse<T> {
  view: ReportingFournisseursView;
  filters: {
    periode: string;
    dateDebut: string;
    dateFin: string;
    entite?: string;
    fournisseurId?: string;
    statut?: string;
    agingBucket?: ReportingFournisseursAgingBucket;
    page: number;
    pageSize: number;
  };
  summary: ReportingFournisseursSummary;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
  rows: T[];
}

export type EtatDettesFournisseursResponse = ReportingFournisseursPagedResponse<EtatDettesFournisseursRow>;
export type EtatAvancesRegularisationsResponse = ReportingFournisseursPagedResponse<EtatAvancesRegularisationsRow>;

export interface ReportingFournisseursExportRequest extends ReportingFournisseursFilters {
  view: ReportingFournisseursView;
  format: ReportingFournisseursExportFormat;
}

export interface ReportingFournisseursExportStartResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ReportingFournisseursExportStatusResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  filename?: string;
  errorMessage?: string;
}
