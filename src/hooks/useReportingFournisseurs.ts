import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { reportingFournisseursService } from '@/services/api/reporting-fournisseurs.service';
import type {
  ReportingFournisseursExportFormat,
  ReportingFournisseursFilters,
  ReportingFournisseursView
} from '@/types/reporting-fournisseurs.types';

interface PendingExport {
  exportId: string;
  fallbackFilename: string;
}

const buildFallbackFilename = (view: ReportingFournisseursView, format: ReportingFournisseursExportFormat): string => {
  return `reporting-fournisseurs-${view}.${format}`;
};

export const useReportingFournisseurs = (filters: ReportingFournisseursFilters | null) => {
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

  const reportQuery = useQuery({
    queryKey: ['reporting-fournisseurs', filters],
    queryFn: async () => {
      const activeFilters = filters as ReportingFournisseursFilters;

      const [dettes, avances] = await Promise.all([
        reportingFournisseursService.getEtatDettesFournisseurs(activeFilters),
        reportingFournisseursService.getEtatAvancesRegularisations(activeFilters)
      ]);

      return { dettes, avances };
    },
    enabled: Boolean(filters?.periode)
  });

  const startExportMutation = useMutation({
    mutationFn: async ({ view, format }: { view: ReportingFournisseursView; format: ReportingFournisseursExportFormat }) => {
      if (!filters) {
        throw new Error('Filtres manquants');
      }

      const result = await reportingFournisseursService.startExport({
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
    queryKey: ['reporting-fournisseurs-export-status', pendingExport?.exportId],
    queryFn: () => reportingFournisseursService.getExportStatus(pendingExport!.exportId),
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

    void reportingFournisseursService
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
    dettes: reportQuery.data?.dettes,
    avances: reportQuery.data?.avances,
    isLoading: reportQuery.isLoading,
    error: reportQuery.error,
    refetch: reportQuery.refetch,
    launchExport: startExportMutation.mutateAsync,
    isExporting: startExportMutation.isPending || exportStatusQuery.isFetching,
    exportState,
    exportError: startExportMutation.error || exportStatusQuery.error || null
  };
};
