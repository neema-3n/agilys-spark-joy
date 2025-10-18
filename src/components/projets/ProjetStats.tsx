import { StatsCard } from '@/components/ui/stats-card';
import { Folder, PlayCircle, CheckCircle, Wallet, TrendingUp, DollarSign } from 'lucide-react';
import { useProjetStats } from '@/hooks/useProjets';

export const ProjetStats = () => {
  const { stats, isLoading } = useProjetStats();

  if (isLoading || !stats) {
    return <div>Chargement des statistiques...</div>;
  }

  const budgetDisponible = stats.budgetTotalAlloue - stats.budgetTotalConsomme;
  const tauxExecutionGlobal = stats.budgetTotalAlloue > 0
    ? (stats.budgetTotalConsomme / stats.budgetTotalAlloue) * 100
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatsCard
        title="Projets total"
        value={stats.nombreTotal.toString()}
        icon={Folder}
        color="text-primary"
      />
      <StatsCard
        title="En cours"
        value={stats.nombreEnCours.toString()}
        icon={PlayCircle}
        color="text-primary"
      />
      <StatsCard
        title="Terminés"
        value={stats.nombreTermines.toString()}
        icon={CheckCircle}
        color="text-secondary"
      />
      <StatsCard
        title="Budget total alloué"
        value={`${(stats.budgetTotalAlloue / 1000000).toFixed(1)}M €`}
        icon={Wallet}
        color="text-primary"
      />
      <StatsCard
        title="Budget consommé"
        value={`${(stats.budgetTotalConsomme / 1000000).toFixed(1)}M €`}
        icon={DollarSign}
        color="text-accent"
        trend={`${tauxExecutionGlobal.toFixed(1)}% du total`}
      />
      <StatsCard
        title="Avancement moyen"
        value={`${stats.tauxExecutionMoyen.toFixed(0)}%`}
        icon={TrendingUp}
        color="text-secondary"
      />
    </div>
  );
};
