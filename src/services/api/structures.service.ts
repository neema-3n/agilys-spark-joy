import { requestJson } from '@/services/api/api-utils';
import { CreateStructureInput, Structure, UpdateStructureInput } from '@/types/structure.types';

interface StructureApiModel {
  id: string;
  clientId: string;
  exerciceId?: string;
  code: string;
  nom: string;
  type: Structure['type'];
  parentId?: string;
  responsable?: string;
  statut: Structure['statut'];
  createdAt: string;
  updatedAt: string;
}

const mapFromApi = (data: StructureApiModel): Structure => ({
  id: data.id,
  clientId: data.clientId,
  exerciceId: data.exerciceId,
  code: data.code,
  nom: data.nom,
  type: data.type,
  parentId: data.parentId,
  responsable: data.responsable,
  statut: data.statut,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt
});

export const structuresService = {
  async getAll(_clientId: string, exerciceId?: string): Promise<Structure[]> {
    const query = exerciceId ? `?exerciceId=${encodeURIComponent(exerciceId)}` : '';
    const payload = await requestJson<StructureApiModel[]>(
      `/structures${query}`,
      { method: 'GET' },
      'Erreur lors de la récupération des structures'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<Structure> {
    const payload = await requestJson<StructureApiModel>(
      `/structures/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération de la structure'
    );

    return mapFromApi(payload);
  },

  async create(input: CreateStructureInput): Promise<Structure> {
    const payload = await requestJson<StructureApiModel>(
      '/structures',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: input.exerciceId,
          code: input.code,
          nom: input.nom,
          type: input.type,
          parentId: input.parentId,
          responsable: input.responsable,
          statut: input.statut
        })
      },
      'Erreur lors de la création de la structure'
    );

    return mapFromApi(payload);
  },

  async update(id: string, input: UpdateStructureInput): Promise<Structure> {
    const payload = await requestJson<StructureApiModel>(
      `/structures/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          code: input.code,
          nom: input.nom,
          type: input.type,
          parentId: input.parentId,
          responsable: input.responsable,
          statut: input.statut
        })
      },
      'Erreur lors de la mise à jour de la structure'
    );

    return mapFromApi(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/structures/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      'Erreur lors de la suppression de la structure'
    );
  }
};
