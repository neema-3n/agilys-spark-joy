import type {
  PointComptable,
  RoleLigneComptable,
  SourceCompteComptable,
  SourceMontantComptable,
  TypeOperation,
} from '@/types/regle-comptable.types';

type SupportedAccountingOperation = Extract<TypeOperation, 'facture' | 'depense' | 'paiement'>;

type AccountingOperationPolicy = {
  allowedPoints: PointComptable[];
  allowedRoles: RoleLigneComptable[];
  allowedSourceMontantsByRole: Record<RoleLigneComptable, SourceMontantComptable[]>;
  allowedAccountSources: SourceCompteComptable[];
  defaultPoint: PointComptable;
  defaultRole: RoleLigneComptable;
  defaultSourceMontant: SourceMontantComptable;
  supportsSnapshotCard: boolean;
};

export const ACCOUNTING_OPERATION_TYPES: SupportedAccountingOperation[] = ['facture', 'depense', 'paiement'];

export const ACCOUNTING_POLICY_BY_OPERATION: Record<SupportedAccountingOperation, AccountingOperationPolicy> = {
  facture: {
    allowedPoints: ['constatation'],
    allowedRoles: ['charge_principale', 'ventilation'],
    allowedSourceMontantsByRole: {
      charge_principale: ['montant_ht', 'montant_ttc', 'montant_net_paye'],
      ventilation: ['ventilation_montant'],
      reglement_tresorerie: [],
    },
    allowedAccountSources: ['compte_fixe', 'charge_principale'],
    defaultPoint: 'constatation',
    defaultRole: 'charge_principale',
    defaultSourceMontant: 'montant_ht',
    supportsSnapshotCard: true,
  },
  depense: {
    allowedPoints: ['constatation'],
    allowedRoles: ['charge_principale'],
    allowedSourceMontantsByRole: {
      charge_principale: ['montant'],
      ventilation: [],
      reglement_tresorerie: [],
    },
    allowedAccountSources: ['compte_fixe', 'charge_principale'],
    defaultPoint: 'constatation',
    defaultRole: 'charge_principale',
    defaultSourceMontant: 'montant',
    supportsSnapshotCard: true,
  },
  paiement: {
    allowedPoints: ['reglement'],
    allowedRoles: ['reglement_tresorerie'],
    allowedSourceMontantsByRole: {
      charge_principale: [],
      ventilation: [],
      reglement_tresorerie: ['montant'],
    },
    allowedAccountSources: ['compte_fixe'],
    defaultPoint: 'reglement',
    defaultRole: 'reglement_tresorerie',
    defaultSourceMontant: 'montant',
    supportsSnapshotCard: true,
  },
};

export const isAccountingEnabledForOperation = (typeOperation: TypeOperation): typeOperation is SupportedAccountingOperation =>
  typeOperation === 'facture' || typeOperation === 'depense' || typeOperation === 'paiement';

export const getAccountingPolicy = (typeOperation: SupportedAccountingOperation) =>
  ACCOUNTING_POLICY_BY_OPERATION[typeOperation];

export const shouldShowAccountingForDepense = (factureId?: string | null) => !factureId;

