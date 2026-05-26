import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatMontant } from '@/lib/utils';
import type { ReportColumnDefinition, ReportRow } from '@/types/reporting';

interface ReportingTableProps {
  columns: ReportColumnDefinition[];
  rows: ReportRow[];
  totalsEnabled?: boolean;
}

const formatCellValue = (value: string | number | null | undefined, kind?: ReportColumnDefinition['kind']) => {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'number') {
    if (kind === 'currency') return formatMontant(value);
    if (kind === 'percent') return `${value.toFixed(1)} %`;
    if (kind === 'number') return value.toLocaleString('fr-FR');
  }

  if (kind === 'date' && typeof value === 'string') {
    return value;
  }

  return String(value);
};

const statusVariant = (status: string) => {
  const normalized = status.toLowerCase();
  if (['ok', 'valide', 'validee', 'payee', 'soldee', 'rapprochee'].includes(normalized)) {
    return 'default';
  }
  if (['alerte', 'en_cours', 'brouillon', 'partielle', 'partiellement'].includes(normalized)) {
    return 'secondary';
  }
  return 'destructive';
};

export const ReportingTable = ({ columns, rows, totalsEnabled = true }: ReportingTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [currentPage, pageSize, rows]);

  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    columns.forEach((column) => {
      if (!['currency', 'number'].includes(column.kind || '')) return;
      result[column.id] = rows.reduce((sum, row) => {
        const value = row.cells[column.id];
        return typeof value === 'number' ? sum + value : sum;
      }, 0);
    });
    return result;
  }, [columns, rows]);

  const firstIndex = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastIndex = Math.min(currentPage * pageSize, rows.length);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="overflow-auto">
          <Table className="min-w-full border-separate border-spacing-0" noWrapper>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      'sticky top-0 z-10 h-11 border-b border-blue-200 bg-blue-100/80 px-4 text-xs font-bold text-slate-900',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                    Aucune donnée disponible pour ce rapport.
                  </TableCell>
                </TableRow>
              ) : (
                currentRows.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((column) => {
                      const rawValue = row.cells[column.id];
                      const formattedValue = formatCellValue(rawValue, column.kind);
                      const isNegativeCurrency =
                        column.kind === 'currency' && typeof rawValue === 'number' && rawValue < 0;

                      return (
                        <TableCell
                          key={column.id}
                          className={cn(
                            'px-4 py-3 text-sm',
                            column.align === 'right' && 'text-right',
                            column.align === 'center' && 'text-center',
                            isNegativeCurrency && 'font-medium text-destructive',
                          )}
                        >
                          {column.kind === 'status' && typeof rawValue === 'string' ? (
                            <Badge variant={statusVariant(rawValue)}>{formattedValue}</Badge>
                          ) : (
                            formattedValue
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
            {totalsEnabled && rows.length > 0 && (
              <tfoot>
                <tr className="border-t bg-slate-50">
                  {columns.map((column, index) => {
                    const value = totals[column.id];
                    return (
                      <td
                        key={column.id}
                        className={cn(
                          'border-t px-4 py-3 text-sm font-semibold',
                          column.align === 'right' && 'text-right',
                          column.align === 'center' && 'text-center',
                        )}
                      >
                        {index === 0 ? 'Totaux' : value !== undefined ? formatCellValue(value, column.kind) : '—'}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Affichage {firstIndex} à {lastIndex} sur {rows.length} entrées
        </p>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Lignes par page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[88px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex min-w-[36px] items-center justify-center rounded-md border px-3 py-2 text-sm font-medium">
              {currentPage}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
