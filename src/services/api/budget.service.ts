import { requestJson } from '@/services/api/api-utils';
import { LigneBudgetaire } from '@/types/budget.types';

type LigneBudgetaireApiModel = {
  id: string;
  exerciceId: string;
  actionId: string;
  compteId: string;
  enveloppeId: string | null;
  libelle: string;
  montantInitial: number;
  montantModifie: number;
  montantEngage: number;
  montantLiquide: number;
  montantPaye: number;
  disponible: number;
  statut: 'actif' | 'cloture';
  createdAt: string;
};

export type CreateLigneBudgetaireInput = {
  exerciceId: string;
  actionId: string;
  compteId: string;
  enveloppeId?: string | null;
  libelle: string;
  montantInitial: number;
  statut: LigneBudgetaire['statut'];
};

const mapApiLigne = (entry: LigneBudgetaireApiModel): LigneBudgetaire => ({
  id: entry.id,
  exerciceId: entry.exerciceId,
  actionId: entry.actionId,
  compteId: entry.compteId,
  enveloppeId: entry.enveloppeId ?? undefined,
  libelle: entry.libelle,
  montantInitial: entry.montantInitial,
  montantModifie: entry.montantModifie,
  montantEngage: entry.montantEngage,
  montantLiquide: entry.montantLiquide,
  montantPaye: entry.montantPaye,
  disponible: entry.disponible,
  dateCreation: entry.createdAt,
  statut: entry.statut
});

const toUpdatePayload = (updates: Partial<LigneBudgetaire>) => {
  const payload: Record<string, unknown> = {};

  if (updates.actionId !== undefined) payload.actionId = updates.actionId;
  if (updates.compteId !== undefined) payload.compteId = updates.compteId;
  if (updates.enveloppeId !== undefined) payload.enveloppeId = updates.enveloppeId;
  if (updates.libelle !== undefined) payload.libelle = updates.libelle;
  if (updates.montantInitial !== undefined) payload.montantInitial = updates.montantInitial;
  if (updates.montantModifie !== undefined) payload.montantModifie = updates.montantModifie;
  if (updates.montantEngage !== undefined) payload.montantEngage = updates.montantEngage;
  if (updates.montantLiquide !== undefined) payload.montantLiquide = updates.montantLiquide;
  if (updates.montantPaye !== undefined) payload.montantPaye = updates.montantPaye;
  if (updates.disponible !== undefined) payload.disponible = updates.disponible;
  if (updates.statut !== undefined) payload.statut = updates.statut;

  return payload;
};

export const budgetService = {
  getLignesBudgetaires: async (exerciceId: string, _clientId: string): Promise<LigneBudgetaire[]> => {
    const payload = await requestJson<LigneBudgetaireApiModel[]>(
      `/budget-referentiels/lignes-budgetaires?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des lignes budgétaires'
    );
    return payload.map(mapApiLigne);
  },

  createLigneBudgetaire: async (
    ligne: CreateLigneBudgetaireInput,
    _clientId: string,
    _userId: string
  ): Promise<LigneBudgetaire> => {
    const payload = await requestJson<LigneBudgetaireApiModel>(
      '/budget-referentiels/lignes-budgetaires',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: ligne.exerciceId,
          actionId: ligne.actionId,
          compteId: ligne.compteId,
          enveloppeId: ligne.enveloppeId ?? null,
          libelle: ligne.libelle,
          montantInitial: ligne.montantInitial,
          statut: ligne.statut
        })
      },
      'Erreur lors de la création de la ligne budgétaire'
    );

    return mapApiLigne(payload);
  },

  updateLigneBudgetaire: async (
    id: string,
    updates: Partial<LigneBudgetaire>,
    _clientId: string,
    exerciceId: string
  ): Promise<LigneBudgetaire> => {
    const payload = await requestJson<LigneBudgetaireApiModel>(
      `/budget-referentiels/lignes-budgetaires/${encodeURIComponent(id)}?exerciceId=${encodeURIComponent(exerciceId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(toUpdatePayload(updates))
      },
      'Erreur lors de la modification de la ligne budgétaire'
    );

    return mapApiLigne(payload);
  },

  deleteLigneBudgetaire: async (id: string, _clientId: string, exerciceId: string): Promise<void> => {
    await requestJson<LigneBudgetaireApiModel>(
      `/budget-referentiels/lignes-budgetaires/${encodeURIComponent(id)}?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'DELETE' },
      'Impossible de supprimer la ligne budgétaire'
    );
  }
};
