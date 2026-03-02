import { Section } from '@/types/budget.types';
import { requestJson } from '@/services/api/api-utils';

interface SectionApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const mapSection = (input: SectionApiModel): Section => ({
  id: input.id,
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

export const sectionsService = {
  async getAll(_clientId: string, exerciceId: string): Promise<Section[]> {
    const payload = await requestJson<SectionApiModel[]>(
      `/budget-referentiels/sections?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des sections'
    );

    return payload.map(mapSection);
  },

  async getById(id: string, exerciceId: string): Promise<Section> {
    const sections = await this.getAll('', exerciceId);
    const item = sections.find((section) => section.id === id);

    if (!item) {
      throw new Error('Section introuvable');
    }

    return item;
  },

  async create(section: Omit<Section, 'id' | 'created_at' | 'updated_at'>): Promise<Section> {
    const payload = await requestJson<SectionApiModel>(
      '/budget-referentiels/sections',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: section.exercice_id,
          code: section.code,
          libelle: section.libelle,
          ordre: section.ordre,
          statut: section.statut
        })
      },
      'Erreur lors de la création de la section'
    );

    return mapSection(payload);
  },

  async update(id: string, updates: Partial<Section>): Promise<Section> {
    const payload = await requestJson<SectionApiModel>(
      `/budget-referentiels/sections/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          code: updates.code,
          libelle: updates.libelle,
          ordre: updates.ordre,
          statut: updates.statut
        })
      },
      'Erreur lors de la mise à jour de la section'
    );

    return mapSection(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/budget-referentiels/sections/${id}`,
      { method: 'DELETE' },
      'Erreur lors de l\'archivage de la section'
    );
  }
};
