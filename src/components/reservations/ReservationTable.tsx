import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, CheckCircle, XCircle, Trash } from 'lucide-react';
import type { ReservationCredit } from '@/types/reservation.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReservationTableProps {
  reservations: ReservationCredit[];
  onEdit: (reservation: ReservationCredit) => void;
  onCreerEngagement: (reservation: ReservationCredit) => void;
  onAnnuler: (id: string, motif: string) => void;
  onDelete: (id: string) => void;
}

export const ReservationTable = ({
  reservations,
  onEdit,
  onCreerEngagement,
  onAnnuler,
  onDelete,
}: ReservationTableProps) => {
  const calculerSolde = (reservation: ReservationCredit): number => {
    if (!reservation.engagements || reservation.engagements.length === 0) {
      return reservation.montant;
    }
    
    const montantEngage = reservation.engagements
      .filter(e => e.statut !== 'annule')
      .reduce((sum, e) => sum + Number(e.montant), 0);
    
    return Number(reservation.montant) - montantEngage;
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'utilisee':
        return <Badge variant="secondary">Utilisée</Badge>;
      case 'annulee':
        return <Badge variant="destructive">Annulée</Badge>;
      case 'expiree':
        return <Badge variant="warning">Expirée</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  const handleAnnuler = (id: string) => {
    const motif = prompt('Motif d\'annulation:');
    if (motif) {
      onAnnuler(id, motif);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numéro</TableHead>
            <TableHead>Ligne budgétaire</TableHead>
            <TableHead>Objet</TableHead>
            <TableHead>Bénéficiaire</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="text-right">Solde</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground">
                Aucune réservation
              </TableCell>
            </TableRow>
          ) : (
            reservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium">{reservation.numero}</TableCell>
                <TableCell>
                  {reservation.ligneBudgetaire?.libelle || 'N/A'}
                </TableCell>
                <TableCell className="max-w-xs truncate">{reservation.objet}</TableCell>
                <TableCell>
                  {reservation.projet ? (
                    <div>
                      <div className="font-medium">{reservation.projet.nom}</div>
                      <div className="text-xs text-muted-foreground">
                        {reservation.projet.code}
                      </div>
                    </div>
                  ) : (
                    reservation.beneficiaire || '-'
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(reservation.montant)} FCFA
                </TableCell>
                <TableCell className="text-right">
                  {(() => {
                    const solde = calculerSolde(reservation);
                    const isEpuise = solde === 0;
                    const isPartiel = solde < reservation.montant && solde > 0;
                    
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-medium ${isEpuise ? 'text-destructive' : isPartiel ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(solde)} FCFA
                        </span>
                        {isEpuise && (
                          <Badge variant="destructive" className="text-xs">
                            Épuisé
                          </Badge>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell>{formatDate(reservation.dateReservation)}</TableCell>
                <TableCell>
                  {reservation.dateExpiration ? formatDate(reservation.dateExpiration) : '-'}
                </TableCell>
                <TableCell>{getStatutBadge(reservation.statut)}</TableCell>
                <TableCell>
                  {reservation.engagement ? (
                    <Badge variant="outline" className="text-xs">
                      {reservation.engagement.numero}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {reservation.statut === 'active' && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(reservation)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              const solde = calculerSolde(reservation);
                              if (solde > 0) {
                                onCreerEngagement(reservation);
                              }
                            }}
                            disabled={calculerSolde(reservation) === 0}
                            className={calculerSolde(reservation) === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Créer un engagement
                            {calculerSolde(reservation) === 0 && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Solde épuisé
                              </Badge>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAnnuler(reservation.id)}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Annuler
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) {
                            onDelete(reservation.id);
                          }
                        }}
                        className="text-destructive"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
