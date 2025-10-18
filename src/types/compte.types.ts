export type CompteType = 'actif' | 'passif' | 'charge' | 'produit' | 'resultat';
export type CompteCategorie = 
  | 'immobilisation' 
  | 'stock' 
  | 'creance' 
  | 'tresorerie' 
  | 'dette' 
  | 'capital' 
  | 'exploitation' 
  | 'financier' 
  | 'exceptionnel' 
  | 'autre';
export type CompteStatut = 'actif' | 'inactif';

export interface Compte {
  id: string;
  clientId: string;
  numero: string;
  libelle: string;
  type: CompteType;
  categorie: CompteCategorie;
  parentId?: string;
  niveau: number;
  statut: CompteStatut;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCompteInput {
  clientId: string;
  numero: string;
  libelle: string;
  type: CompteType;
  categorie: CompteCategorie;
  parentId?: string;
  niveau?: number;
  statut?: CompteStatut;
}

export interface UpdateCompteInput {
  numero?: string;
  libelle?: string;
  type?: CompteType;
  categorie?: CompteCategorie;
  parentId?: string;
  niveau?: number;
  statut?: CompteStatut;
}
