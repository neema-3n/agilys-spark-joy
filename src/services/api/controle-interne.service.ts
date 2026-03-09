import { requestJson } from '@/services/api/api-utils';
import type {
  CreateInternalControlActionPlanInput,
  InternalControlActionPlan,
  InternalControlActionPlanEventList,
  InternalControlActionPlanList,
  InternalControlWorkspace,
  UpdateInternalControlActionPlanInput,
} from '@/types/controle-interne.types';

export const controleInterneService = {
  getWorkspace(exerciceId: string) {
    return requestJson<InternalControlWorkspace>(
      `/controle-interne/workspace?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors du chargement du workspace de contrôle interne'
    );
  },

  listActionPlans(exerciceId: string, status?: string) {
    const params = new URLSearchParams({ exerciceId });
    if (status) {
      params.set('status', status);
    }

    return requestJson<InternalControlActionPlanList>(
      `/controle-interne/action-plans?${params.toString()}`,
      { method: 'GET' },
      'Erreur lors du chargement des plans d action'
    );
  },

  createActionPlan(input: CreateInternalControlActionPlanInput) {
    return requestJson<InternalControlActionPlan>(
      '/controle-interne/action-plans',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      'Erreur lors de la création du plan d action'
    );
  },

  listActionPlanEvents(id: string, exerciceId: string) {
    return requestJson<InternalControlActionPlanEventList>(
      `/controle-interne/action-plans/${encodeURIComponent(id)}/events?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors du chargement de l historique du plan d action'
    );
  },

  updateActionPlan(id: string, exerciceId: string, input: UpdateInternalControlActionPlanInput) {
    return requestJson<InternalControlActionPlan>(
      `/controle-interne/action-plans/${encodeURIComponent(id)}?exerciceId=${encodeURIComponent(exerciceId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      'Erreur lors de la mise à jour du plan d action'
    );
  },
};
