import { useQuery } from '@tanstack/react-query';
import { projetsService } from '@/services/api/projets.service';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';

export function useProjets() {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();

  const { data: projets, isLoading, error, refetch } = useQuery({
    queryKey: ['projets', currentExercice?.id, currentClient?.id],
    queryFn: () => projetsService.getByExercice(currentExercice!.id, currentClient!.id),
    enabled: !!currentExercice && !!currentClient,
  });

  return { 
    projets: projets || [], 
    isLoading, 
    error, 
    refetch 
  };
}

export function useProjetStats() {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['projet-stats', currentExercice?.id, currentClient?.id],
    queryFn: () => projetsService.getStatistics(currentExercice!.id, currentClient!.id),
    enabled: !!currentExercice && !!currentClient,
  });

  return { stats, isLoading, error };
}
