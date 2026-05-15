import type {
  FinancialBreakdown,
  FinancialVentilation,
  VentilationNature,
  VentilationSens,
} from '@/types/financial.types';

export const VENTILATION_NATURE_LABELS: Record<VentilationNature, string> = {
  taxe: 'Taxe',
  retenue: 'Retenue',
  redevance: 'Redevance',
  frais: 'Frais',
  autre: 'Autre',
};

export const VENTILATION_SENS_LABELS: Record<VentilationSens, string> = {
  ajout: 'Ajout',
  retrait: 'Retrait',
};

export const DEFAULT_SENS_BY_NATURE: Record<VentilationNature, VentilationSens> = {
  taxe: 'ajout',
  retenue: 'retrait',
  redevance: 'ajout',
  frais: 'ajout',
  autre: 'ajout',
};

export const createEmptyVentilation = (): FinancialVentilation => ({
  id: globalThis.crypto?.randomUUID?.() ?? `vent-${Date.now()}-${Math.random()}`,
  libelle: '',
  nature: 'taxe',
  montant: 0,
  sens: 'ajout',
});

export const computeFinancialBreakdown = (
  montantHT: number,
  montantTTC: number,
  montantNetPaye: number,
  ventilations: FinancialVentilation[]
): FinancialBreakdown => {
  const safeVentilations = ventilations.map((item) => ({
    ...item,
    montant: Number.isFinite(item.montant) ? item.montant : 0,
  }));

  const totalAjouts = safeVentilations
    .filter((item) => item.sens === 'ajout')
    .reduce((sum, item) => sum + item.montant, 0);

  const totalRetraits = safeVentilations
    .filter((item) => item.sens === 'retrait')
    .reduce((sum, item) => sum + item.montant, 0);

  return {
    montantHT,
    montantTTC,
    montantNetPaye,
    totalAjouts,
    totalRetraits,
    ventilations: safeVentilations,
  };
};

export const getCoherenceErrors = (breakdown: FinancialBreakdown, tolerance = 0.01): string[] => {
  const errors: string[] = [];
  const expectedTTC = breakdown.montantHT + breakdown.totalAjouts;
  const expectedNet = breakdown.montantTTC - breakdown.totalRetraits;

  if (Math.abs(expectedTTC - breakdown.montantTTC) > tolerance) {
    errors.push('Le TTC ne correspond pas au HT et aux ajouts.');
  }

  if (Math.abs(expectedNet - breakdown.montantNetPaye) > tolerance) {
    errors.push('Le net paye ne correspond pas au TTC et aux retraits.');
  }

  return errors;
};

export const sumTaxVentilations = (ventilations: FinancialVentilation[]): number =>
  ventilations
    .filter((item) => item.nature === 'taxe' && item.sens === 'ajout')
    .reduce((sum, item) => sum + item.montant, 0);
