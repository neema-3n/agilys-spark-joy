import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { recettesService } from '@/services/api/recettes.service';
import type { RecetteFormData } from '@/types/recette.types';
import { toast } from 'sonner';

export const useRecettes = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  const queryClient = useQueryClient();

  const clientId = currentClient?.id || '';
  const exerciceId = currentExercice?.id || '';

  const { data: recettes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['recettes', clientId, exerciceId],
    queryFn: () => recettesService.getAll(clientId, exerciceId),
    enabled: !!clientId && !!exerciceId,
  });

  const { data: stats } = useQuery({
    queryKey: ['recettes-stats', clientId, exerciceId],
    queryFn: () => recettesService.getStats(clientId, exerciceId),
    enabled: !!clientId && !!exerciceId,
  });

  const createMutation = useMutation({
    mutationFn: (data: RecetteFormData) =>
      recettesService.create(clientId, exerciceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recettes'] });
      queryClient.invalidateQueries({ queryKey: ['operations-tresorerie'] });
      queryClient.invalidateQueries({ queryKey: ['comptes-tresorerie'] });
      toast.success('Recette enregistrée avec succès');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'enregistrement de la recette');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<RecetteFormData> }) =>
      recettesService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recettes'] });
      toast.success('Recette modifiée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la modification de la recette');
    },
  });

  const annulerMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      recettesService.annuler(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recettes'] });
      queryClient.invalidateQueries({ queryKey: ['operations-tresorerie'] });
      queryClient.invalidateQueries({ queryKey: ['comptes-tresorerie'] });
      toast.success('Recette annulée');
    },
    onError: () => {
      toast.error('Erreur lors de l\'annulation');
    },
  });

  return {
    recettes,
    stats,
    isLoading,
    error,
    refetch,
    createRecette: createMutation.mutateAsync,
    updateRecette: updateMutation.mutateAsync,
    annulerRecette: annulerMutation.mutateAsync,
  };
};
