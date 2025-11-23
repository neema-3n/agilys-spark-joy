import { useMemo, useState } from 'react';
import { Facture } from '@/types/facture.types';
import { ListColumn, ListTable } from '@/components/lists/ListTable';
import { buildSelectionColumn, ListSelectionHandlers } from '@/components/lists/selectionColumn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle,
  DollarSign,
  XCircle,
  Eye,
  FileText,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { useListSelection } from '@/hooks/useListSelection';
import { formatCurrency } from '@/lib/utils';

type FactureTableSelection = ListSelectionHandlers;

interface FactureTableProps {
  factures: Facture[];
  onEdit: (facture: Facture) => void;
  onDelete: (id: string) => void;
  onValider: (id: string) => void;
  onMarquerPayee: (id: string) => void;
  onAnnuler: (id: string) => void;
  onCreerDepense: (facture: Facture) => void;
  onViewDetails: (factureId: string) => void;
  selection: FactureTableSelection;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
  scrollContainerClassName?: string;
}

export const FactureTable = ({
  factures,
  onEdit,
  onDelete,
  onValider,
  onMarquerPayee,
  onAnnuler,
  onCreerDepense,
  onViewDetails,
  selection,
  stickyHeader = false,
  stickyHeaderOffset = 0,
  scrollContainerClassName,
}: FactureTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const factureIds = useMemo(() => factures.map((facture) => facture.id), [factures]);
  const { selectedIds, allSelected, toggleOne, toggleAll } = selection;

  const getStatutBadge = (statut: string) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
    > = {
      brouillon: { variant: 'outline', label: 'Brouillon' },
      validee: { variant: 'secondary', label: 'Validée' },
      payee: { variant: 'default', label: 'Payée' },
      annulee: { variant: 'destructive', label: 'Annulée' },
    };
    const config = variants[statut] || variants.brouillon;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatMontant = (montant: number) => {
    return formatCurrency(montant);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  const columns: ListColumn<Facture>[] = [
    buildSelectionColumn<Facture>({
      selection: { selectedIds, allSelected, toggleOne, toggleAll },
      getId: (facture) => facture.id,
      getLabel: (facture) => `Sélectionner la facture ${facture.numero}`,
      allLabel: 'Sélectionner toutes les factures',
    }),
    {
      id: 'numero',
      header: 'Numéro',
      render: (facture) => (
        <Link
          to={`/app/factures/${facture.id}`}
          className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
          onClick={(event) => {
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
            onViewDetails(facture.id);
          }}
        >
          {facture.numero}
        </Link>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      render: (facture) => formatDate(facture.dateFacture),
    },
    {
      id: 'fournisseur',
      header: 'Fournisseur',
      render: (facture) => facture.fournisseur?.nom || '-',
    },
    {
      id: 'objet',
      header: 'Objet',
      cellClassName: 'max-w-[220px] truncate',
      render: (facture) => facture.objet,
    },
    {
      id: 'bonCommande',
      header: 'Bon de commande',
      render: (facture) => facture.bonCommande?.numero || '-',
    },
    {
      id: 'montant',
      header: 'Montant (TTC)',
      align: 'right',
      render: (facture) => (
        <span className="font-medium">{formatCurrency(facture.montantTTC)}</span>
      ),
    },
    {
      id: 'paye',
      header: 'Liquidé',
      align: 'right',
      render: (facture) => formatCurrency(facture.montantLiquide || 0),
    },
    {
      id: 'solde',
      header: 'Solde',
      align: 'right',
      render: (facture) => {
        const solde = facture.montantTTC - (facture.montantLiquide || 0);
        const soldeClass = solde > 0 ? 'text-orange-600 font-medium' : 'text-green-600';
        return <span className={soldeClass}>{formatMontant(solde)}</span>;
      },
    },
      {
        id: 'ecritures',
        header: 'Écritures',
        render: (facture) => {
          const count = facture.ecrituresCount || 0;
          return count > 0 ? (
            <Badge variant="default" className="gap-1">
              <BookOpen className="h-3 w-3" />
              {count}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              -
            </Badge>
          );
        },
      },
      {
        id: 'statut',
        header: 'Statut',
        render: (facture) => getStatutBadge(facture.statut),
      },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cellClassName: 'text-right w-[70px]',
      render: (facture) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(facture.id)}>
              <Eye className="mr-2 h-4 w-4" />
              Voir les détails
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {facture.statut === 'brouillon' && (
              <DropdownMenuItem onClick={() => onEdit(facture)}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
            )}

            {facture.statut === 'brouillon' && (
              <DropdownMenuItem onClick={() => onValider(facture.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Valider
              </DropdownMenuItem>
            )}
            {facture.statut === 'validee' && (
              <>
                <DropdownMenuItem onClick={() => onCreerDepense(facture)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Créer une dépense
                </DropdownMenuItem>
              </>
            )}
            {facture.statut !== 'payee' && facture.statut !== 'annulee' && (
              <DropdownMenuItem onClick={() => onAnnuler(facture.id)}>
                <XCircle className="mr-2 h-4 w-4" />
                Annuler
              </DropdownMenuItem>
            )}
            {facture.statut === 'brouillon' && (
              <DropdownMenuItem
                onClick={() => setDeleteId(facture.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <ListTable
        items={factures}
        columns={columns}
        getRowId={(facture) => facture.id}
        onRowDoubleClick={(facture) => onViewDetails(facture.id)}
        emptyMessage="Aucune facture trouvée"
        stickyHeader={stickyHeader}
        stickyHeaderOffset={stickyHeaderOffset}
        scrollContainerClassName={scrollContainerClassName}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
