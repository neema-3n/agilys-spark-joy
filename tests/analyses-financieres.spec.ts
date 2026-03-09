import { expect, test } from '@playwright/test';
import {
  buildAnalysesView,
  serializeAnalysesFilters,
  toChartRows,
  type AnalysesDataset,
} from '../src/lib/analyses-financieres';
import { toCsvCell } from '../src/lib/export-utils';

const dataset: AnalysesDataset = {
  lignes: [
    {
      id: 'ligne-1',
      exerciceId: 'ex-2026',
      actionId: 'act-1',
      compteId: 'cmp-1',
      enveloppeId: 'env-1',
      libelle: 'Ligne A',
      montantInitial: 100,
      montantModifie: 1000,
      montantReserve: 0,
      montantEngage: 400,
      montantLiquide: 250,
      montantPaye: 200,
      disponible: 600,
      dateCreation: '2026-01-03',
      statut: 'actif',
    },
    {
      id: 'ligne-2',
      exerciceId: 'ex-2026',
      actionId: 'act-2',
      compteId: 'cmp-1',
      enveloppeId: 'env-2',
      libelle: 'Ligne B',
      montantInitial: 100,
      montantModifie: 500,
      montantReserve: 0,
      montantEngage: 200,
      montantLiquide: 120,
      montantPaye: 100,
      disponible: 300,
      dateCreation: '2026-02-04',
      statut: 'actif',
    },
  ],
  projets: [
    {
      id: 'prj-1',
      clientId: 'tenant-1',
      exerciceId: 'ex-2026',
      code: 'CC01-PROJ-A',
      nom: 'Projet A',
      responsable: 'Resp Centre 1',
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
      budgetAlloue: 1200,
      budgetConsomme: 0,
      budgetEngage: 0,
      statut: 'en_cours',
      tauxAvancement: 10,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prj-2',
      clientId: 'tenant-1',
      exerciceId: 'ex-2026',
      code: 'CC02-PROJ-B',
      nom: 'Projet B',
      responsable: 'Resp Centre 2',
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
      budgetAlloue: 500,
      budgetConsomme: 0,
      budgetEngage: 0,
      statut: 'en_cours',
      tauxAvancement: 20,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  structures: [
    {
      id: 'st-1',
      clientId: 'tenant-1',
      exerciceId: 'ex-2026',
      code: 'CC01',
      nom: 'Centre 01',
      type: 'centre_cout',
      responsable: 'Resp Centre 1',
      statut: 'actif',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'st-2',
      clientId: 'tenant-1',
      exerciceId: 'ex-2026',
      code: 'CC02',
      nom: 'Centre 02',
      type: 'centre_cout',
      responsable: 'Resp Centre 2',
      statut: 'actif',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  sections: [
    {
      id: 'sec-1',
      client_id: 'tenant-1',
      exercice_id: 'ex-2026',
      code: 'SEC-1',
      libelle: 'Section 1',
      ordre: 1,
      statut: 'actif',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ],
  programmes: [
    {
      id: 'prg-1',
      section_id: 'sec-1',
      client_id: 'tenant-1',
      exercice_id: 'ex-2026',
      code: 'PRG-1',
      libelle: 'Programme 1',
      ordre: 1,
      statut: 'actif',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ],
  actions: [
    {
      id: 'act-1',
      programme_id: 'prg-1',
      client_id: 'tenant-1',
      exercice_id: 'ex-2026',
      code: 'ACT-1',
      libelle: 'Action 1',
      ordre: 1,
      statut: 'actif',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'act-2',
      programme_id: 'prg-1',
      client_id: 'tenant-1',
      exercice_id: 'ex-2026',
      code: 'ACT-2',
      libelle: 'Action 2',
      ordre: 2,
      statut: 'actif',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ],
  engagements: [
    {
      id: 'eng-1',
      numero: 'E-1',
      exerciceId: 'ex-2026',
      clientId: 'tenant-1',
      ligneBudgetaireId: 'ligne-1',
      objet: 'Eng Projet A',
      montant: 300,
      projetId: 'prj-1',
      statut: 'valide',
      dateCreation: '2026-01-20',
      createdAt: '2026-01-20',
      updatedAt: '2026-01-20',
    },
    {
      id: 'eng-2',
      numero: 'E-2',
      exerciceId: 'ex-2026',
      clientId: 'tenant-1',
      ligneBudgetaireId: 'ligne-2',
      objet: 'Eng Projet B',
      montant: 150,
      projetId: 'prj-2',
      statut: 'valide',
      dateCreation: '2026-02-10',
      createdAt: '2026-02-10',
      updatedAt: '2026-02-10',
    },
  ],
  factures: [
    {
      id: 'fac-1',
      clientId: 'tenant-1',
      exerciceId: 'ex-2026',
      numero: 'F-1',
      dateFacture: '2026-01-22',
      fournisseurId: 'fr-1',
      projetId: 'prj-1',
      objet: 'Facture A',
      montantHT: 100,
      montantTVA: 0,
      montantTTC: 100,
      montantLiquide: 100,
      statut: 'payee',
      createdAt: '2026-01-22',
      updatedAt: '2026-01-22',
    },
    {
      id: 'fac-2',
      clientId: 'tenant-1',
      exerciceId: 'ex-2026',
      numero: 'F-2',
      dateFacture: '2026-02-14',
      fournisseurId: 'fr-1',
      projetId: 'prj-2',
      objet: 'Facture B',
      montantHT: 80,
      montantTVA: 0,
      montantTTC: 80,
      montantLiquide: 80,
      statut: 'payee',
      createdAt: '2026-02-14',
      updatedAt: '2026-02-14',
    },
  ],
  reservations: [
    {
      id: 'res-1',
      numero: 'R-1',
      exerciceId: 'ex-2026',
      ligneBudgetaireId: 'ligne-1',
      montant: 120,
      objet: 'Res A',
      projetId: 'prj-1',
      dateReservation: '2026-01-11',
      statut: 'active',
      createdAt: '2026-01-11',
      updatedAt: '2026-01-11',
      clientId: 'tenant-1',
    },
  ],
};

test.describe('analyses financieres helpers', () => {
  test('agrege les KPI globaux et ventile par projet', async () => {
    const view = buildAnalysesView(dataset, {});

    expect(view.kpis.budgetAlloue).toBe(1500);
    expect(view.kpis.engage).toBe(600);
    expect(view.kpis.paye).toBe(300);
    expect(view.kpis.disponible).toBe(900);
    expect(view.projetRows).toHaveLength(2);
    expect(view.structureRows.length).toBeGreaterThanOrEqual(2);
  });

  test('applique les filtres projet/periode et maintient une sortie export coherente', async () => {
    const view = buildAnalysesView(dataset, { projetId: 'prj-1', periode: '2026-01' });

    expect(view.counts.projets).toBe(1);
    expect(view.counts.engagements).toBe(1);
    expect(view.counts.factures).toBe(1);
    expect(view.exportRows.every((row) => ['projet', 'structure', 'axe'].includes(row.dimensionType))).toBeTruthy();
  });

  test('genere les lignes de graphe et la serialisation des filtres', async () => {
    const view = buildAnalysesView(dataset, {});
    const chartRows = toChartRows(view.projetRows, 1);

    expect(chartRows).toHaveLength(1);
    expect(chartRows[0]?.label).toContain('Projet');

    expect(serializeAnalysesFilters({ periode: '2026-01', projetId: 'prj-1' })).toEqual({
      periode: '2026-01',
      projetId: 'prj-1',
    });
  });

  test('restreint les vues projet/structure quand un filtre axe est applique', async () => {
    const view = buildAnalysesView(dataset, { actionId: 'act-1' });

    expect(view.counts.projets).toBe(1);
    expect(view.projetRows[0]?.dimensionLabel).toContain('Projet A');
    expect(view.axeRows.every((row) => row.actionCode === 'ACT-1')).toBeTruthy();
  });

  test('echappe les cellules CSV avec separateur et guillemets', async () => {
    expect(toCsvCell('A;B')).toBe('"A;B"');
    expect(toCsvCell('texte "quote"')).toBe('"texte ""quote"""');
    expect(toCsvCell('ligne\n2')).toBe('"ligne\n2"');
  });
});
