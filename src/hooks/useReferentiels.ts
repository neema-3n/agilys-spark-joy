import { useQuery } from '@tanstack/react-query';
import { referentielsService } from '@/services/api/referentiels.service';
import { ReferentielCategorie } from '@/types/referentiel.types';
import { useClient } from '@/contexts/ClientContext';

export const useReferentiels = (categorie: ReferentielCategorie, actifOnly: boolean = true) => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id || '';

  return useQuery({
    queryKey: ['referentiels', clientId, categorie, actifOnly],
    queryFn: () => referentielsService.getAllByCategorie(clientId, categorie, actifOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!clientId
  });
};
