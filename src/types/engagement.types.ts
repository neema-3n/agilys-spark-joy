export type StatutEngagement = 'brouillon' | 'valide' | 'engage' | 'liquide' | 'annule';

export interface Engagement {
  id: string;
  numero: string;
  exerciceId: string;
  clientId: string;
  reservationCreditId?: string;
  ligneBudgetaireId: string;
  objet: string;
  montant: number;
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  statut: StatutEngagement;
  dateCreation: string;
  dateValidation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  motifAnnulation?: string;
  observations?: string;
  solde?: number;
  
  // Données jointes
  ligneBudgetaire?: {
    libelle: string;
    disponible: number;
  };
  fournisseur?: {
    nom: string;
    code: string;
  };
  projet?: {
    code: string;
    nom: string;
  };
  reservationCredit?: {
    numero: string;
    statut: string;
  };
}

export interface EngagementFormData {
  reservationCreditId?: string;
  ligneBudgetaireId: string;
  objet: string;
  montant: number;
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  observations?: string;
}
