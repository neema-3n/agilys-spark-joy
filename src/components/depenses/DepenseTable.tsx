import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, CheckCircle, FileCheck, Banknote, XCircle, Trash, Eye } from 'lucide-react';
import { ListColumn, ListTable } from '@/components/lists/ListTable';
import { buildSelectionColumn, ListSelectionHandlers } from '@/components/lists/selectionColumn';
import { formatCurrency } from '@/lib/utils';
import type { Depense } from '@/types/depense.types';

interface DepenseTableProps {
  depenses: Depense[];
  onEdit?: (depense: Depense) => void;
  onValider?: (id: string) => void;
  onOrdonnancer?: (id: string) => void;
  onEnregistrerPaiement?: (id: string) => void;
  onAnnuler?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (depenseId: string) => void;
  disableActions?: boolean;
  selection: ListSelectionHandlers;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
  scrollContainerClassName?: string;
}

export const DepenseTable = ({
  depenses,
  onEdit,
  onValider,
  onOrdonnancer,
  onEnregistrerPaiement,
  onAnnuler,
  onDelete,
  onViewDetails,
  disableActions = false,
  selection,
  stickyHeader = false,
  stickyHeaderOffset = 0,
  scrollContainerClassName,
}: DepenseTableProps) => {
  const formatMontant = (montant: number) => {
    return formatCurrency(montant);
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'; label: string }> = {
      brouillon: { variant: 'outline', label: 'Brouillon' },
      validee: { variant: 'success', label: 'Validée' },
      ordonnancee: { variant: 'secondary', label: 'Ordonnancée' },
      payee: { variant: 'success', label: 'Payée' },
      annulee: { variant: 'destructive', label: 'Annulée' },
    };
    const config = variants[statut] || variants.brouillon;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const { selectedIds, allSelected, toggleOne, toggleAll } = selection;

  const columns: ListColumn<Depense>[] = [
    buildSelectionColumn<Depense>({
      selection: { selectedIds, allSelected, toggleOne, toggleAll },
      getId: (depense) => depense.id,
      getLabel: (depense) => `Sélectionner la dépense ${depense.numero}`,
      allLabel: 'Sélectionner toutes les dépenses',
    }),
    {
      id: 'numero',
      header: 'Numéro',
      render: (depense) => (
        <Link
          to={`/app/depenses/${depense.id}`}
          className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
          onClick={(event) => {
            if (!onViewDetails) return;
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }
            event.preventDefault();
            onViewDetails(depense.id);
          }}
        >
          {depense.numero}
        </Link>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      render: (depense) => new Date(depense.dateDepense).toLocaleDateString('fr-FR'),
    },
    {
      id: 'objet',
      header: 'Objet',
      cellClassName: 'max-w-[240px] truncate',
      render: (depense) => depense.objet,
    },
    {
      id: 'beneficiaire',
      header: 'Bénéficiaire',
      render: (depense) => depense.fournisseur?.nom || depense.beneficiaire || '-',
    },
    {
      id: 'montant',
      header: 'Montant TTC',
      align: 'right',
      render: (depense) => (
        <span className="font-medium tabular-nums">{formatMontant(depense.montant)}</span>
      ),
    },
    {
      id: 'montantPaye',
      header: 'Payé',
      align: 'right',
      render: (depense) => (
        <span className="text-success tabular-nums">{formatMontant(depense.montantPaye)}</span>
      ),
    },
    {
      id: 'solde',
      header: 'Solde',
      align: 'right',
      render: (depense) => (
        <span className="font-medium tabular-nums">{formatMontant(depense.montant - depense.montantPaye)}</span>
      ),
    },
    {
      id: 'statut',
      header: 'Statut',
      render: (depense) => getStatutBadge(depense.statut),
    },
    {
      id: 'imputation',
      header: 'Imputation',
      render: (depense) => (
        <div className="text-xs text-muted-foreground space-y-1">
          {depense.engagement && <div>ENG: {depense.engagement.numero}</div>}
          {depense.reservationCredit && <div>RES: {depense.reservationCredit.numero}</div>}
          {depense.facture && <div>FAC: {depense.facture.numero}</div>}
          {!depense.engagement && !depense.reservationCredit && depense.ligneBudgetaire && (
            <div>Ligne directe</div>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cellClassName: 'text-right w-[70px]',
      render: (depense) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={disableActions}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onViewDetails && (
              <>
                <DropdownMenuItem
                  onClick={() => onViewDetails(depense.id)}
                  disabled={disableActions}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir les détails
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {depense.statut === 'brouillon' && (
              <>
                {onValider && (
                  <DropdownMenuItem
                    onClick={() => onValider(depense.id)}
                    disabled={disableActions}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Valider
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(depense.id)}
                    className="text-destructive"
                    disabled={disableActions}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </>
            )}

            {depense.statut === 'validee' && onOrdonnancer && (
              <DropdownMenuItem
                onClick={() => onOrdonnancer(depense.id)}
                disabled={disableActions}
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Ordonnancer
              </DropdownMenuItem>
            )}

            {depense.statut === 'ordonnancee' &&
              depense.montant > depense.montantPaye &&
              onEnregistrerPaiement && (
                <DropdownMenuItem
                  onClick={() => onEnregistrerPaiement(depense.id)}
                  disabled={disableActions}
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Enregistrer un paiement
                </DropdownMenuItem>
              )}

            {depense.statut !== 'annulee' && depense.statut !== 'payee' && onAnnuler && (
              <DropdownMenuItem
                onClick={() => onAnnuler(depense.id)}
                className="text-destructive"
                disabled={disableActions}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annuler
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <ListTable
      items={depenses}
      columns={columns}
      getRowId={(depense) => depense.id}
      onRowDoubleClick={onViewDetails ? (depense) => onViewDetails(depense.id) : undefined}
      emptyMessage="Aucune dépense trouvée"
      stickyHeader={stickyHeader}
      stickyHeaderOffset={stickyHeaderOffset}
      scrollContainerClassName={scrollContainerClassName}
    />
  );
};
