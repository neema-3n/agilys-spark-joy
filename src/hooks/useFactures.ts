import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facturesService } from '@/services/api/factures.service';
import { CreateFactureInput, UpdateFactureInput } from '@/types/facture.types';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { toast } from 'sonner';

export const useFactures = () => {
  const queryClient = useQueryClient();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();

  const { data: factures = [], isLoading } = useQuery({
    queryKey: ['factures', currentClient?.id, currentExercice?.id],
    queryFn: () => facturesService.getAll(currentClient!.id, currentExercice?.id),
    enabled: !!currentClient,
  });

  const createMutation = useMutation({
    mutationFn: ({ facture, skipToast }: { facture: CreateFactureInput; skipToast?: boolean }) => 
      facturesService.create(facture),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      if (!variables.skipToast) {
        toast.success('Facture créée avec succès');
      }
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, facture }: { id: string; facture: UpdateFactureInput }) =>
      facturesService.update(id, facture),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture mise à jour avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => facturesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture supprimée avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const genererNumeroMutation = useMutation({
    mutationFn: ({ clientId, exerciceId }: { clientId: string; exerciceId: string }) =>
      facturesService.genererNumero(clientId, exerciceId),
  });

  const validerMutation = useMutation({
    mutationFn: (id: string) => facturesService.validerFacture(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture validée avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const marquerPayeeMutation = useMutation({
    mutationFn: (id: string) => facturesService.marquerPayee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture marquée comme payée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const annulerMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      facturesService.annuler(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture annulée avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    factures,
    isLoading,
    createFacture: createMutation.mutateAsync,
    updateFacture: updateMutation.mutateAsync,
    deleteFacture: deleteMutation.mutateAsync,
    genererNumero: genererNumeroMutation.mutateAsync,
    validerFacture: validerMutation.mutateAsync,
    marquerPayee: marquerPayeeMutation.mutateAsync,
    annulerFacture: annulerMutation.mutateAsync,
  };
};
