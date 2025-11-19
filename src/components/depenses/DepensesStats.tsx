import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, CheckCircle, FileCheck, Banknote, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import type { Depense } from '@/types/depense.types';

interface DepenseStatsCardsProps {
  depenses: Depense[];
}

export const DepenseStatsCards = ({ depenses }: DepenseStatsCardsProps) => {
  const stats = useMemo(() => {
    const total = depenses.length;
    const brouillon = depenses.filter(d => d.statut === 'brouillon').length;
    const validee = depenses.filter(d => d.statut === 'validee').length;
    const ordonnancee = depenses.filter(d => d.statut === 'ordonnancee').length;
    const payee = depenses.filter(d => d.statut === 'payee').length;
    
    const montantTotal = depenses.reduce((sum, d) => sum + d.montant, 0);
    const montantBrouillon = depenses.filter(d => d.statut === 'brouillon').reduce((sum, d) => sum + d.montant, 0);
    const montantValidee = depenses.filter(d => d.statut === 'validee').reduce((sum, d) => sum + d.montant, 0);
    const montantOrdonnancee = depenses.filter(d => d.statut === 'ordonnancee').reduce((sum, d) => sum + d.montant, 0);
    const montantPayee = depenses.filter(d => d.statut === 'payee').reduce((sum, d) => sum + d.montant, 0);

    return {
      total,
      brouillon,
      validee,
      ordonnancee,
      payee,
      montantTotal,
      montantBrouillon,
      montantValidee,
      montantOrdonnancee,
      montantPayee,
      tauxExecution: montantTotal > 0 ? (montantPayee / montantTotal) * 100 : 0,
    };
  }, [depenses]);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <Card className="hover:shadow-primary transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Dépenses
          </CardTitle>
          <Wallet className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatMontant(stats.montantTotal)}</div>
          <p className="text-xs text-muted-foreground">
            {stats.total} dépense{stats.total > 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-primary transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Validées
          </CardTitle>
          <CheckCircle className="h-5 w-5 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatMontant(stats.montantValidee)}</div>
          <p className="text-xs text-secondary">
            {stats.validee} dépense{stats.validee > 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-primary transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ordonnancées
          </CardTitle>
          <FileCheck className="h-5 w-5 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatMontant(stats.montantOrdonnancee)}</div>
          <p className="text-xs text-accent">
            {stats.ordonnancee} dépense{stats.ordonnancee > 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-primary transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Payées
          </CardTitle>
          <Banknote className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{formatMontant(stats.montantPayee)}</div>
          <p className="text-xs text-green-600">
            {stats.payee} dépense{stats.payee > 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-primary transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Taux d'exécution
          </CardTitle>
          <AlertCircle className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{stats.tauxExecution.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.brouillon} en brouillon
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
