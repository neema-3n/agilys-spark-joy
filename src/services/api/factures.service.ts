import { requestJson } from '@/services/api/api-utils';
import type {
  CreateFactureInput,
  Facture,
  PaginatedResponse,
  PaginationParams,
  UpdateFactureInput
} from '@/types/facture.types';

interface FactureApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateFacture: string;
  dateEcheance?: string;
  fournisseurId: string;
  bonCommandeId?: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  projetId?: string;
  objet: string;
  numeroFactureFournisseur?: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantLiquide: number;
  statut: 'brouillon' | 'validee' | 'payee' | 'annulee';
  dateValidation?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  ecrituresCount?: number;
  fournisseur?: {
    id: string;
    nom: string;
    code: string;
  };
  bonCommande?: {
    id: string;
    numero: string;
  };
  engagement?: {
    id: string;
    numero: string;
  };
  ligneBudgetaire?: {
    id: string;
    libelle: string;
  };
  projet?: {
    id: string;
    nom: string;
    code?: string;
  };
}

interface FacturesStatsApiModel {
  nombreTotal: number;
  nombreBrouillon: number;
  nombreValidee: number;
  nombrePayee: number;
  montantTotal: number;
  montantBrouillon: number;
  montantValidee: number;
  montantLiquide: number;
}

const mapFromApi = (row: FactureApiModel): Facture => ({
  id: row.id,
  clientId: row.clientId,
  exerciceId: row.exerciceId,
  numero: row.numero,
  dateFacture: row.dateFacture,
  dateEcheance: row.dateEcheance,
  fournisseurId: row.fournisseurId,
  bonCommandeId: row.bonCommandeId,
  engagementId: row.engagementId,
  ligneBudgetaireId: row.ligneBudgetaireId,
  projetId: row.projetId,
  objet: row.objet,
  numeroFactureFournisseur: row.numeroFactureFournisseur,
  montantHT: Number(row.montantHT || 0),
  montantTVA: Number(row.montantTVA || 0),
  montantTTC: Number(row.montantTTC || 0),
  montantLiquide: Number(row.montantLiquide || 0),
  statut: row.statut,
  dateValidation: row.dateValidation,
  observations: row.observations,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  createdBy: row.createdBy,
  ecrituresCount: Number(row.ecrituresCount || 0),
  fournisseur: row.fournisseur,
  bonCommande: row.bonCommande,
  engagement: row.engagement,
  ligneBudgetaire: row.ligneBudgetaire,
  projet: row.projet
});

const buildPaginatedQuery = (exerciceId: string | undefined, params: PaginationParams): string => {
  const search = new URLSearchParams();

  search.set('page', String(params.page));
  search.set('pageSize', String(params.pageSize));

  if (exerciceId) {
    search.set('exerciceId', exerciceId);
  }

  if (params.sortBy) {
    search.set('sortBy', params.sortBy);
  }

  if (params.sortOrder) {
    search.set('sortOrder', params.sortOrder);
  }

  if (params.filters?.statut) {
    search.set('statut', params.filters.statut);
  }

  if (params.filters?.searchTerm?.trim()) {
    search.set('searchTerm', params.filters.searchTerm.trim());
  }

  if (params.filters?.fournisseurId) {
    search.set('fournisseurId', params.filters.fournisseurId);
  }

  if (params.filters?.dateDebut) {
    search.set('dateDebut', params.filters.dateDebut);
  }

  if (params.filters?.dateFin) {
    search.set('dateFin', params.filters.dateFin);
  }

  return search.toString();
};

export const facturesService = {
  async getPaginated(
    _clientId: string,
    exerciceId: string | undefined,
    params: PaginationParams
  ): Promise<PaginatedResponse<Facture>> {
    const query = buildPaginatedQuery(exerciceId, params);

    const payload = await requestJson<{
      data: FactureApiModel[];
      totalCount: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(
      `/factures/paginated?${query}`,
      { method: 'GET' },
      'Erreur lors de la récupération paginée des factures'
    );

    return {
      data: payload.data.map(mapFromApi),
      totalCount: Number(payload.totalCount || 0),
      page: Number(payload.page || params.page),
      pageSize: Number(payload.pageSize || params.pageSize),
      totalPages: Number(payload.totalPages || 0)
    };
  },

  async getAll(_clientId: string, exerciceId?: string): Promise<Facture[]> {
    const query = exerciceId ? `?exerciceId=${encodeURIComponent(exerciceId)}` : '';

    const payload = await requestJson<FactureApiModel[]>(
      `/factures${query}`,
      { method: 'GET' },
      'Erreur lors de la récupération des factures'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<Facture> {
    const payload = await requestJson<FactureApiModel>(
      `/factures/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération de la facture'
    );

    return mapFromApi(payload);
  },

  async create(facture: CreateFactureInput): Promise<Facture> {
    const payload = await requestJson<FactureApiModel>(
      '/factures',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: facture.exerciceId,
          fournisseurId: facture.fournisseurId,
          bonCommandeId: facture.bonCommandeId,
          engagementId: facture.engagementId,
          ligneBudgetaireId: facture.ligneBudgetaireId,
          projetId: facture.projetId,
          objet: facture.objet,
          dateFacture: facture.dateFacture,
          dateEcheance: facture.dateEcheance,
          montantHT: facture.montantHT,
          montantTVA: facture.montantTVA,
          montantTTC: facture.montantTTC,
          montantLiquide: facture.montantLiquide,
          numeroFactureFournisseur: facture.numeroFactureFournisseur,
          observations: facture.observations,
          numero: facture.numero
        })
      },
      'Erreur lors de la création de la facture'
    );

    return mapFromApi(payload);
  },

  async update(id: string, facture: UpdateFactureInput): Promise<Facture> {
    const payload = await requestJson<FactureApiModel>(
      `/factures/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          dateFacture: facture.dateFacture,
          dateEcheance: facture.dateEcheance,
          fournisseurId: facture.fournisseurId,
          bonCommandeId: facture.bonCommandeId,
          engagementId: facture.engagementId,
          ligneBudgetaireId: facture.ligneBudgetaireId,
          projetId: facture.projetId,
          objet: facture.objet,
          numeroFactureFournisseur: facture.numeroFactureFournisseur,
          montantHT: facture.montantHT,
          montantTVA: facture.montantTVA,
          montantTTC: facture.montantTTC,
          montantLiquide: facture.montantLiquide,
          statut: facture.statut,
          dateValidation: facture.dateValidation,
          observations: facture.observations
        })
      },
      'Erreur lors de la mise à jour de la facture'
    );

    return mapFromApi(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(`/factures/${encodeURIComponent(id)}`, { method: 'DELETE' }, 'Erreur lors de la suppression de la facture');
  },

  async genererNumero(_clientId: string, exerciceId: string): Promise<string> {
    const payload = await requestJson<{ numero: string }>(
      `/factures/generer-numero?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la génération du numéro de facture'
    );

    return payload.numero;
  },

  async validerFacture(id: string): Promise<Facture> {
    const payload = await requestJson<FactureApiModel>(
      `/factures/${encodeURIComponent(id)}/valider`,
      { method: 'PATCH', body: JSON.stringify({}) },
      'Erreur lors de la validation de la facture'
    );

    return mapFromApi(payload);
  },

  async marquerPayee(id: string): Promise<Facture> {
    const payload = await requestJson<FactureApiModel>(
      `/factures/${encodeURIComponent(id)}/marquer-payee`,
      { method: 'PATCH', body: JSON.stringify({}) },
      'Erreur lors du passage de la facture au statut payée'
    );

    return mapFromApi(payload);
  },

  async annuler(id: string, motif: string): Promise<Facture> {
    const payload = await requestJson<FactureApiModel>(
      `/factures/${encodeURIComponent(id)}/annuler`,
      {
        method: 'PATCH',
        body: JSON.stringify({ motif })
      },
      "Erreur lors de l'annulation de la facture"
    );

    return mapFromApi(payload);
  },

  async getStats(_clientId: string, exerciceId?: string): Promise<FacturesStatsApiModel> {
    const query = exerciceId ? `?exerciceId=${encodeURIComponent(exerciceId)}` : '';

    return requestJson<FacturesStatsApiModel>(
      `/factures/stats${query}`,
      { method: 'GET' },
      'Erreur lors de la récupération des statistiques des factures'
    );
  }
};
