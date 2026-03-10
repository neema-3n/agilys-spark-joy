import { httpClient } from '@/services/api/http-client';
import { requestJson } from '@/services/api/api-utils';
import type {
  DsfExportRequest,
  DsfExportStartResponse,
  DsfExportStatusResponse,
  DsfReportingFilters,
  DsfValidationResponse
} from '@/types/dsf-reporting.types';

const toQueryString = (filters: DsfReportingFilters): string => {
  const query = new URLSearchParams();
  query.set('exerciceId', filters.exerciceId);
  query.set('referentielVersion', filters.referentielVersion);

  if (filters.entiteId) {
    query.set('entiteId', filters.entiteId);
  }

  if (typeof filters.includeWarnings === 'boolean') {
    query.set('includeWarnings', String(filters.includeWarnings));
  }

  if (filters.correlationId) {
    query.set('correlationId', filters.correlationId);
  }

  return query.toString();
};

export const dsfReportingService = {
  async validate(filters: DsfReportingFilters): Promise<DsfValidationResponse> {
    const query = toQueryString(filters);

    return requestJson<DsfValidationResponse>(
      `/dsf-reporting/validate?${query}`,
      { method: 'POST' },
      'Erreur lors de la validation DSF'
    );
  },

  async startExport(payload: DsfExportRequest): Promise<DsfExportStartResponse> {
    const query = toQueryString(payload);

    return requestJson<DsfExportStartResponse>(
      `/dsf-reporting/exports?${query}&format=${encodeURIComponent(payload.format)}`,
      { method: 'POST' },
      'Erreur lors du lancement de l export DSF'
    );
  },

  async getExportStatus(exportId: string): Promise<DsfExportStatusResponse> {
    return requestJson<DsfExportStatusResponse>(
      `/dsf-reporting/exports/status?exportId=${encodeURIComponent(exportId)}`,
      { method: 'GET' },
      'Erreur lors de la recuperation du statut export DSF'
    );
  },

  async downloadExport(downloadUrl: string, fallbackFilename: string): Promise<void> {
    const response = await httpClient.request(downloadUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error('Erreur lors du telechargement export DSF');
    }

    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] || fallbackFilename;

    link.href = href;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(href);
  }
};
