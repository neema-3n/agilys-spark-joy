import { ReactNode } from 'react';
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
}: ListTableProps<T>) => {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={cn(stickyHeader && '[&_tr]:sticky [&_tr]:top-0 [&_tr]:z-10 [&_tr]:bg-background')}>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(column.className, getAlignClass(column.align))}
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
      </div>
    </div>
  );
};
