import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Fournisseur } from '@/types/fournisseur.types';
import { ListTable, ListColumn } from '@/components/lists/ListTable';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListLayout } from '@/components/lists/ListLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { buildSelectionColumn, ListSelectionHandlers } from '@/components/lists/selectionColumn';

interface FournisseurTableProps {
  fournisseurs: Fournisseur[];
  onViewDetails?: (id: string) => void;
  onEdit: (fournisseur: Fournisseur) => void;
  onDelete: (id: string) => void;
  selection?: ListSelectionHandlers;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
}

const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
};

const getStatutBadge = (statut: string) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    actif: { variant: 'default', label: 'Actif' },
    inactif: { variant: 'secondary', label: 'Inactif' },
    blackliste: { variant: 'destructive', label: 'Blacklisté' },
    en_attente_validation: { variant: 'outline', label: 'En attente' },
  };
  const config = variants[statut] || variants.actif;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const FournisseurTable = ({
  fournisseurs,
  onViewDetails,
  onEdit,
  onDelete,
  selection,
  stickyHeader = false,
  stickyHeaderOffset = 0,
}: FournisseurTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredFournisseurs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return fournisseurs.filter(
      (f) =>
        f.code.toLowerCase().includes(term) ||
        f.nom.toLowerCase().includes(term) ||
        f.categorie?.toLowerCase().includes(term) ||
        f.email?.toLowerCase().includes(term) ||
        f.telephone?.toLowerCase().includes(term)
    );
  }, [fournisseurs, searchTerm]);

  const columns = useMemo<ListColumn<Fournisseur>[]>(() => {
    const baseColumns: ListColumn<Fournisseur>[] = [
      {
        id: 'code',
        header: 'Code',
        className: 'w-[120px]',
        render: (f) => (
          <Link
            to={`/app/fournisseurs/${f.id}`}
            className="font-medium text-primary hover:underline"
            onClick={(e) => {
              if (onViewDetails) {
                e.preventDefault();
                onViewDetails(f.id);
              }
            }}
          >
            {f.code}
          </Link>
        ),
      },
      {
        id: 'nom',
        header: 'Nom',
        render: (f) => (
          <Link
            to={`/app/fournisseurs/${f.id}`}
            className="hover:underline"
            onClick={(e) => {
              if (onViewDetails) {
                e.preventDefault();
                onViewDetails(f.id);
              }
            }}
          >
            {f.nom}
          </Link>
        ),
      },
      {
        id: 'categorie',
        header: 'Catégorie',
        className: 'w-[150px]',
        render: (f) => <span className="text-muted-foreground">{f.categorie || '-'}</span>,
      },
      {
        id: 'telephone',
        header: 'Téléphone',
        className: 'w-[140px]',
        render: (f) => <span className="text-muted-foreground">{f.telephone || '-'}</span>,
      },
      {
        id: 'email',
        header: 'Email',
        className: 'w-[200px]',
        render: (f) => <span className="text-muted-foreground">{f.email || '-'}</span>,
      },
      {
        id: 'statut',
        header: 'Statut',
        className: 'w-[120px]',
        render: (f) => getStatutBadge(f.statut),
      },
      {
        id: 'montantTotalEngage',
        header: 'Montant engagé',
        className: 'w-[140px]',
        align: 'right',
        render: (f) => <span className="font-medium">{formatMontant(f.montantTotalEngage)}</span>,
      },
      {
        id: 'nombreEngagements',
        header: 'Engagements',
        className: 'w-[120px]',
        align: 'center',
        render: (f) => <span>{f.nombreEngagements}</span>,
      },
      {
        id: 'actions',
        header: '',
        className: 'w-[60px]',
        cellClassName: 'text-right',
        render: (f) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(f.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Voir détails
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(f)}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              {f.nombreEngagements === 0 && (
                <DropdownMenuItem
                  onClick={() => setDeleteId(f.id)}
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

    if (selection) {
      return [
        buildSelectionColumn({
          selection,
          getId: (f) => f.id,
          getLabel: (f) => `Sélectionner ${f.nom}`,
          allLabel: 'Sélectionner tous les fournisseurs',
        }),
        ...baseColumns,
      ];
    }

    return baseColumns;
  }, [selection, onViewDetails, onEdit]);

  return (
    <>
      <ListLayout
        title="Fournisseurs"
        toolbar={
          <ListToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Rechercher un fournisseur..."
          />
        }
      >
        <ListTable
          items={filteredFournisseurs}
          columns={columns}
          getRowId={(f) => f.id}
          onRowDoubleClick={onViewDetails ? (f) => onViewDetails(f.id) : undefined}
          emptyMessage="Aucun fournisseur trouvé"
          stickyHeader={stickyHeader}
          stickyHeaderOffset={stickyHeaderOffset}
        />
      </ListLayout>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible.
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
