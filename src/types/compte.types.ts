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
export type CompteVersionStatus = 'draft' | 'published' | 'archived';

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
  versionGroupId: string;
  versionNumber: number;
  versionStatus: CompteVersionStatus;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  changeReason?: string;
  publishedAt?: string;
  archivedAt?: string;
  createdBy?: string;
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
  versionStatus?: CompteVersionStatus;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  changeReason?: string;
}

export interface UpdateCompteInput {
  numero?: string;
  libelle?: string;
  type?: CompteType;
  categorie?: CompteCategorie;
  parentId?: string;
  niveau?: number;
  statut?: CompteStatut;
  versionStatus?: CompteVersionStatus;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  changeReason?: string;
}

export interface ImportReport {
  success: boolean;
  stats: {
    total: number;
    created: number;
    skipped: number;
    errors: Array<{ code: string; error: string }>;
  };
  byLevel: Record<number, { created: number; skipped: number }>;
}
