import type { ChargePrincipaleMode, FinancialVentilation } from './financial.types';

export type StatutDepense = 'brouillon' | 'validee' | 'ordonnancee' | 'payee' | 'annulee';
export type ModePaiement = 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';

export interface Depense {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateDepense: string;
  objet: string;
  montant: number;
  montantHT: number;
  montantTTC: number;
  montantNetPaye: number;
  totalAjouts: number;
  totalRetraits: number;
  montantPaye: number;
  
  // Relations optionnelles
  engagementId?: string;
  reservationCreditId?: string;
  ligneBudgetaireId?: string;
  factureId?: string;
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  chargePrincipaleMode: ChargePrincipaleMode;
  natureCompteChargeId?: string;
  compteChargeId?: string;
  ventilations: FinancialVentilation[];
  
  // Workflow
  statut: StatutDepense;
  dateValidation?: string;
  dateOrdonnancement?: string;
  datePaiement?: string;
  
  // Paiement
  modePaiement?: ModePaiement;
  referencePaiement?: string;
  
  // Métadonnées
  observations?: string;
  motifAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  ecrituresCount?: number;
  
  // Données jointes
  engagement?: {
    id: string;
    numero: string;
    montant: number;
    solde?: number;
  };
  reservationCredit?: {
    id: string;
    numero: string;
    montant: number;
    statut: string;
  };
  ligneBudgetaire?: {
    id: string;
    libelle: string;
    disponible: number;
  };
  facture?: {
    id: string;
    numero: string;
    montantTTC: number;
    statut: string;
  };
  fournisseur?: {
    id: string;
    nom: string;
    code: string;
  };
  projet?: {
    id: string;
    code: string;
    nom: string;
  };
}

export interface DepenseFormData {
  engagementId?: string;
  reservationCreditId?: string;
  ligneBudgetaireId?: string;
  factureId?: string;
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  objet: string;
  montant: number;
  montantHT?: number;
  montantTTC?: number;
  montantNetPaye?: number;
  totalAjouts?: number;
  totalRetraits?: number;
  dateDepense: string;
  modePaiement?: ModePaiement;
  referencePaiement?: string;
  observations?: string;
  chargePrincipaleMode?: ChargePrincipaleMode;
  natureCompteChargeId?: string;
  compteChargeId?: string;
  ventilations?: FinancialVentilation[];
}

export interface DepenseStats {
  nombreTotal: number;
  nombreBrouillon: number;
  nombreValidee: number;
  nombreOrdonnancee: number;
  nombrePayee: number;
  montantTotal: number;
  montantBrouillon: number;
  montantValidee: number;
  montantOrdonnancee: number;
  montantPayee: number;
}

// Création de dépense depuis une facture
export interface CreateDepenseFromFactureData {
  factureId: string;
  montant: number;
  dateDepense: string;
  modePaiement?: ModePaiement;
  referencePaiement?: string;
  observations?: string;
}

// Création de dépense depuis un engagement
export interface CreateDepenseFromEngagementData {
  engagementId: string;
  montant: number;
  dateDepense: string;
  modePaiement?: ModePaiement;
  referencePaiement?: string;
  observations?: string;
}

// Création de dépense d'urgence depuis une réservation
export interface CreateDepenseFromReservationData {
  reservationCreditId: string;
  montant: number;
  objet: string;
  dateDepense: string;
  beneficiaire?: string;
  modePaiement?: ModePaiement;
  referencePaiement?: string;
  observations?: string;
  justificationUrgence: string;
}
