import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';
import { comptesTresorerieService } from '@/services/api/comptes-tresorerie.service';
import type { CompteTresorerieFormData } from '@/types/compte-tresorerie.types';
import { toast } from 'sonner';

export const useComptesTresorerie = () => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id || '';
  const queryClient = useQueryClient();

  const { data: comptes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['comptes-tresorerie', clientId],
    queryFn: () => comptesTresorerieService.getAll(clientId),
    enabled: !!clientId,
  });

  const { data: comptesActifs = [] } = useQuery({
    queryKey: ['comptes-tresorerie-actifs', clientId],
    queryFn: () => comptesTresorerieService.getActifs(clientId),
    enabled: !!clientId,
  });

  const { data: stats } = useQuery({
    queryKey: ['comptes-tresorerie-stats', clientId],
    queryFn: () => comptesTresorerieService.getStats(clientId),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CompteTresorerieFormData) =>
      comptesTresorerieService.create(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comptes-tresorerie'] });
      toast.success('Compte créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création du compte');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CompteTresorerieFormData> }) =>
      comptesTresorerieService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comptes-tresorerie'] });
      toast.success('Compte modifié avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la modification du compte');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => comptesTresorerieService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comptes-tresorerie'] });
      toast.success('Compte supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du compte');
    },
  });

  return {
    comptes,
    comptesActifs,
    stats,
    isLoading,
    error,
    refetch,
    createCompte: createMutation.mutateAsync,
    updateCompte: updateMutation.mutateAsync,
    deleteCompte: deleteMutation.mutateAsync,
  };
};
