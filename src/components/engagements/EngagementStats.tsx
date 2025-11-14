import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Engagements Actifs</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActifs}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Hors engagements annulés
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Montant Engagé</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(montantActif)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Montant des engagements actifs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Attente</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{enAttente}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Brouillons à valider
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Annulés</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{engagementsAnnules}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Engagements annulés
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
