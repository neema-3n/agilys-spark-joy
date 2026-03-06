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
import { CheckCircle2, Eye, PlayCircle, Redo2, ShieldCheck, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Paiement } from '@/types/paiement.types';
import {
  formatPaiementTableNumero,
  getPaiementTableActions,
  paiementStatusLabels,
  paiementStatusVariants,
} from '@/lib/paiement-workflow';

interface PaiementTableProps {
  paiements: Paiement[];
  onView?: (id: string) => void;
  onAccepter?: (id: string) => void;
  onExecuter?: (id: string) => void;
  onReconcilier?: (id: string) => void;
  onRejeter?: (id: string) => void;
  onAnnuler?: (id: string) => void;
  onReprendre?: (id: string) => void;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
  scrollContainerClassName?: string;
}

const formatDate = (dateString: string) => format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });

export const PaiementTable = ({
  paiements,
  onView,
  onAccepter,
  onExecuter,
  onReconcilier,
  onRejeter,
  onAnnuler,
  onReprendre,
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
        render: (paiement) => formatPaiementTableNumero(paiement),
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
          <Badge variant={paiementStatusVariants[paiement.statut]}>
            {paiementStatusLabels[paiement.statut]}
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
              {getPaiementTableActions(paiement.statut).includes('view') && onView && (
                <DropdownMenuItem onClick={() => onView(paiement.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir
                </DropdownMenuItem>
              )}
              {getPaiementTableActions(paiement.statut).includes('accepter') && onAccepter && (
                <DropdownMenuItem onClick={() => onAccepter(paiement.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accepter
                </DropdownMenuItem>
              )}
              {getPaiementTableActions(paiement.statut).includes('executer') && onExecuter && (
                <DropdownMenuItem onClick={() => onExecuter(paiement.id)}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Exécuter
                </DropdownMenuItem>
              )}
              {getPaiementTableActions(paiement.statut).includes('reconcilier') && onReconcilier && (
                <DropdownMenuItem onClick={() => onReconcilier(paiement.id)}>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Réconcilier
                </DropdownMenuItem>
              )}
              {getPaiementTableActions(paiement.statut).includes('rejeter') && onRejeter && (
                <DropdownMenuItem onClick={() => onRejeter(paiement.id)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </DropdownMenuItem>
              )}
              {getPaiementTableActions(paiement.statut).includes('reprendre') && onReprendre && (
                <DropdownMenuItem onClick={() => onReprendre(paiement.id)}>
                  <Redo2 className="h-4 w-4 mr-2" />
                  Reprendre
                </DropdownMenuItem>
              )}
              {getPaiementTableActions(paiement.statut).includes('annuler') && onAnnuler && (
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
    [onAccepter, onAnnuler, onExecuter, onReconcilier, onRejeter, onReprendre, onView]
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
