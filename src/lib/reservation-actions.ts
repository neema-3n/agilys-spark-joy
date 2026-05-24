import type { ReservationCredit } from '@/types/reservation.types';

export const canEditReservation = (statut: ReservationCredit['statut']) =>
  statut === 'brouillon' || statut === 'active';

export const canCreateReservationEngagement = (statut: ReservationCredit['statut']) =>
  statut === 'active';

export const canCancelReservation = (statut: ReservationCredit['statut']) =>
  statut === 'active' || statut === 'convertie';
