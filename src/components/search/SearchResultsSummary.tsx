import { Card } from '@/components/ui/card';

interface SearchResultsSummaryProps {
  totals: {
    montantInitial: number;
    montantModifie: number;
    montantReserve: number;
    montantEngage: number;
    montantPaye: number;
    disponible: number;
  };
  resultCount: number;
}

export const SearchResultsSummary = ({
  totals,
  resultCount,
}: SearchResultsSummaryProps) => {
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  if (resultCount === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 p-4">
      <div className="grid gap-4 md:grid-cols-6">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Montant initial</p>
          <p className="text-lg font-semibold">{formatMontant(totals.montantInitial)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Montant modifié</p>
          <p className="text-lg font-semibold">{formatMontant(totals.montantModifie)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Réservé</p>
          <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
            {formatMontant(totals.montantReserve)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Engagé</p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            {formatMontant(totals.montantEngage)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Payé</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            {formatMontant(totals.montantPaye)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Disponible</p>
          <p className="text-lg font-semibold text-primary">
            {formatMontant(totals.disponible)}
          </p>
        </div>
      </div>
    </Card>
  );
};
