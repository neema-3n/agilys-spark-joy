export type ReportingComptableView = 'balance' | 'grand-livre' | 'fiche-compte';
export type ReportingComptableExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ReportingComptableFilters {
  dateDebut: string;
  dateFin: string;
  compteId?: string;
  entiteId?: string;
  axeId?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportingComptableBalanceRow {
  compteId: string;
  numero: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
}

export interface ReportingComptableGrandLivreRow {
  ecritureId: string;
  dateEcriture: string;
  numeroPiece: string;
  numeroLigne: number;
  libelle: string;
  montant: number;
  debitCompteId: string;
  debitCompteNumero: string;
  debitCompteLibelle: string;
  creditCompteId: string;
  creditCompteNumero: string;
  creditCompteLibelle: string;
  projetId?: string;
  projetLabel?: string;
  axeLabel?: string;
}

export interface ReportingComptableFicheMouvement {
  ecritureId: string;
  dateEcriture: string;
  numeroPiece: string;
  numeroLigne: number;
  libelle: string;
  debit: number;
  credit: number;
  soldeCumule: number;
}

export interface ReportingComptableResponse {
  filters: Required<Pick<ReportingComptableFilters, 'dateDebut' | 'dateFin'>> &
    Omit<ReportingComptableFilters, 'dateDebut' | 'dateFin'> & {
      page: number;
      pageSize: number;
    };
  integrity: {
    totalDebit: number;
    totalCredit: number;
    ecart: number;
    isBalanced: boolean;
  };
  balance: {
    rows: ReportingComptableBalanceRow[];
  };
  grandLivre: {
    total: number;
    page: number;
    pageSize: number;
    rows: ReportingComptableGrandLivreRow[];
  };
  ficheCompte: {
    compteId: string;
    compteNumero: string;
    compteLibelle: string;
    soldeOuverture: number;
    totalDebit: number;
    totalCredit: number;
    soldeCloture: number;
    mouvements: ReportingComptableFicheMouvement[];
  };
}

export interface ReportingComptableExportRequest extends ReportingComptableFilters {
  view: ReportingComptableView;
  format: ReportingComptableExportFormat;
}

export interface ReportingComptableExportStartResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ReportingComptableExportStatusResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  filename?: string;
  errorMessage?: string;
}
