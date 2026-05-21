import { ChevronLeft, ChevronRight, Loader2, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  isFetching?: boolean;
  itemLabel: string;
  showKeyboardHint?: boolean;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  isFetching = false,
  itemLabel,
  showKeyboardHint = true,
}: PaginationControlsProps) {
  const isMobile = useIsMobile();
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  // Générer les numéros de pages avec ellipsis
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Afficher toutes les pages si peu nombreuses
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Toujours afficher la première page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Pages autour de la page courante
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Toujours afficher la dernière page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = isMobile ? [currentPage] : getPageNumbers();

  if (totalCount === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
        Aucun élément à afficher
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
          {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>
            Affichage <span className="font-medium text-foreground">{startIndex}-{endIndex}</span> sur{' '}
            <span className="font-medium text-foreground">{totalCount}</span> {itemLabel}
          </span>
        </div>

        <div className="order-3 flex w-full justify-center sm:order-none sm:flex-1">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="gap-1 px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              {!isMobile && 'Précédent'}
            </Button>

            {pageNumbers.map((page, idx) => {
              if (page === 'ellipsis') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-muted-foreground text-sm">
                    ...
                  </span>
                );
              }

              return (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  disabled={isLoading}
                  className={cn(
                    'min-w-[38px] px-3',
                    page === currentPage && 'pointer-events-none'
                  )}
                >
                  {page}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="gap-1 px-3"
            >
              {!isMobile && 'Suivant'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground sm:gap-2 sm:text-sm">
          <span>Afficher</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(parseInt(value, 10))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[68px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className={cn(isMobile && 'sr-only')}>par page</span>
        </div>
      </div>

      {showKeyboardHint && !isMobile && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Keyboard className="h-3 w-3" />
          <span>
            Utilisez <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">←</kbd> et{' '}
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">→</kbd> pour naviguer
          </span>
        </div>
      )}
    </div>
  );
}
