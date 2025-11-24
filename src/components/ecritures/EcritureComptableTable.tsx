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
import type { EcritureComptable } from '@/types/ecriture-comptable.types';

interface EcritureComptableTableProps {
  ecritures: EcritureComptable[];
  onRowClick?: (ecriture: EcritureComptable) => void;
}

const TYPE_OPERATION_LABELS: Record<string, { label: string; variant: any }> = {
  reservation: { label: 'Réservation', variant: 'secondary' },
  engagement: { label: 'Engagement', variant: 'default' },
  bon_commande: { label: 'Bon de Commande', variant: 'outline' },
  facture: { label: 'Facture', variant: 'secondary' },
  depense: { label: 'Dépense', variant: 'default' },
  paiement: { label: 'Paiement', variant: 'outline' },
};

export const EcritureComptableTable = ({ ecritures, onRowClick }: EcritureComptableTableProps) => {
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
            <TableHead>N° Pièce</TableHead>
            <TableHead className="text-center">Ligne</TableHead>
            <TableHead>Compte Débit</TableHead>
            <TableHead>Compte Crédit</TableHead>
            <TableHead>Libellé</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ecritures.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Aucune écriture comptable trouvée
              </TableCell>
            </TableRow>
          ) : (
            ecritures.map((ecriture) => (
              <TableRow
                key={ecriture.id}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={() => onRowClick?.(ecriture)}
              >
                <TableCell>
                  {format(new Date(ecriture.dateEcriture), 'dd/MM/yyyy', { locale: fr })}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {ecriture.numeroPiece}
                </TableCell>
                <TableCell className="text-center font-mono">
                  {ecriture.numeroLigne}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">{ecriture.compteDebit?.numero}</span>
                    <span className="text-xs text-muted-foreground">
                      {ecriture.compteDebit?.libelle}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">{ecriture.compteCredit?.numero}</span>
                    <span className="text-xs text-muted-foreground">
                      {ecriture.compteCredit?.libelle}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {ecriture.libelle}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMontant(ecriture.montant)}
                </TableCell>
                <TableCell>
                  <Badge variant={TYPE_OPERATION_LABELS[ecriture.typeOperation]?.variant || 'default'}>
                    {TYPE_OPERATION_LABELS[ecriture.typeOperation]?.label || ecriture.typeOperation}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
