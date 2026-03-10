import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { reportingAnalytiqueService } from '@/services/api/reporting-analytique.service';
import type {
  ReportingAnalytiqueExportFormat,
  ReportingAnalytiqueFilters,
  ReportingAnalytiqueView
} from '@/types/reporting-analytique.types';

interface PendingExport {
  exportId: string;
  fallbackFilename: string;
}

const buildFallbackFilename = (view: ReportingAnalytiqueView, format: ReportingAnalytiqueExportFormat): string =>
  `reporting-analytique-${view}.${format}`;

export const useReportingAnalytique = (filters: ReportingAnalytiqueFilters | null) => {
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

  const reportQuery = useQuery({
    queryKey: ['reporting-analytique', filters],
    queryFn: async () => {
      const activeFilters = filters as ReportingAnalytiqueFilters;
      const [tableau, dashboard] = await Promise.all([
        reportingAnalytiqueService.getTableauCroise(activeFilters),
        reportingAnalytiqueService.getDashboard(activeFilters)
      ]);

      return { tableau, dashboard };
    },
    enabled: Boolean(filters?.exerciceId && filters?.periode)
  });

  const startExportMutation = useMutation({
    mutationFn: async ({ view, format }: { view: ReportingAnalytiqueView; format: ReportingAnalytiqueExportFormat }) => {
      if (!filters) {
        throw new Error('Filtres manquants');
      }

      const result = await reportingAnalytiqueService.startExport({
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
    queryKey: ['reporting-analytique-export-status', pendingExport?.exportId],
    queryFn: () => reportingAnalytiqueService.getExportStatus(pendingExport!.exportId),
    enabled: Boolean(pendingExport?.exportId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'completed' ? false : 1000;
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

    void reportingAnalytiqueService
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
    tableau: reportQuery.data?.tableau,
    dashboard: reportQuery.data?.dashboard,
    isLoading: reportQuery.isLoading,
    error: reportQuery.error,
    refetch: reportQuery.refetch,
    launchExport: startExportMutation.mutateAsync,
    isExporting: startExportMutation.isPending || exportStatusQuery.isFetching,
    exportState,
    exportError: startExportMutation.error || exportStatusQuery.error || null
  };
};
