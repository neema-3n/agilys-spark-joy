export type StructureType = 'entite' | 'service' | 'centre_cout' | 'direction';
export type StructureStatut = 'actif' | 'inactif';

export interface Structure {
  id: string;
  clientId: string;
  exerciceId?: string;
  code: string;
  nom: string;
  type: StructureType;
  parentId?: string;
  responsable?: string;
  statut: StructureStatut;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStructureInput {
  clientId: string;
  exerciceId?: string;
  code: string;
  nom: string;
  type: StructureType;
  parentId?: string;
  responsable?: string;
  statut?: StructureStatut;
}

export interface UpdateStructureInput {
  code?: string;
  nom?: string;
  type?: StructureType;
  parentId?: string;
  responsable?: string;
  statut?: StructureStatut;
}
