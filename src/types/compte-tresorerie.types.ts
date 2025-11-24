export type TypeCompteTresorerie = 'banque' | 'caisse';
export type StatutCompteTresorerie = 'actif' | 'inactif' | 'cloture';

export interface CompteTresorerie {
  id: string;
  clientId: string;
  code: string;
  libelle: string;
  type: TypeCompteTresorerie;
  banque?: string;
  numeroCompte?: string;
  devise: string;
  soldeInitial: number;
  soldeActuel: number;
  statut: StatutCompteTresorerie;
  dateOuverture: string;
  dateCloture?: string;
  observations?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompteTresorerieFormData {
  code: string;
  libelle: string;
  type: TypeCompteTresorerie;
  banque?: string;
  numeroCompte?: string;
  devise?: string;
  soldeInitial: number;
  dateOuverture: string;
  observations?: string;
}

export interface ComptesTresorerieStats {
  nombreTotal: number;
  nombreBanques: number;
  nombreCaisses: number;
  soldeTotal: number;
  soldeBanques: number;
  soldeCaisses: number;
}
