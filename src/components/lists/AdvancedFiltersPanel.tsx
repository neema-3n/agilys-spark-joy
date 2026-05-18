import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedFiltersToggleButtonProps {
  open: boolean;
  onToggle: () => void;
  activeCount?: number;
  label?: string;
}

export const AdvancedFiltersToggleButton = ({
  open,
  onToggle,
  activeCount = 0,
  label = 'Filtres avancés',
}: AdvancedFiltersToggleButtonProps) => (
  <Button variant="outline" className="gap-2" onClick={onToggle}>
    {label}
    {activeCount > 0 && (
      <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">
        {activeCount}
      </Badge>
    )}
    <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
  </Button>
);

interface AdvancedFiltersPanelProps {
  open: boolean;
  children: ReactNode;
  onReset?: () => void;
  resetDisabled?: boolean;
}

export const AdvancedFiltersPanel = ({
  open,
  children,
  onReset,
  resetDisabled = false,
}: AdvancedFiltersPanelProps) => {
  if (!open) return null;

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="space-y-4">
        {children}
        {onReset && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onReset} disabled={resetDisabled}>
              Réinitialiser tous les filtres
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
