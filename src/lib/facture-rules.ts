import type { Facture } from '@/types/facture.types';

const LIQUIDATION_TOLERANCE = 0.01;

type MinimalFacture = Pick<Facture, 'statut' | 'montantLiquide'>;

export const isFactureLiquidated = (facture: MinimalFacture): boolean =>
  facture.statut === 'soldee' || (facture.montantLiquide ?? 0) > LIQUIDATION_TOLERANCE;

export const canDeleteFacture = (facture: MinimalFacture): boolean => facture.statut === 'brouillon';

export const canCancelFacture = (facture: MinimalFacture): boolean =>
  facture.statut === 'validee' && !isFactureLiquidated(facture);
