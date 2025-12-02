import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import * as reservationsService from '@/services/api/reservations.service';
import type { ReservationCreditFormData } from '@/types/reservation.types';

export const useReservations = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reservations', currentExercice?.id, currentClient?.id],
    queryFn: () => {
      if (!currentExercice?.id || !currentClient?.id) {
        return Promise.resolve([]);
      }
      return reservationsService.getReservations(currentExercice.id, currentClient.id);
    },
    enabled: !!currentExercice?.id && !!currentClient?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: ReservationCreditFormData) => {
      if (!currentExercice?.id || !currentClient?.id || !user?.id) {
        return Promise.reject(new Error('Missing required data'));
      }
      return reservationsService.createReservation(data, currentExercice.id, currentClient.id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ReservationCreditFormData> }) =>
      reservationsService.updateReservation(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  const utiliserMutation = useMutation({
    mutationFn: (id: string) => reservationsService.utiliserReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
    },
  });

  const annulerMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      reservationsService.annulerReservation(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reservationsService.deleteReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  return {
    reservations: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    fetchReservationById: reservationsService.getReservationById,
    createReservation: createMutation.mutateAsync,
    updateReservation: updateMutation.mutateAsync,
    utiliserReservation: utiliserMutation.mutateAsync,
    annulerReservation: annulerMutation.mutateAsync,
    deleteReservation: deleteMutation.mutateAsync,
  };
};
