import { Action } from '@/types/budget.types';
import { requestJson } from '@/services/api/api-utils';

interface ActionApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  programmeId: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const mapAction = (input: ActionApiModel): Action => ({
  id: input.id,
  programme_id: input.programmeId,
  client_id: input.clientId,
  exercice_id: input.exerciceId,
  code: input.code,
  libelle: input.libelle,
  ordre: input.ordre,
  statut: input.statut,
  created_at: input.createdAt,
  updated_at: input.updatedAt,
  created_by: input.createdBy
});

const fetchActions = async (exerciceId: string): Promise<Action[]> => {
  const payload = await requestJson<ActionApiModel[]>(
    `/budget-referentiels/actions?exerciceId=${encodeURIComponent(exerciceId)}`,
    { method: 'GET' },
    'Erreur lors de la récupération des actions'
  );

  return payload.map(mapAction);
};

export const actionsService = {
  async getAll(_clientId: string, exerciceId: string): Promise<Action[]> {
    return fetchActions(exerciceId);
  },

  async getByProgrammeId(programmeId: string, exerciceId: string): Promise<Action[]> {
    const all = await fetchActions(exerciceId);
    return all.filter((action) => action.programme_id === programmeId);
  },

  async getById(id: string, exerciceId: string): Promise<Action> {
    const all = await fetchActions(exerciceId);
    const item = all.find((action) => action.id === id);

    if (!item) {
      throw new Error('Action introuvable');
    }

    return item;
  },

  async create(action: Omit<Action, 'id' | 'created_at' | 'updated_at'>): Promise<Action> {
    const payload = await requestJson<ActionApiModel>(
      '/budget-referentiels/actions',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: action.exercice_id,
          programmeId: action.programme_id,
          code: action.code,
          libelle: action.libelle,
          ordre: action.ordre,
          statut: action.statut
        })
      },
      'Erreur lors de la création de l\'action'
    );

    return mapAction(payload);
  },

  async update(id: string, updates: Partial<Action>): Promise<Action> {
    const payload = await requestJson<ActionApiModel>(
      `/budget-referentiels/actions/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          programmeId: updates.programme_id,
          code: updates.code,
          libelle: updates.libelle,
          ordre: updates.ordre,
          statut: updates.statut
        })
      },
      'Erreur lors de la mise à jour de l\'action'
    );

    return mapAction(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/budget-referentiels/actions/${id}`,
      { method: 'DELETE' },
      'Erreur lors de l\'archivage de l\'action'
    );
  }
};
