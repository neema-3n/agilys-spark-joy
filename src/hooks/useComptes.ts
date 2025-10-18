import { useQuery } from '@tanstack/react-query';
import { comptesService } from '@/services/api/comptes.service';
import { useClient } from '@/contexts/ClientContext';

export const useComptes = () => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id || '';

  const { data: comptes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['comptes', clientId],
    queryFn: () => comptesService.getAll(clientId),
    enabled: !!clientId,
  });

  return {
    comptes,
    isLoading,
    error,
    refetch,
  };
};
