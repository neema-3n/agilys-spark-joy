import { Layers3, WalletCards, ShieldCheck, FileClock, Landmark, CircleDollarSign, BadgeEuro } from 'lucide-react';
import { StatsCard } from '@/components/ui/stats-card';
import { formatMontant } from '@/lib/utils';

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
  if (resultCount === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <StatsCard
        title="Montant initial"
        value={formatMontant(totals.montantInitial)}
        icon={Layers3}
        showCurrencyCode
        color="text-primary"
        trend="Base budgétaire"
        density="compact"
      />
      <StatsCard
        title="Montant modifié"
        value={formatMontant(totals.montantModifie)}
        icon={WalletCards}
        showCurrencyCode
        color="text-secondary"
        trend="Après ajustements"
        trendUp={true}
        density="compact"
      />
      <StatsCard
        title="Réservé"
        value={formatMontant(totals.montantReserve)}
        icon={ShieldCheck}
        showCurrencyCode
        color="text-orange-500"
        trend="Crédits réservés"
        density="compact"
      />
      <StatsCard
        title="Engagé"
        value={formatMontant(totals.montantEngage)}
        icon={FileClock}
        showCurrencyCode
        color="text-red-500"
        trend="Montants engagés"
        density="compact"
      />
      <StatsCard
        title="Liquidé"
        value={formatMontant(totals.montantLiquide)}
        icon={Landmark}
        showCurrencyCode
        color="text-blue-500"
        trend="En liquidation"
        density="compact"
      />
      <StatsCard
        title="Payé"
        value={formatMontant(totals.montantPaye)}
        icon={CircleDollarSign}
        showCurrencyCode
        color="text-emerald-500"
        trend="Déjà payés"
        trendUp={true}
        density="compact"
      />
      <StatsCard
        title="Disponible"
        value={formatMontant(totals.disponible)}
        icon={BadgeEuro}
        showCurrencyCode
        color="text-primary"
        trend="Solde mobilisable"
        trendUp={true}
        density="compact"
      />
    </div>
  );
};
