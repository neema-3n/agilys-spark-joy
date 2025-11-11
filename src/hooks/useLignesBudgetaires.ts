import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '@/services/api/budget.service';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { LigneBudgetaire } from '@/types/budget.types';

export function useLignesBudgetaires() {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lignes, isLoading, error, refetch } = useQuery({
    queryKey: ['lignes-budgetaires', currentExercice?.id, currentClient?.id],
    queryFn: () => budgetService.getLignesBudgetaires(currentExercice!.id, currentClient!.id),
    enabled: !!currentExercice && !!currentClient,
  });

  const createMutation = useMutation({
    mutationFn: (ligne: Omit<LigneBudgetaire, 'id' | 'dateCreation'>) => 
      budgetService.createLigneBudgetaire(ligne, currentClient!.id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lignes-budgetaires'] });
      toast({
        title: 'Succès',
        description: 'Ligne budgétaire créée avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la création de la ligne budgétaire',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LigneBudgetaire> }) =>
      budgetService.updateLigneBudgetaire(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lignes-budgetaires'] });
      toast({
        title: 'Succès',
        description: 'Ligne budgétaire modifiée avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la modification de la ligne budgétaire',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetService.deleteLigneBudgetaire(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lignes-budgetaires'] });
      toast({
        title: 'Succès',
        description: 'Ligne budgétaire supprimée avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression de la ligne budgétaire',
        variant: 'destructive',
      });
    },
  });

  return {
    lignes: lignes || [],
    isLoading,
    error,
    refetch,
    createLigne: createMutation.mutateAsync,
    updateLigne: updateMutation.mutateAsync,
    deleteLigne: deleteMutation.mutateAsync,
  };
}
