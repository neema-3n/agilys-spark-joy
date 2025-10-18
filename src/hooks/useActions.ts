import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { actionsService } from '@/services/api/actions.service';
import { Action } from '@/types/budget.types';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { toast } from 'sonner';

export const useActions = (programmeId?: string) => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const queryClient = useQueryClient();
  const clientId = currentClient?.id || '';
  const exerciceId = currentExercice?.id || '';

  const { data: actions = [], isLoading, error, refetch } = useQuery({
    queryKey: programmeId 
      ? ['actions', 'programme', programmeId]
      : ['actions', clientId, exerciceId],
    queryFn: () => programmeId 
      ? actionsService.getByProgrammeId(programmeId)
      : actionsService.getAll(clientId, exerciceId),
    enabled: programmeId ? !!programmeId : (!!clientId && !!exerciceId),
  });

  const createMutation = useMutation({
    mutationFn: (action: Omit<Action, 'id' | 'created_at' | 'updated_at'>) =>
      actionsService.create(action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      toast.success('Action créée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création de l\'action');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Action> }) =>
      actionsService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      toast.success('Action modifiée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la modification de l\'action');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => actionsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      toast.success('Action supprimée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression de l\'action');
    },
  });

  return {
    actions,
    isLoading,
    error,
    refetch,
    createAction: createMutation.mutateAsync,
    updateAction: updateMutation.mutateAsync,
    deleteAction: deleteMutation.mutateAsync,
  };
};
