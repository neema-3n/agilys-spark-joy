import { requestJson } from '@/services/api/api-utils';
import type {
  CloseoutDossierPayload,
  FluxTresorerie,
  PaginatedTresorerieAudit,
  PrevisionTresorerie,
  TresorerieAuditDetail,
  TresorerieAuditFilters,
  TresorerieStats,
  TresorerieSupervision,
} from '@/types/tresorerie.types';

interface FluxTresorerieApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  date: string;
  type: 'encaissement' | 'decaissement';
  categorie: string;
  libelle: string;
  montant: number;
  sourceType: 'paiement' | 'recette' | 'autre';
  sourceId?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

const mapFluxFromApi = (row: FluxTresorerieApiModel): FluxTresorerie => ({
  id: row.id,
  clientId: row.clientId,
  exerciceId: row.exerciceId,
  date: row.date,
  type: row.type,
  categorie: row.categorie,
  libelle: row.libelle,
  montant: Number(row.montant || 0),
  sourceType: row.sourceType,
  sourceId: row.sourceId,
  observations: row.observations,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const buildAuditQueryParams = (exerciceId: string, filters: TresorerieAuditFilters = {}) => {
  const params = new URLSearchParams({ exerciceId });

  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.transition) {
    params.set('transition', filters.transition);
  }
  if (filters.severity) {
    params.set('severity', filters.severity);
  }
  if (filters.decision) {
    params.set('decision', filters.decision);
  }
  if (filters.sourceType) {
    params.set('sourceType', filters.sourceType);
  }
  if (filters.sourceId) {
    params.set('sourceId', filters.sourceId);
  }
  if (filters.entityId) {
    params.set('entityId', filters.entityId);
  }
  if (filters.fromDate) {
    params.set('fromDate', filters.fromDate);
  }
  if (filters.toDate) {
    params.set('toDate', filters.toDate);
  }
  if (filters.page) {
    params.set('page', String(filters.page));
  }
  if (filters.pageSize) {
    params.set('pageSize', String(filters.pageSize));
  }

  return params;
};

export const tresorerieService = {
  async getStats(_clientId: string, exerciceId: string): Promise<TresorerieStats> {
    return requestJson<TresorerieStats>(
      `/tresorerie/stats?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des statistiques de trésorerie'
    );
  },

  async getFlux(_clientId: string, exerciceId: string): Promise<FluxTresorerie[]> {
    const payload = await requestJson<FluxTresorerieApiModel[]>(
      `/tresorerie/flux?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des flux de trésorerie'
    );

    return payload.map(mapFluxFromApi);
  },

  async getPrevisions(_clientId: string, exerciceId: string): Promise<PrevisionTresorerie[]> {
    return requestJson<PrevisionTresorerie[]>(
      `/tresorerie/previsions?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des prévisions de trésorerie'
    );
  },

  async getSupervision(_clientId: string, exerciceId: string): Promise<TresorerieSupervision> {
    return requestJson<TresorerieSupervision>(
      `/tresorerie/supervision?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors du chargement de la supervision de trésorerie'
    );
  },

  async getExceptionAudit(
    _clientId: string,
    exerciceId: string,
    filters: TresorerieAuditFilters = {}
  ): Promise<PaginatedTresorerieAudit> {
    const params = buildAuditQueryParams(exerciceId, filters);

    return requestJson<PaginatedTresorerieAudit>(
      `/tresorerie/exception-audit?${params.toString()}`,
      { method: 'GET' },
      'Erreur lors du chargement du journal d’audit des exceptions'
    );
  },

  async getExceptionAuditDetail(
    _clientId: string,
    exerciceId: string,
    query: { exceptionId?: string; correlationId?: string }
  ): Promise<TresorerieAuditDetail> {
    const params = new URLSearchParams({ exerciceId });
    if (query.exceptionId) {
      params.set('exceptionId', query.exceptionId);
    }
    if (query.correlationId) {
      params.set('correlationId', query.correlationId);
    }

    return requestJson<TresorerieAuditDetail>(
      `/tresorerie/exception-audit/detail?${params.toString()}`,
      { method: 'GET' },
      'Erreur lors du chargement du détail d’audit'
    );
  },

  async getCloseoutDossier(
    _clientId: string,
    exerciceId: string,
    input?: { dossierType?: 'cloture_exercice' | 'migration_reconciliation'; migrationBatchId?: string }
  ): Promise<CloseoutDossierPayload> {
    const params = new URLSearchParams({ exerciceId });
    if (input?.dossierType) {
      params.set('dossierType', input.dossierType);
    }
    if (input?.migrationBatchId) {
      params.set('migrationBatchId', input.migrationBatchId);
    }

    return requestJson<CloseoutDossierPayload>(
      `/tresorerie/closeout-dossier?${params.toString()}`,
      { method: 'GET' },
      'Erreur lors du chargement du dossier de clôture'
    );
  },
};
