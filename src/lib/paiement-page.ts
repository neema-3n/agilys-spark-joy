import type { Paiement, PaiementMotifPayload, StatutPaiement } from '@/types/paiement.types';
import { paiementStatusLabels } from '@/lib/paiement-workflow';

export type PaiementMotifAction = 'annuler' | 'rejeter';

export interface PaiementMotifDialogState {
  open: boolean;
  selectedPaiementId: string | null;
  pendingAction: PaiementMotifAction | null;
  motif: string;
}

export interface PaiementMotifDialogCopy {
  title: string;
  description: string;
  label: string;
  placeholder: string;
}

export const filterPaiements = (
  paiements: Paiement[],
  search: string,
  statutFilter: 'tous' | StatutPaiement
): Paiement[] => {
  const searchLower = search.toLowerCase();

  return paiements
    .filter((paiement) => (statutFilter === 'tous' ? true : paiement.statut === statutFilter))
    .filter(
      (paiement) =>
        !search ||
        paiement.numero.toLowerCase().includes(searchLower) ||
        paiement.depense?.numero.toLowerCase().includes(searchLower) ||
        paiement.referencePaiement?.toLowerCase().includes(searchLower) ||
        paiement.depense?.fournisseur?.nom?.toLowerCase().includes(searchLower)
    )
    .sort((left, right) => new Date(right.datePaiement).getTime() - new Date(left.datePaiement).getTime());
};

export const openPaiementMotifDialog = (
  paiementId: string,
  action: PaiementMotifAction
): PaiementMotifDialogState => ({
  open: true,
  selectedPaiementId: paiementId,
  pendingAction: action,
  motif: '',
});

export const resetPaiementMotifDialog = (): PaiementMotifDialogState => ({
  open: false,
  selectedPaiementId: null,
  pendingAction: null,
  motif: '',
});

export const getPaiementMotifDialogCopy = (action: PaiementMotifAction | null): PaiementMotifDialogCopy => {
  if (action === 'rejeter') {
    return {
      title: 'Rejeter ce paiement',
      description: 'Cette action marque la tentative comme rejetée et conserve son historique.',
      label: 'Motif de rejet *',
      placeholder: 'Indiquez le motif du rejet...',
    };
  }

  return {
    title: 'Annuler ce paiement',
    description: 'Cette action annule la tentative. Les montants et écritures liés seront recalculés si nécessaire.',
    label: "Motif d'annulation *",
    placeholder: "Indiquez le motif de l'annulation...",
  };
};

export const canSubmitPaiementMotif = (state: PaiementMotifDialogState): boolean =>
  Boolean(state.selectedPaiementId && state.pendingAction && state.motif.trim());

export const buildPaiementMotifSubmission = (
  state: PaiementMotifDialogState
): { id: string; action: PaiementMotifAction; payload: PaiementMotifPayload } | null => {
  if (!canSubmitPaiementMotif(state)) {
    return null;
  }

  return {
    id: state.selectedPaiementId!,
    action: state.pendingAction!,
    payload: { motif: state.motif.trim() },
  };
};

export const getPaiementFilterOptions = (): Array<{ value: 'tous' | StatutPaiement; label: string }> => [
  { value: 'tous', label: 'Tous' },
  { value: 'transmis', label: paiementStatusLabels.transmis },
  { value: 'accepte', label: paiementStatusLabels.accepte },
  { value: 'execute', label: paiementStatusLabels.execute },
  { value: 'reconcilie', label: paiementStatusLabels.reconcilie },
  { value: 'rejete', label: paiementStatusLabels.rejete },
  { value: 'annule', label: paiementStatusLabels.annule },
];

export const getPaiementInvalidationKeys = (depenseId?: string): string[][] => {
  const keys: string[][] = [['paiements']];

  if (depenseId) {
    keys.push(['paiements', 'depense', depenseId]);
  }

  keys.push(['depenses']);
  keys.push(['ecritures-comptables']);

  return keys;
};
