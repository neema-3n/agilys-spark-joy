import { requestJson } from '@/services/api/api-utils';
import type { Recette, RecetteFormData, RecettesStats } from '@/types/recette.types';

interface RecetteApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateRecette: string;
  montant: number;
  compteDestinationId: string;
  sourceRecette: string;
  categorie?: string;
  beneficiaire?: string;
  reference?: string;
  libelle: string;
  observations?: string;
  statut: 'validee' | 'annulee';
  motifAnnulation?: string;
  dateAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  compteDestination?: {
    code: string;
    libelle: string;
    type: string;
  };
}

const mapFromApi = (data: RecetteApiModel): Recette => ({
  id: data.id,
  clientId: data.clientId,
  exerciceId: data.exerciceId,
  numero: data.numero,
  dateRecette: data.dateRecette,
  montant: Number(data.montant || 0),
  compteDestinationId: data.compteDestinationId,
  sourceRecette: data.sourceRecette,
  categorie: data.categorie,
  beneficiaire: data.beneficiaire,
  reference: data.reference,
  libelle: data.libelle,
  observations: data.observations,
  statut: data.statut,
  motifAnnulation: data.motifAnnulation,
  dateAnnulation: data.dateAnnulation,
  createdBy: data.createdBy,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  compteDestination: data.compteDestination
});

export const recettesService = {
  async getAll(_clientId: string, exerciceId: string): Promise<Recette[]> {
    const payload = await requestJson<RecetteApiModel[]>(
      `/recettes?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des recettes'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<Recette> {
    const payload = await requestJson<RecetteApiModel>(
      `/recettes/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération de la recette'
    );

    return mapFromApi(payload);
  },

  async create(_clientId: string, exerciceId: string, recette: RecetteFormData): Promise<Recette> {
    const payload = await requestJson<RecetteApiModel>(
      '/recettes',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId,
          dateRecette: recette.dateRecette,
          montant: recette.montant,
          compteDestinationId: recette.compteDestinationId,
          sourceRecette: recette.sourceRecette,
          categorie: recette.categorie,
          beneficiaire: recette.beneficiaire,
          reference: recette.reference,
          libelle: recette.libelle,
          observations: recette.observations
        })
      },
      'Erreur lors de la création de la recette'
    );

    return mapFromApi(payload);
  },

  async update(id: string, updates: Partial<RecetteFormData>): Promise<void> {
    await requestJson(
      `/recettes/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          dateRecette: updates.dateRecette,
          montant: updates.montant,
          compteDestinationId: updates.compteDestinationId,
          sourceRecette: updates.sourceRecette,
          categorie: updates.categorie,
          beneficiaire: updates.beneficiaire,
          reference: updates.reference,
          libelle: updates.libelle,
          observations: updates.observations
        })
      },
      'Erreur lors de la mise à jour de la recette'
    );
  },

  async annuler(id: string, motif: string): Promise<void> {
    await requestJson(
      `/recettes/${encodeURIComponent(id)}/annuler`,
      {
        method: 'PATCH',
        body: JSON.stringify({ motif })
      },
      "Erreur lors de l'annulation de la recette"
    );
  },

  async getStats(_clientId: string, exerciceId: string): Promise<RecettesStats> {
    return requestJson<RecettesStats>(
      `/recettes/stats?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des statistiques des recettes'
    );
  }
};
