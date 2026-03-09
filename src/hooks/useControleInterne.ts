import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { controleInterneService } from '@/services/api/controle-interne.service';
import type {
  CreateInternalControlActionPlanInput,
  InternalControlActionPlanStatus,
  UpdateInternalControlActionPlanInput,
} from '@/types/controle-interne.types';

const useScope = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  return {
    exerciceId: currentExercice?.id,
    clientId: currentClient?.id,
    enabled: Boolean(currentExercice?.id && currentClient?.id),
  };
};

export const useControleInterneWorkspace = () => {
  const scope = useScope();

  return useQuery({
    queryKey: ['controle-interne-workspace', scope.clientId, scope.exerciceId],
    queryFn: () => {
      if (!scope.exerciceId) {
        throw new Error('Exercice non défini');
      }
      return controleInterneService.getWorkspace(scope.exerciceId);
    },
    enabled: scope.enabled,
  });
};

export const useControleInterneActionPlans = (status?: InternalControlActionPlanStatus) => {
  const scope = useScope();

  return useQuery({
    queryKey: ['controle-interne-action-plans', scope.clientId, scope.exerciceId, status],
    queryFn: () => {
      if (!scope.exerciceId) {
        throw new Error('Exercice non défini');
      }
      return controleInterneService.listActionPlans(scope.exerciceId, status);
    },
    enabled: scope.enabled,
  });
};

export const useControleInterneActionPlanEvents = (actionPlanId?: string) => {
  const scope = useScope();

  return useQuery({
    queryKey: ['controle-interne-action-plan-events', scope.clientId, scope.exerciceId, actionPlanId],
    queryFn: () => {
      if (!scope.exerciceId || !actionPlanId) {
        throw new Error('Exercice ou plan d action non défini');
      }
      return controleInterneService.listActionPlanEvents(actionPlanId, scope.exerciceId);
    },
    enabled: scope.enabled && Boolean(actionPlanId),
  });
};

export const useControleInterneMutations = () => {
  const scope = useScope();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['controle-interne-action-plans'] }),
      queryClient.invalidateQueries({ queryKey: ['controle-interne-workspace'] }),
      queryClient.invalidateQueries({ queryKey: ['controle-interne-action-plan-events'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (input: Omit<CreateInternalControlActionPlanInput, 'exerciceId'>) => {
      if (!scope.exerciceId) {
        throw new Error('Exercice non défini');
      }
      return controleInterneService.createActionPlan({ ...input, exerciceId: scope.exerciceId });
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateInternalControlActionPlanInput }) => {
      if (!scope.exerciceId) {
        throw new Error('Exercice non défini');
      }
      return controleInterneService.updateActionPlan(id, scope.exerciceId, input);
    },
    onSuccess: invalidate,
  });

  return {
    createActionPlan: createMutation.mutateAsync,
    updateActionPlan: updateMutation.mutateAsync,
    isMutating: createMutation.isPending || updateMutation.isPending,
  };
};
