import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { FournisseurStats as FournisseurStatsType } from '@/types/fournisseur.types';

interface FournisseurStatsProps {
  stats?: FournisseurStatsType;
}

export const FournisseurStats = ({ stats }: FournisseurStatsProps) => {
  if (!stats) return null;

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total fournisseurs</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.nombreTotal}</div>
          <p className="text-xs text-muted-foreground">
            Référencés dans le système
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fournisseurs actifs</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.nombreActifs}</div>
          <p className="text-xs text-muted-foreground">
            {stats.nombreTotal > 0 
              ? `${Math.round((stats.nombreActifs / stats.nombreTotal) * 100)}%`
              : '0%'
            } du total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fournisseurs inactifs</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.nombreInactifs}</div>
          <p className="text-xs text-muted-foreground">
            {stats.nombreBlacklistes > 0 && `${stats.nombreBlacklistes} blacklistés`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Montant total engagé</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMontant(stats.montantTotalEngage)}</div>
          <p className="text-xs text-muted-foreground">
            {stats.nombreEngagementsTotal} engagements
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
