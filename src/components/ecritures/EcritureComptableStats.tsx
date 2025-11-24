import { StatsCard } from '@/components/ui/stats-card';
import { BookOpen, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import type { EcrituresStats } from '@/types/ecriture-comptable.types';

interface EcritureComptableStatsProps {
  stats?: EcrituresStats;
}

export const EcritureComptableStats = ({ stats }: EcritureComptableStatsProps) => {
  if (!stats) {
    return null;
  }

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Écritures"
        value={stats.nombreTotal.toString()}
        icon={BookOpen}
      />
      <StatsCard
        title="Total Débits"
        value={formatMontant(stats.montantTotalDebit)}
        icon={TrendingDown}
      />
      <StatsCard
        title="Total Crédits"
        value={formatMontant(stats.montantTotalCredit)}
        icon={TrendingUp}
      />
      <StatsCard
        title="Équilibre"
        value={formatMontant(stats.montantTotalDebit - stats.montantTotalCredit)}
        icon={Activity}
      />
    </div>
  );
};
