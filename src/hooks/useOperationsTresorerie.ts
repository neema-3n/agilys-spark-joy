import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { operationsTresorerieService } from '@/services/api/operations-tresorerie.service';
import type { OperationTresorerieFormData } from '@/types/operation-tresorerie.types';
import { toast } from 'sonner';

export const useOperationsTresorerie = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  const queryClient = useQueryClient();

  const clientId = currentClient?.id || '';
  const exerciceId = currentExercice?.id || '';

  const { data: operations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['operations-tresorerie-v2', clientId, exerciceId],
    queryFn: () => operationsTresorerieService.getAll(clientId, exerciceId),
    enabled: !!clientId && !!exerciceId,
  });

  const { data: stats } = useQuery({
    queryKey: ['operations-tresorerie-stats', clientId, exerciceId],
    queryFn: () => operationsTresorerieService.getStats(clientId, exerciceId),
    enabled: !!clientId && !!exerciceId,
  });

  const createMutation = useMutation({
    mutationFn: (data: OperationTresorerieFormData) =>
      operationsTresorerieService.create(clientId, exerciceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations-tresorerie-v2'] });
      queryClient.invalidateQueries({ queryKey: ['operations-tresorerie-stats'] });
      queryClient.invalidateQueries({ queryKey: ['comptes-tresorerie'] });
      toast.success('Opération enregistrée avec succès');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'enregistrement de l\'opération');
    },
  });

  const rapprocherMutation = useMutation({
    mutationFn: (operationIds: string[]) =>
      operationsTresorerieService.rapprocher(operationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations-tresorerie-v2'] });
      toast.success('Opérations rapprochées');
    },
    onError: () => {
      toast.error('Erreur lors du rapprochement');
    },
  });

  return {
    operations,
    stats,
    isLoading,
    error,
    refetch,
    createOperation: createMutation.mutateAsync,
    rapprocherOperations: rapprocherMutation.mutateAsync,
  };
};
