import { requestJson } from '@/services/api/api-utils';
import type { BonCommande, CreateBonCommandeInput, UpdateBonCommandeInput } from '@/types/bonCommande.types';

interface BonCommandeApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateCommande: string;
  fournisseurId: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  projetId?: string;
  objet: string;
  montant: number;
  statut: 'brouillon' | 'valide' | 'en_cours' | 'receptionne' | 'facture' | 'annule';
  dateValidation?: string;
  dateLivraisonPrevue?: string;
  dateLivraisonReelle?: string;
  conditionsLivraison?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  ecrituresCount?: number;
  montantFacture?: number;
  fournisseur?: {
    id: string;
    nom: string;
    code: string;
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
  };
}

const mapFromApi = (row: BonCommandeApiModel): BonCommande => ({
  id: row.id,
  clientId: row.clientId,
  exerciceId: row.exerciceId,
  numero: row.numero,
  dateCommande: row.dateCommande,
  fournisseurId: row.fournisseurId,
  engagementId: row.engagementId,
  ligneBudgetaireId: row.ligneBudgetaireId,
  projetId: row.projetId,
  objet: row.objet,
  montant: Number(row.montant || 0),
  statut: row.statut,
  dateValidation: row.dateValidation,
  dateLivraisonPrevue: row.dateLivraisonPrevue,
  dateLivraisonReelle: row.dateLivraisonReelle,
  conditionsLivraison: row.conditionsLivraison,
  observations: row.observations,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  createdBy: row.createdBy,
  ecrituresCount: Number(row.ecrituresCount || 0),
  montantFacture: Number(row.montantFacture || 0),
  fournisseur: row.fournisseur,
  engagement: row.engagement,
  ligneBudgetaire: row.ligneBudgetaire,
  projet: row.projet
});

export const bonsCommandeService = {
  async getAll(_clientId: string, exerciceId?: string): Promise<BonCommande[]> {
    const query = exerciceId ? `?exerciceId=${encodeURIComponent(exerciceId)}` : '';

    const payload = await requestJson<BonCommandeApiModel[]>(
      `/bons-commande${query}`,
      { method: 'GET' },
      'Erreur lors de la récupération des bons de commande'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<BonCommande> {
    const payload = await requestJson<BonCommandeApiModel>(
      `/bons-commande/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération du bon de commande'
    );

    return mapFromApi(payload);
  },

  async create(bonCommande: CreateBonCommandeInput): Promise<BonCommande> {
    const payload = await requestJson<BonCommandeApiModel>(
      '/bons-commande',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: bonCommande.exerciceId,
          fournisseurId: bonCommande.fournisseurId,
          engagementId: bonCommande.engagementId,
          ligneBudgetaireId: bonCommande.ligneBudgetaireId,
          projetId: bonCommande.projetId,
          objet: bonCommande.objet,
          montant: bonCommande.montant,
          dateCommande: bonCommande.dateCommande,
          dateLivraisonPrevue: bonCommande.dateLivraisonPrevue,
          conditionsLivraison: bonCommande.conditionsLivraison,
          observations: bonCommande.observations,
          numero: bonCommande.numero
        })
      },
      'Erreur lors de la création du bon de commande'
    );

    return mapFromApi(payload);
  },

  async update(id: string, bonCommande: UpdateBonCommandeInput): Promise<BonCommande> {
    const payload = await requestJson<BonCommandeApiModel>(
      `/bons-commande/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          dateCommande: bonCommande.dateCommande,
          fournisseurId: bonCommande.fournisseurId,
          engagementId: bonCommande.engagementId,
          ligneBudgetaireId: bonCommande.ligneBudgetaireId,
          projetId: bonCommande.projetId,
          objet: bonCommande.objet,
          montant: bonCommande.montant,
          statut: bonCommande.statut,
          dateValidation: bonCommande.dateValidation,
          dateLivraisonPrevue: bonCommande.dateLivraisonPrevue,
          dateLivraisonReelle: bonCommande.dateLivraisonReelle,
          conditionsLivraison: bonCommande.conditionsLivraison,
          observations: bonCommande.observations
        })
      },
      'Erreur lors de la mise à jour du bon de commande'
    );

    return mapFromApi(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/bons-commande/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      'Erreur lors de la suppression du bon de commande'
    );
  },

  async genererNumero(_clientId: string, exerciceId: string): Promise<string> {
    const payload = await requestJson<{ numero: string }>(
      `/bons-commande/generer-numero?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la génération du numéro'
    );

    return payload.numero;
  },

  async validerBonCommande(id: string): Promise<BonCommande> {
    const payload = await requestJson<BonCommandeApiModel>(
      `/bons-commande/${encodeURIComponent(id)}/valider`,
      { method: 'PATCH', body: JSON.stringify({}) },
      'Erreur lors de la validation du bon de commande'
    );

    return mapFromApi(payload);
  },

  async mettreEnCours(id: string): Promise<BonCommande> {
    const payload = await requestJson<BonCommandeApiModel>(
      `/bons-commande/${encodeURIComponent(id)}/mettre-en-cours`,
      { method: 'PATCH', body: JSON.stringify({}) },
      'Erreur lors de la mise en cours du bon de commande'
    );

    return mapFromApi(payload);
  },

  async receptionner(id: string, dateLivraisonReelle: string): Promise<BonCommande> {
    const payload = await requestJson<BonCommandeApiModel>(
      `/bons-commande/${encodeURIComponent(id)}/receptionner`,
      {
        method: 'PATCH',
        body: JSON.stringify({ dateLivraisonReelle })
      },
      'Erreur lors de la réception du bon de commande'
    );

    return mapFromApi(payload);
  },

  async annuler(id: string, motif: string): Promise<BonCommande> {
    const payload = await requestJson<BonCommandeApiModel>(
      `/bons-commande/${encodeURIComponent(id)}/annuler`,
      {
        method: 'PATCH',
        body: JSON.stringify({ motif })
      },
      "Erreur lors de l'annulation du bon de commande"
    );

    return mapFromApi(payload);
  }
};
