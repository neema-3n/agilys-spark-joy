import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fournisseursService } from '@/services/api/fournisseurs.service';
import { useClient } from '@/contexts/ClientContext';
import { useToast } from '@/hooks/use-toast';
import {
  CreateFournisseurInput,
  UpdateFournisseurInput,
} from '@/types/fournisseur.types';

export const useFournisseurs = () => {
  const { currentClient } = useClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fournisseurs = [], isLoading, refetch } = useQuery({
    queryKey: ['fournisseurs', currentClient?.id],
    queryFn: () => fournisseursService.getAll(currentClient!.id),
    enabled: !!currentClient,
  });

  const { data: stats } = useQuery({
    queryKey: ['fournisseurs-stats', currentClient?.id],
    queryFn: () => fournisseursService.getStatistics(currentClient!.id),
    enabled: !!currentClient,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateFournisseurInput) =>
      fournisseursService.create({ ...input, clientId: currentClient!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      toast({
        title: 'Succès',
        description: 'Fournisseur créé avec succès',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le fournisseur',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFournisseurInput }) =>
      fournisseursService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      toast({
        title: 'Succès',
        description: 'Fournisseur modifié avec succès',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le fournisseur',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fournisseursService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      toast({
        title: 'Succès',
        description: 'Fournisseur supprimé avec succès',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer ce fournisseur',
        variant: 'destructive',
      });
    },
  });

  return {
    fournisseurs,
    stats,
    isLoading,
    refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
};
