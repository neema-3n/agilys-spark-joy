import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import * as engagementsService from '@/services/api/engagements.service';
import type { EngagementFormData } from '@/types/engagement.types';
import type { CashRiskBlockedInfo } from '@/lib/cash-risk-ui';
import { toCashRiskBlockedInfo } from '@/lib/cash-risk-ui';
import { isApiError } from '@/services/api/api-utils';

export const useEngagements = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cashRiskBlocked, setCashRiskBlocked] = useState<CashRiskBlockedInfo | null>(null);

  const query = useQuery({
    queryKey: ['engagements', currentExercice?.id, currentClient?.id],
    queryFn: () => {
      if (!currentExercice?.id || !currentClient?.id) {
        return Promise.resolve([]);
      }
      return engagementsService.getEngagements(currentExercice.id, currentClient.id);
    },
    enabled: !!currentExercice?.id && !!currentClient?.id,
  });

  const clearCashRiskBlocked = useCallback(() => {
    setCashRiskBlocked(null);
  }, []);

  const handleMutationError = (error: Error) => {
    if (!isApiError(error)) {
      setCashRiskBlocked(null);
      return;
    }

    const blockedInfo = toCashRiskBlockedInfo(error);
    setCashRiskBlocked(blockedInfo);
  };

  const createMutation = useMutation({
    mutationFn: (data: EngagementFormData) => {
      if (!currentExercice?.id || !currentClient?.id || !user?.id) {
        return Promise.reject(new Error('Missing required data'));
      }
      return engagementsService.createEngagement(data, currentExercice.id, currentClient.id, user.id);
    },
    onSuccess: () => {
      clearCashRiskBlocked();
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
    },
    onError: (error: Error) => {
      handleMutationError(error);
    },
  });

  const createFromReservationMutation = useMutation({
    mutationFn: ({ 
      reservationId, 
      additionalData 
    }: { 
      reservationId: string; 
      additionalData?: Partial<EngagementFormData> 
    }) => {
      if (!currentExercice?.id || !currentClient?.id || !user?.id) {
        return Promise.reject(new Error('Missing required data'));
      }
      return engagementsService.createEngagementFromReservation(
        reservationId,
        additionalData || {},
        currentExercice.id,
        currentClient.id,
        user.id
      );
    },
    onSuccess: () => {
      clearCashRiskBlocked();
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
    },
    onError: (error: Error) => {
      handleMutationError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EngagementFormData> }) =>
      engagementsService.updateEngagement(id, updates),
    onSuccess: () => {
      clearCashRiskBlocked();
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    },
    onError: (error: Error) => {
      handleMutationError(error);
    },
  });

  const validerMutation = useMutation({
    mutationFn: (id: string) => engagementsService.validerEngagement(id),
    onSuccess: () => {
      clearCashRiskBlocked();
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
    },
    onError: (error: Error) => {
      handleMutationError(error);
    },
  });

  const annulerMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      engagementsService.annulerEngagement(id, motif),
    onSuccess: () => {
      clearCashRiskBlocked();
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      queryClient.invalidateQueries({ queryKey: ['ecritures-comptables'] });
    },
    onError: (error: Error) => {
      handleMutationError(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => engagementsService.deleteEngagement(id),
    onSuccess: () => {
      clearCashRiskBlocked();
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    },
    onError: (error: Error) => {
      handleMutationError(error);
    },
  });

  return {
    engagements: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    cashRiskBlocked,
    clearCashRiskBlocked,
    createEngagement: createMutation.mutateAsync,
    createEngagementFromReservation: createFromReservationMutation.mutateAsync,
    updateEngagement: updateMutation.mutateAsync,
    validerEngagement: validerMutation.mutateAsync,
    annulerEngagement: annulerMutation.mutateAsync,
    deleteEngagement: deleteMutation.mutateAsync,
  };
};
