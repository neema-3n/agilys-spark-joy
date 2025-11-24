export type StatutFacture = 'brouillon' | 'validee' | 'payee' | 'annulee';

export interface Facture {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateFacture: string;
  dateEcheance?: string;
  fournisseurId: string;
  bonCommandeId?: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  projetId?: string;
  objet: string;
  numeroFactureFournisseur?: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantLiquide: number;
  statut: StatutFacture;
  dateValidation?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  ecrituresCount?: number;
  
  // Relations optionnelles
  fournisseur?: {
    id: string;
    nom: string;
    code: string;
  };
  bonCommande?: {
    id: string;
    numero: string;
  };
  engagement?: {
    id: string;
    numero: string;
  };
  ligneBudgetaire?: {
    id: string;
    libelle: string;
  };
  projet?: {
    id: string;
    nom: string;
  };
}

export type CreateFactureInput = Omit<
  Facture,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'fournisseur' | 'bonCommande' | 'engagement' | 'ligneBudgetaire' | 'projet'
>;

export type UpdateFactureInput = Partial<CreateFactureInput>;

export interface FactureStats {
  nombreTotal: number;
  nombreBrouillon: number;
  nombreValidee: number;
  nombrePayee: number;
  montantTotal: number;
  montantBrouillon: number;
  montantValidee: number;
  montantLiquide: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: {
    statut?: StatutFacture;
    searchTerm?: string;
    fournisseurId?: string;
    dateDebut?: string;
    dateFin?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
