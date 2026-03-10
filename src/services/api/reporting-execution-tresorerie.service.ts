import { httpClient } from '@/services/api/http-client';
import { requestJson } from '@/services/api/api-utils';
import type {
  ExecutionBudgetaireResponse,
  ReportingExecutionTresorerieExportRequest,
  ReportingExecutionTresorerieExportStartResponse,
  ReportingExecutionTresorerieExportStatusResponse,
  ReportingExecutionTresorerieFilters,
  TresorerieResponse
} from '@/types/reporting-execution-tresorerie.types';

const toQueryString = (filters: ReportingExecutionTresorerieFilters): string => {
  const query = new URLSearchParams();
  query.set('exerciceId', filters.exerciceId);
  query.set('periode', filters.periode);

  if (filters.entite) {
    query.set('entite', filters.entite);
  }

  if (filters.axeAnalytique) {
    query.set('axeAnalytique', filters.axeAnalytique);
  }

  if (typeof filters.seuil === 'number') {
    query.set('seuil', String(filters.seuil));
  }

  if (filters.page) {
    query.set('page', String(filters.page));
  }

  if (filters.pageSize) {
    query.set('pageSize', String(filters.pageSize));
  }

  if (filters.correlationId) {
    query.set('correlationId', filters.correlationId);
  }

  return query.toString();
};

export const reportingExecutionTresorerieService = {
  async getExecutionBudgetaire(filters: ReportingExecutionTresorerieFilters): Promise<ExecutionBudgetaireResponse> {
    const query = toQueryString(filters);

    return requestJson<ExecutionBudgetaireResponse>(
      `/reporting-execution-tresorerie/execution-budgetaire?${query}`,
      { method: 'GET' },
      'Erreur lors du chargement du reporting execution budgetaire'
    );
  },

  async getTresorerie(filters: ReportingExecutionTresorerieFilters): Promise<TresorerieResponse> {
    const query = toQueryString(filters);

    return requestJson<TresorerieResponse>(
      `/reporting-execution-tresorerie/tresorerie?${query}`,
      { method: 'GET' },
      'Erreur lors du chargement du reporting tresorerie'
    );
  },

  async startExport(payload: ReportingExecutionTresorerieExportRequest): Promise<ReportingExecutionTresorerieExportStartResponse> {
    const query = toQueryString(payload);

    return requestJson<ReportingExecutionTresorerieExportStartResponse>(
      `/reporting-execution-tresorerie/exports?${query}&view=${encodeURIComponent(payload.view)}&format=${encodeURIComponent(payload.format)}`,
      { method: 'POST' },
      'Erreur lors du lancement de l export execution+tresorerie'
    );
  },

  async getExportStatus(exportId: string): Promise<ReportingExecutionTresorerieExportStatusResponse> {
    return requestJson<ReportingExecutionTresorerieExportStatusResponse>(
      `/reporting-execution-tresorerie/exports/status?exportId=${encodeURIComponent(exportId)}`,
      { method: 'GET' },
      'Erreur lors de la recuperation du statut export execution+tresorerie'
    );
  },

  async downloadExport(downloadUrl: string, fallbackFilename: string): Promise<void> {
    const response = await httpClient.request(downloadUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error('Erreur lors du telechargement export execution+tresorerie');
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
