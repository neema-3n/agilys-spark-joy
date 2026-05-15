import { useQuery } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';
import { taxesFiscalesService } from '@/services/api/taxes-fiscales.service';

export const useTaxesFiscales = (actifOnly = true) => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id || '';

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['taxes-fiscales', clientId, actifOnly],
    queryFn: () => taxesFiscalesService.getAll(clientId, actifOnly),
    enabled: !!clientId,
  });

  return {
    taxesFiscales: data,
    isLoading,
    error,
  };
};
