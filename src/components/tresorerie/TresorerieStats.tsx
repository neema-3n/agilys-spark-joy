import { StatsCard } from '@/components/ui/stats-card';
import { Wallet, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import type { TresorerieStats as TresorerieStatsType } from '@/types/tresorerie.types';
import { formatMontant } from '@/lib/utils';

interface TresorerieStatsComponentProps {
  stats?: TresorerieStatsType;
}

export const TresorerieStats = ({ stats }: TresorerieStatsComponentProps) => {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Solde Actuel"
        value={formatMontant(stats.soldeActuel)}
        icon={Wallet}
        showCurrencyCode
        trend={`${stats.variationMensuelle >= 0 ? '+' : ''}${formatMontant(stats.variationMensuelle)} vs mois dernier`}
        trendUp={stats.variationMensuelle >= 0}
      />
      <StatsCard
        title="Encaissements"
        value={formatMontant(stats.totalEncaissements)}
        icon={TrendingUp}
        showCurrencyCode
        trend={`${formatMontant(stats.encaissementsMoisEnCours)} ce mois`}
        color="text-green-600"
      />
      <StatsCard
        title="Décaissements"
        value={formatMontant(stats.totalDecaissements)}
        icon={TrendingDown}
        showCurrencyCode
        trend={`${formatMontant(stats.decaissementsMoisEnCours)} ce mois`}
        color="text-red-600"
      />
      <StatsCard
        title="Solde Prévisionnel"
        value={formatMontant(stats.soldePrevisionnel)}
        icon={Calendar}
        showCurrencyCode
      />
    </div>
  );
};
