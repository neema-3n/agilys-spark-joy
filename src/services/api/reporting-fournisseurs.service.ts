import { httpClient } from '@/services/api/http-client';
import { requestJson } from '@/services/api/api-utils';
import type {
  EtatAvancesRegularisationsResponse,
  EtatDettesFournisseursResponse,
  ReportingFournisseursExportRequest,
  ReportingFournisseursExportStartResponse,
  ReportingFournisseursExportStatusResponse,
  ReportingFournisseursFilters
} from '@/types/reporting-fournisseurs.types';

const toQueryString = (filters: ReportingFournisseursFilters): string => {
  const query = new URLSearchParams();
  query.set('periode', filters.periode);

  if (filters.entite) {
    query.set('entite', filters.entite);
  }

  if (filters.fournisseurId) {
    query.set('fournisseurId', filters.fournisseurId);
  }

  if (filters.statut) {
    query.set('statut', filters.statut);
  }

  if (filters.agingBucket) {
    query.set('agingBucket', filters.agingBucket);
  }

  if (filters.page) {
    query.set('page', String(filters.page));
  }

  if (filters.pageSize) {
    query.set('pageSize', String(filters.pageSize));
  }

  return query.toString();
};

export const reportingFournisseursService = {
  async getEtatDettesFournisseurs(filters: ReportingFournisseursFilters): Promise<EtatDettesFournisseursResponse> {
    const query = toQueryString(filters);

    return requestJson<EtatDettesFournisseursResponse>(
      `/reporting-fournisseurs/etat-dettes-fournisseurs?${query}`,
      { method: 'GET' },
      'Erreur lors du chargement de l etat des dettes fournisseurs'
    );
  },

  async getEtatAvancesRegularisations(filters: ReportingFournisseursFilters): Promise<EtatAvancesRegularisationsResponse> {
    const query = toQueryString(filters);

    return requestJson<EtatAvancesRegularisationsResponse>(
      `/reporting-fournisseurs/etat-avances-regularisations?${query}`,
      { method: 'GET' },
      'Erreur lors du chargement de l etat des avances regularisations'
    );
  },

  async startExport(payload: ReportingFournisseursExportRequest): Promise<ReportingFournisseursExportStartResponse> {
    const query = toQueryString(payload);

    return requestJson<ReportingFournisseursExportStartResponse>(
      `/reporting-fournisseurs/exports?${query}&view=${encodeURIComponent(payload.view)}&format=${encodeURIComponent(payload.format)}`,
      { method: 'POST' },
      'Erreur lors du lancement de l export fournisseurs'
    );
  },

  async getExportStatus(exportId: string): Promise<ReportingFournisseursExportStatusResponse> {
    return requestJson<ReportingFournisseursExportStatusResponse>(
      `/reporting-fournisseurs/exports/status?exportId=${encodeURIComponent(exportId)}`,
      { method: 'GET' },
      'Erreur lors de la recuperation du statut export fournisseurs'
    );
  },

  async downloadExport(downloadUrl: string, fallbackFilename: string): Promise<void> {
    const response = await httpClient.request(downloadUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error('Erreur lors du telechargement export fournisseurs');
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
