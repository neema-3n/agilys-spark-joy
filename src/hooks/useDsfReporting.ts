import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dsfReportingService } from '@/services/api/dsf-reporting.service';
import type { DsfExportFormat, DsfReportingFilters } from '@/types/dsf-reporting.types';

interface PendingExport {
  exportId: string;
  fallbackFilename: string;
}

const buildFallbackFilename = (format: DsfExportFormat): string => `dsf-reporting.${format}`;

export const useDsfReporting = (filters: DsfReportingFilters | null) => {
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

  const validationQuery = useQuery({
    queryKey: ['dsf-reporting-validation', filters],
    queryFn: () => dsfReportingService.validate(filters as DsfReportingFilters),
    enabled: Boolean(filters?.exerciceId && filters?.referentielVersion)
  });

  const startExportMutation = useMutation({
    mutationFn: async ({ format }: { format: DsfExportFormat }) => {
      if (!filters) {
        throw new Error('Filtres DSF manquants');
      }

      if (validationQuery.data?.status !== 'conforme') {
        throw new Error('Export DSF indisponible tant que des erreurs bloquantes persistent.');
      }

      const result = await dsfReportingService.startExport({
        ...filters,
        format
      });

      setPendingExport({
        exportId: result.exportId,
        fallbackFilename: buildFallbackFilename(format)
      });

      return result;
    }
  });

  const exportStatusQuery = useQuery({
    queryKey: ['dsf-reporting-export-status', pendingExport?.exportId],
    queryFn: () => dsfReportingService.getExportStatus(pendingExport!.exportId),
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

    void dsfReportingService.downloadExport(status.downloadUrl, pendingExport.fallbackFilename).finally(() => {
      setPendingExport(null);
    });
  }, [exportStatusQuery.data, pendingExport]);

  const exportState = useMemo(() => {
    if (startExportMutation.isPending) {
      return 'pending';
    }

    return exportStatusQuery.data?.status ?? null;
  }, [startExportMutation.isPending, exportStatusQuery.data?.status]);

  return {
    validation: validationQuery.data,
    isValidationLoading: validationQuery.isLoading,
    validationError: validationQuery.error,
    refreshValidation: validationQuery.refetch,
    launchExport: startExportMutation.mutateAsync,
    isExporting: startExportMutation.isPending || exportStatusQuery.isFetching,
    exportState,
    exportStatus: exportStatusQuery.data,
    exportError: startExportMutation.error || exportStatusQuery.error || null
  };
};
