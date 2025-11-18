import { StatsCard } from '@/components/ui/stats-card';
import { FileText, CheckCircle, Clock, Package } from 'lucide-react';
import { BonCommande } from '@/types/bonCommande.types';

interface BonCommandeStatsProps {
  bonsCommande: BonCommande[];
}

export const BonCommandeStats = ({ bonsCommande }: BonCommandeStatsProps) => {
  const stats = {
    total: bonsCommande.length,
    brouillon: bonsCommande.filter(bc => bc.statut === 'brouillon').length,
    valide: bonsCommande.filter(bc => bc.statut === 'valide' || bc.statut === 'en_cours').length,
    receptionne: bonsCommande.filter(bc => bc.statut === 'receptionne').length,
    montantTotal: bonsCommande.reduce((sum, bc) => sum + bc.montant, 0),
    montantBrouillon: bonsCommande.filter(bc => bc.statut === 'brouillon').reduce((sum, bc) => sum + bc.montant, 0),
    montantValide: bonsCommande.filter(bc => bc.statut === 'valide' || bc.statut === 'en_cours').reduce((sum, bc) => sum + bc.montant, 0),
    montantReceptionne: bonsCommande.filter(bc => bc.statut === 'receptionne').reduce((sum, bc) => sum + bc.montant, 0),
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
        title="Validés / En cours"
        value={stats.valide.toString()}
        icon={CheckCircle}
        color="text-secondary"
        trend={formatMontant(stats.montantValide)}
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
    </div>
  );
};
