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
import { CheckCircle, Edit, FileText, MoreHorizontal, Receipt, Trash2, XCircle } from 'lucide-react';
import type { Engagement } from '@/types/engagement.types';

interface EngagementTableProps {
  engagements: Engagement[];
  onEdit?: (id: string) => void;
  onValider?: (id: string) => void;
  onAnnuler?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCreerBonCommande?: (id: string) => void;
  onCreerDepense?: (id: string) => void;
  onViewDetails?: (engagementId: string) => void;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
  scrollContainerClassName?: string;
}

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR');

const getStatusBadge = (statut: Engagement['statut']) => {
  const variants: Record<Engagement['statut'], { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'; label: string }> = {
    brouillon: { variant: 'warning', label: 'Brouillon' },
    valide: { variant: 'success', label: 'Validé' },
    engage: { variant: 'success', label: 'Engagé' },
    liquide: { variant: 'success', label: 'Liquidé' },
    annule: { variant: 'destructive', label: 'Annulé' },
  };
  const config = variants[statut] || variants.brouillon;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const EngagementTable = ({
  engagements,
  onEdit,
  onValider,
  onAnnuler,
  onDelete,
  onCreerBonCommande,
  onCreerDepense,
  onViewDetails,
  stickyHeader = false,
  stickyHeaderOffset = 0,
  scrollContainerClassName,
}: EngagementTableProps) => {
  const columns: ListColumn<Engagement>[] = useMemo(
    () => [
      {
        id: 'numero',
        header: 'Numéro',
        render: (engagement) => (
          <Link
            to={`/app/engagements/${engagement.id}`}
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
              onViewDetails(engagement.id);
            }}
          >
            {engagement.numero}
          </Link>
        ),
      },
      {
        id: 'ligne',
        header: 'Ligne budgétaire',
        cellClassName: 'max-w-[240px] truncate',
        render: (engagement) => engagement.ligneBudgetaire?.libelle || '-',
      },
      {
        id: 'objet',
        header: 'Objet',
        cellClassName: 'max-w-[260px] truncate',
        render: (engagement) => engagement.objet,
      },
      {
        id: 'beneficiaire',
        header: 'Bénéficiaire',
        render: (engagement) => engagement.fournisseur?.nom || engagement.beneficiaire || '-',
      },
      {
        id: 'montant',
        header: 'Montant',
        align: 'right',
        render: (engagement) => <span className="font-medium tabular-nums">{formatCurrency(engagement.montant)}</span>,
      },
      {
        id: 'solde',
        header: 'Solde',
        align: 'right',
        render: (engagement) => (
          <span
            className={
              engagement.solde === 0
                ? 'text-muted-foreground'
                : engagement.solde && engagement.solde < 0
                ? 'text-destructive font-medium'
                : 'tabular-nums'
            }
          >
            {formatCurrency(engagement.solde ?? engagement.montant)}
          </span>
        ),
      },
      {
        id: 'statut',
        header: 'Statut',
        render: (engagement) => getStatusBadge(engagement.statut),
      },
      {
        id: 'date',
        header: 'Date création',
        render: (engagement) => formatDate(engagement.dateCreation),
      },
      {
        id: 'reservation',
        header: 'Réservation',
        render: (engagement) =>
          engagement.reservationCredit ? (
            <Badge variant="outline" className="text-xs">
              {engagement.reservationCredit.numero}
            </Badge>
          ) : (
            '-'
          ),
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'text-right w-[70px]',
        render: (engagement) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails && (
                <>
                  <DropdownMenuItem onClick={() => onViewDetails(engagement.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Voir les détails
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {engagement.statut === 'brouillon' && (
                <>
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(engagement.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                  {onValider && (
                    <DropdownMenuItem onClick={() => onValider(engagement.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Valider
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}

              {engagement.statut === 'valide' && (
                <>
                  {onCreerBonCommande && (
                    <DropdownMenuItem onClick={() => onCreerBonCommande(engagement.id)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Créer bon de commande
                    </DropdownMenuItem>
                  )}
                  {onCreerDepense && (
                    <DropdownMenuItem onClick={() => onCreerDepense(engagement.id)}>
                      <Receipt className="h-4 w-4 mr-2" />
                      Créer une dépense
                    </DropdownMenuItem>
                  )}
                  {onAnnuler && (
                    <DropdownMenuItem onClick={() => onAnnuler(engagement.id)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuler
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}

              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(engagement.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onAnnuler, onCreerBonCommande, onCreerDepense, onDelete, onEdit, onValider, onViewDetails]
  );

  return (
    <ListTable
      items={engagements}
      columns={columns}
      getRowId={(engagement) => engagement.id}
      onRowDoubleClick={(engagement) => onViewDetails?.(engagement.id)}
      emptyMessage="Aucun engagement pour le moment"
      stickyHeader={stickyHeader}
      stickyHeaderOffset={stickyHeaderOffset}
      scrollContainerClassName={scrollContainerClassName}
    />
  );
};
