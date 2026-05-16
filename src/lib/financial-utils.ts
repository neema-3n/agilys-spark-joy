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
  impacteNetPaye: true,
});

export const computeFinancialBreakdown = (
  montantHT: number,
  montantTTC: number,
  montantNetPaye: number,
  ventilations: FinancialVentilation[]
): FinancialBreakdown => {
  const safeMontantHT = Number.isFinite(Number(montantHT)) ? Number(montantHT) : 0;
  const safeMontantTTC = Number.isFinite(Number(montantTTC)) ? Number(montantTTC) : 0;
  const safeMontantNetPaye = Number.isFinite(Number(montantNetPaye)) ? Number(montantNetPaye) : 0;

  const safeVentilations = ventilations.map((item) => ({
    ...item,
    montant: Number.isFinite(Number(item.montant)) ? Number(item.montant) : 0,
    impacteNetPaye: item.impacteNetPaye ?? true,
  }));

  const totalAjouts = safeVentilations
    .filter((item) => item.sens === 'ajout')
    .reduce((sum, item) => sum + item.montant, 0);

  const totalRetraits = safeVentilations
    .filter((item) => item.sens === 'retrait')
    .reduce((sum, item) => sum + item.montant, 0);

  return {
    montantHT: safeMontantHT,
    montantTTC: safeMontantTTC,
    montantNetPaye: safeMontantNetPaye,
    totalAjouts,
    totalRetraits,
    ventilations: safeVentilations,
  };
};

export const getCoherenceErrors = (breakdown: FinancialBreakdown, tolerance = 0.01): string[] => {
  const errors: string[] = [];
  const expectedTTC = breakdown.montantHT + breakdown.totalAjouts;
  const netVentilations = breakdown.ventilations.filter((item) => item.impacteNetPaye);
  const totalAjoutsNet = netVentilations
    .filter((item) => item.sens === 'ajout')
    .reduce((sum, item) => sum + item.montant, 0);
  const totalRetraitsNet = netVentilations
    .filter((item) => item.sens === 'retrait')
    .reduce((sum, item) => sum + item.montant, 0);
  const expectedNet = breakdown.montantHT + totalAjoutsNet - totalRetraitsNet;

  if (Math.abs(expectedTTC - breakdown.montantTTC) > tolerance) {
    errors.push('Le TTC ne correspond pas au HT et aux ajouts.');
  }

  if (Math.abs(expectedNet - breakdown.montantNetPaye) > tolerance) {
    errors.push("Le net paye ne correspond pas au HT et aux ajustements pris en compte dans le net.");
  }

  return errors;
};

export const sumTaxVentilations = (ventilations: FinancialVentilation[]): number =>
  ventilations
    .filter((item) => item.nature === 'taxe' && item.sens === 'ajout')
    .reduce((sum, item) => sum + item.montant, 0);
