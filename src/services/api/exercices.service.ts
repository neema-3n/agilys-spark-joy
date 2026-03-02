import { Exercice } from '@/types';
import { requestJson } from '@/services/api/api-utils';

interface ExerciceApiModel {
  id: string;
  clientId: string;
  libelle: string;
  code: string;
  dateDebut: string;
  dateFin: string;
  statut: 'ouvert' | 'cloture';
}

const mapExercice = (input: ExerciceApiModel): Exercice => ({
  id: input.id,
  clientId: input.clientId,
  libelle: input.libelle,
  code: input.code || undefined,
  dateDebut: input.dateDebut,
  dateFin: input.dateFin,
  statut: input.statut
});

export const exercicesService = {
  async getByClient(_clientId: string): Promise<Exercice[]> {
    const payload = await requestJson<ExerciceApiModel[]>(
      '/budget-referentiels/exercices',
      { method: 'GET' },
      'Erreur lors de la récupération des exercices'
    );

    return payload.map(mapExercice);
  },

  async create(exercice: Omit<Exercice, 'id'>): Promise<Exercice> {
    const payload = await requestJson<ExerciceApiModel>(
      '/budget-referentiels/exercices',
      {
        method: 'POST',
        body: JSON.stringify({
          libelle: exercice.libelle,
          code: exercice.code,
          dateDebut: exercice.dateDebut,
          dateFin: exercice.dateFin,
          statut: exercice.statut
        })
      },
      'Erreur lors de la création de l\'exercice'
    );

    return mapExercice(payload);
  },

  async update(id: string, updates: Partial<Omit<Exercice, 'id' | 'clientId'>>): Promise<Exercice> {
    const payload = await requestJson<ExerciceApiModel>(
      `/budget-referentiels/exercices/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      },
      'Erreur lors de la mise à jour de l\'exercice'
    );

    return mapExercice(payload);
  },

  async cloturer(id: string): Promise<Exercice> {
    return this.update(id, { statut: 'cloture' });
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/budget-referentiels/exercices/${id}`,
      { method: 'DELETE' },
      'Erreur lors de l\'archivage de l\'exercice'
    );
  }
};
