export const PAIEMENT_STATUSES = [
  'brouillon',
  'transmis',
  'accepte',
  'execute',
  'reconcilie',
  'rejete',
  'annule',
] as const;

export const SUCCESS_PAIEMENT_STATUSES = ['execute', 'reconcilie'] as const;

export const ACCOUNTING_READY_PAIEMENT_STATUSES = ['execute', 'reconcilie'] as const;

export const ACTIVE_DEPENSE_PAIEMENT_STATUSES = ['ordonnancee', 'partiellement_payee'] as const;

export const PAIEMENT_MODE_VALUES = ['virement', 'cheque', 'especes', 'carte', 'autre'] as const;

export type PaiementStatus = (typeof PAIEMENT_STATUSES)[number];

export type SuccessfulPaiementStatus = (typeof SUCCESS_PAIEMENT_STATUSES)[number];
export type PaiementMode = (typeof PAIEMENT_MODE_VALUES)[number];

export type DepensePaiementStatus = 'brouillon' | 'validee' | 'ordonnancee' | 'partiellement_payee' | 'payee' | 'annulee';
export type DepenseWorkflowStatus = DepensePaiementStatus;

const transitionMap: Record<PaiementStatus, readonly PaiementStatus[]> = {
  brouillon: ['transmis', 'annule'],
  transmis: ['accepte', 'execute', 'reconcilie', 'rejete', 'annule'],
  accepte: ['execute', 'reconcilie', 'rejete', 'annule'],
  execute: ['reconcilie', 'rejete'],
  reconcilie: [],
  rejete: [],
  annule: [],
};

export const isPaiementStatus = (value: string): value is PaiementStatus =>
  (PAIEMENT_STATUSES as readonly string[]).includes(value);

export const isSuccessfulPaiementStatus = (value: string): value is SuccessfulPaiementStatus =>
  (SUCCESS_PAIEMENT_STATUSES as readonly string[]).includes(value);

export const isAccountingReadyPaiementStatus = (value: string): value is SuccessfulPaiementStatus =>
  (ACCOUNTING_READY_PAIEMENT_STATUSES as readonly string[]).includes(value);

export const canTransitionPaiement = (current: PaiementStatus, next: PaiementStatus): boolean =>
  transitionMap[current].includes(next);

export const canCreatePaiementForDepense = (statut: string): statut is (typeof ACTIVE_DEPENSE_PAIEMENT_STATUSES)[number] =>
  (ACTIVE_DEPENSE_PAIEMENT_STATUSES as readonly string[]).includes(statut);
