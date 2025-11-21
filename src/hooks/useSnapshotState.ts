import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseSnapshotStateParams<T> {
  items: T[];
  getId: (item: T) => string;
  initialId?: string | null;
  onNavigateToId?: (id: string) => void; // ex: navigate(`/app/entities/${id}`)
  onMissingId?: () => void; // ex: navigate back to list
  isLoadingItems?: boolean;
}

interface UseSnapshotStateResult<T> {
  snapshotId: string | null;
  snapshotItem: T | undefined;
  snapshotIndex: number;
  isSnapshotOpen: boolean;
  isSnapshotLoading: boolean;
  openSnapshot: (id: string) => void;
  closeSnapshot: () => void;
  navigateSnapshot: (direction: 'prev' | 'next') => void;
}

/**
 * Mutualise l'état des snapshots pour éviter les duplications par page.
 * - Conserve l'ID sélectionné
 * - Navigation prev/next
 * - Synchronise avec la liste fournie (reset si élément manquant)
 * - Délègue la navigation (URL) à onNavigateToId
 */
export function useSnapshotState<T>({
  items,
  getId,
  initialId = null,
  onNavigateToId,
  onMissingId,
  isLoadingItems = false,
}: UseSnapshotStateParams<T>): UseSnapshotStateResult<T> {
  // on initialise avec initialId pour éviter tout clignotement
  const [snapshotId, setSnapshotId] = useState<string | null>(initialId || null);
  const initialIdRef = useMemo(() => initialId, [initialId]);
  const lastSnapshotItemRef = useRef<T | undefined>(undefined);

  // Reset si initialId change (ex: changement de paramètre de route)
  useEffect(() => {
    // Toujours conserver l'ID de départ, même si la liste n'est pas encore chargée
    if (initialId) {
      setSnapshotId(initialId);
      lastSnapshotItemRef.current = undefined;
    } else {
      setSnapshotId(null);
      lastSnapshotItemRef.current = undefined;
    }
  }, [initialId]);

  // Si l'ID courant ne fait plus partie de la liste (refresh, suppression) une fois les données chargées
  useEffect(() => {
    if (snapshotId && !isLoadingItems && items.length > 0 && !items.some(item => getId(item) === snapshotId)) {
      // Si l'ID vient d'un clic (pas d'initialId), on peut retomber sur la liste
      if (!initialIdRef) {
        setSnapshotId(null);
        onMissingId?.();
      }
    }
  }, [snapshotId, items, getId, onMissingId, isLoadingItems, initialIdRef]);

  const snapshotItem = useMemo(
    () => items.find(item => getId(item) === snapshotId),
    [items, snapshotId, getId]
  );

  // Mémoriser le dernier item trouvé pour cet ID pour éviter les clignotements lors des refetchs
  useEffect(() => {
    if (!snapshotId) {
      lastSnapshotItemRef.current = undefined;
      return;
    }
    if (snapshotItem) {
      lastSnapshotItemRef.current = snapshotItem;
    }
  }, [snapshotId, snapshotItem]);

  const snapshotIndex = useMemo(() => {
    if (!snapshotId) return -1;
    return items.findIndex(item => getId(item) === snapshotId);
  }, [items, snapshotId, getId]);

  const openSnapshot = useCallback(
    (id: string) => {
      setSnapshotId(id);
      onNavigateToId?.(id);
    },
    [onNavigateToId]
  );

  const closeSnapshot = useCallback(() => {
    setSnapshotId(null);
    onNavigateToId?.(''); // laisser la page gérer la redirection vers la liste
  }, [onNavigateToId]);

  const navigateSnapshot = useCallback(
    (direction: 'prev' | 'next') => {
      if (snapshotIndex === -1) return;
      const newIndex = direction === 'prev' ? snapshotIndex - 1 : snapshotIndex + 1;
      if (newIndex >= 0 && newIndex < items.length) {
        const target = items[newIndex];
        const id = getId(target);
        setSnapshotId(id);
        onNavigateToId?.(id);
      }
    },
    [snapshotIndex, items, getId, onNavigateToId]
  );

  const hasItems = items.length > 0;
  const hasCachedItem = !!lastSnapshotItemRef.current;
  // Snapshot en chargement uniquement si aucun item n'a encore été résolu
  const isSnapshotLoading = !!snapshotId && !snapshotItem && !hasCachedItem && (isLoadingItems || !hasItems);

  return {
    snapshotId,
    snapshotItem: snapshotItem || lastSnapshotItemRef.current,
    snapshotIndex,
    isSnapshotOpen: !!snapshotId && (!!snapshotItem || hasCachedItem || isSnapshotLoading),
    isSnapshotLoading,
    openSnapshot,
    closeSnapshot,
    navigateSnapshot,
  };
}
