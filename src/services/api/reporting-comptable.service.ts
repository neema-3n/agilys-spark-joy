import { httpClient } from '@/services/api/http-client';
import { requestJson } from '@/services/api/api-utils';
import type {
  ReportingComptableExportRequest,
  ReportingComptableExportStartResponse,
  ReportingComptableExportStatusResponse,
  ReportingComptableFilters,
  ReportingComptableResponse
} from '@/types/reporting-comptable.types';

const toQueryString = (filters: ReportingComptableFilters): string => {
  const query = new URLSearchParams();
  query.set('dateDebut', filters.dateDebut);
  query.set('dateFin', filters.dateFin);

  if (filters.compteId) {
    query.set('compteId', filters.compteId);
  }

  if (filters.entiteId) {
    query.set('entiteId', filters.entiteId);
  }

  if (filters.axeId) {
    query.set('axeId', filters.axeId);
  }

  if (filters.page) {
    query.set('page', String(filters.page));
  }

  if (filters.pageSize) {
    query.set('pageSize', String(filters.pageSize));
  }

  return query.toString();
};

export const reportingComptableService = {
  async getReport(filters: ReportingComptableFilters): Promise<ReportingComptableResponse> {
    const query = toQueryString(filters);
    return requestJson<ReportingComptableResponse>(
      `/reporting-comptable?${query}`,
      { method: 'GET' },
      'Erreur lors du chargement du reporting comptable'
    );
  },

  async startExport(payload: ReportingComptableExportRequest): Promise<ReportingComptableExportStartResponse> {
    const query = toQueryString(payload);
    return requestJson<ReportingComptableExportStartResponse>(
      `/reporting-comptable/exports?${query}&view=${encodeURIComponent(payload.view)}&format=${encodeURIComponent(payload.format)}`,
      { method: 'POST' },
      'Erreur lors du lancement de l export'
    );
  },

  async getExportStatus(exportId: string): Promise<ReportingComptableExportStatusResponse> {
    return requestJson<ReportingComptableExportStatusResponse>(
      `/reporting-comptable/exports/status?exportId=${encodeURIComponent(exportId)}`,
      { method: 'GET' },
      'Erreur lors de la recuperation du statut export'
    );
  },

  async downloadExport(downloadUrl: string, fallbackFilename: string): Promise<void> {
    const response = await httpClient.request(downloadUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error('Erreur lors du telechargement export');
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
