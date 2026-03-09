import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import {
  getRapprochementInvalidationKeys,
  rapprochementsBancairesService,
} from '@/services/api/rapprochements-bancaires.service';
import type {
  ManualRapprochementDecisionInput,
  RapprochementBancaireFormData,
} from '@/types/rapprochement-bancaire.types';
import { toast } from 'sonner';

const invalidateRapprochementKeys = async (queryClient: ReturnType<typeof useQueryClient>, id?: string) => {
  const keys = getRapprochementInvalidationKeys(id);
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
};

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
    onSuccess: async () => {
      await invalidateRapprochementKeys(queryClient);
      toast.success('Rapprochement créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création du rapprochement');
    },
  });

  const validerMutation = useMutation({
    mutationFn: (id: string) => rapprochementsBancairesService.valider(id),
    onSuccess: async () => {
      await invalidateRapprochementKeys(queryClient);
      toast.success('Rapprochement validé');
    },
    onError: () => {
      toast.error('Erreur lors de la validation');
    },
  });

  const decisionMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ManualRapprochementDecisionInput }) =>
      rapprochementsBancairesService.applyDecision(id, input),
    onSuccess: async (_, variables) => {
      await invalidateRapprochementKeys(queryClient, variables.id);
      toast.success('Décision de rapprochement enregistrée');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la décision de rapprochement');
    },
  });

  return {
    rapprochements,
    isLoading,
    error,
    refetch,
    createRapprochement: createMutation.mutateAsync,
    createPending: createMutation.isPending,
    validerRapprochement: validerMutation.mutateAsync,
    validerPending: validerMutation.isPending,
    appliquerDecisionRapprochement: decisionMutation.mutateAsync,
    decisionPending: decisionMutation.isPending,
  };
};

export const useRapprochementBancaireDetail = (id?: string) => {
  return useQuery({
    queryKey: ['rapprochements-bancaires', 'detail', id],
    queryFn: () => {
      if (!id) {
        throw new Error('Rapprochement non défini');
      }
      return rapprochementsBancairesService.getById(id);
    },
    enabled: Boolean(id),
  });
};
