import { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

interface ListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  mobileSearchPlaceholder?: string;
  filters?: ReactNode[];
  rightSlot?: ReactNode;
}

export const ListToolbar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  mobileSearchPlaceholder = 'Rechercher...',
  filters = [],
  rightSlot,
}: ListToolbarProps) => {
  const isMobile = useIsMobile();
  const effectivePlaceholder = isMobile ? mobileSearchPlaceholder : searchPlaceholder;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={effectivePlaceholder}
          className="bg-background pl-10 pr-10"
          aria-label="Rechercher dans la liste"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:flex-nowrap md:overflow-visible md:pb-0">
        {filters.map((filter, index) => (
          <div key={index} className="flex-shrink-0 whitespace-nowrap">
            {filter}
          </div>
        ))}
        {rightSlot && <div className="flex-shrink-0 whitespace-nowrap">{rightSlot}</div>}
      </div>
    </div>
  );
};
