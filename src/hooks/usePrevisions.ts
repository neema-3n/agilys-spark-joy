import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { previsionsService } from '@/services/api/previsions.service';
import { useClient } from '@/contexts/ClientContext';
import { Scenario, LignePrevision, GenerationParams } from '@/types/prevision.types';
import { toast } from 'sonner';

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
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création du scénario');
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
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  // Mutation pour supprimer un scénario
  const deleteScenario = useMutation({
    mutationFn: (id: string) => previsionsService.deleteScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scénario supprimé');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  // Mutation pour valider un scénario
  const validerScenario = useMutation({
    mutationFn: (id: string) => previsionsService.validerScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scénario validé');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la validation');
    },
  });

  // Mutation pour archiver un scénario
  const archiverScenario = useMutation({
    mutationFn: (id: string) => previsionsService.archiverScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scénario archivé');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'archivage');
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
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la duplication');
    },
  });

  // Mutation pour générer des prévisions
  const genererPrevisions = useMutation({
    mutationFn: (params: GenerationParams) => previsionsService.genererPrevisions(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lignes-prevision'] });
      toast.success('Prévisions générées avec succès');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la génération');
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
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'ajout');
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
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  // Mutation pour supprimer une ligne
  const deleteLigne = useMutation({
    mutationFn: (id: string) => previsionsService.deleteLignePrevision(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lignes-prevision'] });
      toast.success('Ligne supprimée');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression');
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
