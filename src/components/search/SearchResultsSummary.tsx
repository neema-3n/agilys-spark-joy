import { Layers3, WalletCards, ShieldCheck, FileClock, Landmark, CircleDollarSign, BadgeEuro } from 'lucide-react';
import { StatsCard } from '@/components/ui/stats-card';

interface SearchResultsSummaryProps {
  totals: {
    montantInitial: number;
    montantModifie: number;
    montantReserve: number;
    montantEngage: number;
    montantLiquide: number;
    montantPaye: number;
    disponible: number;
  };
  resultCount: number;
}

export const SearchResultsSummary = ({
  totals,
  resultCount,
}: SearchResultsSummaryProps) => {
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  if (resultCount === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <StatsCard
        title="Montant initial"
        value={formatMontant(totals.montantInitial)}
        icon={Layers3}
        color="text-primary"
        trend="Base budgétaire"
      />
      <StatsCard
        title="Montant modifié"
        value={formatMontant(totals.montantModifie)}
        icon={WalletCards}
        color="text-secondary"
        trend="Après ajustements"
        trendUp={true}
      />
      <StatsCard
        title="Réservé"
        value={formatMontant(totals.montantReserve)}
        icon={ShieldCheck}
        color="text-orange-500"
        trend="Crédits réservés"
      />
      <StatsCard
        title="Engagé"
        value={formatMontant(totals.montantEngage)}
        icon={FileClock}
        color="text-red-500"
        trend="Montants engagés"
      />
      <StatsCard
        title="Liquidé"
        value={formatMontant(totals.montantLiquide)}
        icon={Landmark}
        color="text-blue-500"
        trend="En liquidation"
      />
      <StatsCard
        title="Payé"
        value={formatMontant(totals.montantPaye)}
        icon={CircleDollarSign}
        color="text-emerald-500"
        trend="Déjà payés"
        trendUp={true}
      />
      <StatsCard
        title="Disponible"
        value={formatMontant(totals.disponible)}
        icon={BadgeEuro}
        color="text-primary"
        trend="Solde mobilisable"
        trendUp={true}
      />
    </div>
  );
};
