import { StatsCard } from '@/components/ui/stats-card';
import { FileText, CheckCircle, DollarSign, XCircle } from 'lucide-react';
import { Facture } from '@/types/facture.types';

interface FactureStatsProps {
  factures: Facture[];
  stats?: {
    nombreTotal: number;
    nombreBrouillon: number;
    nombreValidee: number;
    nombrePayee: number;
    montantTotal: number;
    montantBrouillon: number;
    montantValidee: number;
    montantLiquide: number;
  };
}

export const FactureStats = ({ factures, stats: globalStats }: FactureStatsProps) => {
  // Utiliser les stats globales si disponibles, sinon calculer localement (fallback)
  const stats = globalStats || {
    nombreTotal: factures.length,
    nombreBrouillon: factures.filter(f => f.statut === 'brouillon').length,
    nombreValidee: factures.filter(f => f.statut === 'validee').length,
    nombrePayee: factures.filter(f => f.statut === 'payee').length,
    montantTotal: factures.reduce((sum, f) => sum + f.montantTTC, 0),
    montantBrouillon: factures.filter(f => f.statut === 'brouillon').reduce((sum, f) => sum + f.montantTTC, 0),
    montantValidee: factures.filter(f => f.statut === 'validee').reduce((sum, f) => sum + f.montantTTC, 0),
    montantLiquide: factures.reduce((sum, f) => sum + (f.montantLiquide || 0), 0),
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
        value={stats.nombreTotal.toString()}
        icon={FileText}
        color="text-primary"
        trend={formatMontant(stats.montantTotal)}
        trendUp={true}
      />
      <StatsCard
        title="En brouillon"
        value={stats.nombreBrouillon.toString()}
        icon={XCircle}
        color="text-muted-foreground"
        trend={formatMontant(stats.montantBrouillon)}
      />
      <StatsCard
        title="Validées"
        value={stats.nombreValidee.toString()}
        icon={CheckCircle}
        color="text-secondary"
        trend={formatMontant(stats.montantValidee)}
        trendUp={true}
      />
      <StatsCard
        title="Liquidé"
        value={stats.nombrePayee.toString()}
        icon={DollarSign}
        color="text-accent"
        trend={formatMontant(stats.montantLiquide)}
        trendUp={true}
      />
    </div>
  );
};
