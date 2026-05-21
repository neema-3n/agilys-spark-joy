import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowRightLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export type ListColumn<T> = {
  id: string;
  header: ReactNode;
  className?: string;
  cellClassName?: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T) => ReactNode;
};

interface ListTableProps<T> {
  items: T[];
  columns: ListColumn<T>[];
  getRowId: (item: T) => string;
  onRowDoubleClick?: (item: T) => void;
  emptyMessage?: string;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
  scrollContainerClassName?: string;
  footer?: ReactNode;
}

const getAlignClass = (align?: ListColumn<unknown>['align']) => {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return '';
};

export const ListTable = <T,>({
  items,
  columns,
  getRowId,
  onRowDoubleClick,
  emptyMessage = 'Aucun élément trouvé',
  stickyHeader = false,
  stickyHeaderOffset = 0,
  scrollContainerClassName,
  footer,
}: ListTableProps<T>) => {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateScrollState = () => {
      const overflow = element.scrollWidth > element.clientWidth + 1;
      const right = element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
      setHasHorizontalOverflow(overflow);
      setCanScrollRight(overflow && right);
    };

    updateScrollState();
    element.addEventListener('scroll', updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);
    Array.from(element.children).forEach((child) => resizeObserver.observe(child));

    return () => {
      element.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [items, columns]);

  return (
    <div className="rounded-md border">
      {isMobile && hasHorizontalOverflow && (
        <div className="flex items-center gap-2 border-b bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
          <span>Balayez horizontalement pour voir toutes les colonnes.</span>
        </div>
      )}
      <div ref={scrollRef} className={cn('relative overflow-auto', scrollContainerClassName)}>
        {isMobile && canScrollRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-background via-background/90 to-transparent" />
        )}
        <Table className="min-w-full border-separate border-spacing-0" noWrapper>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    'h-10 px-3 text-[11px] sm:h-12 sm:px-4 sm:text-xs',
                    column.className,
                    getAlignClass(column.align),
                    stickyHeader &&
                      'sticky top-[var(--sticky-offset,0px)] z-30 bg-background shadow-sm border-b'
                  )}
                  style={
                    stickyHeader
                      ? ({ '--sticky-offset': `${stickyHeaderOffset}px` } as React.CSSProperties)
                      : undefined
                  }
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={getRowId(item)}
                  onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(item) : undefined}
                  className={cn(
                    onRowDoubleClick && 'cursor-pointer hover:bg-muted/30 transition-colors'
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        'px-3 py-3 text-[13px] sm:p-4 sm:text-sm',
                        column.cellClassName,
                        getAlignClass(column.align)
                      )}
                    >
                      {column.render(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {footer && (
          <div className="border-t bg-muted/20 px-3 py-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
