import { useCallback } from 'react';

/**
 * Hook pour gérer les handlers de snapshot de manière cohérente.
 * 
 * RÈGLE D'OR: Les handlers de snapshot ne doivent JAMAIS fermer le snapshot.
 * Le snapshot reste visible pendant l'édition/création pour que l'utilisateur
 * puisse consulter les informations pendant qu'il remplit le formulaire.
 * 
 * Le dialogue et le snapshot coexistent grâce à leur z-index respectif.
 * 
 * @example
 * const handlers = useSnapshotHandlers({
 *   onEdit: (item) => handleEdit(item.id),
 *   onValidate: (id) => validateItem(id),
 * });
 */
export const useSnapshotHandlers = <TItem = any>(config: {
  onEdit?: (item: TItem) => void;
  onDelete?: (id: string) => void;
  onValidate?: (id: string) => void;
  onCreate?: (sourceItem: TItem) => void;
  onCancel?: (id: string, reason?: string) => void;
  [key: string]: any;
}) => {
  const wrappedHandlers = Object.keys(config).reduce((acc, key) => {
    const handler = config[key];
    if (typeof handler === 'function') {
      acc[key] = useCallback((...args: any[]) => {
        handler(...args);
        // IMPORTANT: Le snapshot reste ouvert intentionnellement
        // pour permettre à l'utilisateur de consulter les informations
        // pendant l'édition/création dans le dialogue
      }, [handler]);
    } else {
      acc[key] = handler;
    }
    return acc;
  }, {} as Record<string, any>);

  return wrappedHandlers;
};
