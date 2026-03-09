import type { Action, LigneBudgetaire, Programme, Section } from '@/types/budget.types';
import type { Engagement } from '@/types/engagement.types';
import type { Facture } from '@/types/facture.types';
import type { Projet } from '@/types/projet.types';
import type { ReservationCredit } from '@/types/reservation.types';
import type { Structure } from '@/types/structure.types';

export interface AnalysesFilters {
  periode?: string;
  projetId?: string;
  structureId?: string;
  sectionId?: string;
  programmeId?: string;
  actionId?: string;
}

export interface AnalyseRow {
  id: string;
  dimensionType: 'projet' | 'structure' | 'axe';
  dimensionLabel: string;
  projetLabel?: string;
  structureLabel?: string;
  sectionCode?: string;
  programmeCode?: string;
  actionCode?: string;
  budgetAlloue: number;
  engage: number;
  paye: number;
  disponible: number;
  tauxExecution: number;
  ecart: number;
}

export interface AnalysesKpis {
  budgetAlloue: number;
  engage: number;
  paye: number;
  disponible: number;
  tauxExecution: number;
}

export interface AnalyseChartRow {
  label: string;
  budgetAlloue: number;
  engage: number;
  paye: number;
  disponible: number;
}

export interface AnalysesDataset {
  lignes: LigneBudgetaire[];
  projets: Projet[];
  structures: Structure[];
  sections: Section[];
  programmes: Programme[];
  actions: Action[];
  engagements: Engagement[];
  factures: Facture[];
  reservations: ReservationCredit[];
}

const clean = (value?: string | null): string => value?.trim().toLowerCase() ?? '';

const isSamePeriode = (dateValue: string | undefined, periode: string | undefined): boolean => {
  if (!periode) {
    return true;
  }

  if (!dateValue) {
    return false;
  }

  return dateValue.startsWith(periode);
};

const round2 = (value: number): number => Math.round(value * 100) / 100;
const hasAxisFilters = (filters: AnalysesFilters): boolean =>
  Boolean(filters.sectionId || filters.programmeId || filters.actionId);

const buildLineAxisMap = (
  lignes: LigneBudgetaire[],
  actions: Action[],
  programmes: Programme[],
  sections: Section[]
): Map<string, { sectionId: string; programmeId: string; actionId: string }> => {
  const actionById = new Map(actions.map((item) => [item.id, item]));
  const programmeById = new Map(programmes.map((item) => [item.id, item]));
  const sectionIds = new Set(sections.map((item) => item.id));

  const mapping = new Map<string, { sectionId: string; programmeId: string; actionId: string }>();

  lignes.forEach((ligne) => {
    const action = actionById.get(ligne.actionId);
    if (!action) {
      return;
    }

    const programme = programmeById.get(action.programme_id);
    if (!programme || !sectionIds.has(programme.section_id)) {
      return;
    }

    mapping.set(ligne.id, {
      sectionId: programme.section_id,
      programmeId: programme.id,
      actionId: action.id,
    });
  });

  return mapping;
};

const filterLignes = (
  lignes: LigneBudgetaire[],
  lineAxisMap: Map<string, { sectionId: string; programmeId: string; actionId: string }>,
  filters: AnalysesFilters
): LigneBudgetaire[] => {
  return lignes.filter((ligne) => {
    const axis = lineAxisMap.get(ligne.id);

    if (filters.actionId && axis?.actionId !== filters.actionId) {
      return false;
    }

    if (filters.programmeId && axis?.programmeId !== filters.programmeId) {
      return false;
    }

    if (filters.sectionId && axis?.sectionId !== filters.sectionId) {
      return false;
    }

    return true;
  });
};

const detectStructureForProjet = (projet: Projet, structures: Structure[]): Structure | null => {
  const byCode = structures.find((structure) => clean(projet.code).startsWith(clean(structure.code)));
  if (byCode) {
    return byCode;
  }

  if (!projet.responsable) {
    return null;
  }

  return structures.find((structure) => clean(structure.responsable) === clean(projet.responsable)) ?? null;
};

const computeRowMetrics = (budgetAlloue: number, engage: number, paye: number) => {
  const safeBudget = Number.isFinite(budgetAlloue) ? budgetAlloue : 0;
  const safeEngage = Number.isFinite(engage) ? engage : 0;
  const safePaye = Number.isFinite(paye) ? paye : 0;
  const disponible = safeBudget - safeEngage;
  const ecart = safeBudget - safePaye;
  const tauxExecution = safeBudget > 0 ? (safePaye / safeBudget) * 100 : 0;

  return {
    budgetAlloue: round2(safeBudget),
    engage: round2(safeEngage),
    paye: round2(safePaye),
    disponible: round2(disponible),
    ecart: round2(ecart),
    tauxExecution: round2(tauxExecution),
  };
};

const buildProjetRows = (input: {
  projects: Projet[];
  engagements: Engagement[];
  factures: Facture[];
  structuresCentreCout: Structure[];
  filters: AnalysesFilters;
  allowedProjetIds?: Set<string>;
}): AnalyseRow[] => {
  const { projects, engagements, factures, structuresCentreCout, filters, allowedProjetIds } = input;

  const engagementByProjet = new Map<string, number>();
  engagements.forEach((item) => {
    if (!item.projetId) {
      return;
    }

    engagementByProjet.set(item.projetId, (engagementByProjet.get(item.projetId) ?? 0) + Number(item.montant || 0));
  });

  const factureByProjet = new Map<string, number>();
  factures.forEach((item) => {
    if (!item.projetId) {
      return;
    }

    factureByProjet.set(item.projetId, (factureByProjet.get(item.projetId) ?? 0) + Number(item.montantLiquide || item.montantTTC || 0));
  });

  return projects
    .filter((projet) => !filters.projetId || projet.id === filters.projetId)
    .filter((projet) => !allowedProjetIds || allowedProjetIds.has(projet.id))
    .map((projet) => {
      const structure = detectStructureForProjet(projet, structuresCentreCout);
      if (filters.structureId && structure?.id !== filters.structureId) {
        return null;
      }

      const metrics = computeRowMetrics(
        Number(projet.budgetAlloue || 0),
        engagementByProjet.get(projet.id) ?? 0,
        factureByProjet.get(projet.id) ?? 0
      );

      return {
        id: `projet-${projet.id}`,
        dimensionType: 'projet' as const,
        dimensionLabel: `${projet.code} - ${projet.nom}`,
        projetLabel: projet.nom,
        structureLabel: structure ? `${structure.code} - ${structure.nom}` : 'Non rattachee',
        ...metrics,
      };
    })
    .filter((row): row is AnalyseRow => row !== null)
    .sort((left, right) => right.budgetAlloue - left.budgetAlloue);
};

const buildStructureRows = (projetRows: AnalyseRow[], structuresCentreCout: Structure[]): AnalyseRow[] => {
  const byStructure = new Map<string, AnalyseRow>();

  structuresCentreCout.forEach((structure) => {
    const label = `${structure.code} - ${structure.nom}`;
    byStructure.set(label, {
      id: `structure-${structure.id}`,
      dimensionType: 'structure',
      dimensionLabel: label,
      structureLabel: label,
      budgetAlloue: 0,
      engage: 0,
      paye: 0,
      disponible: 0,
      tauxExecution: 0,
      ecart: 0,
    });
  });

  projetRows.forEach((row) => {
    const key = row.structureLabel ?? 'Non rattachee';
    if (!byStructure.has(key)) {
      byStructure.set(key, {
        id: `structure-nr`,
        dimensionType: 'structure',
        dimensionLabel: key,
        structureLabel: key,
        budgetAlloue: 0,
        engage: 0,
        paye: 0,
        disponible: 0,
        tauxExecution: 0,
        ecart: 0,
      });
    }

    const current = byStructure.get(key)!;
    current.budgetAlloue += row.budgetAlloue;
    current.engage += row.engage;
    current.paye += row.paye;
    current.disponible += row.disponible;
    current.ecart += row.ecart;
  });

  return Array.from(byStructure.values())
    .map((row) => {
      row.tauxExecution = row.budgetAlloue > 0 ? round2((row.paye / row.budgetAlloue) * 100) : 0;
      row.budgetAlloue = round2(row.budgetAlloue);
      row.engage = round2(row.engage);
      row.paye = round2(row.paye);
      row.disponible = round2(row.disponible);
      row.ecart = round2(row.ecart);
      return row;
    })
    .sort((left, right) => right.budgetAlloue - left.budgetAlloue);
};

const buildAxeRows = (input: {
  lignes: LigneBudgetaire[];
  lineAxisMap: Map<string, { sectionId: string; programmeId: string; actionId: string }>;
  sections: Section[];
  programmes: Programme[];
  actions: Action[];
}): AnalyseRow[] => {
  const { lignes, lineAxisMap, sections, programmes, actions } = input;

  const sectionById = new Map(sections.map((item) => [item.id, item]));
  const programmeById = new Map(programmes.map((item) => [item.id, item]));
  const actionById = new Map(actions.map((item) => [item.id, item]));
  const aggregates = new Map<string, AnalyseRow>();

  lignes.forEach((ligne) => {
    const axis = lineAxisMap.get(ligne.id);
    if (!axis) {
      return;
    }

    const section = sectionById.get(axis.sectionId);
    const programme = programmeById.get(axis.programmeId);
    const action = actionById.get(axis.actionId);

    const key = [section?.code ?? 'NA', programme?.code ?? 'NA', action?.code ?? 'NA'].join('|');
    if (!aggregates.has(key)) {
      aggregates.set(key, {
        id: `axe-${key}`,
        dimensionType: 'axe',
        dimensionLabel: `${section?.code ?? 'SEC-NA'} / ${programme?.code ?? 'PRG-NA'} / ${action?.code ?? 'ACT-NA'}`,
        sectionCode: section?.code,
        programmeCode: programme?.code,
        actionCode: action?.code,
        budgetAlloue: 0,
        engage: 0,
        paye: 0,
        disponible: 0,
        tauxExecution: 0,
        ecart: 0,
      });
    }

    const current = aggregates.get(key)!;
    current.budgetAlloue += Number(ligne.montantModifie || 0);
    current.engage += Number(ligne.montantEngage || 0);
    current.paye += Number(ligne.montantPaye || 0);
  });

  return Array.from(aggregates.values())
    .map((row) => {
      const metrics = computeRowMetrics(row.budgetAlloue, row.engage, row.paye);
      return { ...row, ...metrics };
    })
    .sort((left, right) => right.budgetAlloue - left.budgetAlloue);
};

export const buildAnalysesView = (dataset: AnalysesDataset, filters: AnalysesFilters) => {
  const structuresCentreCout = dataset.structures.filter((item) => item.type === 'centre_cout');
  const axisFilterEnabled = hasAxisFilters(filters);

  const projetStructureMap = new Map<string, string | null>(
    dataset.projets.map((projet) => [projet.id, detectStructureForProjet(projet, structuresCentreCout)?.id ?? null])
  );

  const projectMatchesStructure = (projetId?: string) => {
    if (!filters.structureId) {
      return true;
    }
    if (!projetId) {
      return false;
    }
    return projetStructureMap.get(projetId) === filters.structureId;
  };

  const lineAxisMap = buildLineAxisMap(dataset.lignes, dataset.actions, dataset.programmes, dataset.sections);
  const lignesFiltreesAxes = filterLignes(dataset.lignes, lineAxisMap, filters);
  const lineIdsAfterAxisFilter = new Set(lignesFiltreesAxes.map((item) => item.id));

  const reservationsFiltrees = dataset.reservations.filter(
    (item) =>
      isSamePeriode(item.dateReservation, filters.periode) &&
      (!filters.projetId || item.projetId === filters.projetId) &&
      projectMatchesStructure(item.projetId) &&
      (!axisFilterEnabled || Boolean(item.ligneBudgetaireId && lineIdsAfterAxisFilter.has(item.ligneBudgetaireId)))
  );
  const engagementsFiltrees = dataset.engagements.filter(
    (item) =>
      isSamePeriode(item.dateCreation, filters.periode) &&
      (!filters.projetId || item.projetId === filters.projetId) &&
      projectMatchesStructure(item.projetId) &&
      (!axisFilterEnabled || lineIdsAfterAxisFilter.has(item.ligneBudgetaireId))
  );
  const facturesFiltrees = dataset.factures.filter(
    (item) =>
      isSamePeriode(item.dateFacture, filters.periode) &&
      (!filters.projetId || item.projetId === filters.projetId) &&
      projectMatchesStructure(item.projetId) &&
      (!axisFilterEnabled || Boolean(item.ligneBudgetaireId && lineIdsAfterAxisFilter.has(item.ligneBudgetaireId)))
  );

  const projectScopedLineIds = new Set<string>();
  reservationsFiltrees.forEach((item) => {
    if (item.ligneBudgetaireId) {
      projectScopedLineIds.add(item.ligneBudgetaireId);
    }
  });
  engagementsFiltrees.forEach((item) => projectScopedLineIds.add(item.ligneBudgetaireId));
  facturesFiltrees.forEach((item) => {
    if (item.ligneBudgetaireId) {
      projectScopedLineIds.add(item.ligneBudgetaireId);
    }
  });

  const shouldScopeLignesByProject = Boolean(filters.projetId || filters.structureId || filters.periode);
  const lignesFiltrees = lignesFiltreesAxes.filter((ligne) => {
    if (filters.periode && !isSamePeriode(ligne.dateCreation, filters.periode)) {
      return false;
    }
    if (!shouldScopeLignesByProject) {
      return true;
    }
    if (projectScopedLineIds.size === 0) {
      return false;
    }
    return projectScopedLineIds.has(ligne.id);
  });

  const allowedProjetIds = new Set<string>();
  reservationsFiltrees.forEach((item) => {
    if (item.projetId) {
      allowedProjetIds.add(item.projetId);
    }
  });
  engagementsFiltrees.forEach((item) => {
    if (item.projetId) {
      allowedProjetIds.add(item.projetId);
    }
  });
  facturesFiltrees.forEach((item) => {
    if (item.projetId) {
      allowedProjetIds.add(item.projetId);
    }
  });

  const projetRows = buildProjetRows({
    projects: dataset.projets,
    engagements: engagementsFiltrees,
    factures: facturesFiltrees,
    structuresCentreCout,
    filters,
    allowedProjetIds:
      filters.projetId || filters.structureId || filters.periode || axisFilterEnabled ? allowedProjetIds : undefined,
  });

  const structureRows = buildStructureRows(projetRows, structuresCentreCout);
  const axeRows = buildAxeRows({
    lignes: lignesFiltrees,
    lineAxisMap,
    sections: dataset.sections,
    programmes: dataset.programmes,
    actions: dataset.actions,
  });

  const globalMetrics = lignesFiltrees.length
    ? computeRowMetrics(
        lignesFiltrees.reduce((sum, item) => sum + Number(item.montantModifie || 0), 0),
        lignesFiltrees.reduce((sum, item) => sum + Number(item.montantEngage || 0), 0),
        lignesFiltrees.reduce((sum, item) => sum + Number(item.montantPaye || 0), 0)
      )
    : computeRowMetrics(
        projetRows.reduce((sum, item) => sum + item.budgetAlloue, 0),
        projetRows.reduce((sum, item) => sum + item.engage, 0),
        projetRows.reduce((sum, item) => sum + item.paye, 0)
      );

  const kpis: AnalysesKpis = {
    budgetAlloue: globalMetrics.budgetAlloue,
    engage: globalMetrics.engage,
    paye: globalMetrics.paye,
    disponible: globalMetrics.disponible,
    tauxExecution: globalMetrics.tauxExecution,
  };

  const exportRows = [
    ...projetRows.map((row) => ({ ...row, dimensionType: 'projet' as const })),
    ...structureRows.map((row) => ({ ...row, dimensionType: 'structure' as const })),
    ...axeRows.map((row) => ({ ...row, dimensionType: 'axe' as const })),
  ];

  return {
    kpis,
    counts: {
      projets: projetRows.length,
      structures: structureRows.length,
      axes: axeRows.length,
      reservations: reservationsFiltrees.length,
      engagements: engagementsFiltrees.length,
      factures: facturesFiltrees.length,
    },
    projetRows,
    structureRows,
    axeRows,
    exportRows,
  };
};

export const toChartRows = (rows: AnalyseRow[], maxItems = 8): AnalyseChartRow[] => {
  return rows.slice(0, maxItems).map((row) => ({
    label: row.dimensionLabel,
    budgetAlloue: row.budgetAlloue,
    engage: row.engage,
    paye: row.paye,
    disponible: row.disponible,
  }));
};

export const serializeAnalysesFilters = (filters: AnalysesFilters): Record<string, string> => {
  const entries = Object.entries(filters).filter(([, value]) => Boolean(value));
  return Object.fromEntries(entries.map(([key, value]) => [key, String(value)]));
};
