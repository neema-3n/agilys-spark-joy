import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ListColumn, ListTable } from '@/components/lists/ListTable';
import { ModePaiement, Paiement } from '@/types/paiement.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MoreHorizontal, Trash } from 'lucide-react';

interface PaiementTableProps {
  paiements: Paiement[];
  onDelete?: (id: string) => void;
}

const modeLabels: Record<ModePaiement, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  carte: 'Carte',
  espece: 'Espèces',
  autre: 'Autre',
};

export const PaiementTable = ({ paiements, onDelete }: PaiementTableProps) => {
  const columns: ListColumn<Paiement>[] = [
    {
      id: 'date',
      header: 'Date',
      render: (paiement) => format(new Date(paiement.date), 'dd/MM/yyyy', { locale: fr }),
    },
    {
      id: 'facture',
      header: 'Facture',
      render: (paiement) => (
        <Link
          to={`/app/factures/${paiement.factureId}`}
          className="text-primary underline-offset-4 hover:underline"
        >
          {paiement.factureNumero}
        </Link>
      ),
    },
    {
      id: 'fournisseur',
      header: 'Fournisseur',
      render: (paiement) => paiement.fournisseurNom || '-',
    },
    {
      id: 'mode',
      header: 'Mode',
      render: (paiement) => <Badge variant="outline">{modeLabels[paiement.mode]}</Badge>,
    },
    {
      id: 'montant',
      header: 'Montant',
      align: 'right',
      render: (paiement) =>
        new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2,
        }).format(paiement.montant),
    },
    {
      id: 'reference',
      header: 'Référence',
      render: (paiement) => paiement.reference || '-',
    },
    {
      id: 'note',
      header: 'Note',
      cellClassName: 'max-w-[240px] truncate text-muted-foreground',
      render: (paiement) => paiement.note || '-',
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cellClassName: 'w-[70px]',
      render: (paiement) =>
        onDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(paiement.id)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    },
  ];

  return (
    <ListTable
      items={paiements}
      columns={columns}
      getRowId={(paiement) => paiement.id}
      emptyMessage="Aucun paiement enregistré"
    />
  );
};
