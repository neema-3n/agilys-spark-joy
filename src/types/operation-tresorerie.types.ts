export type TypeOperationTresorerie = 'encaissement' | 'decaissement' | 'transfert';
export type StatutOperationTresorerie = 'validee' | 'rapprochee' | 'annulee';

export interface OperationTresorerie {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateOperation: string;
  typeOperation: TypeOperationTresorerie;
  compteId: string;
  compteContrepartieId?: string;
  montant: number;
  modePaiement?: string;
  referenceBancaire?: string;
  libelle: string;
  categorie?: string;
  pieceJustificative?: string;
  paiementId?: string;
  recetteId?: string;
  depenseId?: string;
  statut: StatutOperationTresorerie;
  rapproche: boolean;
  dateRapprochement?: string;
  observations?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  compte?: {
    code: string;
    libelle: string;
    type: string;
  };
  compteContrepartie?: {
    code: string;
    libelle: string;
    type: string;
  };
  paiement?: {
    id: string;
    numero: string;
    depense?: {
      id: string;
      numero: string;
      objet: string;
      ligneBudgetaire?: {
        id: string;
        libelle: string;
        action?: {
          code: string;
          libelle: string;
        };
      };
    };
  };
}

export interface OperationTresorerieFormData {
  dateOperation: string;
  typeOperation: TypeOperationTresorerie;
  compteId: string;
  compteContrepartieId?: string;
  montant: number;
  modePaiement?: string;
  referenceBancaire?: string;
  libelle: string;
  categorie?: string;
  observations?: string;
}

export interface OperationsTresorerieStats {
  nombreTotal: number;
  nombreEncaissements: number;
  nombreDecaissements: number;
  nombreTransferts: number;
  montantEncaissements: number;
  montantDecaissements: number;
  montantTransferts: number;
  soldeNet: number;
  operationsNonRapprochees: number;
}
