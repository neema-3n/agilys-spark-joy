import type { LigneBudgetaire } from '@/types/budget.types';
import type { EcartsPrevisionExecution } from '@/types/prevision.types';
import type { TresorerieAlertSeverity, TresorerieSupervision } from '@/types/tresorerie.types';

export interface DashboardBudgetaireFilters {
  periode?: string;
  sectionCode?: string;
  programmeCode?: string;
  actionCode?: string;
  enveloppeId?: string;
}

export interface DashboardSignal {
  id: string;
  severity: TresorerieAlertSeverity;
  title: string;
  message: string;
  sourceLabel: string;
  sourcePath: string;
}

export interface DashboardAxeTension {
  id: string;
  label: string;
  periode: string;
  ecartMontant: number;
  ecartTaux: number;
}

export interface DashboardFilterMetadata {
  actionsById: Map<string, { code: string; programmeId: string }>;
  programmesById: Map<string, { code: string; sectionId: string }>;
  sectionsById: Map<string, { code: string }>;
  enveloppesById: Map<string, { code: string }>;
}

const severityRank: Record<TresorerieAlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const sanitizeFilterValue = (value?: string) => value?.trim().toLowerCase() ?? '';

const matchesFilter = (actualValue: string | undefined, expectedValue: string) => {
  if (!expectedValue) {
    return true;
  }

  return (actualValue ?? '').toLowerCase() === expectedValue;
};

export const buildAxeLabel = (item: EcartsPrevisionExecution) => {
  const labels = [
    item.axe.sectionCode ? `SEC:${item.axe.sectionCode}` : null,
    item.axe.programmeCode ? `PRG:${item.axe.programmeCode}` : null,
    item.axe.actionCode ? `ACT:${item.axe.actionCode}` : null,
    item.axe.enveloppeId ? `ENV:${item.axe.enveloppeId.slice(0, 8)}` : null,
  ].filter(Boolean);

  return labels.length > 0 ? labels.join(' · ') : 'Axe non qualifie';
};

export const filterLignesBudgetaires = (
  lignes: LigneBudgetaire[],
  filters: DashboardBudgetaireFilters,
  metadata: DashboardFilterMetadata,
  ecarts: EcartsPrevisionExecution[] = []
) => {
  const sectionCodeFilter = sanitizeFilterValue(filters.sectionCode);
  const programmeCodeFilter = sanitizeFilterValue(filters.programmeCode);
  const actionCodeFilter = sanitizeFilterValue(filters.actionCode);
  const enveloppeFilter = sanitizeFilterValue(filters.enveloppeId);
  const periodeFilter = sanitizeFilterValue(filters.periode);

  const periodAxes = periodeFilter
    ? ecarts.filter((item) => sanitizeFilterValue(item.periode) === periodeFilter)
    : [];

  return lignes.filter((ligne) => {
    const action = metadata.actionsById.get(ligne.actionId);
    const programme = action ? metadata.programmesById.get(action.programmeId) : undefined;
    const section = programme ? metadata.sectionsById.get(programme.sectionId) : undefined;
    const enveloppe = ligne.enveloppeId ? metadata.enveloppesById.get(ligne.enveloppeId) : undefined;

    const lineMatchesSection = matchesFilter(section?.code, sectionCodeFilter);
    const lineMatchesProgramme = matchesFilter(programme?.code, programmeCodeFilter);
    const lineMatchesAction = matchesFilter(action?.code, actionCodeFilter);

    const lineMatchesEnveloppe = !enveloppeFilter
      || (ligne.enveloppeId ?? '').toLowerCase() === enveloppeFilter
      || (enveloppe?.code ?? '').toLowerCase() === enveloppeFilter;

    const matchesPeriode = !periodeFilter || (periodAxes.length > 0 && periodAxes.some((item) => {
      const ecartSection = sanitizeFilterValue(item.axe.sectionCode);
      const ecartProgramme = sanitizeFilterValue(item.axe.programmeCode);
      const ecartAction = sanitizeFilterValue(item.axe.actionCode);
      const ecartEnveloppe = sanitizeFilterValue(item.axe.enveloppeId);

      const lineSection = sanitizeFilterValue(section?.code);
      const lineProgramme = sanitizeFilterValue(programme?.code);
      const lineAction = sanitizeFilterValue(action?.code);
      const lineEnveloppeId = sanitizeFilterValue(ligne.enveloppeId);
      const lineEnveloppeCode = sanitizeFilterValue(enveloppe?.code);

      return (!ecartSection || lineSection === ecartSection)
        && (!ecartProgramme || lineProgramme === ecartProgramme)
        && (!ecartAction || lineAction === ecartAction)
        && (!ecartEnveloppe || lineEnveloppeId === ecartEnveloppe || lineEnveloppeCode === ecartEnveloppe);
    }));

    return lineMatchesSection && lineMatchesProgramme && lineMatchesAction && lineMatchesEnveloppe && matchesPeriode;
  });
};

export const computeDashboardKpis = (lignes: LigneBudgetaire[]) => {
  return lignes.reduce(
    (acc, ligne) => {
      acc.budgetModifie += Number(ligne.montantModifie || 0);
      acc.engage += Number(ligne.montantEngage || 0);
      acc.paye += Number(ligne.montantPaye || 0);
      acc.disponible += Number(ligne.disponible || 0);

      return acc;
    },
    { budgetModifie: 0, engage: 0, paye: 0, disponible: 0 }
  );
};

export const buildEcartsByPeriode = (ecarts: EcartsPrevisionExecution[]) => {
  const grouped = new Map<string, { periode: string; prevu: number; execute: number; ecart: number }>();

  ecarts.forEach((item) => {
    const current = grouped.get(item.periode) ?? {
      periode: item.periode,
      prevu: 0,
      execute: 0,
      ecart: 0,
    };

    current.prevu += Number(item.montantPrevu || 0);
    current.execute += Number(item.montantExecute || 0);
    current.ecart += Number(item.ecartMontant || 0);

    grouped.set(item.periode, current);
  });

  return Array.from(grouped.values()).sort((left, right) => left.periode.localeCompare(right.periode));
};

export const buildAxesSousTension = (ecarts: EcartsPrevisionExecution[]): DashboardAxeTension[] => {
  return [...ecarts]
    .sort((left, right) => Math.abs(right.ecartMontant) - Math.abs(left.ecartMontant))
    .slice(0, 5)
    .map((item, index) => ({
      id: `${item.periode}-${index}`,
      label: buildAxeLabel(item),
      periode: item.periode,
      ecartMontant: Number(item.ecartMontant || 0),
      ecartTaux: Number(item.ecartTaux || 0),
    }));
};

export const buildDashboardSignals = (input: {
  supervision?: TresorerieSupervision;
  ecarts: EcartsPrevisionExecution[];
}): DashboardSignal[] => {
  const supervisionSignals: DashboardSignal[] = (input.supervision?.alerts ?? []).map((alert) => ({
    id: `supervision-${alert.key}`,
    severity: alert.severity,
    title: alert.label,
    message: alert.message,
    sourceLabel: 'Supervision tresorerie',
    sourcePath: '/app/tresorerie?tab=supervision',
  }));

  const ecartSignals: DashboardSignal[] = [...input.ecarts]
    .sort((left, right) => Math.abs(right.ecartMontant) - Math.abs(left.ecartMontant))
    .slice(0, 3)
    .map((item, index) => {
      const rate = Number(item.ecartTaux || 0);
      return {
        id: `ecart-${item.periode}-${index}`,
        severity: 'medium',
        title: `Ecart prevision/execution (${item.periode})`,
        message: `${buildAxeLabel(item)} - Ecart ${rate.toFixed(1)}%`,
        sourceLabel: 'Analyse previsionnelle',
        sourcePath: '/app/previsions',
      };
    });

  const unreconciled = input.supervision?.nonReconciledOperations ?? 0;
  const reconciliationSignal: DashboardSignal[] = unreconciled > 0
    ? [{
      id: 'non-reconciled-operations',
      severity: 'medium',
      title: 'Operations non rapprochees',
      message: `${unreconciled} operation(s) non rapprochee(s) detectee(s).`,
      sourceLabel: 'Controle interne',
      sourcePath: '/app/controle-interne',
    }]
    : [];

  return [...supervisionSignals, ...ecartSignals, ...reconciliationSignal]
    .sort((left, right) => severityRank[right.severity] - severityRank[left.severity])
    .slice(0, 8);
};
