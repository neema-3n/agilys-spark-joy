import { useSearchParams } from 'react-router-dom';

/**
 * Statut demandé par l'adresse, pour ouvrir une liste déjà filtrée.
 *
 * La cloche annonce « 11 factures à valider » : le lien doit conduire à ces
 * onze-là, pas à la liste entière où il faudrait les retrouver. Le statut
 * voyage donc dans l'adresse, ce qui rend aussi le lien partageable.
 *
 * Une valeur inconnue est ignorée plutôt que subie : l'adresse vient de
 * l'extérieur, elle ne décide pas de l'état interne de la page.
 */
export const useStatutInitial = <T extends string>(valeurs: readonly T[], defaut: T): T => {
  const [parametres] = useSearchParams();
  const demande = parametres.get('statut');
  return valeurs.includes(demande as T) ? (demande as T) : defaut;
};
