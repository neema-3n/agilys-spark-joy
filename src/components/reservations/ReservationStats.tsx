import { StatsCard } from '@/components/ui/stats-card';
import { DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { ReservationCredit } from '@/types/reservation.types';
import { formatMontant } from '@/lib/utils';

interface ReservationStatsProps {
  reservations: ReservationCredit[];
}

export const ReservationStats = ({ reservations }: ReservationStatsProps) => {
  const stats = {
    totalActives: reservations.filter(r => r.statut === 'active').length,
    montantActif: reservations
      .filter(r => r.statut === 'active')
      .reduce((sum, r) => sum + r.montant, 0),
    montantUtilise: reservations.reduce((sum, r) => {
      // Calculer le montant réellement utilisé via les engagements liés
      const montantEngagements = r.engagements
        ?.filter(e => e.statut !== 'annule')
        .reduce((engSum, e) => engSum + Number(e.montant), 0) || 0;
      return sum + montantEngagements;
    }, 0),
    totalAnnulees: reservations.filter(r => r.statut === 'annulee').length,
  };

  const formatCurrency = formatMontant;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatsCard
        title="Réservations Actives"
        value={stats.totalActives.toString()}
        icon={Clock}
        color="text-blue-700"
        borderTintClassName="border-blue-200/90"
        iconBgClassName="bg-blue-100/80"
        trend="En cours de validité"
      />
      <StatsCard
        title="Montant Actif"
        value={formatCurrency(stats.montantActif)}
        icon={DollarSign}
        showCurrencyCode
        color="text-cyan-700"
        borderTintClassName="border-cyan-200/90"
        iconBgClassName="bg-cyan-100/80"
        trend="En réservation active"
        trendUp={true}
      />
      <StatsCard
        title="Montant Utilisé"
        value={formatCurrency(stats.montantUtilise)}
        icon={CheckCircle}
        showCurrencyCode
        color="text-emerald-700"
        borderTintClassName="border-emerald-200/90"
        iconBgClassName="bg-emerald-100/80"
        trend="Consommés"
        trendUp={true}
      />
      <StatsCard
        title="Réservations Annulées"
        value={stats.totalAnnulees.toString()}
        icon={XCircle}
        color="text-rose-700"
        borderTintClassName="border-rose-200/90"
        iconBgClassName="bg-rose-100/80"
        trend="Réservations abandonnées"
      />
    </div>
  );
};
