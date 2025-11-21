import { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode[];
  rightSlot?: ReactNode;
}

export const ListToolbar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  rightSlot,
}: ListToolbarProps) => {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10"
          aria-label="Rechercher dans la liste"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
        {filters.map((filter, index) => (
          <div key={index} className="flex-shrink-0">
            {filter}
          </div>
        ))}
        {rightSlot && <div className="flex-1 md:flex-none">{rightSlot}</div>}
      </div>
    </div>
  );
};
