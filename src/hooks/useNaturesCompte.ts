import { useQuery } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';
import { naturesCompteService } from '@/services/api/natures-compte.service';

interface UseNaturesCompteOptions {
  actifOnly?: boolean;
  includeFallback?: boolean;
}

export const useNaturesCompte = (options: UseNaturesCompteOptions = {}) => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id || '';
  const { actifOnly = true, includeFallback = true } = options;

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['natures-compte', clientId, actifOnly, includeFallback],
    queryFn: () => naturesCompteService.getAll(clientId, { actifOnly, includeFallback }),
    enabled: !!clientId,
  });

  return {
    naturesCompte: data,
    isLoading,
    error,
  };
};
