import { useMutation, useQuery } from '@tanstack/react-query';
import { dossierDepenseUnifieService } from '@/services/api/dossier-depense-unifie.service';
import type { DossierDepenseExportFormat, DossierDepenseFilters } from '@/types/dossier-depense-unifie.types';

export const useDossierDepenseUnifie = (depenseId: string, filters: DossierDepenseFilters) => {
  const dossierQuery = useQuery({
    queryKey: ['dossier-depense-unifie', depenseId, filters],
    queryFn: () => dossierDepenseUnifieService.getDossier(depenseId, filters),
    enabled: Boolean(depenseId.trim())
  });

  const exportMutation = useMutation({
    mutationFn: (format: DossierDepenseExportFormat) => dossierDepenseUnifieService.exportDossier(depenseId, format, filters)
  });

  return {
    dossier: dossierQuery.data,
    isLoading: dossierQuery.isLoading,
    error: dossierQuery.error,
    refetch: dossierQuery.refetch,
    exportDossier: exportMutation.mutateAsync,
    isExporting: exportMutation.isPending,
    exportError: exportMutation.error
  };
};
