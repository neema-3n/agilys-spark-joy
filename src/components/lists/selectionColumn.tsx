import { Checkbox } from '@/components/ui/checkbox';
import { ListColumn } from './ListTable';

export interface ListSelectionHandlers {
  selectedIds: Set<string>;
  allSelected: boolean;
  toggleOne: (id: string, checked: boolean) => void;
  toggleAll: (checked: boolean) => void;
}

interface BuildSelectionColumnParams<T extends { id: string }> {
  selection: ListSelectionHandlers;
  getId?: (item: T) => string;
  getLabel?: (item: T) => string;
  allLabel?: string;
  widthClassName?: string;
}

export const buildSelectionColumn = <T extends { id: string }>({
  selection,
  getId = (item) => item.id,
  getLabel,
  allLabel = 'Sélectionner toutes les lignes',
  widthClassName = 'w-[48px]',
}: BuildSelectionColumnParams<T>): ListColumn<T> => {
  const { selectedIds, allSelected, toggleOne, toggleAll } = selection;

  return {
    id: 'select',
    header: (
      <Checkbox
        checked={allSelected}
        onCheckedChange={(checked) => toggleAll(Boolean(checked))}
        aria-label={allLabel}
      />
    ),
    cellClassName: widthClassName,
    render: (item) => {
      const itemId = getId(item);
      const label = getLabel ? getLabel(item) : `Sélectionner ${itemId}`;
      return (
        <Checkbox
          checked={selectedIds.has(itemId)}
          onCheckedChange={(checked) => toggleOne(itemId, Boolean(checked))}
          aria-label={label}
        />
      );
    },
  };
};
