import { ReactNode, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SnapshotBaseProps {
  title: string;
  subtitle?: string;
  statusBadge?: ReactNode;
  currentIndex: number;
  totalCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  actions?: ReactNode;
  children: ReactNode;
}

export const SnapshotBase = ({
  title,
  subtitle,
  statusBadge,
  currentIndex,
  totalCount,
  hasPrev,
  hasNext,
  onClose,
  onNavigate,
  actions,
  children,
}: SnapshotBaseProps) => {
  // Scroll en haut à l'ouverture
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [title]); // Re-scroll quand on change de snapshot

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
        <div className="py-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="mb-2 h-1 w-10 rounded-full bg-primary" />
                <div className="flex items-start gap-3">
                  <h2 className="min-w-0 truncate text-[28px] font-semibold leading-9">{title}</h2>
                  {statusBadge && <div className="mt-1 flex-shrink-0">{statusBadge}</div>}
                </div>
                {subtitle && (
                  <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  Élément {currentIndex + 1} sur {totalCount}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('prev')}
                  disabled={!hasPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('next')}
                  disabled={!hasNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {actions && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="py-6">
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};
