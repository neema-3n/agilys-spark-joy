import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useActions } from '@/hooks/useActions';
import { useEngagements } from '@/hooks/useEngagements';
import { useFactures } from '@/hooks/useFactures';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useProgrammes } from '@/hooks/useProgrammes';
import { useProjets } from '@/hooks/useProjets';
import { useReservations } from '@/hooks/useReservations';
import { useSections } from '@/hooks/useSections';
import { buildAnalysesView, toChartRows, type AnalysesFilters } from '@/lib/analyses-financieres';
import { structuresService } from '@/services/api/structures.service';

export type { AnalysesFilters } from '@/lib/analyses-financieres';

export const useAnalysesFinancieres = (filters: AnalysesFilters) => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();

  const lignesQuery = useLignesBudgetaires();
  const projetsQuery = useProjets();
  const sectionsQuery = useSections();
  const programmesQuery = useProgrammes();
  const actionsQuery = useActions();
  const reservationsQuery = useReservations();
  const engagementsQuery = useEngagements();
  const facturesQuery = useFactures();

  const structuresQuery = useQuery({
    queryKey: ['structures', currentClient?.id, currentExercice?.id],
    queryFn: () => structuresService.getAll(currentClient!.id, currentExercice?.id),
    enabled: Boolean(currentClient?.id),
  });

  const aggregation = useMemo(
    () =>
      buildAnalysesView(
        {
          lignes: lignesQuery.lignes,
          projets: projetsQuery.projets,
          structures: structuresQuery.data ?? [],
          sections: sectionsQuery.sections,
          programmes: programmesQuery.programmes,
          actions: actionsQuery.actions,
          engagements: engagementsQuery.engagements,
          factures: facturesQuery.factures,
          reservations: reservationsQuery.reservations
        },
        filters
      ),
    [
      actionsQuery.actions,
      engagementsQuery.engagements,
      facturesQuery.factures,
      filters,
      lignesQuery.lignes,
      programmesQuery.programmes,
      projetsQuery.projets,
      reservationsQuery.reservations,
      sectionsQuery.sections,
      structuresQuery.data
    ]
  );

  const isLoading =
    lignesQuery.isLoading ||
    projetsQuery.isLoading ||
    sectionsQuery.isLoading ||
    programmesQuery.isLoading ||
    actionsQuery.isLoading ||
    reservationsQuery.isLoading ||
    engagementsQuery.isLoading ||
    facturesQuery.isLoading ||
    structuresQuery.isLoading;

  const error =
    (lignesQuery.error as Error | null) ||
    (projetsQuery.error as Error | null) ||
    (sectionsQuery.error as Error | null) ||
    (programmesQuery.error as Error | null) ||
    (actionsQuery.error as Error | null) ||
    (reservationsQuery.error as Error | null) ||
    (engagementsQuery.error as Error | null) ||
    (structuresQuery.error as Error | null) ||
    null;

  return {
    isLoading,
    error,
    kpis: aggregation.kpis,
    counts: aggregation.counts,
    projetRows: aggregation.projetRows,
    structureRows: aggregation.structureRows,
    axeRows: aggregation.axeRows,
    projetChartRows: toChartRows(aggregation.projetRows),
    structureChartRows: toChartRows(aggregation.structureRows),
    axeChartRows: toChartRows(aggregation.axeRows),
    exportRows: aggregation.exportRows,
    options: {
      projets: projetsQuery.projets,
      structures: (structuresQuery.data ?? []).filter((item) => item.type === 'centre_cout'),
      sections: sectionsQuery.sections,
      programmes: programmesQuery.programmes,
      actions: actionsQuery.actions
    }
  };
};
