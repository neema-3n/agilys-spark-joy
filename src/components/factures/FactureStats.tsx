import { StatsCard } from '@/components/ui/stats-card';
import { FileText, CheckCircle, DollarSign, XCircle } from 'lucide-react';
import { Facture } from '@/types/facture.types';

interface FactureStatsProps {
  factures: Facture[];
}

export const FactureStats = ({ factures }: FactureStatsProps) => {
  const stats = {
    total: factures.length,
    brouillon: factures.filter(f => f.statut === 'brouillon').length,
    validee: factures.filter(f => f.statut === 'validee').length,
    payee: factures.filter(f => f.statut === 'payee').length,
    montantLiquide: factures.reduce((sum, f) => sum + (f.montantLiquide || 0), 0),
    montantTotal: factures.reduce((sum, f) => sum + f.montantTTC, 0),
    montantBrouillon: factures.filter(f => f.statut === 'brouillon').reduce((sum, f) => sum + f.montantTTC, 0),
    montantValidee: factures.filter(f => f.statut === 'validee').reduce((sum, f) => sum + f.montantTTC, 0),
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total des factures"
        value={stats.total.toString()}
        icon={FileText}
        color="text-primary"
        trend={formatMontant(stats.montantTotal)}
        trendUp={true}
      />
      <StatsCard
        title="En brouillon"
        value={stats.brouillon.toString()}
        icon={XCircle}
        color="text-muted-foreground"
        trend={formatMontant(stats.montantBrouillon)}
      />
      <StatsCard
        title="Validées"
        value={stats.validee.toString()}
        icon={CheckCircle}
        color="text-secondary"
        trend={formatMontant(stats.montantValidee)}
        trendUp={true}
      />
      <StatsCard
        title="Liquidé"
        value={stats.payee.toString()}
        icon={DollarSign}
        color="text-accent"
        trend={formatMontant(stats.montantLiquide)}
        trendUp={true}
      />
    </div>
  );
};
