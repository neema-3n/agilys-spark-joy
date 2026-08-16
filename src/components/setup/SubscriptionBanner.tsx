import { AlertTriangle, CalendarClock } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';
import { cn } from '@/lib/utils';

/** Fenêtre d'alerte avant l'échéance, en jours. */
const SEUIL_ALERTE_JOURS = 15;

const joursRestants = (dateFin: string | null): number | null => {
  if (!dateFin) return null;
  const echeance = new Date(`${dateFin}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((echeance.getTime() - today.getTime()) / 86_400_000);
};

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR');

/**
 * Alerte sur l'échéance de l'abonnement.
 *
 * Sans elle, un utilisateur découvre l'expiration en se heurtant au premier
 * refus d'écriture — au milieu d'une saisie, sans avoir rien vu venir. Le
 * bandeau prévient à l'approche, et explique la situation une fois dépassée.
 */
export const SubscriptionBanner = () => {
  const { currentClient } = useClient();

  if (!currentClient) return null;

  const jours = joursRestants(currentClient.dateFinAbonnement);
  const expire = jours === null || jours < 0;

  if (!expire && (jours ?? 0) > SEUIL_ALERTE_JOURS) return null;

  const message = expire
    ? currentClient.dateFinAbonnement
      ? `Abonnement expiré depuis le ${formatDate(currentClient.dateFinAbonnement)}. Vos données restent consultables et exportables, mais aucune modification n'est possible.`
      : "Aucun abonnement en cours. Vos données restent consultables et exportables, mais aucune modification n'est possible."
    : `${
        currentClient.typeAbonnement === 'trial' ? "Période d'essai" : 'Abonnement'
      } valable jusqu'au ${formatDate(currentClient.dateFinAbonnement!)} — ${
        jours === 0 ? "dernier jour" : `${jours} jour${jours! > 1 ? 's' : ''} restant${jours! > 1 ? 's' : ''}`
      }.`;

  return (
    <div
      className={cn(
        'border-b',
        expire
          ? 'border-destructive/30 bg-destructive/10'
          : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30',
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3 md:px-6">
        {expire ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        ) : (
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
        )}
        <p
          className={cn(
            'text-sm',
            expire ? 'text-destructive' : 'text-amber-900 dark:text-amber-200',
          )}
        >
          {message}
        </p>
      </div>
    </div>
  );
};
