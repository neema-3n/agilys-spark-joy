/**
 * Types pour les handlers de snapshot.
 * 
 * RÈGLE: Ces handlers ne doivent JAMAIS fermer le snapshot.
 * Le snapshot reste visible pour que l'utilisateur puisse consulter
 * les informations pendant qu'il interagit avec les dialogues.
 */

/**
 * Handler générique de snapshot.
 * Ne doit jamais appeler de fonction de fermeture du snapshot.
 */
export type SnapshotHandler<TArgs = void> = TArgs extends void
  ? (() => void) | undefined
  : ((args: TArgs) => void) | undefined;

/**
 * Props de base pour tous les composants snapshot.
 * Ces handlers contrôlent la navigation et la fermeture du snapshot.
 */
export interface BaseSnapshotProps {
  /** Ferme le snapshot (via le bouton X ou Escape) */
  onClose: () => void;
  
  /** Navigation entre snapshots (via flèches ou boutons) */
  onNavigate: (direction: 'prev' | 'next') => void;
  
  /** Navigation vers une entité liée (optionnel) */
  onNavigateToEntity?: (type: string, id: string) => void;
  
  /** Indicateurs de pagination */
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
}

/**
 * Props d'actions pour les snapshots.
 * Ces handlers NE DOIVENT PAS fermer le snapshot.
 */
export interface BaseSnapshotActionProps {
  /** Éditer l'élément (ouvre un dialogue, le snapshot reste ouvert) */
  onEdit?: () => void;
  
  /** Supprimer l'élément */
  onDelete?: () => void;
  
  /** Valider l'élément */
  onValidate?: () => void;
  
  /** Annuler l'élément */
  onCancel?: () => void;
}
