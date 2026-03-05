import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facturesService } from '@/services/api/factures.service';
import { CreateFactureInput, UpdateFactureInput, PaginationParams } from '@/types/facture.types';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { toast } from 'sonner';
import { useServerPagination } from './useServerPagination';
import type { Facture } from '@/types/facture.types';
import { showMutationErrorToast } from './useMutationErrorToast';

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
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      if (!variables.skipToast) {
        toast.success('Facture créée avec succès');
      }
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, "Erreur lors de la création de la facture");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, facture }: { id: string; facture: UpdateFactureInput }) =>
      facturesService.update(id, facture),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture mise à jour avec succès');
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, 'Erreur lors de la mise à jour de la facture');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => facturesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture supprimée avec succès');
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, 'Erreur lors de la suppression de la facture');
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
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      toast.success('Facture validée avec succès');
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, 'Erreur lors de la validation de la facture');
    },
  });

  const marquerPayeeMutation = useMutation({
    mutationFn: (id: string) => facturesService.marquerPayee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      toast.success('Facture marquée comme payée');
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, 'Erreur lors du passage au statut payée');
    },
  });

  const annulerMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      facturesService.annuler(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
      toast.success('Facture annulée avec succès');
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, "Erreur lors de l'annulation de la facture");
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

export const useFacturesPaginated = () => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const queryClient = useQueryClient();

  const pagination = useServerPagination<Facture>({
    queryKey: ['factures-paginated', currentClient?.id, currentExercice?.id],
    queryFn: (params: PaginationParams) => 
      facturesService.getPaginated(currentClient!.id, currentExercice?.id, params),
    initialPageSize: 25,
    enableUrlSync: true,
    enablePrefetch: true,
    storageKey: 'factures-pagination',
    enabled: !!currentClient,
  });

  const createMutation = useMutation({
    mutationFn: ({ facture, skipToast }: { facture: CreateFactureInput; skipToast?: boolean }) => 
      facturesService.create(facture),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['factures-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      if (!variables.skipToast) {
        toast.success('Facture créée avec succès');
      }
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, "Erreur lors de la création de la facture");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, facture }: { id: string; facture: UpdateFactureInput }) =>
      facturesService.update(id, facture),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture mise à jour avec succès');
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, 'Erreur lors de la mise à jour de la facture');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => facturesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture supprimée avec succès');
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, 'Erreur lors de la suppression de la facture');
    },
  });

  const validerMutation = useMutation({
    mutationFn: (id: string) => facturesService.validerFacture(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture validée avec succès');
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, 'Erreur lors de la validation de la facture');
    },
  });

  const marquerPayeeMutation = useMutation({
    mutationFn: (id: string) => facturesService.marquerPayee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture marquée comme payée');
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, 'Erreur lors du passage au statut payée');
    },
  });

  const annulerMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      facturesService.annuler(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factures-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture annulée avec succès');
    },
    onError: (error: unknown) => {
      showMutationErrorToast(error, "Erreur lors de l'annulation de la facture");
    },
  });

  return {
    ...pagination,
    createFacture: createMutation.mutateAsync,
    updateFacture: updateMutation.mutateAsync,
    deleteFacture: deleteMutation.mutateAsync,
    validerFacture: validerMutation.mutateAsync,
    marquerPayee: marquerPayeeMutation.mutateAsync,
    annulerFacture: annulerMutation.mutateAsync,
  };
};
