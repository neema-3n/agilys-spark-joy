import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import type { LigneBudgetaire } from '@/types/budget.types';

interface DepensesStatsProps {
  lignesBudgetaires: LigneBudgetaire[];
}

export const DepensesStats = ({ lignesBudgetaires }: DepensesStatsProps) => {
  const stats = useMemo(() => {
    const totalBudget = lignesBudgetaires.reduce((sum, ligne) => 
      sum + (ligne.montantModifie || ligne.montantInitial), 0
    );
    const totalEngage = lignesBudgetaires.reduce((sum, ligne) => 
      sum + ligne.montantEngage, 0
    );
    const totalPaye = lignesBudgetaires.reduce((sum, ligne) => 
      sum + ligne.montantPaye, 0
    );
    const totalDisponible = lignesBudgetaires.reduce((sum, ligne) => 
      sum + ligne.disponible, 0
    );

    // Lignes en alerte (disponible < 10% du budget)
    const lignesEnAlerte = lignesBudgetaires.filter(ligne => {
      const budget = ligne.montantModifie || ligne.montantInitial;
      return budget > 0 && (ligne.disponible / budget) < 0.1;
    });

    // Lignes en dépassement (disponible < 0)
    const lignesEnDepassement = lignesBudgetaires.filter(ligne => 
      ligne.disponible < 0
    );

    const tauxEngagement = totalBudget > 0 ? (totalEngage / totalBudget) * 100 : 0;
    const tauxExecution = totalBudget > 0 ? (totalPaye / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalEngage,
      totalPaye,
      totalDisponible,
      tauxEngagement,
      tauxExecution,
      lignesEnAlerte: lignesEnAlerte.length,
      lignesEnDepassement: lignesEnDepassement.length,
    };
  }, [lignesBudgetaires]);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="hover:shadow-primary transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Budget Total
          </CardTitle>
          <Wallet className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatMontant(stats.totalBudget)}</div>
          <p className="text-xs text-muted-foreground">
            Disponible: {formatMontant(stats.totalDisponible)}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-primary transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Engagé
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatMontant(stats.totalEngage)}</div>
          <p className="text-xs text-secondary">
            {stats.tauxEngagement.toFixed(1)}% du budget
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-primary transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Payé
          </CardTitle>
          <TrendingDown className="h-5 w-5 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatMontant(stats.totalPaye)}</div>
          <p className="text-xs text-accent">
            {stats.tauxExecution.toFixed(1)}% du budget
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-primary transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Alertes
          </CardTitle>
          <AlertCircle className="h-5 w-5 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">
            {stats.lignesEnDepassement + stats.lignesEnAlerte}
          </div>
          <p className="text-xs text-destructive">
            {stats.lignesEnDepassement} dépassement{stats.lignesEnDepassement > 1 ? 's' : ''} · {stats.lignesEnAlerte} alerte{stats.lignesEnAlerte > 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
