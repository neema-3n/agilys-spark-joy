import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseSnapshotStateParams<T> {
  items: T[];
  getId: (item: T) => string;
  initialId?: string | null;
  onNavigateToId?: (id: string) => void; // ex: navigate(`/app/entities/${id}`)
  onMissingId?: () => void; // ex: navigate back to list
}

interface UseSnapshotStateResult<T> {
  snapshotId: string | null;
  snapshotItem: T | undefined;
  snapshotIndex: number;
  isSnapshotOpen: boolean;
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
}: UseSnapshotStateParams<T>): UseSnapshotStateResult<T> {
  const [snapshotId, setSnapshotId] = useState<string | null>(initialId || null);

  // Reset si initialId change (ex: changement de paramètre de route)
  useEffect(() => {
    if (initialId && items.length > 0) {
      const exists = items.some(item => getId(item) === initialId);
      if (exists) {
        setSnapshotId(initialId);
      } else {
        setSnapshotId(null);
        onMissingId?.();
      }
    }
    if (!initialId) {
      setSnapshotId(null);
    }
  }, [initialId, items, getId, onMissingId]);

  // Si l'ID courant ne fait plus partie de la liste (refresh, suppression)
  useEffect(() => {
    if (snapshotId && !items.some(item => getId(item) === snapshotId)) {
      setSnapshotId(null);
      onMissingId?.();
    }
  }, [snapshotId, items, getId, onMissingId]);

  const snapshotItem = useMemo(
    () => items.find(item => getId(item) === snapshotId),
    [items, snapshotId, getId]
  );

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

  return {
    snapshotId,
    snapshotItem,
    snapshotIndex,
    isSnapshotOpen: !!(snapshotId && snapshotItem),
    openSnapshot,
    closeSnapshot,
    navigateSnapshot,
  };
}
