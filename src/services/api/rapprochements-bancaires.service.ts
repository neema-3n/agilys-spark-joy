import { requestJson } from '@/services/api/api-utils';
import type { RapprochementBancaire, RapprochementBancaireFormData } from '@/types/rapprochement-bancaire.types';

interface RapprochementBancaireApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  compteId: string;
  dateDebut: string;
  dateFin: string;
  soldeReleve: number;
  soldeComptable: number;
  ecart: number;
  statut: 'en_cours' | 'valide' | 'annule';
  dateValidation?: string;
  validePar?: string;
  observations?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  compte?: {
    code: string;
    libelle: string;
    type: string;
  };
}

const mapFromApi = (row: RapprochementBancaireApiModel): RapprochementBancaire => ({
  id: row.id,
  clientId: row.clientId,
  exerciceId: row.exerciceId,
  numero: row.numero,
  compteId: row.compteId,
  dateDebut: row.dateDebut,
  dateFin: row.dateFin,
  soldeReleve: Number(row.soldeReleve || 0),
  soldeComptable: Number(row.soldeComptable || 0),
  ecart: Number(row.ecart || 0),
  statut: row.statut,
  dateValidation: row.dateValidation,
  validePar: row.validePar,
  observations: row.observations,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  compte: row.compte
});

export const rapprochementsBancairesService = {
  async getAll(_clientId: string, exerciceId: string): Promise<RapprochementBancaire[]> {
    const payload = await requestJson<RapprochementBancaireApiModel[]>(
      `/rapprochements-bancaires?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des rapprochements bancaires'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<RapprochementBancaire> {
    const payload = await requestJson<RapprochementBancaireApiModel>(
      `/rapprochements-bancaires/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération du rapprochement bancaire'
    );

    return mapFromApi(payload);
  },

  async create(
    _clientId: string,
    exerciceId: string,
    rapprochement: RapprochementBancaireFormData
  ): Promise<RapprochementBancaire> {
    const payload = await requestJson<RapprochementBancaireApiModel>(
      '/rapprochements-bancaires',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId,
          compteId: rapprochement.compteId,
          dateDebut: rapprochement.dateDebut,
          dateFin: rapprochement.dateFin,
          soldeReleve: rapprochement.soldeReleve,
          observations: rapprochement.observations
        })
      },
      'Erreur lors de la création du rapprochement bancaire'
    );

    return mapFromApi(payload);
  },

  async valider(id: string): Promise<void> {
    await requestJson(
      `/rapprochements-bancaires/${encodeURIComponent(id)}/valider`,
      { method: 'PATCH', body: JSON.stringify({}) },
      'Erreur lors de la validation du rapprochement bancaire'
    );
  }
};
