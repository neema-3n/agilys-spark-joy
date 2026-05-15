import type { Compte } from './compte.types';
import type { VentilationNature, VentilationSens } from './financial.types';

export interface TaxeFiscale {
  id: string;
  clientId: string;
  code: string;
  libelle: string;
  description?: string;
  nature: VentilationNature;
  sensDefaut: VentilationSens;
  tauxDefaut?: number;
  montantFixeDefaut?: number;
  compteComptableId?: string;
  ordre: number;
  actif: boolean;
  dateDebutValidite?: string;
  dateFinValidite?: string;
  compteComptable?: Pick<Compte, 'id' | 'numero' | 'libelle' | 'type' | 'categorie'>;
}

export interface CreateTaxeFiscaleInput {
  clientId: string;
  code: string;
  libelle: string;
  description?: string;
  nature: VentilationNature;
  sensDefaut: VentilationSens;
  tauxDefaut?: number;
  montantFixeDefaut?: number;
  compteComptableId?: string;
  ordre: number;
  actif: boolean;
  dateDebutValidite?: string;
  dateFinValidite?: string;
}

export type UpdateTaxeFiscaleInput = Partial<Omit<CreateTaxeFiscaleInput, 'clientId'>>;

export interface ModeleFiscalLigne {
  id: string;
  taxeFiscaleId: string;
  ordre: number;
  tauxDefautOverride?: number;
  montantDefautOverride?: number;
  taxeFiscale?: TaxeFiscale;
}

export interface ModeleFiscal {
  id: string;
  clientId: string;
  code: string;
  libelle: string;
  description?: string;
  actif: boolean;
  ordre: number;
  lignes: ModeleFiscalLigne[];
}

export interface CreateModeleFiscalInput {
  clientId: string;
  code: string;
  libelle: string;
  description?: string;
  actif: boolean;
  ordre: number;
  lignes: Array<{
    taxeFiscaleId: string;
    ordre: number;
    tauxDefautOverride?: number;
    montantDefautOverride?: number;
  }>;
}

export type UpdateModeleFiscalInput = Partial<Omit<CreateModeleFiscalInput, 'clientId'>> & {
  lignes?: CreateModeleFiscalInput['lignes'];
};
