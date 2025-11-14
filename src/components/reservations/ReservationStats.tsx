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
    montantUtilise: reservations
      .filter(r => r.statut === 'utilisee')
      .reduce((sum, r) => sum + r.montant, 0),
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
          <CardTitle className="text-sm font-medium">Montant Actif</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.montantActif)}</div>
          <p className="text-xs text-muted-foreground">
            FCFA en réservation active
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Montant Utilisé</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.montantUtilise)}</div>
          <p className="text-xs text-muted-foreground">
            FCFA consommés
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
