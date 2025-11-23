import { useMemo } from 'react';
import { StatsCard } from '@/components/ui/stats-card';
import { Banknote, CheckCircle, TrendingUp } from 'lucide-react';
import { Paiement } from '@/types/paiement.types';

interface PaiementStatsProps {
  paiements: Paiement[];
}

export const PaiementStats = ({ paiements }: PaiementStatsProps) => {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const nombreTotal = paiements.length;
    const nombreValide = paiements.filter(p => p.statut === 'valide').length;

    const montantTotal = paiements
      .filter(p => p.statut === 'valide')
      .reduce((sum, p) => sum + p.montant, 0);

    const montantAujourdHui = paiements
      .filter(p => p.statut === 'valide' && p.datePaiement === today)
      .reduce((sum, p) => sum + p.montant, 0);

    const montantCeMois = paiements
      .filter(p => p.statut === 'valide' && p.datePaiement >= startOfMonth)
      .reduce((sum, p) => sum + p.montant, 0);

    return {
      nombreTotal: nombreTotal.toString(),
      nombreValide: nombreValide.toString(),
      montantTotal: `${montantTotal.toFixed(2)} €`,
      montantAujourdHui: `${montantAujourdHui.toFixed(2)} €`,
      montantCeMois: `${montantCeMois.toFixed(2)} €`,
    };
  }, [paiements]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <StatsCard
        title="Total paiements"
        value={stats.nombreTotal}
        icon={Banknote}
      />
      <StatsCard
        title="Paiements valides"
        value={stats.nombreValide}
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
