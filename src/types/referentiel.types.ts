export type ReferentielCategorie = 
  | 'compte_type'
  | 'compte_categorie' 
  | 'structure_type'
  | 'source_financement'
  | 'statut_general';

export interface ParametreReferentiel {
  id: string;
  clientId: string;
  categorie: ReferentielCategorie;
  code: string;
  libelle: string;
  description?: string;
  ordre: number;
  actif: boolean;
  modifiable: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type CreateReferentielInput = Omit<ParametreReferentiel, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;
export type UpdateReferentielInput = Partial<Omit<CreateReferentielInput, 'clientId' | 'categorie'>>;
