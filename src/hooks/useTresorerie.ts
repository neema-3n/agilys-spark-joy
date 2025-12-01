import { useQuery } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { tresorerieService } from '@/services/api/tresorerie.service';

export const useTresorerie = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();

  const statsQuery = useQuery({
    queryKey: ['tresorerie-stats', currentClient?.id, currentExercice?.id],
    queryFn: () => {
      if (!currentClient?.id || !currentExercice?.id) {
        throw new Error('Client ou exercice non défini');
      }
      return tresorerieService.getStats(currentClient.id, currentExercice.id);
    },
    enabled: !!currentClient?.id && !!currentExercice?.id,
  });

  const fluxQuery = useQuery({
    queryKey: ['tresorerie-flux', currentClient?.id, currentExercice?.id],
    queryFn: () => {
      if (!currentClient?.id || !currentExercice?.id) {
        throw new Error('Client ou exercice non défini');
      }
      return tresorerieService.getFlux(currentClient.id, currentExercice.id);
    },
    enabled: !!currentClient?.id && !!currentExercice?.id,
  });

  const previsionsQuery = useQuery({
    queryKey: ['tresorerie-previsions', currentClient?.id, currentExercice?.id],
    queryFn: () => {
      if (!currentClient?.id || !currentExercice?.id) {
        throw new Error('Client ou exercice non défini');
      }
      return tresorerieService.getPrevisions(currentClient.id, currentExercice.id);
    },
    enabled: !!currentClient?.id && !!currentExercice?.id,
  });

  return {
    stats: statsQuery.data,
    flux: fluxQuery.data || [],
    previsions: previsionsQuery.data || [],
    isLoading: statsQuery.isLoading || fluxQuery.isLoading || previsionsQuery.isLoading,
    error: statsQuery.error || fluxQuery.error || previsionsQuery.error,
  };
};
