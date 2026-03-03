import { requestJson } from '@/services/api/api-utils';
import {
  BudgetDecisionComparison,
  BudgetDecisionVersion,
  LigneBudgetaire,
  ModificationBudgetaire
} from '@/types/budget.types';

type AllocationApiModel = {
  id: string;
  exerciceId: string;
  numero: string;
  operationType: 'allocation' | 'reallocation';
  sourceAxeId: string | null;
  destinationAxeId: string;
  montant: number;
  motif: string;
  createdAt: string;
  dateValidation: string;
  validePar: string;
};

const mapAllocationToModification = (entry: AllocationApiModel): ModificationBudgetaire => ({
  id: entry.id,
  exerciceId: entry.exerciceId,
  numero: entry.numero,
  type: entry.operationType === 'reallocation' ? 'virement' : 'augmentation',
  ligneSourceId: entry.sourceAxeId ?? undefined,
  ligneDestinationId: entry.destinationAxeId,
  montant: entry.montant,
  motif: entry.motif,
  statut: 'validee',
  dateCreation: entry.createdAt,
  dateValidation: entry.dateValidation,
  validePar: entry.validePar
});

export const applyModificationsToLignes = (
  lignes: LigneBudgetaire[],
  modifications: ModificationBudgetaire[]
): LigneBudgetaire[] => {
  const axeToLigneId = new Map<string, string>();
  for (const ligne of lignes) {
    axeToLigneId.set(ligne.id, ligne.id);
    axeToLigneId.set(ligne.actionId, ligne.id);
  }

  const projected = new Map(
    lignes.map((ligne) => [
      ligne.id,
      {
        ...ligne
      }
    ])
  );

  for (const modification of modifications) {
    if (modification.statut !== 'validee') {
      continue;
    }

    if (modification.type === 'augmentation') {
      const destinationLigneId = axeToLigneId.get(modification.ligneDestinationId);
      const destination = destinationLigneId ? projected.get(destinationLigneId) : undefined;
      if (!destination) {
        continue;
      }
      destination.montantModifie += modification.montant;
      destination.disponible += modification.montant;
      continue;
    }

    if (modification.type === 'virement') {
      const sourceLigneId = modification.ligneSourceId ? axeToLigneId.get(modification.ligneSourceId) : undefined;
      const destinationLigneId = axeToLigneId.get(modification.ligneDestinationId);
      const source = sourceLigneId ? projected.get(sourceLigneId) : undefined;
      const destination = destinationLigneId ? projected.get(destinationLigneId) : undefined;

      if (source) {
        source.montantModifie -= modification.montant;
        source.disponible -= modification.montant;
      }

      if (destination) {
        destination.montantModifie += modification.montant;
        destination.disponible += modification.montant;
      }
    }
  }

  return lignes.map((ligne) => projected.get(ligne.id) ?? ligne);
};

export const computeDecisionVersionDiff = (
  left: BudgetDecisionVersion,
  right: BudgetDecisionVersion
): Record<string, { from: unknown; to: unknown }> => {
  const fields: ReadonlyArray<[string, unknown, unknown]> = [
    ['montant', left.snapshotApres.montant, right.snapshotApres.montant],
    ['sourceAxeId', left.snapshotApres.sourceAxeId, right.snapshotApres.sourceAxeId],
    ['destinationAxeId', left.snapshotApres.destinationAxeId, right.snapshotApres.destinationAxeId],
    ['statutDecision', left.statutDecision, right.statutDecision],
    ['motif', left.motif, right.motif],
    ['auteur', left.auteur, right.auteur],
    ['horodatage', left.horodatage, right.horodatage]
  ];

  return fields.reduce<Record<string, { from: unknown; to: unknown }>>((acc, [key, from, to]) => {
    if (from !== to) {
      acc[key] = { from, to };
    }
    return acc;
  }, {});
};

export const budgetModificationsService = {
  getModifications: async (exerciceId: string): Promise<ModificationBudgetaire[]> => {
    const payload = await requestJson<AllocationApiModel[]>(
      `/budget-referentiels/allocations?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des allocations budgétaires'
    );

    return payload.map(mapAllocationToModification);
  },

  createModification: async (
    modification: Omit<ModificationBudgetaire, 'id' | 'dateCreation' | 'numero' | 'statut'>
  ): Promise<ModificationBudgetaire> => {
    const endpoint = modification.type === 'virement' ? '/budget-referentiels/reallocations' : '/budget-referentiels/allocations';
    const body =
      modification.type === 'virement'
        ? {
            exerciceId: modification.exerciceId,
            sourceAxeId: modification.ligneSourceId,
            destinationAxeId: modification.ligneDestinationId,
            montant: modification.montant,
            motif: modification.motif
          }
        : {
            exerciceId: modification.exerciceId,
            destinationAxeId: modification.ligneDestinationId,
            montant: modification.montant,
            motif: modification.motif
          };

    const payload = await requestJson<AllocationApiModel>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(body)
      },
      'Erreur lors de la création de la modification budgétaire'
    );

    return mapAllocationToModification(payload);
  },

  getDecisionHistory: async (allocationId: string, exerciceId: string): Promise<BudgetDecisionVersion[]> => {
    return requestJson<BudgetDecisionVersion[]>(
      `/budget-referentiels/allocations/${encodeURIComponent(allocationId)}/decisions?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      "Erreur lors de la récupération de l'historique des décisions"
    );
  },

  compareDecisionVersions: async (
    allocationId: string,
    exerciceId: string,
    leftVersion?: number,
    rightVersion?: number
  ): Promise<BudgetDecisionComparison> => {
    const params = new URLSearchParams({ exerciceId });
    if (leftVersion !== undefined) {
      params.set('leftVersion', String(leftVersion));
    }
    if (rightVersion !== undefined) {
      params.set('rightVersion', String(rightVersion));
    }

    return requestJson<BudgetDecisionComparison>(
      `/budget-referentiels/allocations/${encodeURIComponent(allocationId)}/decisions/compare?${params.toString()}`,
      { method: 'GET' },
      'Erreur lors de la comparaison des versions de décision'
    );
  },

  validerModification: async (_id: string, _userId: string): Promise<ModificationBudgetaire> => {
    throw new Error('Les modifications sont validées automatiquement via les endpoints allocation/reallocation');
  },

  soumettreModification: async (_id: string): Promise<ModificationBudgetaire> => {
    throw new Error('Le workflow brouillon/en_attente est indisponible sur le nouveau flux allocation/reallocation');
  },

  rejeterModification: async (_id: string): Promise<ModificationBudgetaire> => {
    throw new Error('Le rejet manuel est indisponible sur le nouveau flux allocation/reallocation');
  }
};
