import { StatsCard } from '@/components/ui/stats-card';
import { TrendingUp, DollarSign, Calendar, FileText } from 'lucide-react';
import type { RecettesStats } from '@/types/recette.types';
import { formatCurrency } from '@/lib/utils';

interface RecetteStatsProps {
  stats?: RecettesStats;
}

export const RecetteStats = ({ stats }: RecetteStatsProps) => {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Recettes"
        value={formatCurrency(stats.montantTotal)}
        icon={DollarSign}
        showCurrencyCode
        trend={`${stats.nombreTotal} recettes`}
        color="text-green-600"
      />
      <StatsCard
        title="Validées"
        value={formatCurrency(stats.montantValidees)}
        icon={TrendingUp}
        showCurrencyCode
        trend={`${stats.nombreValidees} validées`}
        trendUp
        color="text-green-600"
      />
      <StatsCard
        title="Ce Mois"
        value={formatCurrency(stats.montantCeMois)}
        icon={Calendar}
        showCurrencyCode
        trend="Mois en cours"
      />
      <StatsCard
        title="Aujourd'hui"
        value={formatCurrency(stats.montantAujourdhui)}
        icon={FileText}
        showCurrencyCode
        trend="Encaissements du jour"
      />
    </div>
  );
};
