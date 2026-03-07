import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import * as paiementsService from '@/services/api/paiements.service';
import { getPaiementInvalidationKeys } from '@/lib/paiement-page';
import type { PaiementFormData, PaiementMotifPayload, ReprendrePaiementPayload } from '@/types/paiement.types';
import { toast } from 'sonner';
import type { CashRiskBlockedInfo } from '@/lib/cash-risk-ui';
import { toCashRiskBlockedInfo } from '@/lib/cash-risk-ui';
import { isApiError } from '@/services/api/api-utils';

export const usePaiements = () => {
  const queryClient = useQueryClient();
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  const { user } = useAuth();
  const [cashRiskBlocked, setCashRiskBlocked] = useState<CashRiskBlockedInfo | null>(null);

  // Fetch all paiements
  const { data: paiements = [], isLoading, error } = useQuery({
    queryKey: ['paiements', currentExercice?.id, currentClient?.id],
    queryFn: () => paiementsService.getPaiements(currentExercice!.id, currentClient!.id),
    enabled: !!currentExercice?.id && !!currentClient?.id,
  });

  const invalidatePaiementDomain = (depenseId?: string) => {
    getPaiementInvalidationKeys(depenseId).forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  };

  const clearCashRiskBlocked = useCallback(() => {
    setCashRiskBlocked(null);
  }, []);

  const handleMutationError = (error: Error, fallbackMessage: string) => {
    if (!isApiError(error)) {
      setCashRiskBlocked(null);
      toast.error(error.message || fallbackMessage);
      return;
    }

    const blockedInfo = toCashRiskBlockedInfo(error);
    if (blockedInfo) {
      setCashRiskBlocked(blockedInfo);
      toast.error(blockedInfo.summary);
      return;
    }

    setCashRiskBlocked(null);
    toast.error(error.message || fallbackMessage);
  };

  const createMutation = useMutation({
    mutationFn: (data: PaiementFormData) =>
      paiementsService.createPaiement(data, currentExercice!.id, currentClient!.id, user!.id),
    onSuccess: (_, data) => {
      clearCashRiskBlocked();
      invalidatePaiementDomain(data.depenseId);
      toast.success('Paiement transmis avec succès');
    },
    onError: (error: Error) => {
      handleMutationError(error, "Erreur lors de l'enregistrement du paiement");
    },
  });

  // Annuler paiement
  const annulerMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PaiementMotifPayload }) =>
      paiementsService.annulerPaiement(id, payload),
    onSuccess: (paiement) => {
      clearCashRiskBlocked();
      invalidatePaiementDomain(paiement.depenseId);
      toast.success('Paiement annulé avec succès');
    },
    onError: (error: Error) => {
      handleMutationError(error, "Erreur lors de l'annulation du paiement");
    },
  });

  // Delete paiement
  const deleteMutation = useMutation({
    mutationFn: (id: string) => paiementsService.deletePaiement(id),
    onSuccess: () => {
      clearCashRiskBlocked();
      invalidatePaiementDomain();
      toast.success('Paiement supprimé avec succès');
    },
    onError: (error: Error) => {
      handleMutationError(error, 'Erreur lors de la suppression du paiement');
    },
  });

  const accepterMutation = useMutation({
    mutationFn: (id: string) => paiementsService.accepterPaiement(id),
    onSuccess: (paiement) => {
      clearCashRiskBlocked();
      invalidatePaiementDomain(paiement.depenseId);
      toast.success('Paiement accepté');
    },
    onError: (error: Error) => {
      handleMutationError(error, "Erreur lors de l'acceptation du paiement");
    },
  });

  const executerMutation = useMutation({
    mutationFn: (id: string) => paiementsService.executerPaiement(id),
    onSuccess: (paiement) => {
      clearCashRiskBlocked();
      invalidatePaiementDomain(paiement.depenseId);
      toast.success('Paiement exécuté');
    },
    onError: (error: Error) => {
      handleMutationError(error, "Erreur lors de l'exécution du paiement");
    },
  });

  const reconcilierMutation = useMutation({
    mutationFn: (id: string) => paiementsService.reconcilierPaiement(id),
    onSuccess: (paiement) => {
      clearCashRiskBlocked();
      invalidatePaiementDomain(paiement.depenseId);
      toast.success('Paiement rapproché');
    },
    onError: (error: Error) => {
      handleMutationError(error, 'Erreur lors du rapprochement du paiement');
    },
  });

  const rejeterMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PaiementMotifPayload }) =>
      paiementsService.rejeterPaiement(id, payload),
    onSuccess: (paiement) => {
      clearCashRiskBlocked();
      invalidatePaiementDomain(paiement.depenseId);
      toast.success('Paiement rejeté');
    },
    onError: (error: Error) => {
      handleMutationError(error, 'Erreur lors du rejet du paiement');
    },
  });

  const reprendreMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ReprendrePaiementPayload }) =>
      paiementsService.reprendrePaiement(id, payload),
    onSuccess: (paiement) => {
      clearCashRiskBlocked();
      invalidatePaiementDomain(paiement.depenseId);
      toast.success('Nouvelle tentative de paiement créée');
    },
    onError: (error: Error) => {
      handleMutationError(error, 'Erreur lors de la reprise du paiement');
    },
  });

  return {
    paiements,
    isLoading,
    error,
    cashRiskBlocked,
    clearCashRiskBlocked,
    createPaiement: createMutation.mutateAsync,
    accepterPaiement: accepterMutation.mutateAsync,
    executerPaiement: executerMutation.mutateAsync,
    reconcilierPaiement: reconcilierMutation.mutateAsync,
    rejeterPaiement: rejeterMutation.mutateAsync,
    annulerPaiement: annulerMutation.mutateAsync,
    reprendrePaiement: reprendreMutation.mutateAsync,
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
