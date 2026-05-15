import type { Compte } from './compte.types';

export interface NatureCompte {
  id: string;
  clientId: string;
  code: string;
  libelle: string;
  description?: string;
  compteDefautId?: string;
  ordre: number;
  actif: boolean;
  compteDefaut?: Pick<Compte, 'id' | 'numero' | 'libelle' | 'type' | 'categorie'>;
  isFallback?: boolean;
}

export interface CreateNatureCompteInput {
  clientId: string;
  code: string;
  libelle: string;
  description?: string;
  compteDefautId?: string;
  ordre: number;
  actif: boolean;
}

export type UpdateNatureCompteInput = Partial<Omit<CreateNatureCompteInput, 'clientId'>>;
