import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AmountWithCurrencyCode } from '@/components/ui/amount-with-currency-code';
import { Wallet, CheckCircle, Banknote, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import type { Depense } from '@/types/depense.types';
import { formatMontant } from '@/lib/utils';

interface DepenseStatsCardsProps {
  depenses: Depense[];
}

export const DepenseStatsCards = ({ depenses }: DepenseStatsCardsProps) => {
  const stats = useMemo(() => {
    const total = depenses.length;
    const brouillon = depenses.filter(d => d.statut === 'brouillon').length;
    const validee = depenses.filter(d => d.statut === 'validee').length;
    const payee = depenses.filter(d => d.statut === 'payee').length;
    
    const montantTotal = depenses.reduce((sum, d) => sum + d.montant, 0);
    const montantBrouillon = depenses.filter(d => d.statut === 'brouillon').reduce((sum, d) => sum + d.montant, 0);
    const montantValidee = depenses.filter(d => d.statut === 'validee').reduce((sum, d) => sum + d.montant, 0);
    const montantPayee = depenses.filter(d => d.statut === 'payee').reduce((sum, d) => sum + d.montant, 0);

    return {
      total,
      brouillon,
      validee,
      payee,
      montantTotal,
      montantBrouillon,
      montantValidee,
      montantPayee,
      tauxExecution: montantTotal > 0 ? (montantPayee / montantTotal) * 100 : 0,
    };
  }, [depenses]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="hover:shadow-primary transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Dépenses
          </CardTitle>
          <Wallet className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">
            <AmountWithCurrencyCode amount={formatMontant(stats.montantTotal)} />
          </div>
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
          <div className="text-2xl font-bold mb-1">
            <AmountWithCurrencyCode amount={formatMontant(stats.montantValidee)} />
          </div>
          <p className="text-xs text-secondary">
            {stats.validee} dépense{stats.validee > 1 ? 's' : ''}
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
          <div className="text-2xl font-bold mb-1">
            <AmountWithCurrencyCode amount={formatMontant(stats.montantPayee)} />
          </div>
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
