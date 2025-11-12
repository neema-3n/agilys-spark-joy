import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { ReservationCredit } from '@/types/reservation.types';

interface ReservationStatsProps {
  reservations: ReservationCredit[];
}

export const ReservationStats = ({ reservations }: ReservationStatsProps) => {
  const stats = {
    totalActives: reservations.filter(r => r.statut === 'active').length,
    montantActif: reservations
      .filter(r => r.statut === 'active')
      .reduce((sum, r) => sum + r.montant, 0),
    totalUtilisees: reservations.filter(r => r.statut === 'utilisee').length,
    totalAnnulees: reservations.filter(r => r.statut === 'annulee').length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Réservations Actives</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalActives}</div>
          <p className="text-xs text-muted-foreground">
            En cours de validité
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Montant Réservé</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.montantActif)}</div>
          <p className="text-xs text-muted-foreground">
            FCFA en réservation
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Réservations Utilisées</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUtilisees}</div>
          <p className="text-xs text-muted-foreground">
            Crédits consommés
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Réservations Annulées</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAnnulees}</div>
          <p className="text-xs text-muted-foreground">
            Réservations abandonnées
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
