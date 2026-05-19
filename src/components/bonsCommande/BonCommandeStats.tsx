import { StatsCard } from '@/components/ui/stats-card';
import { FileText, CheckCircle, Clock, Package, DollarSign } from 'lucide-react';
import { BonCommande } from '@/types/bonCommande.types';
import { formatMontant } from '@/lib/utils';

interface BonCommandeStatsProps {
  bonsCommande: BonCommande[];
}

export const BonCommandeStats = ({ bonsCommande }: BonCommandeStatsProps) => {
  const stats = {
    total: bonsCommande.length,
    brouillon: bonsCommande.filter(bc => bc.statut === 'brouillon').length,
    emis: bonsCommande.filter(bc => bc.statut === 'emis').length,
    receptionne: bonsCommande.filter(bc => bc.statut === 'receptionne').length,
    montantTotal: bonsCommande.reduce((sum, bc) => sum + bc.montant, 0),
    montantBrouillon: bonsCommande.filter(bc => bc.statut === 'brouillon').reduce((sum, bc) => sum + bc.montant, 0),
    montantEmis: bonsCommande.filter(bc => bc.statut === 'emis').reduce((sum, bc) => sum + bc.montant, 0),
    montantReceptionne: bonsCommande.filter(bc => bc.statut === 'receptionne').reduce((sum, bc) => sum + bc.montant, 0),
    montantFacture: bonsCommande.reduce((sum, bc) => sum + (bc.montantFacture || 0), 0),
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatsCard
        title="Total des BC"
        value={stats.total.toString()}
        icon={FileText}
        color="text-primary"
        trend={formatMontant(stats.montantTotal)}
        trendUp={true}
      />
      <StatsCard
        title="En brouillon"
        value={stats.brouillon.toString()}
        icon={Clock}
        color="text-muted-foreground"
        trend={formatMontant(stats.montantBrouillon)}
      />
      <StatsCard
        title="Émis"
        value={stats.emis.toString()}
        icon={CheckCircle}
        color="text-secondary"
        trend={formatMontant(stats.montantEmis)}
        trendUp={true}
      />
      <StatsCard
        title="Réceptionnés"
        value={stats.receptionne.toString()}
        icon={Package}
        color="text-accent"
        trend={formatMontant(stats.montantReceptionne)}
        trendUp={true}
      />
      <StatsCard
        title="Montant facturé"
        value={formatMontant(stats.montantFacture)}
        icon={DollarSign}
        color="text-green-600"
        trend={`${stats.receptionne} réceptionné${stats.receptionne > 1 ? 's' : ''}`}
        trendUp={true}
      />
    </div>
  );
};
