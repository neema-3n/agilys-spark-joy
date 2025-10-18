import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sectionsService } from '@/services/api/sections.service';
import { Section } from '@/types/budget.types';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { toast } from 'sonner';

export const useSections = () => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const queryClient = useQueryClient();
  const clientId = currentClient?.id || '';
  const exerciceId = currentExercice?.id || '';

  const { data: sections = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sections', clientId, exerciceId],
    queryFn: () => sectionsService.getAll(clientId, exerciceId),
    enabled: !!clientId && !!exerciceId,
  });

  const createMutation = useMutation({
    mutationFn: (section: Omit<Section, 'id' | 'created_at' | 'updated_at'>) =>
      sectionsService.create(section),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', clientId, exerciceId] });
      toast.success('Section créée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création de la section');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Section> }) =>
      sectionsService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', clientId, exerciceId] });
      toast.success('Section modifiée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la modification de la section');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sectionsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', clientId, exerciceId] });
      toast.success('Section supprimée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression de la section');
    },
  });

  return {
    sections,
    isLoading,
    error,
    refetch,
    createSection: createMutation.mutateAsync,
    updateSection: updateMutation.mutateAsync,
    deleteSection: deleteMutation.mutateAsync,
  };
};
