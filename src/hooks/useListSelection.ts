import { useCallback, useEffect, useMemo, useState } from 'react';

export const useListSelection = (ids: string[]) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const idsSet = useMemo(() => new Set(ids), [ids]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const filtered = new Set(Array.from(prev).filter((id) => idsSet.has(id)));
      return filtered.size === prev.size ? prev : filtered;
    });
  }, [idsSet]);

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelectedIds(new Set());
        return;
      }
      setSelectedIds(new Set(ids));
    },
    [ids]
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const allSelected = useMemo(
    () => ids.length > 0 && ids.every((id) => selectedIds.has(id)),
    [ids, selectedIds]
  );

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedArray,
    allSelected,
    toggleOne,
    toggleAll,
    clearSelection,
  };
};
