import type { ChargePrincipaleMode, FinancialVentilation } from './financial.types';

export type StatutPaiement = 'valide' | 'annule';
export type ModePaiement = 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';

export interface Paiement {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  
  // Source
  depenseId?: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  objet?: string;
  
  // Montant
  montant: number;
  montantHT: number;
  montantTTC: number;
  montantNetPaye: number;
  totalAjouts: number;
  totalRetraits: number;
  chargePrincipaleMode: ChargePrincipaleMode;
  natureCompteChargeId?: string;
  compteChargeId?: string;
  ventilations: FinancialVentilation[];
  
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
  ecrituresCount?: number;
  
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
  depenseId?: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  objet?: string;
  montant: number;
  montantHT?: number;
  montantTTC?: number;
  montantNetPaye?: number;
  totalAjouts?: number;
  totalRetraits?: number;
  datePaiement: string;
  modePaiement: ModePaiement;
  referencePaiement?: string;
  observations?: string;
  chargePrincipaleMode?: ChargePrincipaleMode;
  natureCompteChargeId?: string;
  compteChargeId?: string;
  ventilations?: FinancialVentilation[];
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
