import { requestJson } from '@/services/api/api-utils';
import type {
  CompteTresorerie,
  CompteTresorerieFormData,
  ComptesTresorerieStats
} from '@/types/compte-tresorerie.types';

interface CompteTresorerieApiModel {
  id: string;
  clientId: string;
  code: string;
  libelle: string;
  type: 'banque' | 'caisse';
  banque?: string;
  numeroCompte?: string;
  devise: string;
  soldeInitial: number;
  soldeActuel: number;
  statut: 'actif' | 'inactif' | 'cloture';
  dateOuverture: string;
  dateCloture?: string;
  observations?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

const mapFromApi = (data: CompteTresorerieApiModel): CompteTresorerie => ({
  id: data.id,
  clientId: data.clientId,
  code: data.code,
  libelle: data.libelle,
  type: data.type,
  banque: data.banque,
  numeroCompte: data.numeroCompte,
  devise: data.devise,
  soldeInitial: Number(data.soldeInitial || 0),
  soldeActuel: Number(data.soldeActuel || 0),
  statut: data.statut,
  dateOuverture: data.dateOuverture,
  dateCloture: data.dateCloture,
  observations: data.observations,
  createdBy: data.createdBy,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt
});

export const comptesTresorerieService = {
  async getAll(_clientId: string): Promise<CompteTresorerie[]> {
    const payload = await requestJson<CompteTresorerieApiModel[]>(
      '/comptes-tresorerie',
      { method: 'GET' },
      'Erreur lors de la récupération des comptes de trésorerie'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<CompteTresorerie> {
    const payload = await requestJson<CompteTresorerieApiModel>(
      `/comptes-tresorerie/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération du compte de trésorerie'
    );

    return mapFromApi(payload);
  },

  async getActifs(_clientId: string): Promise<CompteTresorerie[]> {
    const payload = await requestJson<CompteTresorerieApiModel[]>(
      '/comptes-tresorerie/actifs',
      { method: 'GET' },
      'Erreur lors de la récupération des comptes de trésorerie actifs'
    );

    return payload.map(mapFromApi);
  },

  async create(_clientId: string, compte: CompteTresorerieFormData): Promise<CompteTresorerie> {
    const payload = await requestJson<CompteTresorerieApiModel>(
      '/comptes-tresorerie',
      {
        method: 'POST',
        body: JSON.stringify({
          code: compte.code,
          libelle: compte.libelle,
          type: compte.type,
          banque: compte.banque,
          numeroCompte: compte.numeroCompte,
          devise: compte.devise || 'XOF',
          soldeInitial: compte.soldeInitial,
          dateOuverture: compte.dateOuverture,
          observations: compte.observations
        })
      },
      'Erreur lors de la création du compte de trésorerie'
    );

    return mapFromApi(payload);
  },

  async update(id: string, updates: Partial<CompteTresorerieFormData>): Promise<void> {
    await requestJson(
      `/comptes-tresorerie/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          code: updates.code,
          libelle: updates.libelle,
          type: updates.type,
          banque: updates.banque,
          numeroCompte: updates.numeroCompte,
          devise: updates.devise,
          soldeInitial: updates.soldeInitial,
          dateOuverture: updates.dateOuverture,
          observations: updates.observations
        })
      },
      'Erreur lors de la mise à jour du compte de trésorerie'
    );
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/comptes-tresorerie/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      'Erreur lors de la suppression du compte de trésorerie'
    );
  },

  async getStats(clientId: string): Promise<ComptesTresorerieStats> {
    const comptesActifs = await this.getActifs(clientId);

    const stats: ComptesTresorerieStats = {
      nombreTotal: comptesActifs.length,
      nombreBanques: 0,
      nombreCaisses: 0,
      soldeTotal: 0,
      soldeBanques: 0,
      soldeCaisses: 0
    };

    for (const compte of comptesActifs) {
      stats.soldeTotal += compte.soldeActuel;
      if (compte.type === 'banque') {
        stats.nombreBanques += 1;
        stats.soldeBanques += compte.soldeActuel;
      } else if (compte.type === 'caisse') {
        stats.nombreCaisses += 1;
        stats.soldeCaisses += compte.soldeActuel;
      }
    }

    return stats;
  }
};
