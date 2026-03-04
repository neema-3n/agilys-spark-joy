import { requestJson } from '@/services/api/api-utils';
import type { FluxTresorerie, PrevisionTresorerie, TresorerieStats } from '@/types/tresorerie.types';

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
  }
};
