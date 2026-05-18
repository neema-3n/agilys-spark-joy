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
import { buildSelectionColumn, ListSelectionHandlers } from '@/components/lists/selectionColumn';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, Eye, Pencil, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Paiement } from '@/types/paiement.types';

interface PaiementTableProps {
  paiements: Paiement[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onValidate?: (id: string) => void;
  onAnnuler?: (id: string) => void;
  selection?: ListSelectionHandlers;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
  scrollContainerClassName?: string;
  footer?: React.ReactNode;
}

const formatDate = (dateString: string) => format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });

export const PaiementTable = ({
  paiements,
  onView,
  onEdit,
  onValidate,
  onAnnuler,
  selection,
  stickyHeader = false,
  stickyHeaderOffset = 0,
  scrollContainerClassName,
  footer,
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
      ...(selection
        ? [
            buildSelectionColumn<Paiement>({
              selection,
              getId: (paiement) => paiement.id,
              getLabel: (paiement) => `Sélectionner le paiement ${paiement.numero}`,
              allLabel: 'Sélectionner tous les paiements',
            }),
          ]
        : []),
      {
        id: 'numero',
        header: 'Numéro',
        render: (paiement) =>
          onView ? (
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
              onClick={() => onView(paiement.id)}
            >
              {paiement.numero}
            </button>
          ) : (
            paiement.numero
          ),
      },
      {
        id: 'date',
        header: 'Date',
        render: (paiement) => formatDate(paiement.datePaiement),
      },
      {
        id: 'depense',
        header: 'Source',
        render: (paiement) => paiement.depense?.numero || paiement.objet || 'Paiement direct',
      },
      {
        id: 'beneficiaire',
        header: 'Bénéficiaire',
        render: (paiement) => paiement.depense?.fournisseur?.nom || paiement.beneficiaire || '-',
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
          <Badge
            variant={
              paiement.statut === 'valide'
                ? 'success'
                : paiement.statut === 'brouillon'
                  ? 'secondary'
                  : 'destructive'
            }
          >
            {paiement.statut === 'valide'
              ? 'Validé'
              : paiement.statut === 'brouillon'
                ? 'Brouillon'
                : 'Annulé'}
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
              {paiement.statut === 'brouillon' && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(paiement.id)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
              )}
              {paiement.statut === 'brouillon' && onValidate && (
                <DropdownMenuItem onClick={() => onValidate(paiement.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Valider
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
    [onAnnuler, onEdit, onValidate, onView, selection]
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
      footer={footer}
    />
  );
};
