import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import * as paiementsService from '@/services/api/paiements.service';
import { PaiementFormData } from '@/types/paiement.types';
import { toast } from 'sonner';

export const usePaiements = () => {
  const queryClient = useQueryClient();
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  const { user } = useAuth();

  // Fetch all paiements
  const { data: paiements = [], isLoading, error } = useQuery({
    queryKey: ['paiements', currentExercice?.id, currentClient?.id],
    queryFn: () => paiementsService.getPaiements(currentExercice!.id, currentClient!.id),
    enabled: !!currentExercice?.id && !!currentClient?.id,
  });

  // Create paiement
  const createMutation = useMutation({
    mutationFn: (data: PaiementFormData) =>
      paiementsService.createPaiement(data, currentExercice!.id, currentClient!.id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paiements'] });
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      toast.success('Paiement enregistré avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'enregistrement du paiement');
    },
  });

  // Annuler paiement
  const annulerMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      paiementsService.annulerPaiement(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paiements'] });
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      toast.success('Paiement annulé avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'annulation du paiement');
    },
  });

  // Delete paiement
  const deleteMutation = useMutation({
    mutationFn: (id: string) => paiementsService.deletePaiement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paiements'] });
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      toast.success('Paiement supprimé avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la suppression du paiement');
    },
  });

  return {
    paiements,
    isLoading,
    error,
    createPaiement: createMutation.mutateAsync,
    annulerPaiement: annulerMutation.mutateAsync,
    deletePaiement: deleteMutation.mutateAsync,
  };
};

// Hook pour récupérer les paiements d'une dépense spécifique
export const usePaiementsByDepense = (depenseId: string) => {
  const { data: paiements = [], isLoading, error } = useQuery({
    queryKey: ['paiements', 'depense', depenseId],
    queryFn: () => paiementsService.getPaiementsByDepense(depenseId),
    enabled: !!depenseId,
  });

  return {
    paiements,
    isLoading,
    error,
  };
};
