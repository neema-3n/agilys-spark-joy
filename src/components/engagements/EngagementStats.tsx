import { StatsCard } from '@/components/ui/stats-card';
import { FileText, TrendingUp, Clock, XCircle } from 'lucide-react';
import type { Engagement } from '@/types/engagement.types';

interface EngagementStatsProps {
  engagements: Engagement[];
}

export const EngagementStats = ({ engagements }: EngagementStatsProps) => {
  // Séparer les engagements actifs des annulés
  const engagementsActifs = engagements.filter(e => e.statut !== 'annule');
  const engagementsAnnules = engagements.filter(e => e.statut === 'annule').length;
  
  const totalActifs = engagementsActifs.length;
  const montantActif = engagementsActifs.reduce((sum, e) => sum + Number(e.montant), 0);
  const enAttente = engagementsActifs.filter(e => e.statut === 'brouillon').length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Engagements Actifs"
        value={totalActifs.toString()}
        icon={FileText}
        color="text-primary"
        trend="Hors engagements annulés"
      />
      <StatsCard
        title="Montant Engagé"
        value={formatCurrency(montantActif)}
        icon={TrendingUp}
        color="text-secondary"
        trend="Montant des engagements actifs"
        trendUp={true}
      />
      <StatsCard
        title="En Attente"
        value={enAttente.toString()}
        icon={Clock}
        color="text-muted-foreground"
        trend="Brouillons à valider"
      />
      <StatsCard
        title="Annulés"
        value={engagementsAnnules.toString()}
        icon={XCircle}
        color="text-muted-foreground"
        trend="Engagements annulés"
      />
    </div>
  );
};
