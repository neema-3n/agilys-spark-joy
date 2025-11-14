import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bonsCommandeService } from '@/services/api/bonsCommande.service';
import { CreateBonCommandeInput, UpdateBonCommandeInput } from '@/types/bonCommande.types';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { toast } from 'sonner';

export const useBonsCommande = () => {
  const queryClient = useQueryClient();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();

  const { data: bonsCommande = [], isLoading } = useQuery({
    queryKey: ['bons-commande', currentClient?.id, currentExercice?.id],
    queryFn: () => bonsCommandeService.getAll(currentClient!.id, currentExercice?.id),
    enabled: !!currentClient?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBonCommandeInput) => bonsCommandeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bons-commande'] });
      toast.success('Bon de commande créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création du bon de commande');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBonCommandeInput }) =>
      bonsCommandeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bons-commande'] });
      toast.success('Bon de commande mis à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour du bon de commande');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bonsCommandeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bons-commande'] });
      toast.success('Bon de commande supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression du bon de commande');
    },
  });

  const genererNumeroMutation = useMutation({
    mutationFn: () => bonsCommandeService.genererNumero(currentClient!.id, currentExercice!.id),
  });

  return {
    bonsCommande,
    isLoading,
    createBonCommande: createMutation.mutateAsync,
    updateBonCommande: updateMutation.mutateAsync,
    deleteBonCommande: deleteMutation.mutateAsync,
    genererNumero: genererNumeroMutation.mutateAsync,
  };
};
