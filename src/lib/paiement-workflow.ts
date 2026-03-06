import type { StatutDepense } from '@/types/depense.types';
import type { Paiement, StatutPaiement } from '@/types/paiement.types';

export type PaiementTableAction =
  | 'view'
  | 'accepter'
  | 'executer'
  | 'reconcilier'
  | 'rejeter'
  | 'annuler'
  | 'reprendre';

export const paiementStatusLabels: Record<StatutPaiement, string> = {
  brouillon: 'Brouillon',
  transmis: 'Transmis',
  accepte: 'Accepté',
  execute: 'Exécuté',
  reconcilie: 'Réconcilié',
  rejete: 'Rejeté',
  annule: 'Annulé',
};

export const paiementStatusVariants: Record<
  StatutPaiement,
  'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'
> = {
  brouillon: 'outline',
  transmis: 'secondary',
  accepte: 'warning',
  execute: 'success',
  reconcilie: 'success',
  rejete: 'destructive',
  annule: 'outline',
};

export const isPaiementSuccessful = (statut: StatutPaiement): boolean =>
  ['execute', 'reconcilie'].includes(statut);

export const getMontantRestantDepense = (depense: { montant: number; montantPaye?: number }): number =>
  Math.max(Number(depense.montant ?? 0) - Number(depense.montantPaye ?? 0), 0);

export const getPaiementStatusLabel = (statut: StatutPaiement): string => paiementStatusLabels[statut];

export const getDepenseStatusLabel = (statut: StatutDepense): string =>
  ({
    brouillon: 'Brouillon',
    validee: 'Validée',
    ordonnancee: 'Ordonnancée',
    partiellement_payee: 'Partiellement payée',
    payee: 'Payée',
    annulee: 'Annulée',
  })[statut];

export const isPaiementActif = (statut: StatutPaiement): boolean => ['accepte', 'execute', 'reconcilie'].includes(statut);

export const canReprendrePaiement = (statut: StatutPaiement): boolean => ['rejete', 'annule'].includes(statut);

export const getPaiementTableActions = (statut: StatutPaiement): PaiementTableAction[] => {
  const actions: PaiementTableAction[] = ['view'];

  if (statut === 'transmis') {
    actions.push('accepter');
  }

  if (['transmis', 'accepte'].includes(statut)) {
    actions.push('executer');
  }

  if (['accepte', 'execute'].includes(statut)) {
    actions.push('reconcilier');
  }

  if (['transmis', 'accepte', 'execute'].includes(statut)) {
    actions.push('rejeter');
  }

  if (['brouillon', 'transmis', 'accepte'].includes(statut)) {
    actions.push('annuler');
  }

  if (canReprendrePaiement(statut)) {
    actions.push('reprendre');
  }

  return actions;
};

export interface PaiementStatsSummary {
  nombreTotal: string;
  nombreSucces: string;
  montantTotal: string;
  montantAujourdHui: string;
  montantCeMois: string;
}

export const formatPaiementTableNumero = (paiement: Pick<Paiement, 'numero' | 'tentativeNumero'>): string =>
  `${paiement.numero}${paiement.tentativeNumero > 1 ? ` • T${paiement.tentativeNumero}` : ''}`;

export const buildPaiementStatsSummary = (
  paiements: Paiement[],
  today: string,
  startOfMonth: string
): PaiementStatsSummary => {
  const nombreTotal = paiements.length;
  const nombreSucces = paiements.filter((p) => isPaiementSuccessful(p.statut)).length;
  const montantTotal = paiements
    .filter((p) => isPaiementSuccessful(p.statut))
    .reduce((sum, p) => sum + p.montant, 0);
  const montantAujourdHui = paiements
    .filter((p) => isPaiementSuccessful(p.statut) && p.datePaiement === today)
    .reduce((sum, p) => sum + p.montant, 0);
  const montantCeMois = paiements
    .filter((p) => isPaiementSuccessful(p.statut) && p.datePaiement >= startOfMonth)
    .reduce((sum, p) => sum + p.montant, 0);

  return {
    nombreTotal: nombreTotal.toString(),
    nombreSucces: nombreSucces.toString(),
    montantTotal: `${montantTotal.toFixed(2)} €`,
    montantAujourdHui: `${montantAujourdHui.toFixed(2)} €`,
    montantCeMois: `${montantCeMois.toFixed(2)} €`,
  };
};

export const getMontantPayeFromPaiements = (paiements: Array<Pick<Paiement, 'montant' | 'statut'>>): number =>
  paiements
    .filter((paiement) => isPaiementSuccessful(paiement.statut))
    .reduce((sum, paiement) => sum + Number(paiement.montant ?? 0), 0);
