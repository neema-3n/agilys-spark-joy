import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { previsionsService } from '@/services/api/previsions.service';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import {
  EcartPrevisionExecution,
  EcartsPrevisionFilters,
  GenerationParams,
  LignePrevision,
  Scenario
} from '@/types/prevision.types';
import { toast } from 'sonner';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

export function usePrevisions() {
  const { currentClient } = useClient();
  const queryClient = useQueryClient();

  // Query pour les scénarios
  const { data: scenarios, isLoading: loadingScenarios, refetch: refetchScenarios } = useQuery({
    queryKey: ['scenarios', currentClient?.id],
    queryFn: () => previsionsService.getScenarios(currentClient!.id),
    enabled: !!currentClient,
  });

  // Mutation pour créer un scénario
  const createScenario = useMutation({
    mutationFn: (scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) =>
      previsionsService.createScenario(scenario),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scénario créé avec succès');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erreur lors de la création du scénario'));
    },
  });

  // Mutation pour mettre à jour un scénario
  const updateScenario = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Scenario, 'id' | 'clientId'>> }) =>
      previsionsService.updateScenario(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scénario mis à jour');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erreur lors de la mise à jour'));
    },
  });

  // Mutation pour supprimer un scénario
  const deleteScenario = useMutation({
    mutationFn: (id: string) => previsionsService.deleteScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scénario supprimé');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erreur lors de la suppression'));
    },
  });

  // Mutation pour valider un scénario
  const validerScenario = useMutation({
    mutationFn: (id: string) => previsionsService.validerScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scénario validé');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erreur lors de la validation'));
    },
  });

  // Mutation pour archiver un scénario
  const archiverScenario = useMutation({
    mutationFn: (id: string) => previsionsService.archiverScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scénario archivé');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Erreur lors de l'archivage"));
    },
  });

  // Mutation pour dupliquer un scénario
  const dupliquerScenario = useMutation({
    mutationFn: ({ id, code, nom }: { id: string; code: string; nom: string }) =>
      previsionsService.dupliquerScenario(id, code, nom),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scénario dupliqué avec succès');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erreur lors de la duplication'));
    },
  });

  // Mutation pour générer des prévisions
  const genererPrevisions = useMutation({
    mutationFn: (params: GenerationParams) => previsionsService.genererPrevisions(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lignes-prevision'] });
      toast.success('Prévisions générées avec succès');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erreur lors de la génération'));
    },
  });

  return {
    scenarios,
    loadingScenarios,
    refetchScenarios,
    createScenario,
    updateScenario,
    deleteScenario,
    validerScenario,
    archiverScenario,
    dupliquerScenario,
    genererPrevisions,
  };
}

export const buildEcartsPrevisionQueryKey = (
  clientId: string | undefined,
  exerciceId: string | undefined,
  filters?: Omit<EcartsPrevisionFilters, 'exerciceId'>
) => ['ecarts-prevision-execution', clientId, exerciceId, filters?.periode, filters?.sectionCode, filters?.programmeCode, filters?.actionCode, filters?.enveloppeId];

export function useEcartsPrevisionExecution(
  filters?: Omit<EcartsPrevisionFilters, 'exerciceId'>
): {
  ecarts: EcartPrevisionExecution[];
  totaux: {
    montantPrevu: number;
    montantExecute: number;
    ecartMontant: number;
    ecartTaux?: number;
    nombreAxes: number;
  } | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
} {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();

  const query = useQuery({
    queryKey: buildEcartsPrevisionQueryKey(currentClient?.id, currentExercice?.id, filters),
    queryFn: () =>
      previsionsService.getEcartsPrevisionExecution({
        exerciceId: currentExercice!.id,
        periode: filters?.periode,
        sectionCode: filters?.sectionCode,
        programmeCode: filters?.programmeCode,
        actionCode: filters?.actionCode,
        enveloppeId: filters?.enveloppeId
      }),
    enabled: !!currentClient?.id && !!currentExercice?.id
  });

  return {
    ecarts: query.data?.items ?? [],
    totaux: query.data?.totaux ?? null,
    isLoading: query.isLoading,
    error: (query.error as Error) ?? null,
    refetch: query.refetch
  };
}

export function useLignesPrevision(scenarioId?: string, annee?: number) {
  const queryClient = useQueryClient();

  // Query pour les lignes de prévision
  const { data: lignes, isLoading: loadingLignes, refetch: refetchLignes } = useQuery({
    queryKey: ['lignes-prevision', scenarioId, annee],
    queryFn: () => previsionsService.getLignesPrevision(scenarioId!, annee),
    enabled: !!scenarioId,
  });

  // Mutation pour créer une ligne
  const createLigne = useMutation({
    mutationFn: (ligne: Omit<LignePrevision, 'id' | 'createdAt' | 'updatedAt'>) =>
      previsionsService.createLignePrevision(ligne),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lignes-prevision'] });
      toast.success('Ligne ajoutée');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Erreur lors de l'ajout"));
    },
  });

  // Mutation pour mettre à jour une ligne
  const updateLigne = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<LignePrevision, 'id' | 'scenarioId' | 'clientId'>> }) =>
      previsionsService.updateLignePrevision(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lignes-prevision'] });
      toast.success('Ligne mise à jour');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erreur lors de la mise à jour'));
    },
  });

  // Mutation pour supprimer une ligne
  const deleteLigne = useMutation({
    mutationFn: (id: string) => previsionsService.deleteLignePrevision(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lignes-prevision'] });
      toast.success('Ligne supprimée');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Erreur lors de la suppression'));
    },
  });

  return {
    lignes,
    loadingLignes,
    refetchLignes,
    createLigne,
    updateLigne,
    deleteLigne,
  };
}
