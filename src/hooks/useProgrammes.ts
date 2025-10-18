import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programmesService } from '@/services/api/programmes.service';
import { Programme } from '@/types/budget.types';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { toast } from 'sonner';

export const useProgrammes = (sectionId?: string) => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const queryClient = useQueryClient();
  const clientId = currentClient?.id || '';
  const exerciceId = currentExercice?.id || '';

  const { data: programmes = [], isLoading, error, refetch } = useQuery({
    queryKey: sectionId 
      ? ['programmes', 'section', sectionId]
      : ['programmes', clientId, exerciceId],
    queryFn: () => sectionId 
      ? programmesService.getBySectionId(sectionId)
      : programmesService.getAll(clientId, exerciceId),
    enabled: sectionId ? !!sectionId : (!!clientId && !!exerciceId),
  });

  const createMutation = useMutation({
    mutationFn: (programme: Omit<Programme, 'id' | 'created_at' | 'updated_at'>) =>
      programmesService.create(programme),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programmes'] });
      toast.success('Programme créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création du programme');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Programme> }) =>
      programmesService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programmes'] });
      toast.success('Programme modifié avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la modification du programme');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => programmesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programmes'] });
      toast.success('Programme supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du programme');
    },
  });

  return {
    programmes,
    isLoading,
    error,
    refetch,
    createProgramme: createMutation.mutateAsync,
    updateProgramme: updateMutation.mutateAsync,
    deleteProgramme: deleteMutation.mutateAsync,
  };
};
