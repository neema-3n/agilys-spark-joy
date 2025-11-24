import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ecrituresComptablesService } from '@/services/api/ecritures-comptables.service';
import { toast } from 'sonner';
import type { TypeOperation } from '@/types/regle-comptable.types';

export const useGenerateEcritures = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      typeOperation,
      sourceId,
      clientId,
      exerciceId
    }: {
      typeOperation: TypeOperation;
      sourceId: string;
      clientId: string;
      exerciceId: string;
    }) => ecrituresComptablesService.generateForOperation(
      typeOperation,
      sourceId,
      clientId,
      exerciceId
    ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      toast.success(`${data.ecritures_count || 0} écriture(s) générée(s)`);
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la génération des écritures', {
        description: error.message
      });
    }
  });
};
