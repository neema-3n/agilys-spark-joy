export type StatutPaiement =
  | 'brouillon'
  | 'transmis'
  | 'accepte'
  | 'execute'
  | 'reconcilie'
  | 'rejete'
  | 'annule';
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
  motifRejet?: string;
  dateRejet?: string;
  dateRetour?: string;
  referenceRetour?: string;
  tentativeNumero: number;
  paiementOrigineId?: string;
  paiementReprisDeId?: string;
  
  // Métadonnées
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  ecrituresCount?: number;
  
  // Relations (données jointes)
  depense?: {
    id: string;
    numero: string;
    objet: string;
    montant: number;
    montantPaye: number;
    resteAPayer: number;
    statut: 'brouillon' | 'validee' | 'ordonnancee' | 'partiellement_payee' | 'payee' | 'annulee';
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

export interface PaiementMotifPayload {
  motif: string;
  dateRetour?: string;
  referenceRetour?: string;
}

export interface ReprendrePaiementPayload {
  montant?: number;
  datePaiement?: string;
  modePaiement?: ModePaiement;
  referencePaiement?: string;
  observations?: string;
}

export interface PaiementStats {
  nombreTotal: number;
  nombreSucces: number;
  nombreAnnule: number;
  nombreRejete: number;
  montantTotal: number;
  montantSucces: number;
  montantAnnule: number;
  montantAujourdHui: number;
  montantCeMois: number;
  repartitionParMode: {
    mode: ModePaiement;
    nombre: number;
    montant: number;
  }[];
}
