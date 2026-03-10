import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { reportingExecutionTresorerieService } from '@/services/api/reporting-execution-tresorerie.service';
import type {
  ReportingExecutionTresorerieExportFormat,
  ReportingExecutionTresorerieFilters,
  ReportingExecutionTresorerieView
} from '@/types/reporting-execution-tresorerie.types';

interface PendingExport {
  exportId: string;
  fallbackFilename: string;
}

const buildFallbackFilename = (view: ReportingExecutionTresorerieView, format: ReportingExecutionTresorerieExportFormat): string => {
  return `reporting-execution-tresorerie-${view}.${format}`;
};

export const useReportingExecutionTresorerie = (filters: ReportingExecutionTresorerieFilters | null) => {
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

  const reportQuery = useQuery({
    queryKey: ['reporting-execution-tresorerie', filters],
    queryFn: async () => {
      const activeFilters = filters as ReportingExecutionTresorerieFilters;

      const [execution, tresorerie] = await Promise.all([
        reportingExecutionTresorerieService.getExecutionBudgetaire(activeFilters),
        reportingExecutionTresorerieService.getTresorerie(activeFilters)
      ]);

      return { execution, tresorerie };
    },
    enabled: Boolean(filters?.exerciceId && filters?.periode)
  });

  const startExportMutation = useMutation({
    mutationFn: async ({ view, format }: { view: ReportingExecutionTresorerieView; format: ReportingExecutionTresorerieExportFormat }) => {
      if (!filters) {
        throw new Error('Filtres manquants');
      }

      const result = await reportingExecutionTresorerieService.startExport({
        ...filters,
        view,
        format
      });

      setPendingExport({
        exportId: result.exportId,
        fallbackFilename: buildFallbackFilename(view, format)
      });

      return result;
    }
  });

  const exportStatusQuery = useQuery({
    queryKey: ['reporting-execution-tresorerie-export-status', pendingExport?.exportId],
    queryFn: () => reportingExecutionTresorerieService.getExportStatus(pendingExport!.exportId),
    enabled: Boolean(pendingExport?.exportId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'completed' || status === 'failed' ? false : 1500;
    }
  });

  useEffect(() => {
    const status = exportStatusQuery.data;
    if (!status || !pendingExport) {
      return;
    }

    if (status.status !== 'completed' || !status.downloadUrl) {
      return;
    }

    void reportingExecutionTresorerieService
      .downloadExport(status.downloadUrl, pendingExport.fallbackFilename)
      .finally(() => setPendingExport(null));
  }, [exportStatusQuery.data, pendingExport]);

  const exportState = useMemo(() => {
    if (startExportMutation.isPending) {
      return 'pending';
    }

    return exportStatusQuery.data?.status || null;
  }, [startExportMutation.isPending, exportStatusQuery.data?.status]);

  return {
    execution: reportQuery.data?.execution,
    tresorerie: reportQuery.data?.tresorerie,
    isLoading: reportQuery.isLoading,
    error: reportQuery.error,
    refetch: reportQuery.refetch,
    launchExport: startExportMutation.mutateAsync,
    isExporting: startExportMutation.isPending || exportStatusQuery.isFetching,
    exportState,
    exportError: startExportMutation.error || exportStatusQuery.error || null
  };
};
