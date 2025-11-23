import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListColumn, ListTable } from '@/components/lists/ListTable';
import { formatCurrency } from '@/lib/utils';
import { Eye, XCircle, BookOpen, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Paiement } from '@/types/paiement.types';

interface PaiementTableProps {
  paiements: Paiement[];
  onView?: (id: string) => void;
  onAnnuler?: (id: string) => void;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
  scrollContainerClassName?: string;
}

const formatDate = (dateString: string) => format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });

export const PaiementTable = ({
  paiements,
  onView,
  onAnnuler,
  stickyHeader = false,
  stickyHeaderOffset = 0,
  scrollContainerClassName,
}: PaiementTableProps) => {
  const modes: Record<string, string> = {
    virement: 'Virement',
    cheque: 'Chèque',
    especes: 'Espèces',
    carte: 'Carte',
    autre: 'Autre',
  };

  const columns: ListColumn<Paiement>[] = useMemo(
    () => [
      {
        id: 'numero',
        header: 'Numéro',
        render: (paiement) => paiement.numero,
      },
      {
        id: 'date',
        header: 'Date',
        render: (paiement) => formatDate(paiement.datePaiement),
      },
      {
        id: 'depense',
        header: 'Dépense',
        render: (paiement) => paiement.depense?.numero || '-',
      },
      {
        id: 'montant',
        header: 'Montant',
        align: 'right',
        render: (paiement) => <span className="font-medium tabular-nums">{formatCurrency(paiement.montant)}</span>,
      },
      {
        id: 'mode',
        header: 'Mode',
        render: (paiement) => modes[paiement.modePaiement] || paiement.modePaiement,
      },
      {
        id: 'reference',
        header: 'Référence',
        render: (paiement) => paiement.referencePaiement || '-',
      },
      {
        id: 'statut',
        header: 'Statut',
        render: (paiement) => (
          <Badge variant={paiement.statut === 'valide' ? 'secondary' : 'destructive'}>
            {paiement.statut === 'valide' ? 'Validé' : 'Annulé'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'text-right w-[70px]',
        render: (paiement) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(paiement.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir
                </DropdownMenuItem>
              )}
              {paiement.statut === 'valide' && onAnnuler && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAnnuler(paiement.id)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Annuler
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onAnnuler, onView]
  );

  return (
    <ListTable
      items={paiements}
      columns={columns}
      getRowId={(paiement) => paiement.id}
      onRowDoubleClick={(paiement) => onView?.(paiement.id)}
      emptyMessage="Aucun paiement pour le moment"
      stickyHeader={stickyHeader}
      stickyHeaderOffset={stickyHeaderOffset}
      scrollContainerClassName={scrollContainerClassName}
    />
  );
};
