import { requestJson } from '@/services/api/api-utils';
import type { Paiement, PaiementFormData } from '@/types/paiement.types';

interface PaiementApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  depenseId: string;
  montant: number;
  datePaiement: string;
  modePaiement: 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';
  referencePaiement?: string;
  observations?: string;
  statut: 'valide' | 'annule';
  motifAnnulation?: string;
  dateAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  ecrituresCount?: number;
  depense?: {
    id: string;
    numero: string;
    objet: string;
    montant: number;
    fournisseur?: {
      id: string;
      nom: string;
      code: string;
    };
  };
}

const mapFromApi = (row: PaiementApiModel): Paiement => ({
  id: row.id,
  clientId: row.clientId,
  exerciceId: row.exerciceId,
  numero: row.numero,
  depenseId: row.depenseId,
  montant: Number(row.montant || 0),
  datePaiement: row.datePaiement,
  modePaiement: row.modePaiement,
  referencePaiement: row.referencePaiement,
  observations: row.observations,
  statut: row.statut,
  motifAnnulation: row.motifAnnulation,
  dateAnnulation: row.dateAnnulation,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  ecrituresCount: Number(row.ecrituresCount || 0),
  depense: row.depense
});

export const getPaiements = async (exerciceId: string, _clientId: string): Promise<Paiement[]> => {
  const payload = await requestJson<PaiementApiModel[]>(
    `/paiements?exerciceId=${encodeURIComponent(exerciceId)}`,
    { method: 'GET' },
    'Erreur lors de la récupération des paiements'
  );

  return payload.map(mapFromApi);
};

export const getPaiementsByDepense = async (depenseId: string): Promise<Paiement[]> => {
  const payload = await requestJson<PaiementApiModel[]>(
    `/paiements/depense/${encodeURIComponent(depenseId)}`,
    { method: 'GET' },
    'Erreur lors de la récupération des paiements de la dépense'
  );

  return payload.map(mapFromApi);
};

export const createPaiement = async (
  paiement: PaiementFormData,
  exerciceId: string,
  _clientId: string,
  _userId: string
): Promise<Paiement> => {
  const payload = await requestJson<PaiementApiModel>(
    '/paiements',
    {
      method: 'POST',
      body: JSON.stringify({
        depenseId: paiement.depenseId,
        montant: paiement.montant,
        datePaiement: paiement.datePaiement,
        modePaiement: paiement.modePaiement,
        referencePaiement: paiement.referencePaiement,
        observations: paiement.observations,
        exerciceId
      })
    },
    "Erreur lors de l'enregistrement du paiement"
  );

  return mapFromApi(payload);
};

export const annulerPaiement = async (id: string, motif: string): Promise<Paiement> => {
  const payload = await requestJson<PaiementApiModel>(
    `/paiements/${encodeURIComponent(id)}/annuler`,
    {
      method: 'PATCH',
      body: JSON.stringify({ motif })
    },
    "Erreur lors de l'annulation du paiement"
  );

  return mapFromApi(payload);
};

export const deletePaiement = async (id: string): Promise<void> => {
  await requestJson(
    `/paiements/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    'Erreur lors de la suppression du paiement'
  );
};
