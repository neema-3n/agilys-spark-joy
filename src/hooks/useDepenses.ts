import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import * as depensesService from '@/services/api/depenses.service';
import type { DepenseFormData } from '@/types/depense.types';

export const useDepenses = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['depenses', currentExercice?.id, currentClient?.id],
    queryFn: () => {
      if (!currentExercice?.id || !currentClient?.id) {
        return Promise.resolve([]);
      }
      return depensesService.getDepenses(currentExercice.id, currentClient.id);
    },
    enabled: !!currentExercice?.id && !!currentClient?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: DepenseFormData) => {
      if (!currentExercice?.id || !currentClient?.id || !user?.id) {
        return Promise.reject(new Error('Données requises manquantes'));
      }
      return depensesService.createDepense(data, currentExercice.id, currentClient.id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      queryClient.invalidateQueries({ queryKey: ['lignes-budgetaires'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      toast({
        title: 'Succès',
        description: 'Dépense créée avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DepenseFormData> }) =>
      depensesService.updateDepense(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      toast({
        title: 'Succès',
        description: 'Dépense modifiée avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const validerMutation = useMutation({
    mutationFn: (id: string) => depensesService.validerDepense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      toast({
        title: 'Succès',
        description: 'Dépense validée avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const ordonnancerMutation = useMutation({
    mutationFn: (id: string) => depensesService.ordonnancerDepense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      toast({
        title: 'Succès',
        description: 'Dépense ordonnancée avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const marquerPayeeMutation = useMutation({
    mutationFn: ({ 
      id, 
      datePaiement, 
      modePaiement, 
      referencePaiement 
    }: { 
      id: string; 
      datePaiement: string; 
      modePaiement: string; 
      referencePaiement?: string 
    }) => depensesService.marquerPayee(id, datePaiement, modePaiement, referencePaiement),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      toast({
        title: 'Succès',
        description: 'Dépense marquée comme payée',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const annulerMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      depensesService.annulerDepense(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['paiements'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      toast({
        title: 'Dépense annulée',
        description: 'La dépense et ses paiements associés ont été annulés avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const annulerMultipleMutation = useMutation({
    mutationFn: ({ ids, motif }: { ids: string[]; motif: string }) =>
      depensesService.annulerMultipleDepenses(ids, motif),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['paiements'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      toast({
        title: 'Dépenses annulées',
        description: `${variables.ids.length} dépense${variables.ids.length > 1 ? 's ont' : ' a'} été annulée${variables.ids.length > 1 ? 's' : ''} avec succès`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => depensesService.deleteDepense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      toast({
        title: 'Succès',
        description: 'Dépense supprimée',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createFromFactureMutation = useMutation({
    mutationFn: (data: any) => {
      if (!currentExercice?.id || !currentClient?.id || !user?.id) {
        return Promise.reject(new Error('Données requises manquantes'));
      }
      return depensesService.createDepenseFromFacture(
        data,
        currentExercice.id,
        currentClient.id,
        user.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createFromEngagementMutation = useMutation({
    mutationFn: (data: any) => {
      if (!currentExercice?.id || !currentClient?.id || !user?.id) {
        return Promise.reject(new Error('Données requises manquantes'));
      }
      return depensesService.createDepenseFromEngagement(
        data,
        currentExercice.id,
        currentClient.id,
        user.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createFromReservationMutation = useMutation({
    mutationFn: (data: any) => {
      if (!currentExercice?.id || !currentClient?.id || !user?.id) {
        return Promise.reject(new Error('Données requises manquantes'));
      }
      return depensesService.createDepenseFromReservation(
        data,
        currentExercice.id,
        currentClient.id,
        user.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['depenses'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fonction simplifiée pour payer une dépense
  const payerDepense = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    return marquerPayeeMutation.mutateAsync({
      id,
      datePaiement: today,
      modePaiement: 'virement',
      referencePaiement: undefined,
    });
  };

  return {
    depenses: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createDepense: createMutation.mutateAsync,
    createDepenseFromFacture: createFromFactureMutation.mutateAsync,
    createDepenseFromEngagement: createFromEngagementMutation.mutateAsync,
    createDepenseFromReservation: createFromReservationMutation.mutateAsync,
    updateDepense: updateMutation.mutateAsync,
    validerDepense: validerMutation.mutateAsync,
    ordonnancerDepense: ordonnancerMutation.mutateAsync,
    marquerPayee: marquerPayeeMutation.mutateAsync,
    payerDepense,
    annulerDepense: annulerMutation.mutateAsync,
    annulerMultipleDepenses: annulerMultipleMutation.mutateAsync,
    deleteDepense: deleteMutation.mutateAsync,
  };
};
