import { BadRequestException } from '@nestjs/common';

export type ReservationStatus = 'active' | 'utilisee' | 'annulee' | 'expiree';
export type EngagementStatus = 'brouillon' | 'valide' | 'annule';

const allowedReservationTransitions: Record<'update' | 'utiliser' | 'annuler' | 'create-engagement', ReservationStatus[]> = {
  update: ['active'],
  utiliser: ['active'],
  annuler: ['active', 'utilisee'],
  'create-engagement': ['active']
};

const allowedEngagementTransitions: Record<'update' | 'valider' | 'annuler', EngagementStatus[]> = {
  update: ['brouillon'],
  valider: ['brouillon'],
  annuler: ['brouillon', 'valide']
};

const formatStatuses = (statuses: string[]): string => statuses.map((status) => `"${status}"`).join(', ');

export const assertReservationTransitionAllowed = (
  action: keyof typeof allowedReservationTransitions,
  currentStatus: ReservationStatus
): void => {
  const allowed = allowedReservationTransitions[action];
  if (allowed.includes(currentStatus)) {
    return;
  }

  throw new BadRequestException(
    `Transition interdite pour la réservation (action: ${action}). ` +
      `Statut actuel: "${currentStatus}". Statuts autorisés: ${formatStatuses(allowed)}.`
  );
};

export const assertEngagementTransitionAllowed = (
  action: keyof typeof allowedEngagementTransitions,
  currentStatus: EngagementStatus
): void => {
  const allowed = allowedEngagementTransitions[action];
  if (allowed.includes(currentStatus)) {
    return;
  }

  throw new BadRequestException(
    `Transition interdite pour l'engagement (action: ${action}). ` +
      `Statut actuel: "${currentStatus}". Statuts autorisés: ${formatStatuses(allowed)}.`
  );
};
