import { requestJson } from '@/services/api/api-utils';
import type {
  OperationTresorerie,
  OperationTresorerieFormData,
  OperationsTresorerieStats
} from '@/types/operation-tresorerie.types';

interface OperationTresorerieApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateOperation: string;
  typeOperation: 'encaissement' | 'decaissement' | 'transfert';
  compteId: string;
  compteContrepartieId?: string;
  montant: number;
  modePaiement?: string;
  referenceBancaire?: string;
  libelle: string;
  categorie?: string;
  pieceJustificative?: string;
  paiementId?: string;
  recetteId?: string;
  depenseId?: string;
  statut: 'validee' | 'rapprochee' | 'annulee';
  rapproche: boolean;
  dateRapprochement?: string;
  observations?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  compte?: {
    code: string;
    libelle: string;
    type: string;
  };
  compteContrepartie?: {
    code: string;
    libelle: string;
    type: string;
  };
  paiement?: {
    id: string;
    numero: string;
    depense?: {
      id: string;
      numero: string;
      objet: string;
      ligneBudgetaire?: {
        id: string;
        libelle: string;
      };
    };
  };
}

const mapFromApi = (data: OperationTresorerieApiModel): OperationTresorerie => ({
  id: data.id,
  clientId: data.clientId,
  exerciceId: data.exerciceId,
  numero: data.numero,
  dateOperation: data.dateOperation,
  typeOperation: data.typeOperation,
  compteId: data.compteId,
  compteContrepartieId: data.compteContrepartieId,
  montant: Number(data.montant || 0),
  modePaiement: data.modePaiement,
  referenceBancaire: data.referenceBancaire,
  libelle: data.libelle,
  categorie: data.categorie,
  pieceJustificative: data.pieceJustificative,
  paiementId: data.paiementId,
  recetteId: data.recetteId,
  depenseId: data.depenseId,
  statut: data.statut,
  rapproche: data.rapproche,
  dateRapprochement: data.dateRapprochement,
  observations: data.observations,
  createdBy: data.createdBy,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  compte: data.compte,
  compteContrepartie: data.compteContrepartie,
  paiement: data.paiement
});

export const operationsTresorerieService = {
  async getAll(_clientId: string, exerciceId: string): Promise<OperationTresorerie[]> {
    const payload = await requestJson<OperationTresorerieApiModel[]>(
      `/operations-tresorerie?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des opérations de trésorerie'
    );

    return payload.map(mapFromApi);
  },

  async getByCompte(compteId: string): Promise<OperationTresorerie[]> {
    const payload = await requestJson<OperationTresorerieApiModel[]>(
      `/operations-tresorerie/compte/${encodeURIComponent(compteId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des opérations du compte'
    );

    return payload.map(mapFromApi);
  },

  async create(_clientId: string, exerciceId: string, operation: OperationTresorerieFormData): Promise<OperationTresorerie> {
    const payload = await requestJson<OperationTresorerieApiModel>(
      '/operations-tresorerie',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId,
          dateOperation: operation.dateOperation,
          typeOperation: operation.typeOperation,
          compteId: operation.compteId,
          compteContrepartieId: operation.compteContrepartieId,
          montant: operation.montant,
          modePaiement: operation.modePaiement,
          referenceBancaire: operation.referenceBancaire,
          libelle: operation.libelle,
          categorie: operation.categorie,
          observations: operation.observations
        })
      },
      "Erreur lors de l'enregistrement de l'opération"
    );

    return mapFromApi(payload);
  },

  async rapprocher(operationIds: string[]): Promise<void> {
    await requestJson(
      '/operations-tresorerie/rapprocher',
      {
        method: 'PATCH',
        body: JSON.stringify({ operationIds })
      },
      'Erreur lors du rapprochement des opérations'
    );
  },

  async getStats(_clientId: string, exerciceId: string): Promise<OperationsTresorerieStats> {
    return requestJson<OperationsTresorerieStats>(
      `/operations-tresorerie/stats?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des statistiques de trésorerie'
    );
  }
};
