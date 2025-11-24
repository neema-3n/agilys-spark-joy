import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  return (
    <div className="rounded-md border">
      <div className={cn('overflow-auto', scrollContainerClassName)}>
        <Table className="min-w-full border-separate border-spacing-0" noWrapper>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
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
                      className={cn(column.cellClassName, getAlignClass(column.align))}
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
          <div className="border-t bg-muted/20 px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
