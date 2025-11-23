export type StatutBonCommande = 'brouillon' | 'valide' | 'en_cours' | 'receptionne' | 'facture' | 'annule';

export interface BonCommande {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateCommande: string;
  fournisseurId: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  projetId?: string;
  objet: string;
  montant: number;
  statut: StatutBonCommande;
  dateValidation?: string;
  dateLivraisonPrevue?: string;
  dateLivraisonReelle?: string;
  conditionsLivraison?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  
  // Relations optionnelles
  fournisseur?: {
    id: string;
    nom: string;
    code: string;
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
  
  // Montant facturé (calculé)
  montantFacture?: number;
}

export type CreateBonCommandeInput = Omit<
  BonCommande,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'fournisseur' | 'engagement' | 'ligneBudgetaire' | 'projet'
>;

export type UpdateBonCommandeInput = Partial<CreateBonCommandeInput>;

export interface BonCommandeStats {
  nombreTotal: number;
  nombreBrouillon: number;
  nombreValide: number;
  nombreEnCours: number;
  nombreReceptionne: number;
  nombreFacture: number;
  montantTotal: number;
  montantValide: number;
  montantEnCours: number;
  montantFacture: number;
}
