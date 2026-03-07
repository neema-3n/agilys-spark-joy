import { ListLayout } from '@/components/lists/ListLayout';
import { ListTable, type ListColumn } from '@/components/lists/ListTable';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { PaginationControls } from '@/components/lists/PaginationControls';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TresorerieRiskBadge } from '@/components/tresorerie/TresorerieRiskBadge';
import { formatCurrency } from '@/lib/utils';
import type {
  PaginatedTresorerieAudit,
  TresorerieAuditEntry,
  TresorerieAuditFilters,
  TresorerieAuditStatus,
} from '@/types/tresorerie.types';

const statusLabel: Record<TresorerieAuditStatus, string> = {
  blocked: 'Bloquée',
  'exception-requested': 'Exception demandée',
  'exception-approved': 'Exception approuvée',
  'exception-expired': 'Exception expirée',
  'executed-under-exception': 'Exécutée sous exception',
};

interface ExceptionAuditTableProps {
  data?: PaginatedTresorerieAudit;
  isLoading: boolean;
  isFetching: boolean;
  filters: TresorerieAuditFilters;
  onFiltersChange: (next: TresorerieAuditFilters) => void;
  onSelect: (entry: TresorerieAuditEntry) => void;
}

const columns: ListColumn<TresorerieAuditEntry>[] = [
  {
    id: 'status',
    header: 'Statut',
    render: (item) => <Badge variant="secondary">{statusLabel[item.status]}</Badge>,
  },
  {
    id: 'severity',
    header: 'Risque',
    render: (item) => <TresorerieRiskBadge severity={item.severity} />,
  },
  {
    id: 'transition',
    header: 'Transition',
    render: (item) => <span className="font-medium">{item.transition}</span>,
  },
  {
    id: 'motif',
    header: 'Motif',
    render: (item) => <span className="line-clamp-1">{item.motif}</span>,
  },
  {
    id: 'approvers',
    header: 'Approbateurs',
    align: 'center',
    render: (item) => <span>{item.approvers.length}</span>,
  },
  {
    id: 'gap',
    header: 'Gap projeté',
    align: 'right',
    render: (item) => <span className="tabular-nums">{formatCurrency(item.snapshot.projectedGap)}</span>,
  },
  {
    id: 'date',
    header: 'Horodatage',
    render: (item) => new Date(item.createdAt).toLocaleString('fr-FR'),
  },
];

export const ExceptionAuditTable = ({
  data,
  isLoading,
  isFetching,
  filters,
  onFiltersChange,
  onSelect,
}: ExceptionAuditTableProps) => {
  const items = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    total: 0,
    totalPages: 1,
  };

  return (
    <ListLayout
      title="Audit des exceptions cash-risk"
      description="Lecture seule des transitions risquées et décisions d’exception."
      toolbar={
        <ListToolbar
          searchValue={filters.sourceId ?? ''}
          onSearchChange={(value) => onFiltersChange({ ...filters, sourceId: value || undefined, page: 1 })}
          searchPlaceholder="Filtrer par sourceId"
          filters={[
            <Select
              key="status"
              value={filters.status ?? 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  status: value === 'all' ? undefined : (value as TresorerieAuditStatus),
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="blocked">Bloquée</SelectItem>
                <SelectItem value="exception-requested">Exception demandée</SelectItem>
                <SelectItem value="exception-approved">Exception approuvée</SelectItem>
                <SelectItem value="exception-expired">Exception expirée</SelectItem>
                <SelectItem value="executed-under-exception">Exécutée sous exception</SelectItem>
              </SelectContent>
            </Select>,
            <Select
              key="severity"
              value={filters.severity ?? 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  severity: value === 'all' ? undefined : (value as TresorerieAuditFilters['severity']),
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sévérité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
                <SelectItem value="high">Élevée</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="low">Faible</SelectItem>
              </SelectContent>
            </Select>,
            <Select
              key="transition"
              value={filters.transition ?? 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  transition: value === 'all' ? undefined : value,
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Transition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes transitions</SelectItem>
                <SelectItem value="engagement:create">engagement:create</SelectItem>
                <SelectItem value="engagement:validate">engagement:validate</SelectItem>
                <SelectItem value="paiement:execute">paiement:execute</SelectItem>
                <SelectItem value="paiement:reprendre">paiement:reprendre</SelectItem>
                <SelectItem value="depense:ordonnancer">depense:ordonnancer</SelectItem>
              </SelectContent>
            </Select>,
            <Input
              key="fromDate"
              type="date"
              value={filters.fromDate ?? ''}
              onChange={(event) => onFiltersChange({ ...filters, fromDate: event.target.value || undefined, page: 1 })}
              className="w-[170px]"
              aria-label="Filtrer depuis la date"
            />,
            <Input
              key="toDate"
              type="date"
              value={filters.toDate ?? ''}
              onChange={(event) => onFiltersChange({ ...filters, toDate: event.target.value || undefined, page: 1 })}
              className="w-[170px]"
              aria-label="Filtrer jusqu'à la date"
            />,
          ]}
        />
      }
      footer={
        <PaginationControls
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={(page) => onFiltersChange({ ...filters, page })}
          onPageSizeChange={(pageSize) => onFiltersChange({ ...filters, pageSize, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
          itemLabel="entrées"
          showKeyboardHint={false}
        />
      }
    >
      <ListTable
        items={items}
        columns={columns}
        getRowId={(item) => item.id}
        onRowClick={onSelect}
        onRowDoubleClick={onSelect}
        emptyMessage="Aucune entrée d’audit trouvée."
      />
    </ListLayout>
  );
};
