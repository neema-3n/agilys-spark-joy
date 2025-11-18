// Types pour le module Budget

export interface Section {
  id: string;
  client_id: string;
  exercice_id: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Programme {
  id: string;
  section_id: string;
  client_id: string;
  exercice_id: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Action {
  id: string;
  programme_id: string;
  client_id: string;
  exercice_id: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface LigneBudgetaire {
  id: string;
  exerciceId: string;
  actionId: string;
  compteId: string;
  enveloppeId?: string;
  libelle: string;
  montantInitial: number;
  montantModifie: number;
  montantReserve?: number;
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
