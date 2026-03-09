import { useMemo } from 'react';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useEcartsPrevisionExecution } from '@/hooks/usePrevisions';
import { useTresorerieSupervision } from '@/hooks/useTresorerie';
import { useSections } from '@/hooks/useSections';
import { useProgrammes } from '@/hooks/useProgrammes';
import { useActions } from '@/hooks/useActions';
import { useEnveloppes } from '@/hooks/useEnveloppes';
import {
  buildAxesSousTension,
  buildDashboardSignals,
  buildEcartsByPeriode,
  computeDashboardKpis,
  filterLignesBudgetaires,
  type DashboardBudgetaireFilters,
} from '@/lib/dashboard-budgetaire';

export type { DashboardBudgetaireFilters } from '@/lib/dashboard-budgetaire';

export const useDashboardBudgetaire = (filters: DashboardBudgetaireFilters) => {
  const lignesQuery = useLignesBudgetaires();
  const ecartsQuery = useEcartsPrevisionExecution({
    periode: filters.periode,
    sectionCode: filters.sectionCode,
    programmeCode: filters.programmeCode,
    actionCode: filters.actionCode,
    enveloppeId: filters.enveloppeId,
  });
  const supervisionQuery = useTresorerieSupervision();

  const { sections, isLoading: sectionsLoading } = useSections();
  const { programmes, isLoading: programmesLoading } = useProgrammes();
  const { actions, isLoading: actionsLoading } = useActions();
  const { enveloppes, isLoading: enveloppesLoading } = useEnveloppes();

  const metadata = useMemo(() => {
    const actionsById = new Map(actions.map((action) => [action.id, {
      code: action.code,
      programmeId: action.programme_id,
    }]));
    const programmesById = new Map(programmes.map((programme) => [programme.id, {
      code: programme.code,
      sectionId: programme.section_id,
    }]));
    const sectionsById = new Map(sections.map((section) => [section.id, {
      code: section.code,
    }]));
    const enveloppesById = new Map(enveloppes.map((enveloppe) => [enveloppe.id, {
      code: enveloppe.code,
    }]));

    return {
      actionsById,
      programmesById,
      sectionsById,
      enveloppesById,
    };
  }, [actions, programmes, sections, enveloppes]);

  const lignesFiltrees = useMemo(
    () => filterLignesBudgetaires(lignesQuery.lignes, filters, metadata, ecartsQuery.ecarts),
    [lignesQuery.lignes, filters, metadata, ecartsQuery.ecarts]
  );

  const kpis = useMemo(() => computeDashboardKpis(lignesFiltrees), [lignesFiltrees]);

  const tauxEngagement = kpis.budgetModifie > 0 ? (kpis.engage / kpis.budgetModifie) * 100 : 0;
  const tauxExecution = kpis.budgetModifie > 0 ? (kpis.paye / kpis.budgetModifie) * 100 : 0;

  const chartData = useMemo(() => buildEcartsByPeriode(ecartsQuery.ecarts), [ecartsQuery.ecarts]);
  const axesSousTension = useMemo(() => buildAxesSousTension(ecartsQuery.ecarts), [ecartsQuery.ecarts]);
  const signals = useMemo(
    () => buildDashboardSignals({ supervision: supervisionQuery.data, ecarts: ecartsQuery.ecarts }),
    [ecartsQuery.ecarts, supervisionQuery.data]
  );

  const isLoading = lignesQuery.isLoading
    || ecartsQuery.isLoading
    || supervisionQuery.isLoading
    || sectionsLoading
    || programmesLoading
    || actionsLoading
    || enveloppesLoading;

  const error = lignesQuery.error
    || ecartsQuery.error
    || sections.error
    || programmes.error
    || actions.error
    || enveloppes.error
    || (supervisionQuery.error as Error | null)
    || null;

  return {
    isLoading,
    error,
    kpis,
    tauxEngagement,
    tauxExecution,
    chartData,
    signals,
    axesSousTension,
    hasData: lignesFiltrees.length > 0 || ecartsQuery.ecarts.length > 0 || signals.length > 0,
  };
};
