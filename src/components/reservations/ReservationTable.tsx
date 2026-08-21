import { ReactNode, useMemo } from 'react';
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
import { buildSelectionColumn, ListSelectionHandlers } from '@/components/lists/selectionColumn';
import { formatCurrency, cn } from '@/lib/utils';
import { Edit, Trash2, Eye, MoreHorizontal, XCircle, CheckCircle } from 'lucide-react';
import type { ReservationCredit } from '@/types/reservation.types';
import { formatDateValue } from '@/lib/date-utils';
import {
  canCancelReservation,
  canCreateReservationEngagement,
  canEditReservation,
} from '@/lib/reservation-actions';
import { SiPermission, SiSuperAdmin } from '@/components/SiPermission';

interface ReservationTableProps {
  reservations: ReservationCredit[];
  onEdit?: (reservationId: string) => void;
  onCreerEngagement?: (reservationId: string) => void;
  onAnnuler?: (reservationId: string) => void;
  onDelete?: (reservationId: string) => void;
  onViewDetails?: (reservationId: string) => void;
  selection?: ListSelectionHandlers;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
  scrollContainerClassName?: string;
  footer?: ReactNode;
}

const calculerSolde = (reservation: ReservationCredit): number => {
  if (!reservation.engagements || reservation.engagements.length === 0) {
    return reservation.montant;
  }

  const montantEngage = reservation.engagements
    .filter((engagement) => engagement.statut !== 'annule')
    .reduce((sum, engagement) => sum + Number(engagement.montant), 0);

  return Number(reservation.montant) - montantEngage;
};

const formatDate = (dateString: string) => formatDateValue(dateString);

const getStatutBadge = (statut: ReservationCredit['statut']) => {
  const variants: Record<ReservationCredit['statut'], 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'> = {
    brouillon: 'outline',
    active: 'success',
    convertie: 'secondary',
    annulee: 'destructive',
    expiree: 'outline',
  };

  const labels: Record<ReservationCredit['statut'], string> = {
    brouillon: 'Brouillon',
    active: 'Active',
    convertie: 'Convertie',
    annulee: 'Annulée',
    expiree: 'Expirée',
  };

  return <Badge variant={variants[statut] || 'default'}>{labels[statut] || statut}</Badge>;
};

export const ReservationTable = ({
  reservations,
  onEdit,
  onCreerEngagement,
  onAnnuler,
  onDelete,
  onViewDetails,
  selection,
  stickyHeader = false,
  stickyHeaderOffset = 0,
  scrollContainerClassName,
  footer,
}: ReservationTableProps) => {
  const columns: ListColumn<ReservationCredit>[] = useMemo(
    () => {
      const baseColumns: ListColumn<ReservationCredit>[] = [
        {
        id: 'numero',
        header: 'Numéro',
        render: (reservation) => (
          <Link
            to={`/app/reservations/${reservation.id}`}
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
              onViewDetails(reservation.id);
            }}
          >
            {reservation.numero}
          </Link>
        ),
      },
      {
        id: 'ligne',
        header: 'Ligne budgétaire',
        cellClassName: 'max-w-[240px] truncate',
        render: (reservation) => reservation.ligneBudgetaire?.libelle || 'N/A',
      },
      {
        id: 'objet',
        header: 'Objet',
        cellClassName: 'max-w-[260px] truncate',
        render: (reservation) => reservation.objet,
      },
      {
        id: 'beneficiaire',
        header: 'Bénéficiaire',
        render: (reservation) =>
          reservation.projet ? (
            <div className="space-y-1">
              <div className="font-medium">{reservation.projet.nom}</div>
              <div className="text-xs text-muted-foreground">{reservation.projet.code}</div>
            </div>
          ) : (
            reservation.beneficiaire || '-'
          ),
      },
      {
        id: 'montant',
        header: 'Montant',
        align: 'right',
        render: (reservation) => (
          <span className="font-medium tabular-nums">{formatCurrency(reservation.montant)}</span>
        ),
      },
      {
        id: 'solde',
        header: 'Solde',
        align: 'right',
        render: (reservation) => {
          const solde = calculerSolde(reservation);
          const isEpuise = solde === 0;
          const isPartiel = solde < reservation.montant && solde > 0;

          return (
            <span
              className={cn(
                'font-medium tabular-nums',
                isEpuise ? 'text-destructive' : isPartiel ? 'text-muted-foreground' : undefined
              )}
            >
              {formatCurrency(solde)}
            </span>
          );
        },
      },
      {
        id: 'date',
        header: 'Date',
        render: (reservation) => formatDate(reservation.dateReservation),
      },
      {
        id: 'expiration',
        header: 'Expiration',
        render: (reservation) => (reservation.dateExpiration ? formatDate(reservation.dateExpiration) : '-'),
      },
      {
        id: 'statut',
        header: 'Statut',
        render: (reservation) => getStatutBadge(reservation.statut),
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cellClassName: 'text-right w-[70px]',
        render: (reservation) => {
          const solde = calculerSolde(reservation);
          const canEdit = canEditReservation(reservation.statut);
          const canCreateEngagement = canCreateReservationEngagement(reservation.statut);
          const canCancel = canCancelReservation(reservation.statut);

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewDetails && (
                  <DropdownMenuItem onClick={() => onViewDetails(reservation.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Voir les détails
                  </DropdownMenuItem>
                )}

                {canEdit && onEdit && (
                  <SiPermission permission="reservations.modifier">
                  <DropdownMenuItem onClick={() => onEdit(reservation.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  </SiPermission>
                )}

                {canCreateEngagement && onCreerEngagement && (
                  <SiPermission permission="engagements.creer">
                  <DropdownMenuItem onClick={() => onCreerEngagement(reservation.id)} disabled={solde === 0}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Créer un engagement
                  </DropdownMenuItem>
                  </SiPermission>
                )}

                {canCancel && onAnnuler && (
                  <>
                    <DropdownMenuSeparator />
                    <SiPermission permission="reservations.annuler">
                    <DropdownMenuItem onClick={() => onAnnuler(reservation.id)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuler
                    </DropdownMenuItem>
                    </SiPermission>
                  </>
                )}

                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <SiSuperAdmin>
                    <DropdownMenuItem onClick={() => onDelete(reservation.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                    </SiSuperAdmin>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        },
      ];

      if (selection) {
        const selectionColumn = buildSelectionColumn<ReservationCredit>({
          selection,
          getId: (reservation) => reservation.id,
          getLabel: (reservation) => `Sélectionner ${reservation.numero}`,
          allLabel: 'Sélectionner toutes les réservations',
        });

        return [
          selectionColumn,
          ...baseColumns,
        ];
      }

      return baseColumns;
    },
    [onAnnuler, onCreerEngagement, onDelete, onEdit, onViewDetails, selection]
  );

  return (
    <ListTable
      items={reservations}
      columns={columns}
      getRowId={(reservation) => reservation.id}
      onRowDoubleClick={(reservation) => onViewDetails?.(reservation.id)}
      emptyMessage="Aucune réservation"
      stickyHeader={stickyHeader}
      stickyHeaderOffset={stickyHeaderOffset}
      scrollContainerClassName={scrollContainerClassName}
      footer={footer}
    />
  );
};
