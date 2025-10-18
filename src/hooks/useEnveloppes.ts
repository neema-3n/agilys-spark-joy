import { useQuery } from '@tanstack/react-query';
import { enveloppesService } from '@/services/api/enveloppes.service';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';

export function useEnveloppes() {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();

  const { data: enveloppes, isLoading, error, refetch } = useQuery({
    queryKey: ['enveloppes', currentExercice?.id, currentClient?.id],
    queryFn: () => enveloppesService.getAll(currentClient!.id, currentExercice!.id),
    enabled: !!currentExercice && !!currentClient,
  });

  return { 
    enveloppes: enveloppes || [], 
    isLoading, 
    error, 
    refetch 
  };
}
