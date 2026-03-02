import { Programme } from '@/types/budget.types';
import { requestJson } from '@/services/api/api-utils';

interface ProgrammeApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  sectionId: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const mapProgramme = (input: ProgrammeApiModel): Programme => ({
  id: input.id,
  section_id: input.sectionId,
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

const fetchProgrammes = async (exerciceId: string): Promise<Programme[]> => {
  const payload = await requestJson<ProgrammeApiModel[]>(
    `/budget-referentiels/programmes?exerciceId=${encodeURIComponent(exerciceId)}`,
    { method: 'GET' },
    'Erreur lors de la récupération des programmes'
  );

  return payload.map(mapProgramme);
};

export const programmesService = {
  async getAll(_clientId: string, exerciceId: string): Promise<Programme[]> {
    return fetchProgrammes(exerciceId);
  },

  async getBySectionId(sectionId: string, exerciceId: string): Promise<Programme[]> {
    const all = await fetchProgrammes(exerciceId);
    return all.filter((programme) => programme.section_id === sectionId);
  },

  async getById(id: string, exerciceId: string): Promise<Programme> {
    const all = await fetchProgrammes(exerciceId);
    const item = all.find((programme) => programme.id === id);

    if (!item) {
      throw new Error('Programme introuvable');
    }

    return item;
  },

  async create(programme: Omit<Programme, 'id' | 'created_at' | 'updated_at'>): Promise<Programme> {
    const payload = await requestJson<ProgrammeApiModel>(
      '/budget-referentiels/programmes',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: programme.exercice_id,
          sectionId: programme.section_id,
          code: programme.code,
          libelle: programme.libelle,
          ordre: programme.ordre,
          statut: programme.statut
        })
      },
      'Erreur lors de la création du programme'
    );

    return mapProgramme(payload);
  },

  async update(id: string, updates: Partial<Programme>, exerciceId: string): Promise<Programme> {
    const payload = await requestJson<ProgrammeApiModel>(
      `/budget-referentiels/programmes/${id}?exerciceId=${encodeURIComponent(exerciceId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          sectionId: updates.section_id,
          code: updates.code,
          libelle: updates.libelle,
          ordre: updates.ordre,
          statut: updates.statut
        })
      },
      'Erreur lors de la mise à jour du programme'
    );

    return mapProgramme(payload);
  },

  async delete(id: string, exerciceId: string): Promise<void> {
    await requestJson(
      `/budget-referentiels/programmes/${id}?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'DELETE' },
      'Erreur lors de l\'archivage du programme'
    );
  }
};
