import type { ChargePrincipaleMode } from '@/types/financial.types';
import type { NatureCompte } from '@/types/nature-compte.types';

interface ResolveChargePrincipaleParams {
  mode: ChargePrincipaleMode;
  natureCompteId?: string;
  compteChargeId?: string;
  naturesCompte: NatureCompte[];
}

interface ResolveChargePrincipaleResult {
  chargePrincipaleMode: ChargePrincipaleMode;
  natureCompteChargeId?: string;
  compteChargeId?: string;
  error?: string;
}

export const resolveChargePrincipale = ({
  mode,
  natureCompteId,
  compteChargeId,
  naturesCompte,
}: ResolveChargePrincipaleParams): ResolveChargePrincipaleResult => {
  if (mode === 'compte_expert') {
    if (!compteChargeId) {
      return {
        chargePrincipaleMode: 'compte_expert',
        error: 'Le compte de charge principal est requis.',
      };
    }

    return {
      chargePrincipaleMode: 'compte_expert',
      compteChargeId,
    };
  }

  if (!natureCompteId) {
    return {
      chargePrincipaleMode: 'nature',
      error: 'La nature de compte est requise.',
    };
  }

  const nature = naturesCompte.find((item) => item.id === natureCompteId);
  const resolvedCompteChargeId = nature?.compteDefautId ?? compteChargeId;

  if (!resolvedCompteChargeId) {
    return {
      chargePrincipaleMode: 'nature',
      natureCompteChargeId: natureCompteId,
      error: 'La nature de compte selectionnee n’a pas de compte de charge par defaut.',
    };
  }

  return {
    chargePrincipaleMode: 'nature',
    natureCompteChargeId: natureCompteId,
    compteChargeId: resolvedCompteChargeId,
  };
};
