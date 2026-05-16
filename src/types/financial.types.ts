export type VentilationNature = 'taxe' | 'retenue' | 'redevance' | 'frais' | 'autre';
export type VentilationSens = 'ajout' | 'retrait';
export type ChargePrincipaleMode = 'nature' | 'compte_expert';

export interface FinancialVentilation {
  id: string;
  taxeFiscaleId?: string;
  libelle: string;
  nature: VentilationNature;
  montant: number;
  sens: VentilationSens;
  impacteNetPaye?: boolean;
  taux?: number;
}

export interface FinancialBreakdown {
  montantHT: number;
  montantTTC: number;
  montantNetPaye: number;
  totalAjouts: number;
  totalRetraits: number;
  ventilations: FinancialVentilation[];
}
