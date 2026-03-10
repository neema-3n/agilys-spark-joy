import { requestJson } from '@/services/api/api-utils';
import { httpClient } from '@/services/api/http-client';
import type {
  ReportingAnalytiqueExportRequest,
  ReportingAnalytiqueExportStartResponse,
  ReportingAnalytiqueExportStatusResponse,
  ReportingAnalytiqueFilters,
  ReportingAnalytiqueTableauResponse,
  ReportingAnalytiqueDashboardResponse
} from '@/types/reporting-analytique.types';

const toQueryString = (filters: ReportingAnalytiqueFilters): string => {
  const query = new URLSearchParams();
  query.set('exerciceId', filters.exerciceId);
  query.set('periode', filters.periode);

  if (filters.entite) query.set('entite', filters.entite);
  if (filters.axeAnalytique) query.set('axeAnalytique', filters.axeAnalytique);
  if (filters.composanteBudgetaire) query.set('composanteBudgetaire', filters.composanteBudgetaire);
  if (filters.fournisseurId) query.set('fournisseurId', filters.fournisseurId);
  if (filters.statut) query.set('statut', filters.statut);
  if (filters.rowDimension) query.set('rowDimension', filters.rowDimension);
  if (filters.columnDimension) query.set('columnDimension', filters.columnDimension);
  if (filters.measure) query.set('measure', filters.measure);
  if (filters.page) query.set('page', String(filters.page));
  if (filters.pageSize) query.set('pageSize', String(filters.pageSize));
  if (filters.correlationId) query.set('correlationId', filters.correlationId);

  return query.toString();
};

export const reportingAnalytiqueService = {
  async getTableauCroise(filters: ReportingAnalytiqueFilters): Promise<ReportingAnalytiqueTableauResponse> {
    const query = toQueryString(filters);

    return requestJson<ReportingAnalytiqueTableauResponse>(
      `/reporting-analytique/tableau-croise?${query}`,
      { method: 'GET' },
      'Erreur lors du chargement du tableau croise analytique'
    );
  },

  async getDashboard(filters: ReportingAnalytiqueFilters): Promise<ReportingAnalytiqueDashboardResponse> {
    const query = toQueryString(filters);

    return requestJson<ReportingAnalytiqueDashboardResponse>(
      `/reporting-analytique/dashboard?${query}`,
      { method: 'GET' },
      'Erreur lors du chargement du dashboard analytique'
    );
  },

  async startExport(payload: ReportingAnalytiqueExportRequest): Promise<ReportingAnalytiqueExportStartResponse> {
    const query = toQueryString(payload);

    return requestJson<ReportingAnalytiqueExportStartResponse>(
      `/reporting-analytique/exports?${query}&view=${encodeURIComponent(payload.view)}&format=${encodeURIComponent(payload.format)}`,
      { method: 'POST' },
      'Erreur lors du lancement de l export analytique'
    );
  },

  async getExportStatus(exportId: string): Promise<ReportingAnalytiqueExportStatusResponse> {
    return requestJson<ReportingAnalytiqueExportStatusResponse>(
      `/reporting-analytique/exports/status?exportId=${encodeURIComponent(exportId)}`,
      { method: 'GET' },
      'Erreur lors de la recuperation du statut export analytique'
    );
  },

  async downloadExport(downloadUrl: string, fallbackFilename: string): Promise<void> {
    const response = await httpClient.request(downloadUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error('Erreur lors du telechargement export analytique');
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
