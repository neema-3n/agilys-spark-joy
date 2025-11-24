import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FluxTresorerie } from '@/types/tresorerie.types';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface FluxTresorerieTableProps {
  flux: FluxTresorerie[];
}

export const FluxTresorerieTable = ({ flux }: FluxTresorerieTableProps) => {
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Libellé</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Observations</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flux.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Aucun flux de trésorerie trouvé
              </TableCell>
            </TableRow>
          ) : (
            flux.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  {format(new Date(f.date), 'dd/MM/yyyy', { locale: fr })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={f.type === 'encaissement' ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    {f.type === 'encaissement' ? (
                      <>
                        <ArrowUp className="h-3 w-3" />
                        Encaissement
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-3 w-3" />
                        Décaissement
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>{f.categorie}</TableCell>
                <TableCell className="max-w-md truncate">{f.libelle}</TableCell>
                <TableCell className="text-right font-semibold">
                  <span className={f.type === 'encaissement' ? 'text-green-600' : 'text-red-600'}>
                    {f.type === 'encaissement' ? '+' : '-'}
                    {formatMontant(f.montant)}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {f.observations || '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
