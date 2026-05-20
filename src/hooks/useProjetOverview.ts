import { useMemo } from 'react';
import type { BonCommande } from '@/types/bonCommande.types';
import type { Depense } from '@/types/depense.types';
import type { Engagement } from '@/types/engagement.types';
import type { Facture } from '@/types/facture.types';
import type { Paiement } from '@/types/paiement.types';
import { useBonsCommande } from '@/hooks/useBonsCommande';
import { useDepenses } from '@/hooks/useDepenses';
import { useEngagements } from '@/hooks/useEngagements';
import { useFactures } from '@/hooks/useFactures';
import { usePaiements } from '@/hooks/usePaiements';

type ProjetFlowSummary = {
  count: number;
  amount: number;
};

type ProjetRecentCollections = {
  engagements: Engagement[];
  bonsCommande: BonCommande[];
  factures: Facture[];
  depenses: Depense[];
  paiements: Paiement[];
};

export interface ProjetOverview {
  isLoading: boolean;
  engagements: Engagement[];
  bonsCommande: BonCommande[];
  factures: Facture[];
  depenses: Depense[];
  paiements: Paiement[];
  active: {
    engagements: ProjetFlowSummary;
    bonsCommande: ProjetFlowSummary;
    factures: ProjetFlowSummary;
    depenses: ProjetFlowSummary;
    paiements: ProjetFlowSummary;
  };
  recent: ProjetRecentCollections;
  totals: {
    resteAEngager: number;
    resteAFacturer: number;
    resteAPayer: number;
  };
}

const sortByDateDesc = <T>(items: T[], getDate: (item: T) => string | undefined) =>
  [...items].sort((a, b) => {
    const aTime = new Date(getDate(a) || 0).getTime();
    const bTime = new Date(getDate(b) || 0).getTime();
    return bTime - aTime;
  });

export const useProjetOverview = (projetId?: string | null): ProjetOverview => {
  const { engagements, isLoading: engagementsLoading } = useEngagements();
  const { bonsCommande, isLoading: bonsCommandeLoading } = useBonsCommande();
  const { factures, isLoading: facturesLoading } = useFactures();
  const { depenses, isLoading: depensesLoading } = useDepenses();
  const { paiements, isLoading: paiementsLoading } = usePaiements();

  return useMemo(() => {
    const linkedEngagements = projetId
      ? engagements.filter((item) => item.projetId === projetId)
      : [];
    const linkedBonsCommande = projetId
      ? bonsCommande.filter((item) => item.projetId === projetId)
      : [];
    const linkedFactures = projetId
      ? factures.filter((item) => item.projetId === projetId)
      : [];
    const linkedDepenses = projetId
      ? depenses.filter((item) => item.projetId === projetId)
      : [];
    const linkedPaiements = projetId
      ? paiements.filter((item) => item.projetId === projetId)
      : [];

    const activeEngagements = linkedEngagements.filter((item) => item.statut !== 'annule');
    const activeBonsCommande = linkedBonsCommande.filter((item) => item.statut !== 'annule');
    const activeFactures = linkedFactures.filter((item) => item.statut !== 'annulee');
    const activeDepenses = linkedDepenses.filter((item) => item.statut !== 'annulee');
    const activePaiements = linkedPaiements.filter((item) => item.statut === 'valide');

    const active = {
      engagements: {
        count: activeEngagements.length,
        amount: activeEngagements.reduce((sum, item) => sum + item.montant, 0),
      },
      bonsCommande: {
        count: activeBonsCommande.length,
        amount: activeBonsCommande.reduce((sum, item) => sum + item.montant, 0),
      },
      factures: {
        count: activeFactures.length,
        amount: activeFactures.reduce((sum, item) => sum + item.montantTTC, 0),
      },
      depenses: {
        count: activeDepenses.length,
        amount: activeDepenses.reduce((sum, item) => sum + item.montant, 0),
      },
      paiements: {
        count: activePaiements.length,
        amount: activePaiements.reduce((sum, item) => sum + item.montant, 0),
      },
    };

    const recent = {
      engagements: sortByDateDesc(linkedEngagements, (item) => item.dateCreation).slice(0, 3),
      bonsCommande: sortByDateDesc(linkedBonsCommande, (item) => item.dateCommande).slice(0, 3),
      factures: sortByDateDesc(linkedFactures, (item) => item.dateFacture).slice(0, 3),
      depenses: sortByDateDesc(linkedDepenses, (item) => item.dateDepense).slice(0, 3),
      paiements: sortByDateDesc(linkedPaiements, (item) => item.datePaiement).slice(0, 3),
    };

    return {
      isLoading:
        engagementsLoading ||
        bonsCommandeLoading ||
        facturesLoading ||
        depensesLoading ||
        paiementsLoading,
      engagements: linkedEngagements,
      bonsCommande: linkedBonsCommande,
      factures: linkedFactures,
      depenses: linkedDepenses,
      paiements: linkedPaiements,
      active,
      recent,
      totals: {
        resteAEngager: Math.max(0, active.engagements.amount - active.bonsCommande.amount),
        resteAFacturer: Math.max(0, active.factures.amount - active.depenses.amount),
        resteAPayer: Math.max(0, active.depenses.amount - active.paiements.amount),
      },
    };
  }, [
    bonsCommande,
    bonsCommandeLoading,
    depenses,
    depensesLoading,
    engagements,
    engagementsLoading,
    factures,
    facturesLoading,
    paiements,
    paiementsLoading,
    projetId,
  ]);
};
