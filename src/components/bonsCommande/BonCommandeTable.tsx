import { useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { CheckCircle, Edit, Eye, FileText, MoreHorizontal, PackageCheck, Receipt, Trash2, Truck, XCircle, BookOpen, AlertCircle } from 'lucide-react';
import type { BonCommande } from '@/types/bonCommande.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BonCommandeTableProps {
  bonsCommande: BonCommande[];
  onEdit?: (id: string) => void;
  onValider?: (id: string) => void;
  onMettreEnCours?: (id: string) => void;
  onReceptionner?: (id: string) => void;
  onAnnuler?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCreateFacture?: (id: string) => void;
  onViewDetails?: (bonCommandeId: string) => void;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
  scrollContainerClassName?: string;
}

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  } catch {
    return '-';
  }
};

const getStatutBadge = (statut: BonCommande['statut']) => {
  const variants: Record<BonCommande['statut'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    brouillon: { variant: 'outline', label: 'Brouillon' },
    valide: { variant: 'secondary', label: 'Validé' },
    en_cours: { variant: 'default', label: 'En cours' },
    receptionne: { variant: 'default', label: 'Réceptionné' },
    facture: { variant: 'default', label: 'Facturé' },
    annule: { variant: 'destructive', label: 'Annulé' },
  };

  const config = variants[statut] || variants.brouillon;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const BonCommandeTable = ({
  bonsCommande,
  onEdit,
  onValider,
  onMettreEnCours,
  onReceptionner,
  onAnnuler,
  onDelete,
  onCreateFacture,
  onViewDetails,
  stickyHeader = false,
  stickyHeaderOffset = 0,
  scrollContainerClassName,
}: BonCommandeTableProps) => {
  const columns: ListColumn<BonCommande>[] = useMemo(
    () => [
      {
        id: 'numero',
        header: 'Numéro',
        render: (bc) => (
          <Link
            to={`/app/bons-commande/${bc.id}`}
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
              onViewDetails(bc.id);
            }}
          >
            {bc.numero}
          </Link>
        ),
      },
      {
        id: 'date',
        header: 'Date',
        render: (bc) => formatDate(bc.dateCommande),
      },
      {
        id: 'fournisseur',
        header: 'Fournisseur',
        render: (bc) => bc.fournisseur?.nom || '-',
      },
      {
        id: 'engagement',
        header: 'Engagement',
        render: (bc) =>
          bc.engagement ? (
            <Badge variant="outline" className="text-xs">
              {bc.engagement.numero}
            </Badge>
          ) : (
            '-'
          ),
      },
      {
        id: 'objet',
        header: 'Objet',
        cellClassName: 'max-w-[260px] truncate',
        render: (bc) => bc.objet,
      },
      {
        id: 'montant',
        header: 'Montant',
        align: 'right',
        render: (bc) => <span className="font-medium tabular-nums">{formatCurrency(bc.montant)}</span>,
      },
      {
        id: 'facture',
        header: 'Facturé',
        align: 'right',
        render: (bc) => <span className="tabular-nums">{formatCurrency(bc.montantFacture || 0)}</span>,
      },
      {
        id: 'ecritures',
        header: 'Écritures',
        render: (bc) => {
          const count = bc.ecrituresCount || 0;
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
        render: (bc) => getStatutBadge(bc.statut),
      },
      {
        id: 'livraison-prevue',
        header: 'Livraison prévue',
        render: (bc) => formatDate(bc.dateLivraisonPrevue),
      },
      {
        id: 'livraison-reelle',
        header: 'Livraison effective',
        render: (bc) => formatDate(bc.dateLivraisonReelle),
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'text-right w-[70px]',
        render: (bc) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails && (
                <>
                  <DropdownMenuItem onClick={() => onViewDetails(bc.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Voir les détails
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {bc.statut === 'brouillon' && (
                <>
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(bc.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                  {onValider && (
                    <DropdownMenuItem onClick={() => onValider(bc.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Valider
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}

              {bc.statut === 'valide' && onMettreEnCours && (
                <DropdownMenuItem onClick={() => onMettreEnCours(bc.id)}>
                  <Truck className="h-4 w-4 mr-2" />
                  Mettre en cours
                </DropdownMenuItem>
              )}

              {bc.statut === 'en_cours' && onReceptionner && (
                <DropdownMenuItem onClick={() => onReceptionner(bc.id)}>
                  <PackageCheck className="h-4 w-4 mr-2" />
                  Réceptionner
                </DropdownMenuItem>
              )}

              {bc.statut === 'receptionne' && onCreateFacture && (
                <DropdownMenuItem onClick={() => onCreateFacture(bc.id)}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Créer une facture
                </DropdownMenuItem>
              )}

              {bc.statut !== 'facture' && bc.statut !== 'annule' && onAnnuler && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAnnuler(bc.id)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Annuler
                  </DropdownMenuItem>
                </>
              )}

              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(bc.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onAnnuler, onCreateFacture, onDelete, onEdit, onMettreEnCours, onReceptionner, onValider, onViewDetails]
  );

  return (
    <ListTable
      items={bonsCommande}
      columns={columns}
      getRowId={(bc) => bc.id}
      onRowDoubleClick={(bc) => onViewDetails?.(bc.id)}
      emptyMessage="Aucun bon de commande trouvé"
      stickyHeader={stickyHeader}
      stickyHeaderOffset={stickyHeaderOffset}
      scrollContainerClassName={scrollContainerClassName}
    />
  );
};
