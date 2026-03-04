import { requestJson } from '@/services/api/api-utils';
import type { Engagement, EngagementFormData } from '@/types/engagement.types';

interface EngagementApiModel {
  id: string;
  numero: string;
  exerciceId: string;
  clientId: string;
  reservationCreditId?: string;
  ligneBudgetaireId: string;
  objet: string;
  montant: number;
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  statut: 'brouillon' | 'valide' | 'annule';
  dateCreation: string;
  dateValidation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  motifAnnulation?: string;
  observations?: string;
  solde?: number;
  ecrituresCount?: number;
  ligneBudgetaire?: {
    libelle: string;
    disponible: number;
  };
  fournisseur?: {
    nom: string;
    code: string;
  };
  projet?: {
    code: string;
    nom: string;
  };
  reservationCredit?: {
    numero: string;
    statut: string;
  };
}

const mapFromApi = (row: EngagementApiModel): Engagement => ({
  id: row.id,
  numero: row.numero,
  exerciceId: row.exerciceId,
  clientId: row.clientId,
  reservationCreditId: row.reservationCreditId,
  ligneBudgetaireId: row.ligneBudgetaireId,
  objet: row.objet,
  montant: Number(row.montant || 0),
  fournisseurId: row.fournisseurId,
  beneficiaire: row.beneficiaire,
  projetId: row.projetId,
  statut: row.statut,
  dateCreation: row.dateCreation,
  dateValidation: row.dateValidation,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  motifAnnulation: row.motifAnnulation,
  observations: row.observations,
  solde: Number(row.solde || 0),
  ecrituresCount: Number(row.ecrituresCount || 0),
  ligneBudgetaire: row.ligneBudgetaire,
  fournisseur: row.fournisseur,
  projet: row.projet,
  reservationCredit: row.reservationCredit
});

export const getMontantDisponibleReservation = async (reservationId: string): Promise<number> => {
  const payload = await requestJson<{ montantDisponible: number }>(
    `/engagements/reservation/${encodeURIComponent(reservationId)}/montant-disponible`,
    { method: 'GET' },
    'Erreur lors de la récupération du montant disponible de la réservation'
  );

  return Number(payload.montantDisponible || 0);
};

export const getEngagements = async (exerciceId: string, _clientId: string): Promise<Engagement[]> => {
  const payload = await requestJson<EngagementApiModel[]>(
    `/engagements?exerciceId=${encodeURIComponent(exerciceId)}`,
    { method: 'GET' },
    'Erreur lors de la récupération des engagements'
  );

  return payload.map(mapFromApi);
};

export const createEngagement = async (
  engagement: EngagementFormData,
  exerciceId: string,
  _clientId: string,
  _userId: string
): Promise<Engagement> => {
  const payload = await requestJson<EngagementApiModel>(
    '/engagements',
    {
      method: 'POST',
      body: JSON.stringify({
        exerciceId,
        reservationCreditId: engagement.reservationCreditId,
        ligneBudgetaireId: engagement.ligneBudgetaireId,
        objet: engagement.objet,
        montant: engagement.montant,
        fournisseurId: engagement.fournisseurId,
        beneficiaire: engagement.beneficiaire,
        projetId: engagement.projetId,
        observations: engagement.observations
      })
    },
    "Erreur lors de la création de l'engagement"
  );

  return mapFromApi(payload);
};

export const createEngagementFromReservation = async (
  reservationId: string,
  additionalData: Partial<EngagementFormData>,
  exerciceId: string,
  _clientId: string,
  _userId: string
): Promise<Engagement> => {
  const payload = await requestJson<EngagementApiModel>(
    '/engagements/from-reservation',
    {
      method: 'POST',
      body: JSON.stringify({
        reservationId,
        exerciceId,
        montant: additionalData.montant,
        ligneBudgetaireId: additionalData.ligneBudgetaireId,
        objet: additionalData.objet,
        fournisseurId: additionalData.fournisseurId,
        beneficiaire: additionalData.beneficiaire,
        projetId: additionalData.projetId,
        observations: additionalData.observations
      })
    },
    "Erreur lors de la création de l'engagement depuis la réservation"
  );

  return mapFromApi(payload);
};

export const updateEngagement = async (id: string, updates: Partial<EngagementFormData>): Promise<Engagement> => {
  const payload = await requestJson<EngagementApiModel>(
    `/engagements/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        reservationCreditId: updates.reservationCreditId,
        ligneBudgetaireId: updates.ligneBudgetaireId,
        objet: updates.objet,
        montant: updates.montant,
        fournisseurId: updates.fournisseurId,
        beneficiaire: updates.beneficiaire,
        projetId: updates.projetId,
        observations: updates.observations
      })
    },
    "Erreur lors de la mise à jour de l'engagement"
  );

  return mapFromApi(payload);
};

export const validerEngagement = async (id: string): Promise<Engagement> => {
  const payload = await requestJson<EngagementApiModel>(
    `/engagements/${encodeURIComponent(id)}/valider`,
    { method: 'PATCH', body: JSON.stringify({}) },
    "Erreur lors de la validation de l'engagement"
  );

  return mapFromApi(payload);
};

export const annulerEngagement = async (id: string, motifAnnulation: string): Promise<Engagement> => {
  const payload = await requestJson<EngagementApiModel>(
    `/engagements/${encodeURIComponent(id)}/annuler`,
    {
      method: 'PATCH',
      body: JSON.stringify({ motifAnnulation })
    },
    "Erreur lors de l'annulation de l'engagement"
  );

  return mapFromApi(payload);
};

export const deleteEngagement = async (id: string): Promise<void> => {
  await requestJson(
    `/engagements/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    "Erreur lors de la suppression de l'engagement"
  );
};
