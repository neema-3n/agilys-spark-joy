import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { reportingComptableService } from '@/services/api/reporting-comptable.service';
import type {
  ReportingComptableExportFormat,
  ReportingComptableFilters,
  ReportingComptableView
} from '@/types/reporting-comptable.types';

interface PendingExport {
  exportId: string;
  fallbackFilename: string;
}

const buildFallbackFilename = (view: ReportingComptableView, format: ReportingComptableExportFormat): string => {
  return `reporting-comptable-${view}.${format}`;
};

export const useReportingComptable = (filters: ReportingComptableFilters | null) => {
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

  const reportQuery = useQuery({
    queryKey: ['reporting-comptable', filters],
    queryFn: () => reportingComptableService.getReport(filters as ReportingComptableFilters),
    enabled: Boolean(filters?.dateDebut && filters?.dateFin)
  });

  const startExportMutation = useMutation({
    mutationFn: async ({ view, format }: { view: ReportingComptableView; format: ReportingComptableExportFormat }) => {
      if (!filters) {
        throw new Error('Filtres manquants');
      }

      const result = await reportingComptableService.startExport({
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
    queryKey: ['reporting-comptable-export-status', pendingExport?.exportId],
    queryFn: () => reportingComptableService.getExportStatus(pendingExport!.exportId),
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

    void reportingComptableService
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
    report: reportQuery.data,
    isLoading: reportQuery.isLoading,
    error: reportQuery.error,
    refetch: reportQuery.refetch,
    launchExport: startExportMutation.mutateAsync,
    isExporting: startExportMutation.isPending || exportStatusQuery.isFetching,
    exportState,
    exportError: startExportMutation.error || exportStatusQuery.error || null
  };
};
