import { useMemo } from 'react';
import { StatsCard } from '@/components/ui/stats-card';
import { Banknote, CheckCircle, TrendingUp } from 'lucide-react';
import { Paiement } from '@/types/paiement.types';
import { buildPaiementStatsSummary } from '@/lib/paiement-workflow';

interface PaiementStatsProps {
  paiements: Paiement[];
}

export const PaiementStats = ({ paiements }: PaiementStatsProps) => {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    return buildPaiementStatsSummary(paiements, today, startOfMonth);
  }, [paiements]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <StatsCard
        title="Total paiements"
        value={stats.nombreTotal}
        icon={Banknote}
      />
      <StatsCard
        title="Paiements comptabilisés"
        value={stats.nombreSucces}
        icon={CheckCircle}
      />
      <StatsCard
        title="Montant aujourd'hui"
        value={stats.montantAujourdHui}
        icon={TrendingUp}
      />
      <StatsCard
        title="Montant ce mois"
        value={stats.montantCeMois}
        icon={Banknote}
      />
    </div>
  );
};
