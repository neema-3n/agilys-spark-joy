import { useState } from 'react';
import { Facture } from '@/types/facture.types';
import { ListColumn, ListTable } from '@/components/lists/ListTable';
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


interface FactureTableProps {
  factures: Facture[];
  onEdit: (facture: Facture) => void;
  onDelete: (id: string) => void;
  onValider: (id: string) => void;
  onMarquerPayee: (id: string) => void;
  onAnnuler: (id: string) => void;
  onCreerDepense: (facture: Facture) => void;
  onViewDetails: (factureId: string) => void;
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
}: FactureTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  const columns: ListColumn<Facture>[] = [
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
      render: (facture) => <span className="font-medium">{formatMontant(facture.montantTTC)}</span>,
    },
    {
      id: 'paye',
      header: 'Liquidé',
      align: 'right',
      render: (facture) => formatMontant(facture.montantPaye || 0),
    },
    {
      id: 'solde',
      header: 'Solde',
      align: 'right',
      render: (facture) => {
        const solde = facture.montantTTC - (facture.montantPaye || 0);
        const soldeClass = solde > 0 ? 'text-orange-600 font-medium' : 'text-green-600';
        return <span className={soldeClass}>{formatMontant(solde)}</span>;
      },
    },
    {
      id: 'statut',
      header: 'Statut',
      render: (facture) => getStatutBadge(facture.statut),
    },
    {
      id: 'actions',
      header: '',
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
