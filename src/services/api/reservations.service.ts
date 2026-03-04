import { requestJson } from '@/services/api/api-utils';
import type { ReservationCredit, ReservationCreditFormData } from '@/types/reservation.types';

interface ReservationApiModel {
  id: string;
  numero: string;
  exerciceId: string;
  ligneBudgetaireId: string;
  montant: number;
  objet: string;
  beneficiaire?: string;
  projetId?: string;
  dateReservation: string;
  dateExpiration?: string;
  statut: 'active' | 'utilisee' | 'annulee' | 'expiree';
  motifAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  ecrituresCount?: number;
  ligneBudgetaire?: {
    libelle: string;
    disponible: number;
  };
  projet?: {
    id: string;
    code: string;
    nom: string;
    statut: string;
  };
  engagements?: Array<{
    id: string;
    numero: string;
    montant: number;
    statut: string;
  }>;
}

const mapFromApi = (row: ReservationApiModel): ReservationCredit => ({
  id: row.id,
  numero: row.numero,
  exerciceId: row.exerciceId,
  ligneBudgetaireId: row.ligneBudgetaireId,
  montant: Number(row.montant || 0),
  objet: row.objet,
  beneficiaire: row.beneficiaire,
  projetId: row.projetId,
  dateReservation: row.dateReservation,
  dateExpiration: row.dateExpiration,
  statut: row.statut,
  motifAnnulation: row.motifAnnulation,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  clientId: row.clientId,
  ecrituresCount: Number(row.ecrituresCount || 0),
  ligneBudgetaire: row.ligneBudgetaire,
  projet: row.projet,
  engagements: row.engagements?.map((eng) => ({
    id: eng.id,
    numero: eng.numero,
    montant: Number(eng.montant || 0),
    statut: eng.statut
  }))
});

export const getReservations = async (exerciceId: string, _clientId: string): Promise<ReservationCredit[]> => {
  const payload = await requestJson<ReservationApiModel[]>(
    `/reservations?exerciceId=${encodeURIComponent(exerciceId)}`,
    { method: 'GET' },
    'Erreur lors de la récupération des réservations'
  );

  return payload.map(mapFromApi);
};

export const getReservationById = async (id: string): Promise<ReservationCredit | null> => {
  try {
    const payload = await requestJson<ReservationApiModel>(
      `/reservations/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération de la réservation'
    );

    return mapFromApi(payload);
  } catch {
    return null;
  }
};

export const createReservation = async (
  reservation: ReservationCreditFormData,
  exerciceId: string,
  _clientId: string,
  _userId: string
): Promise<ReservationCredit> => {
  const payload = await requestJson<ReservationApiModel>(
    '/reservations',
    {
      method: 'POST',
      body: JSON.stringify({
        exerciceId,
        ligneBudgetaireId: reservation.ligneBudgetaireId,
        montant: reservation.montant,
        objet: reservation.objet,
        beneficiaire: reservation.beneficiaire,
        projetId: reservation.projetId,
        dateExpiration: reservation.dateExpiration
      })
    },
    'Erreur lors de la création de la réservation'
  );

  return mapFromApi(payload);
};

export const updateReservation = async (
  id: string,
  updates: Partial<ReservationCreditFormData>
): Promise<ReservationCredit> => {
  const payload = await requestJson<ReservationApiModel>(
    `/reservations/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ligneBudgetaireId: updates.ligneBudgetaireId,
        montant: updates.montant,
        objet: updates.objet,
        beneficiaire: updates.beneficiaire,
        projetId: updates.projetId,
        dateExpiration: updates.dateExpiration
      })
    },
    'Erreur lors de la mise à jour de la réservation'
  );

  return mapFromApi(payload);
};

export const utiliserReservation = async (id: string): Promise<ReservationCredit> => {
  const payload = await requestJson<ReservationApiModel>(
    `/reservations/${encodeURIComponent(id)}/utiliser`,
    { method: 'PATCH', body: JSON.stringify({}) },
    'Erreur lors de l\'utilisation de la réservation'
  );

  return mapFromApi(payload);
};

export const annulerReservation = async (id: string, motifAnnulation: string): Promise<ReservationCredit> => {
  const payload = await requestJson<ReservationApiModel>(
    `/reservations/${encodeURIComponent(id)}/annuler`,
    {
      method: 'PATCH',
      body: JSON.stringify({ motifAnnulation })
    },
    'Erreur lors de l\'annulation de la réservation'
  );

  return mapFromApi(payload);
};

export const deleteReservation = async (id: string): Promise<void> => {
  await requestJson(
    `/reservations/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    'Erreur lors de la suppression de la réservation'
  );
};
