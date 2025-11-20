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
  pageHeaderClone: ReactNode;
  scrollProgress: number;
}

export const SnapshotBase = ({
  title,
  subtitle,
  currentIndex,
  totalCount,
  hasPrev,
  hasNext,
  onClose,
  onNavigate,
  actions,
  children,
  pageHeaderClone,
  scrollProgress,
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
      {/* Clone du PageHeader - sera poussé lors du scroll */}
      <div
        style={{
          transform: `translateY(${-(scrollProgress * 100)}px)`,
          opacity: 1 - scrollProgress,
          transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
        }}
      >
        {pageHeaderClone}
      </div>

      {/* En-tête du snapshot - sticky */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Élément {currentIndex + 1} sur {totalCount}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Navigation */}
              <div className="flex items-center gap-1">
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
              </div>

              {/* Actions personnalisées */}
              {actions && (
                <>
                  <div className="h-6 w-px bg-border mx-2" />
                  <div className="flex items-center gap-2 flex-1">
                    {actions}
                  </div>
                </>
              )}

              {/* Bouton fermer */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu du snapshot */}
      <div className="px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};
