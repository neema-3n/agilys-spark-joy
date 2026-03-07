import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { toast } from 'sonner';
import {
  createWorkflowException,
  listWorkflowExceptions,
  voteWorkflowException,
} from '@/services/api/workflow-exceptions.service';
import type {
  CreateWorkflowExceptionInput,
  VoteWorkflowExceptionInput,
  WorkflowExceptionStatus,
} from '@/types/workflow-exception.types';

export const useWorkflowExceptions = (status?: WorkflowExceptionStatus) => {
  const queryClient = useQueryClient();
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();

  const queryKey = ['workflow-exceptions', currentClient?.id, currentExercice?.id, status];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!currentExercice?.id) {
        return Promise.resolve([]);
      }
      return listWorkflowExceptions(currentExercice.id, status);
    },
    enabled: Boolean(currentExercice?.id && currentClient?.id),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkflowExceptionInput) => createWorkflowException(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-exceptions'] });
      toast.success('Demande d\'exception soumise');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de créer la demande d\'exception');
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VoteWorkflowExceptionInput }) =>
      voteWorkflowException(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-exceptions'] });
      toast.success('Vote enregistré');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible d\'enregistrer le vote');
    },
  });

  return {
    exceptions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createWorkflowException: createMutation.mutateAsync,
    voteWorkflowException: voteMutation.mutateAsync,
  };
};
