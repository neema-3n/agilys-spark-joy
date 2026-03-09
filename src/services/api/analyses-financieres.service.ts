import { requestJson } from '@/services/api/api-utils';
import type { AnalysesFilters, AnalyseRow, AnalysesKpis } from '@/lib/analyses-financieres';

export interface AnalysesAggregationResponse {
  kpis: AnalysesKpis;
  counts: {
    projets: number;
    structures: number;
    axes: number;
  };
  projetRows: AnalyseRow[];
  structureRows: AnalyseRow[];
  axeRows: AnalyseRow[];
}

const buildQueryParams = (exerciceId: string, filters: AnalysesFilters): string => {
  const params = new URLSearchParams({ exerciceId });

  if (filters.periode) params.set('periode', filters.periode);
  if (filters.projetId) params.set('projetId', filters.projetId);
  if (filters.structureId) params.set('structureId', filters.structureId);
  if (filters.sectionId) params.set('sectionId', filters.sectionId);
  if (filters.programmeId) params.set('programmeId', filters.programmeId);
  if (filters.actionId) params.set('actionId', filters.actionId);

  return params.toString();
};

export const analysesFinancieresService = {
  async getAggregation(exerciceId: string, filters: AnalysesFilters): Promise<AnalysesAggregationResponse> {
    return requestJson<AnalysesAggregationResponse>(
      `/analyses-financieres?${buildQueryParams(exerciceId, filters)}`,
      { method: 'GET' },
      'Erreur lors du chargement des analyses financieres'
    );
  }
};

