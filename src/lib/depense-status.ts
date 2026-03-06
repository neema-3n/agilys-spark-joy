import type { StatutDepense } from '@/types/depense.types';

export const depenseStatusLabels: Record<StatutDepense, string> = {
  brouillon: 'Brouillon',
  validee: 'Validée',
  ordonnancee: 'Ordonnancée',
  partiellement_payee: 'Partiellement payée',
  payee: 'Payée',
  annulee: 'Annulée',
};

export const depenseStatusVariants: Record<
  StatutDepense,
  'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'
> = {
  brouillon: 'outline',
  validee: 'success',
  ordonnancee: 'secondary',
  partiellement_payee: 'warning',
  payee: 'success',
  annulee: 'destructive',
};

export const canAddPaiementToDepense = (statut: StatutDepense): boolean =>
  statut === 'ordonnancee' || statut === 'partiellement_payee';

