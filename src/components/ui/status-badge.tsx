import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, CheckCircle, XCircle, Clock, FileText, Truck, Receipt, Building2, Wallet } from 'lucide-react';

export type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success';

export interface StatusConfig {
  variant: StatusVariant;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Generic status badge component that handles common status patterns
 */
export const StatusBadge = ({
  status,
  config,
  className
}: {
  status: string;
  config: Record<string, StatusConfig>;
  className?: string;
}) => {
  const statusConfig = config[status] || config.default || { variant: 'outline', label: status };

  return (
    <Badge variant={statusConfig.variant} className={className}>
      {statusConfig.icon && <statusConfig.icon className="h-3 w-3 mr-1" />}
      {statusConfig.label}
    </Badge>
  );
};

/**
 * Pre-configured status badges for common entities
 */

// Facture status badges
export const FACTURE_STATUS_CONFIG: Record<string, StatusConfig> = {
  brouillon: { variant: 'outline', label: 'Brouillon', icon: FileText },
  validee: { variant: 'success', label: 'Validée', icon: CheckCircle },
  payee: { variant: 'success', label: 'Payée', icon: CheckCircle },
  annulee: { variant: 'destructive', label: 'Annulée', icon: XCircle },
  default: { variant: 'outline', label: 'Brouillon', icon: FileText },
};

export const FactureStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} config={FACTURE_STATUS_CONFIG} />
);

// Bon de commande status badges
export const BON_COMMANDE_STATUS_CONFIG: Record<string, StatusConfig> = {
  brouillon: { variant: 'outline', label: 'Brouillon', icon: FileText },
  valide: { variant: 'default', label: 'Validé', icon: CheckCircle },
  receptionne: { variant: 'warning', label: 'Réceptionné', icon: Truck },
  facture: { variant: 'success', label: 'Facturé', icon: Receipt },
  annule: { variant: 'destructive', label: 'Annulé', icon: XCircle },
  default: { variant: 'outline', label: 'Brouillon', icon: FileText },
};

export const BonCommandeStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} config={BON_COMMANDE_STATUS_CONFIG} />
);

// Dépense status badges
export const DEPENSE_STATUS_CONFIG: Record<string, StatusConfig> = {
  brouillon: { variant: 'outline', label: 'Brouillon', icon: FileText },
  validee: { variant: 'default', label: 'Validée', icon: CheckCircle },
  ordonnancee: { variant: 'warning', label: 'Ordonnancée', icon: Clock },
  payee: { variant: 'success', label: 'Payée', icon: CheckCircle },
  annulee: { variant: 'destructive', label: 'Annulée', icon: XCircle },
  default: { variant: 'outline', label: 'Brouillon', icon: FileText },
};

export const DepenseStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} config={DEPENSE_STATUS_CONFIG} />
);

// Réservation status badges
export const RESERVATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: { variant: 'default', label: 'Active', icon: CheckCircle },
  utilisee: { variant: 'success', label: 'Utilisée', icon: CheckCircle },
  annulee: { variant: 'destructive', label: 'Annulée', icon: XCircle },
  expiree: { variant: 'secondary', label: 'Expirée', icon: Clock },
  default: { variant: 'outline', label: 'Active', icon: CheckCircle },
};

export const ReservationStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} config={RESERVATION_STATUS_CONFIG} />
);

// Engagement status badges
export const ENGAGEMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  brouillon: { variant: 'outline', label: 'Brouillon', icon: FileText },
  valide: { variant: 'default', label: 'Validé', icon: CheckCircle },
  annule: { variant: 'destructive', label: 'Annulé', icon: XCircle },
  default: { variant: 'outline', label: 'Brouillon', icon: FileText },
};

export const EngagementStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} config={ENGAGEMENT_STATUS_CONFIG} />
);

// Fournisseur status badges
export const FOURNISSEUR_STATUS_CONFIG: Record<string, StatusConfig> = {
  actif: { variant: 'default', label: 'Actif', icon: CheckCircle },
  inactif: { variant: 'secondary', label: 'Inactif', icon: XCircle },
  default: { variant: 'default', label: 'Actif', icon: CheckCircle },
};

export const FournisseurStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} config={FOURNISSEUR_STATUS_CONFIG} />
);

// Generic budget status badges
export const BUDGET_STATUS_CONFIG: Record<string, StatusConfig> = {
  actif: { variant: 'default', label: 'Actif', icon: CheckCircle },
  inactif: { variant: 'secondary', label: 'Inactif', icon: XCircle },
  default: { variant: 'default', label: 'Actif', icon: CheckCircle },
};

export const BudgetStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} config={BUDGET_STATUS_CONFIG} />
);

// Alert status badges for budget monitoring
export const BUDGET_ALERT_CONFIG: Record<string, StatusConfig> = {
  depassement: { variant: 'destructive', label: 'Dépassement', icon: AlertCircle },
  alert: { variant: 'warning', label: 'Alerte', icon: TrendingUp },
  ok: { variant: 'success', label: 'Normal', icon: CheckCircle },
  default: { variant: 'success', label: 'Normal', icon: CheckCircle },
};

export const BudgetAlertBadge = ({ status }: { status: 'depassement' | 'alert' | 'ok' }) => (
  <StatusBadge status={status} config={BUDGET_ALERT_CONFIG} />
);

// Recette status badges
export const RECETTE_STATUS_CONFIG: Record<string, StatusConfig> = {
  validee: { variant: 'default', label: 'Validée', icon: CheckCircle },
  annulee: { variant: 'destructive', label: 'Annulée', icon: XCircle },
  default: { variant: 'outline', label: 'Validée', icon: CheckCircle },
};

export const RecetteStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} config={RECETTE_STATUS_CONFIG} />
);

// Paiement status badges
export const PAIEMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  valide: { variant: 'success', label: 'Validé', icon: CheckCircle },
  annule: { variant: 'destructive', label: 'Annulé', icon: XCircle },
  default: { variant: 'outline', label: 'Validé', icon: CheckCircle },
};

export const PaiementStatusBadge = ({ status }: { status: string }) => (
  <StatusBadge status={status} config={PAIEMENT_STATUS_CONFIG} />
);