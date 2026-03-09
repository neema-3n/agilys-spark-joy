import { Exercice, ExerciceChecklist, ExerciceCloseResult, ExerciceStatut, ReouvrirExercicePayload } from '@/types';
import { requestJson } from '@/services/api/api-utils';

interface ExerciceApiModel {
  id: string;
  clientId: string;
  libelle: string;
  code: string;
  dateDebut: string;
  dateFin: string;
  statut: 'ouvert' | 'cloture' | 'ouverte' | 'en_revue' | 'fermee';
}

const normalizeExerciceStatut = (statut: ExerciceApiModel['statut']): ExerciceStatut => {
  if (statut === 'ouvert') {
    return 'ouverte';
  }

  if (statut === 'cloture') {
    return 'fermee';
  }

  return statut;
};

const mapExercice = (input: ExerciceApiModel): Exercice => ({
  id: input.id,
  clientId: input.clientId,
  libelle: input.libelle,
  code: input.code || undefined,
  dateDebut: input.dateDebut,
  dateFin: input.dateFin,
  statut: normalizeExerciceStatut(input.statut)
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

  async cloturer(id: string): Promise<ExerciceCloseResult> {
    const payload = await requestJson<ExerciceCloseResult>(
      `/budget-referentiels/exercices/${id}/cloturer`,
      { method: 'POST' },
      'Erreur lors de la clôture gouvernée de l\'exercice'
    );

    return {
      ...payload,
      exercice: mapExercice(payload.exercice as unknown as ExerciceApiModel),
      nextExercice: mapExercice(payload.nextExercice as unknown as ExerciceApiModel)
    };
  },

  async preCloturer(id: string): Promise<ExerciceChecklist> {
    return requestJson<ExerciceChecklist>(
      `/budget-referentiels/exercices/${id}/pre-cloture`,
      { method: 'POST' },
      'Erreur lors de la pré-clôture de l\'exercice'
    );
  },

  async getChecklist(id: string): Promise<ExerciceChecklist> {
    return requestJson<ExerciceChecklist>(
      `/budget-referentiels/exercices/${id}/checklist`,
      { method: 'GET' },
      'Erreur lors de la récupération de la checklist de clôture'
    );
  },

  async reouvrir(id: string, payload: ReouvrirExercicePayload): Promise<Exercice> {
    const exercice = await requestJson<ExerciceApiModel>(
      `/budget-referentiels/exercices/${id}/reouvrir`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload)
      },
      'Erreur lors de la réouverture gouvernée de l\'exercice'
    );

    return mapExercice(exercice);
  }
};
