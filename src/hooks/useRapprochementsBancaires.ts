import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { rapprochementsBancairesService } from '@/services/api/rapprochements-bancaires.service';
import type { RapprochementBancaireFormData } from '@/types/rapprochement-bancaire.types';
import { toast } from 'sonner';

export const useRapprochementsBancaires = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  const queryClient = useQueryClient();

  const clientId = currentClient?.id || '';
  const exerciceId = currentExercice?.id || '';

  const { data: rapprochements = [], isLoading, error, refetch } = useQuery({
    queryKey: ['rapprochements-bancaires', clientId, exerciceId],
    queryFn: () => rapprochementsBancairesService.getAll(clientId, exerciceId),
    enabled: !!clientId && !!exerciceId,
  });

  const createMutation = useMutation({
    mutationFn: (data: RapprochementBancaireFormData) =>
      rapprochementsBancairesService.create(clientId, exerciceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapprochements-bancaires'] });
      toast.success('Rapprochement créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création du rapprochement');
    },
  });

  const validerMutation = useMutation({
    mutationFn: (id: string) => rapprochementsBancairesService.valider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rapprochements-bancaires'] });
      queryClient.invalidateQueries({ queryKey: ['operations-tresorerie'] });
      toast.success('Rapprochement validé');
    },
    onError: () => {
      toast.error('Erreur lors de la validation');
    },
  });

  return {
    rapprochements,
    isLoading,
    error,
    refetch,
    createRapprochement: createMutation.mutateAsync,
    validerRapprochement: validerMutation.mutateAsync,
  };
};
