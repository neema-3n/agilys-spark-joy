import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { integrationLegacyService } from '@/services/api/integration-legacy.service';
import type { IntegrationSupervisionFilters } from '@/types/integration-legacy.types';

const useIntegrationLegacyContext = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();

  return {
    exerciceId: currentExercice?.id,
    clientId: currentClient?.id,
    isEnabled: Boolean(currentExercice?.id && currentClient?.id),
  };
};

export const useIntegrationLegacySupervision = (filters: IntegrationSupervisionFilters = {}) => {
  const { exerciceId, clientId, isEnabled } = useIntegrationLegacyContext();

  return useQuery({
    queryKey: ['integration-legacy-supervision', clientId, exerciceId, filters],
    queryFn: () => {
      if (!clientId || !exerciceId) {
        throw new Error('Client ou exercice non défini');
      }
      return integrationLegacyService.getSupervision(clientId, exerciceId, filters);
    },
    enabled: isEnabled,
  });
};

export const useRetryIntegrationEvent = () => {
  const { exerciceId, clientId } = useIntegrationLegacyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { eventId: string; reasonCode?: string; reasonMessage?: string }) => {
      if (!clientId || !exerciceId) {
        throw new Error('Client ou exercice non défini');
      }

      return integrationLegacyService.retry(clientId, {
        eventId: input.eventId,
        exerciceId,
        reasonCode: input.reasonCode,
        reasonMessage: input.reasonMessage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-legacy-supervision'] });
    },
  });
};

export const useRemediateIntegrationEvent = () => {
  const { exerciceId, clientId } = useIntegrationLegacyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      eventId: string;
      action: 'retry' | 'escalate' | 'reconcile-manual';
      priority?: 'P1' | 'P2' | 'P3';
      treatmentStatus?: 'open' | 'triaged' | 'in_progress' | 'resolved' | 'closed';
      owner?: string;
      reasonCode?: string;
      reasonMessage?: string;
    }) => {
      if (!clientId || !exerciceId) {
        throw new Error('Client ou exercice non défini');
      }

      return integrationLegacyService.remediate(clientId, {
        eventId: input.eventId,
        exerciceId,
        action: input.action,
        priority: input.priority,
        treatmentStatus: input.treatmentStatus,
        owner: input.owner,
        reasonCode: input.reasonCode,
        reasonMessage: input.reasonMessage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-legacy-supervision'] });
    },
  });
};
