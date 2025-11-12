import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import type { Engagement } from '@/types/engagement.types';

interface EngagementStatsProps {
  engagements: Engagement[];
}

export const EngagementStats = ({ engagements }: EngagementStatsProps) => {
  const totalEngagements = engagements.length;
  const montantTotal = engagements.reduce((sum, e) => sum + Number(e.montant), 0);
  const enAttente = engagements.filter(e => e.statut === 'brouillon').length;
  const valides = engagements.filter(e => e.statut === 'valide').length;
  const tauxValidation = totalEngagements > 0 
    ? ((valides / totalEngagements) * 100).toFixed(1) 
    : '0';

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
          <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalEngagements}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Tous statuts confondus
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Montant Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(montantTotal)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Engagements cumulés
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
          <CardTitle className="text-sm font-medium">Taux de Validation</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tauxValidation}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {valides} validés sur {totalEngagements}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
