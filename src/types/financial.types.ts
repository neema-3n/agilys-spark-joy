export type VentilationNature = 'taxe' | 'retenue' | 'redevance' | 'frais' | 'autre';
export type VentilationSens = 'ajout' | 'retrait';
export type ChargePrincipaleMode = 'nature' | 'compte_expert';

export interface FinancialVentilation {
  id: string;
  libelle: string;
  nature: VentilationNature;
  montant: number;
  sens: VentilationSens;
}

export interface FinancialBreakdown {
  montantHT: number;
  montantTTC: number;
  montantNetPaye: number;
  totalAjouts: number;
  totalRetraits: number;
  ventilations: FinancialVentilation[];
}
