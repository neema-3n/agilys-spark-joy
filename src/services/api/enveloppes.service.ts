import type { Enveloppe, CreateEnveloppeInput, UpdateEnveloppeInput } from '@/types/enveloppe.types';
import { requestJson } from '@/services/api/api-utils';

interface EnveloppeApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  code: string;
  nom: string;
  sourceFinancement: string;
  montantAlloue: number;
  montantConsomme: number;
  statut: 'actif' | 'cloture';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const mapFromApi = (row: EnveloppeApiModel): Enveloppe => ({
  id: row.id,
  clientId: row.clientId,
  exerciceId: row.exerciceId,
  code: row.code,
  nom: row.nom,
  sourceFinancement: row.sourceFinancement,
  montantAlloue: row.montantAlloue,
  montantConsomme: row.montantConsomme,
  montantDisponible: row.montantAlloue - row.montantConsomme,
  statut: row.statut,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  createdBy: row.createdBy
});

export const enveloppesService = {
  async getAll(_clientId: string, exerciceId?: string): Promise<Enveloppe[]> {
    if (!exerciceId) {
      return [];
    }

    const payload = await requestJson<EnveloppeApiModel[]>(
      `/budget-referentiels/enveloppes?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des enveloppes'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string, exerciceId: string): Promise<Enveloppe> {
    const payload = await requestJson<EnveloppeApiModel[]>(
      `/budget-referentiels/enveloppes?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération de l\'enveloppe'
    );

    const item = payload.find((entry) => entry.id === id);
    if (!item) {
      throw new Error('Enveloppe introuvable');
    }

    return mapFromApi(item);
  },

  async create(input: CreateEnveloppeInput): Promise<Enveloppe> {
    const payload = await requestJson<EnveloppeApiModel>(
      '/budget-referentiels/enveloppes',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: input.exerciceId,
          code: input.code,
          nom: input.nom,
          sourceFinancement: input.sourceFinancement,
          montantAlloue: input.montantAlloue,
          montantConsomme: input.montantConsomme,
          statut: input.statut
        })
      },
      'Erreur lors de la création de l\'enveloppe'
    );

    return mapFromApi(payload);
  },

  async update(id: string, input: UpdateEnveloppeInput): Promise<Enveloppe> {
    const payload = await requestJson<EnveloppeApiModel>(
      `/budget-referentiels/enveloppes/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input)
      },
      'Erreur lors de la mise à jour de l\'enveloppe'
    );

    return mapFromApi(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/budget-referentiels/enveloppes/${id}`,
      { method: 'DELETE' },
      'Erreur lors de l\'archivage de l\'enveloppe'
    );
  },

  async cloturer(id: string): Promise<Enveloppe> {
    return this.update(id, { statut: 'cloture' });
  }
};
