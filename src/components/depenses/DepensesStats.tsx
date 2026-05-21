import { StatsCard } from '@/components/ui/stats-card';
import { Wallet, CheckCircle, Banknote, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import type { Depense } from '@/types/depense.types';
import { formatMontant } from '@/lib/utils';

interface DepenseStatsCardsProps {
  depenses: Depense[];
}

export const DepenseStatsCards = ({ depenses }: DepenseStatsCardsProps) => {
  const stats = useMemo(() => {
    const total = depenses.length;
    const brouillon = depenses.filter(d => d.statut === 'brouillon').length;
    const validee = depenses.filter(d => d.statut === 'validee').length;
    const payee = depenses.filter(d => d.statut === 'payee').length;
    
    const montantTotal = depenses.reduce((sum, d) => sum + d.montant, 0);
    const montantBrouillon = depenses.filter(d => d.statut === 'brouillon').reduce((sum, d) => sum + d.montant, 0);
    const montantValidee = depenses.filter(d => d.statut === 'validee').reduce((sum, d) => sum + d.montant, 0);
    const montantPayee = depenses.filter(d => d.statut === 'payee').reduce((sum, d) => sum + d.montant, 0);

    return {
      total,
      brouillon,
      validee,
      payee,
      montantTotal,
      montantBrouillon,
      montantValidee,
      montantPayee,
      tauxExecution: montantTotal > 0 ? (montantPayee / montantTotal) * 100 : 0,
    };
  }, [depenses]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Dépenses"
        value={formatMontant(stats.montantTotal)}
        icon={Wallet}
        showCurrencyCode
        color="text-blue-700"
        trend={`${stats.total} dépense${stats.total > 1 ? 's' : ''}`}
      />

      <StatsCard
        title="Validées"
        value={formatMontant(stats.montantValidee)}
        icon={CheckCircle}
        showCurrencyCode
        color="text-emerald-700"
        trend={`${stats.validee} dépense${stats.validee > 1 ? 's' : ''}`}
        trendUp
      />

      <StatsCard
        title="Payées"
        value={formatMontant(stats.montantPayee)}
        icon={Banknote}
        showCurrencyCode
        color="text-cyan-700"
        trend={`${stats.payee} dépense${stats.payee > 1 ? 's' : ''}`}
        trendUp
      />

      <StatsCard
        title="Taux d'exécution"
        value={`${stats.tauxExecution.toFixed(1)}%`}
        icon={AlertCircle}
        color="text-amber-600"
        trend={`${stats.brouillon} en brouillon`}
      />
    </div>
  );
};
