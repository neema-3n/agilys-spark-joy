import { httpClient } from '@/services/api/http-client';
import { requestJson } from '@/services/api/api-utils';
import type { DossierDepenseExportFormat, DossierDepenseFilters, DossierDepenseResponse } from '@/types/dossier-depense-unifie.types';

const toQueryString = (filters: DossierDepenseFilters): string => {
  const query = new URLSearchParams();

  if (filters.exerciceId) {
    query.set('exerciceId', filters.exerciceId);
  }

  if (filters.dateDebut) {
    query.set('dateDebut', filters.dateDebut);
  }

  if (filters.dateFin) {
    query.set('dateFin', filters.dateFin);
  }

  if (filters.detailLevel) {
    query.set('detailLevel', filters.detailLevel);
  }

  return query.toString();
};

export const dossierDepenseUnifieService = {
  async getDossier(depenseId: string, filters: DossierDepenseFilters): Promise<DossierDepenseResponse> {
    const query = toQueryString(filters);
    const suffix = query ? `?${query}` : '';

    return requestJson<DossierDepenseResponse>(
      `/dossier-depense-unifie/${encodeURIComponent(depenseId)}${suffix}`,
      { method: 'GET' },
      'Erreur lors du chargement du dossier de depense unifie'
    );
  },

  async exportDossier(depenseId: string, format: DossierDepenseExportFormat, filters: DossierDepenseFilters): Promise<void> {
    const query = toQueryString(filters);
    const exportQuery = query ? `${query}&format=${encodeURIComponent(format)}` : `format=${encodeURIComponent(format)}`;

    const response = await httpClient.request(
      `/dossier-depense-unifie/${encodeURIComponent(depenseId)}/export?${exportQuery}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error('Erreur lors de l export du dossier de depense');
    }

    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] || `dossier-depense-${depenseId}.${format}`;

    link.href = href;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(href);
  }
};
