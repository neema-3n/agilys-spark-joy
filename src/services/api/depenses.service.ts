import { requestJson } from '@/services/api/api-utils';
import type { Depense, DepenseFormData } from '@/types/depense.types';

interface DepenseApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateDepense: string;
  objet: string;
  montant: number;
  montantPaye: number;
  engagementId?: string;
  reservationCreditId?: string;
  ligneBudgetaireId?: string;
  factureId?: string;
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  statut: 'brouillon' | 'validee' | 'ordonnancee' | 'payee' | 'annulee';
  dateValidation?: string;
  dateOrdonnancement?: string;
  datePaiement?: string;
  modePaiement?: 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';
  referencePaiement?: string;
  observations?: string;
  motifAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  ecrituresCount?: number;
  engagement?: {
    id: string;
    numero: string;
    montant: number;
    solde?: number;
  };
  reservationCredit?: {
    id: string;
    numero: string;
    montant: number;
    statut: string;
  };
  ligneBudgetaire?: {
    id: string;
    libelle: string;
    disponible: number;
  };
  facture?: {
    id: string;
    numero: string;
    montantTTC: number;
    statut: string;
  };
  fournisseur?: {
    id: string;
    nom: string;
    code: string;
  };
  projet?: {
    id: string;
    code: string;
    nom: string;
  };
}

const mapFromApi = (row: DepenseApiModel): Depense => ({
  id: row.id,
  clientId: row.clientId,
  exerciceId: row.exerciceId,
  numero: row.numero,
  dateDepense: row.dateDepense,
  objet: row.objet,
  montant: Number(row.montant || 0),
  montantPaye: Number(row.montantPaye || 0),
  engagementId: row.engagementId,
  reservationCreditId: row.reservationCreditId,
  ligneBudgetaireId: row.ligneBudgetaireId,
  factureId: row.factureId,
  fournisseurId: row.fournisseurId,
  beneficiaire: row.beneficiaire,
  projetId: row.projetId,
  statut: row.statut,
  dateValidation: row.dateValidation,
  dateOrdonnancement: row.dateOrdonnancement,
  datePaiement: row.datePaiement,
  modePaiement: row.modePaiement,
  referencePaiement: row.referencePaiement,
  observations: row.observations,
  motifAnnulation: row.motifAnnulation,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  ecrituresCount: Number(row.ecrituresCount || 0),
  engagement: row.engagement,
  reservationCredit: row.reservationCredit,
  ligneBudgetaire: row.ligneBudgetaire,
  facture: row.facture,
  fournisseur: row.fournisseur,
  projet: row.projet
});

export const getDepenses = async (exerciceId: string, _clientId: string): Promise<Depense[]> => {
  const payload = await requestJson<DepenseApiModel[]>(
    `/depenses?exerciceId=${encodeURIComponent(exerciceId)}`,
    { method: 'GET' },
    'Erreur lors de la récupération des dépenses'
  );

  return payload.map(mapFromApi);
};

export const createDepense = async (
  depense: DepenseFormData,
  exerciceId: string,
  _clientId: string,
  _userId: string
): Promise<Depense> => {
  const payload = await requestJson<DepenseApiModel>(
    '/depenses',
    {
      method: 'POST',
      body: JSON.stringify({
        exerciceId,
        engagementId: depense.engagementId,
        reservationCreditId: depense.reservationCreditId,
        ligneBudgetaireId: depense.ligneBudgetaireId,
        factureId: depense.factureId,
        fournisseurId: depense.fournisseurId,
        beneficiaire: depense.beneficiaire,
        projetId: depense.projetId,
        objet: depense.objet,
        montant: depense.montant,
        dateDepense: depense.dateDepense,
        modePaiement: depense.modePaiement,
        referencePaiement: depense.referencePaiement,
        observations: depense.observations
      })
    },
    'Erreur lors de la création de la dépense'
  );

  return mapFromApi(payload);
};

export const updateDepense = async (id: string, updates: Partial<DepenseFormData>): Promise<Depense> => {
  const payload = await requestJson<DepenseApiModel>(
    `/depenses/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        engagementId: updates.engagementId,
        reservationCreditId: updates.reservationCreditId,
        ligneBudgetaireId: updates.ligneBudgetaireId,
        factureId: updates.factureId,
        fournisseurId: updates.fournisseurId,
        beneficiaire: updates.beneficiaire,
        projetId: updates.projetId,
        objet: updates.objet,
        montant: updates.montant,
        dateDepense: updates.dateDepense,
        modePaiement: updates.modePaiement,
        referencePaiement: updates.referencePaiement,
        observations: updates.observations
      })
    },
    'Erreur lors de la mise à jour de la dépense'
  );

  return mapFromApi(payload);
};

export const validerDepense = async (id: string): Promise<Depense> => {
  const payload = await requestJson<DepenseApiModel>(
    `/depenses/${encodeURIComponent(id)}/valider`,
    { method: 'PATCH', body: JSON.stringify({}) },
    'Erreur lors de la validation de la dépense'
  );

  return mapFromApi(payload);
};

export const ordonnancerDepense = async (id: string): Promise<Depense> => {
  const payload = await requestJson<DepenseApiModel>(
    `/depenses/${encodeURIComponent(id)}/ordonnancer`,
    { method: 'PATCH', body: JSON.stringify({}) },
    "Erreur lors de l'ordonnancement de la dépense"
  );

  return mapFromApi(payload);
};

export const marquerPayee = async (
  id: string,
  datePaiement: string,
  modePaiement: string,
  referencePaiement?: string
): Promise<Depense> => {
  const payload = await requestJson<DepenseApiModel>(
    `/depenses/${encodeURIComponent(id)}/marquer-payee`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        datePaiement,
        modePaiement,
        referencePaiement: referencePaiement || null
      })
    },
    'Erreur lors du passage de la dépense à payée'
  );

  return mapFromApi(payload);
};

export const getPaiementsValidesDepense = async (depenseId: string) => {
  return requestJson<Array<{
    id: string;
    numero: string;
    montant: number;
    datePaiement: string;
    modePaiement: string;
  }>>(
    `/depenses/${encodeURIComponent(depenseId)}/paiements-valides`,
    { method: 'GET' },
    'Erreur lors de la récupération des paiements valides'
  );
};

export const getPaiementsValidesMultipleDepenses = async (depenseIds: string[]) => {
  if (depenseIds.length === 0) {
    return [];
  }

  return requestJson<Array<{
    id: string;
    numero: string;
    montant: number;
    datePaiement: string;
    modePaiement: string;
    depenseId: string;
    depenses: {
      numero: string;
      objet: string;
    };
  }>>(
    '/depenses/paiements-valides-multiple',
    {
      method: 'POST',
      body: JSON.stringify({ depenseIds })
    },
    'Erreur lors de la récupération des paiements valides (multiple)'
  );
};

export const annulerMultipleDepenses = async (depenseIds: string[], motif: string): Promise<void> => {
  await Promise.all(depenseIds.map((id) => annulerDepense(id, motif)));
};

export const annulerDepense = async (id: string, motif: string): Promise<Depense> => {
  const payload = await requestJson<DepenseApiModel>(
    `/depenses/${encodeURIComponent(id)}/annuler`,
    {
      method: 'PATCH',
      body: JSON.stringify({ motif })
    },
    "Erreur lors de l'annulation de la dépense"
  );

  return mapFromApi(payload);
};

export const deleteDepense = async (id: string): Promise<void> => {
  await requestJson(
    `/depenses/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    'Erreur lors de la suppression de la dépense'
  );
};

export const createDepenseFromFacture = async (
  data: any,
  exerciceId: string,
  _clientId: string,
  _userId: string
): Promise<Depense> => {
  const payload = await requestJson<DepenseApiModel>(
    '/depenses/from-facture',
    {
      method: 'POST',
      body: JSON.stringify({
        exerciceId,
        factureId: data.factureId,
        montant: data.montant,
        dateDepense: data.dateDepense,
        modePaiement: data.modePaiement,
        referencePaiement: data.referencePaiement,
        observations: data.observations
      })
    },
    'Erreur lors de la création de la dépense depuis la facture'
  );

  return mapFromApi(payload);
};

export const createDepenseFromEngagement = async (
  data: any,
  exerciceId: string,
  _clientId: string,
  _userId: string
): Promise<Depense> => {
  const payload = await requestJson<DepenseApiModel>(
    '/depenses/from-engagement',
    {
      method: 'POST',
      body: JSON.stringify({
        exerciceId,
        engagementId: data.engagementId,
        montant: data.montant,
        dateDepense: data.dateDepense,
        modePaiement: data.modePaiement,
        referencePaiement: data.referencePaiement,
        observations: data.observations
      })
    },
    "Erreur lors de la création de la dépense depuis l'engagement"
  );

  return mapFromApi(payload);
};

export const createDepenseFromReservation = async (
  data: any,
  exerciceId: string,
  _clientId: string,
  _userId: string
): Promise<Depense> => {
  const payload = await requestJson<DepenseApiModel>(
    '/depenses/from-reservation',
    {
      method: 'POST',
      body: JSON.stringify({
        exerciceId,
        reservationCreditId: data.reservationCreditId,
        montant: data.montant,
        objet: data.objet,
        dateDepense: data.dateDepense,
        beneficiaire: data.beneficiaire,
        modePaiement: data.modePaiement,
        referencePaiement: data.referencePaiement,
        observations: data.observations,
        justificationUrgence: data.justificationUrgence
      })
    },
    "Erreur lors de la création de la dépense depuis la réservation"
  );

  return mapFromApi(payload);
};
