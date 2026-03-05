import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { EcartPrevisionExecution } from '@/types/prevision.types';

interface EcartsPrevisionTableProps {
  ecarts: EcartPrevisionExecution[];
  isLoading: boolean;
  errorMessage?: string;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0
  }).format(value);

const formatPercent = (value?: number): string => {
  if (value === undefined) {
    return 'N/A';
  }

  return `${value.toFixed(2)} %`;
};

const formatAxe = (item: EcartPrevisionExecution): string => {
  const parts = [
    item.axe.sectionCode ? `SEC:${item.axe.sectionCode}` : null,
    item.axe.programmeCode ? `PRG:${item.axe.programmeCode}` : null,
    item.axe.actionCode ? `ACT:${item.axe.actionCode}` : null,
    item.axe.enveloppeId ? `ENV:${item.axe.enveloppeId.slice(0, 8)}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' / ') : 'Axe global';
};

export function EcartsPrevisionTable({ ecarts, isLoading, errorMessage }: EcartsPrevisionTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suivi des écarts prévision/exécution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Impossible de charger les écarts</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des écarts...</p>
        ) : null}

        {!isLoading && !errorMessage && ecarts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible sur le scope sélectionné.</p>
        ) : null}

        {!isLoading && ecarts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead>Axe</TableHead>
                <TableHead className="text-right">Prévu</TableHead>
                <TableHead className="text-right">Exécuté</TableHead>
                <TableHead className="text-right">Écart</TableHead>
                <TableHead className="text-right">Taux</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ecarts.map((item, index) => (
                <TableRow key={`${item.periode}-${formatAxe(item)}-${index}`}>
                  <TableCell>{item.periode}</TableCell>
                  <TableCell>{formatAxe(item)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.montantPrevu)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.montantExecute)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.ecartMontant >= 0 ? 'destructive' : 'secondary'}>
                      {formatCurrency(item.ecartMontant)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatPercent(item.ecartTaux)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
