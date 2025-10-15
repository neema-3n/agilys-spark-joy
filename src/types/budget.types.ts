// Types pour le module Budget

export interface Section {
  id: string;
  code: string;
  libelle: string;
  ordre: number;
}

export interface Programme {
  id: string;
  sectionId: string;
  code: string;
  libelle: string;
  ordre: number;
}

export interface Action {
  id: string;
  programmeId: string;
  code: string;
  libelle: string;
  ordre: number;
}

export interface LigneBudgetaire {
  id: string;
  exerciceId: string;
  actionId: string;
  compteId: string;
  libelle: string;
  montantInitial: number;
  montantModifie: number;
  montantEngage: number;
  montantPaye: number;
  disponible: number;
  dateCreation: string;
  statut: 'actif' | 'cloture';
}

export type TypeModification = 'augmentation' | 'diminution' | 'virement';
export type StatutModification = 'brouillon' | 'en_attente' | 'validee' | 'rejetee';

export interface ModificationBudgetaire {
  id: string;
  exerciceId: string;
  numero: string;
  type: TypeModification;
  ligneSourceId?: string;
  ligneDestinationId: string;
  montant: number;
  motif: string;
  statut: StatutModification;
  dateCreation: string;
  dateValidation?: string;
  validePar?: string;
}
