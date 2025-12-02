import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reglesComptablesService } from '@/services/api/regles-comptables.service';
import { useClient } from '@/contexts/ClientContext';
import type { CreateRegleComptableInput, UpdateRegleComptableInput, TypeOperation } from '@/types/regle-comptable.types';
import { toast } from 'sonner';

export const useReglesComptables = (typeOperation?: TypeOperation) => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id || '';
  const queryClient = useQueryClient();

  const queryKey = typeOperation 
    ? ['regles-comptables', clientId, typeOperation]
    : ['regles-comptables', clientId];

  const { data: regles = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => reglesComptablesService.getAll(clientId, typeOperation),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateRegleComptableInput) => reglesComptablesService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regles-comptables', clientId] });
      toast.success('Règle comptable créée avec succès');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création de la règle');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRegleComptableInput }) =>
      reglesComptablesService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regles-comptables', clientId] });
      toast.success('Règle comptable mise à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour de la règle');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reglesComptablesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regles-comptables', clientId] });
      toast.success('Règle comptable supprimée avec succès');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression de la règle');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ typeOp, orderedIds }: { typeOp: TypeOperation; orderedIds: string[] }) =>
      reglesComptablesService.reorder(clientId, typeOp, orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regles-comptables', clientId] });
      toast.success('Ordre des règles mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors du réordonnancement');
    },
  });

  return {
    regles,
    isLoading,
    error,
    refetch,
    createRegle: createMutation.mutateAsync,
    updateRegle: updateMutation.mutateAsync,
    deleteRegle: deleteMutation.mutateAsync,
    reorderRegles: reorderMutation.mutateAsync,
  };
};
