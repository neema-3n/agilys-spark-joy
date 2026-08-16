import { StatsCard } from '@/components/ui/stats-card';
import { Folder, PlayCircle, CheckCircle, Wallet, TrendingUp, DollarSign } from 'lucide-react';
import { useProjetStats } from '@/hooks/useProjets';
import { formatMontant } from '@/lib/utils';

export const ProjetStats = () => {
  const { stats, isLoading } = useProjetStats();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Chargement des statistiques…</div>;
  }

  // Sans exercice sélectionné, la requête est désactivée et ne renvoie jamais
  // rien : confondre cette absence avec un chargement en cours laisserait
  // « Chargement des statistiques… » affiché indéfiniment. Le tableau des
  // projets, juste en dessous, annonce déjà qu'il n'y a rien à montrer.
  if (!stats) {
    return null;
  }

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
        color="text-blue-700"
      />
      <StatsCard
        title="Terminés"
        value={stats.nombreTermines.toString()}
        icon={CheckCircle}
        color="text-secondary"
      />
      <StatsCard
        title="Budget total alloué"
        value={`${formatMontant(stats.budgetTotalAlloue / 1000000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`}
        icon={Wallet}
        showCurrencyCode
        color="text-primary"
      />
      <StatsCard
        title="Budget consommé"
        value={`${formatMontant(stats.budgetTotalConsomme / 1000000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`}
        icon={DollarSign}
        showCurrencyCode
        color="text-amber-600"
        trend={`${tauxExecutionGlobal.toFixed(1)}% du total`}
      />
      <StatsCard
        title="Avancement moyen"
        value={`${stats.tauxExecutionMoyen.toFixed(0)}%`}
        icon={TrendingUp}
        color="text-cyan-700"
      />
    </div>
  );
};
