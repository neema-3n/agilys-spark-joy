import { requestJson } from '@/services/api/api-utils';
import type { Paiement, PaiementFormData, PaiementMotifPayload, ReprendrePaiementPayload } from '@/types/paiement.types';

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
  statut: 'brouillon' | 'transmis' | 'accepte' | 'execute' | 'reconcilie' | 'rejete' | 'annule';
  motifAnnulation?: string;
  dateAnnulation?: string;
  motifRejet?: string;
  dateRejet?: string;
  dateRetour?: string;
  referenceRetour?: string;
  tentativeNumero: number;
  paiementOrigineId?: string;
  paiementReprisDeId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  ecrituresCount?: number;
  depense?: {
    id: string;
    numero: string;
    objet: string;
    montant: number;
    montantPaye: number;
    resteAPayer: number;
    statut: 'brouillon' | 'validee' | 'ordonnancee' | 'partiellement_payee' | 'payee' | 'annulee';
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
  motifRejet: row.motifRejet,
  dateRejet: row.dateRejet,
  dateRetour: row.dateRetour,
  referenceRetour: row.referenceRetour,
  tentativeNumero: Number(row.tentativeNumero || 1),
  paiementOrigineId: row.paiementOrigineId,
  paiementReprisDeId: row.paiementReprisDeId,
  createdBy: row.createdBy,
  updatedBy: row.updatedBy,
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

export const annulerPaiement = async (id: string, motifPayload: PaiementMotifPayload): Promise<Paiement> => {
  const response = await requestJson<PaiementApiModel>(
    `/paiements/${encodeURIComponent(id)}/annuler`,
    {
      method: 'PATCH',
      body: JSON.stringify(motifPayload)
    },
    "Erreur lors de l'annulation du paiement"
  );

  return mapFromApi(response);
};

export const accepterPaiement = async (id: string): Promise<Paiement> => {
  const response = await requestJson<PaiementApiModel>(
    `/paiements/${encodeURIComponent(id)}/accepter`,
    { method: 'PATCH', body: JSON.stringify({}) },
    "Erreur lors de l'acceptation du paiement"
  );

  return mapFromApi(response);
};

export const executerPaiement = async (id: string): Promise<Paiement> => {
  const response = await requestJson<PaiementApiModel>(
    `/paiements/${encodeURIComponent(id)}/executer`,
    { method: 'PATCH', body: JSON.stringify({}) },
    "Erreur lors de l'exécution du paiement"
  );

  return mapFromApi(response);
};

export const reconcilierPaiement = async (id: string): Promise<Paiement> => {
  const response = await requestJson<PaiementApiModel>(
    `/paiements/${encodeURIComponent(id)}/reconcilier`,
    { method: 'PATCH', body: JSON.stringify({}) },
    'Erreur lors du rapprochement du paiement'
  );

  return mapFromApi(response);
};

export const rejeterPaiement = async (id: string, motifPayload: PaiementMotifPayload): Promise<Paiement> => {
  const response = await requestJson<PaiementApiModel>(
    `/paiements/${encodeURIComponent(id)}/rejeter`,
    {
      method: 'PATCH',
      body: JSON.stringify(motifPayload)
    },
    'Erreur lors du rejet du paiement'
  );

  return mapFromApi(response);
};

export const reprendrePaiement = async (id: string, reprisePayload: ReprendrePaiementPayload = {}): Promise<Paiement> => {
  const response = await requestJson<PaiementApiModel>(
    `/paiements/${encodeURIComponent(id)}/reprendre`,
    {
      method: 'POST',
      body: JSON.stringify(reprisePayload)
    },
    'Erreur lors de la reprise du paiement'
  );

  return mapFromApi(response);
};

export const deletePaiement = async (id: string): Promise<void> => {
  await requestJson(
    `/paiements/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    'Erreur lors de la suppression du paiement'
  );
};
