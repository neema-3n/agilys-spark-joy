import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, XCircle } from 'lucide-react';
import { Paiement } from '@/types/paiement.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaiementTableProps {
  paiements: Paiement[];
  onView: (id: string) => void;
  onAnnuler?: (id: string) => void;
}

export const PaiementTable = ({ paiements, onView, onAnnuler }: PaiementTableProps) => {
  const modes = {
    virement: 'Virement',
    cheque: 'Chèque',
    especes: 'Espèces',
    carte: 'Carte',
    autre: 'Autre',
  };

  if (paiements.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun paiement pour le moment
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numéro</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Dépense</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Référence</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paiements.map((paiement) => (
            <TableRow key={paiement.id}>
              <TableCell className="font-medium">{paiement.numero}</TableCell>
              <TableCell>
                {format(new Date(paiement.datePaiement), 'dd/MM/yyyy', { locale: fr })}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {paiement.depense?.numero || '-'}
              </TableCell>
              <TableCell className="font-medium">
                {paiement.montant.toFixed(2)} €
              </TableCell>
              <TableCell>
                {modes[paiement.modePaiement] || paiement.modePaiement}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {paiement.referencePaiement || '-'}
              </TableCell>
              <TableCell>
                <Badge variant={paiement.statut === 'valide' ? 'default' : 'destructive'}>
                  {paiement.statut === 'valide' ? 'Valide' : 'Annulé'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(paiement.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {paiement.statut === 'valide' && onAnnuler && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onAnnuler(paiement.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
