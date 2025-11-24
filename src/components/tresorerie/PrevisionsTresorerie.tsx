import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PrevisionTresorerie } from '@/types/tresorerie.types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PrevisionsTresorerieProps {
  previsions: PrevisionTresorerie[];
}

export const PrevisionsTresorerie = ({ previsions }: PrevisionsTresorerieProps) => {
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  const formatPeriode = (periode: string) => {
    const [year, month] = periode.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Prévisions de Trésorerie
        </CardTitle>
      </CardHeader>
      <CardContent>
        {previsions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune prévision disponible
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Encaissements Prévus</TableHead>
                  <TableHead className="text-right">Décaissements Prévus</TableHead>
                  <TableHead className="text-right">Solde Prévisionnel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previsions.map((p, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {formatPeriode(p.periode)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatMontant(p.encaissementsPrevus)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatMontant(p.decaissementsPrevus)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className={p.soldePrevisionnel >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatMontant(p.soldePrevisionnel)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
