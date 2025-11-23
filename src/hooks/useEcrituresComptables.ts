import { useQuery } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { ecrituresComptablesService } from '@/services/api/ecritures-comptables.service';
import type { EcrituresFilters } from '@/types/ecriture-comptable.types';
import type { TypeOperation } from '@/types/regle-comptable.types';

export const useEcrituresComptables = (filters?: EcrituresFilters) => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();

  const query = useQuery({
    queryKey: ['ecritures-comptables', currentClient?.id, currentExercice?.id, filters],
    queryFn: () => {
      if (!currentClient?.id) {
        return Promise.resolve([]);
      }
      return ecrituresComptablesService.getAll(
        currentClient.id,
        currentExercice?.id,
        filters
      );
    },
    enabled: !!currentClient?.id,
  });

  const statsQuery = useQuery({
    queryKey: ['ecritures-comptables-stats', currentClient?.id, currentExercice?.id],
    queryFn: () => {
      if (!currentClient?.id) {
        return Promise.resolve({
          nombreTotal: 0,
          montantTotalDebit: 0,
          montantTotalCredit: 0,
          parTypeOperation: {
            reservation: { nombre: 0, montant: 0 },
            engagement: { nombre: 0, montant: 0 },
            bon_commande: { nombre: 0, montant: 0 },
            facture: { nombre: 0, montant: 0 },
            depense: { nombre: 0, montant: 0 },
            paiement: { nombre: 0, montant: 0 }
          }
        });
      }
      return ecrituresComptablesService.getStats(currentClient.id, currentExercice?.id);
    },
    enabled: !!currentClient?.id,
  });

  return {
    ecritures: query.data || [],
    stats: statsQuery.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useEcrituresBySource = (typeOperation?: TypeOperation, sourceId?: string) => {
  const query = useQuery({
    queryKey: ['ecritures-comptables', 'source', typeOperation, sourceId],
    queryFn: () => {
      if (!typeOperation || !sourceId) {
        return Promise.resolve([]);
      }
      return ecrituresComptablesService.getBySource(typeOperation, sourceId);
    },
    enabled: !!typeOperation && !!sourceId,
  });

  return {
    ecritures: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
};
