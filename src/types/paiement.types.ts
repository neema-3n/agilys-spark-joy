export type StatutPaiement = 'valide' | 'annule';
export type ModePaiement = 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';

export interface Paiement {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  
  // Source
  depenseId: string;
  
  // Montant
  montant: number;
  
  // Détails paiement
  datePaiement: string;
  modePaiement: ModePaiement;
  referencePaiement?: string;
  observations?: string;
  
  // Statut
  statut: StatutPaiement;
  motifAnnulation?: string;
  dateAnnulation?: string;
  
  // Métadonnées
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations (données jointes)
  depense?: {
    id: string;
    numero: string;
    objet: string;
    montant: number;
    fournisseur?: {
      id: string;
      nom: string;
      code: string;
    };
  };
}

export interface PaiementFormData {
  depenseId: string;
  montant: number;
  datePaiement: string;
  modePaiement: ModePaiement;
  referencePaiement?: string;
  observations?: string;
}

export interface PaiementStats {
  nombreTotal: number;
  nombreValide: number;
  nombreAnnule: number;
  montantTotal: number;
  montantValide: number;
  montantAnnule: number;
  montantAujourdHui: number;
  montantCeMois: number;
  repartitionParMode: {
    mode: ModePaiement;
    nombre: number;
    montant: number;
  }[];
}
