import { useQuery } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';
import { modelesFiscauxService } from '@/services/api/modeles-fiscaux.service';

export const useModelesFiscaux = (actifOnly = true) => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id || '';

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['modeles-fiscaux', clientId, actifOnly],
    queryFn: () => modelesFiscauxService.getAll(clientId, actifOnly),
    enabled: !!clientId,
  });

  return {
    modelesFiscaux: data,
    isLoading,
    error,
  };
};
