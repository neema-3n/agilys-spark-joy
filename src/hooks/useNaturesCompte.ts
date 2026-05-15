import { useQuery } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';
import { naturesCompteService } from '@/services/api/natures-compte.service';

export const useNaturesCompte = () => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id || '';

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['natures-compte', clientId],
    queryFn: () => naturesCompteService.getAll(clientId),
    enabled: !!clientId,
  });

  return {
    naturesCompte: data,
    isLoading,
    error,
  };
};
