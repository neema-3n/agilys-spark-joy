import { useQuery } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { tresorerieService } from '@/services/api/tresorerie.service';
import type { TresorerieAuditFilters } from '@/types/tresorerie.types';

const useTresorerieContext = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();

  return {
    exerciceId: currentExercice?.id,
    clientId: currentClient?.id,
    isEnabled: Boolean(currentExercice?.id && currentClient?.id),
  };
};

export const useTresorerie = () => {
  const { exerciceId, clientId, isEnabled } = useTresorerieContext();

  const statsQuery = useQuery({
    queryKey: ['tresorerie-stats', clientId, exerciceId],
    queryFn: () => {
      if (!clientId || !exerciceId) {
        throw new Error('Client ou exercice non défini');
      }
      return tresorerieService.getStats(clientId, exerciceId);
    },
    enabled: isEnabled,
  });

  const fluxQuery = useQuery({
    queryKey: ['tresorerie-flux', clientId, exerciceId],
    queryFn: () => {
      if (!clientId || !exerciceId) {
        throw new Error('Client ou exercice non défini');
      }
      return tresorerieService.getFlux(clientId, exerciceId);
    },
    enabled: isEnabled,
  });

  const previsionsQuery = useQuery({
    queryKey: ['tresorerie-previsions', clientId, exerciceId],
    queryFn: () => {
      if (!clientId || !exerciceId) {
        throw new Error('Client ou exercice non défini');
      }
      return tresorerieService.getPrevisions(clientId, exerciceId);
    },
    enabled: isEnabled,
  });

  return {
    stats: statsQuery.data,
    flux: fluxQuery.data || [],
    previsions: previsionsQuery.data || [],
    isLoading: statsQuery.isLoading || fluxQuery.isLoading || previsionsQuery.isLoading,
    error: statsQuery.error || fluxQuery.error || previsionsQuery.error,
  };
};

export const useTresorerieSupervision = () => {
  const { exerciceId, clientId, isEnabled } = useTresorerieContext();

  return useQuery({
    queryKey: ['tresorerie-supervision', clientId, exerciceId],
    queryFn: () => {
      if (!clientId || !exerciceId) {
        throw new Error('Client ou exercice non défini');
      }
      return tresorerieService.getSupervision(clientId, exerciceId);
    },
    enabled: isEnabled,
  });
};

export const useExceptionAudit = (filters: TresorerieAuditFilters) => {
  const { exerciceId, clientId, isEnabled } = useTresorerieContext();

  return useQuery({
    queryKey: ['exception-audit', clientId, exerciceId, filters],
    queryFn: () => {
      if (!clientId || !exerciceId) {
        throw new Error('Client ou exercice non défini');
      }
      return tresorerieService.getExceptionAudit(clientId, exerciceId, filters);
    },
    enabled: isEnabled,
  });
};

export const useExceptionAuditDetail = (input: { exceptionId?: string; correlationId?: string }) => {
  const { exerciceId, clientId, isEnabled } = useTresorerieContext();
  const hasIdentifier = Boolean(input.exceptionId || input.correlationId);

  return useQuery({
    queryKey: ['exception-audit-detail', clientId, exerciceId, input],
    queryFn: () => {
      if (!clientId || !exerciceId) {
        throw new Error('Client ou exercice non défini');
      }
      return tresorerieService.getExceptionAuditDetail(clientId, exerciceId, input);
    },
    enabled: isEnabled && hasIdentifier,
  });
};
