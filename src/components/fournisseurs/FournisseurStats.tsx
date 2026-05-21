import { StatsCard } from '@/components/ui/stats-card';
import { Building2, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { FournisseurStats as FournisseurStatsType } from '@/types/fournisseur.types';
import { formatMontant } from '@/lib/utils';

interface FournisseurStatsProps {
  stats?: FournisseurStatsType;
}

export const FournisseurStats = ({ stats }: FournisseurStatsProps) => {
  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total fournisseurs"
        value={stats.nombreTotal.toString()}
        icon={Building2}
        color="text-blue-700"
        trend="Référencés dans le système"
      />

      <StatsCard
        title="Fournisseurs actifs"
        value={stats.nombreActifs.toString()}
        icon={CheckCircle2}
        color="text-emerald-700"
        trend={
          stats.nombreTotal > 0
            ? `${Math.round((stats.nombreActifs / stats.nombreTotal) * 100)}% du total`
            : '0% du total'
        }
        trendUp
      />

      <StatsCard
        title="Fournisseurs inactifs"
        value={stats.nombreInactifs.toString()}
        icon={XCircle}
        color="text-red-600"
        trend={
          stats.nombreBlacklistes > 0
            ? `${stats.nombreBlacklistes} blacklistés`
            : 'Aucun blacklisté'
        }
      />

      <StatsCard
        title="Montant total engagé"
        value={formatMontant(stats.montantTotalEngage)}
        icon={TrendingUp}
        showCurrencyCode
        color="text-cyan-700"
        trend={`${stats.nombreEngagementsTotal} engagements`}
      />
    </div>
  );
};
