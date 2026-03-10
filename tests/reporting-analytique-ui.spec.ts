import { expect, test, type Page } from '@playwright/test';

const UI_BASE_URL = 'http://127.0.0.1:45176';

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
};

type ReportingRouteState = {
  tableauRequests: string[];
  dashboardRequests: string[];
  cycleTimeRequests: string[];
  exportStartCount: number;
  exportStatusCount: number;
  exportDownloadCount: number;
};

const setupReportingRoutes = async (page: Page): Promise<ReportingRouteState> => {
  const state: ReportingRouteState = {
    tableauRequests: [],
    dashboardRequests: [],
    cycleTimeRequests: [],
    exportStartCount: 0,
    exportStatusCount: 0,
    exportDownloadCount: 0
  };

  await page.route('**://127.0.0.1:3001/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/auth/refresh') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: makeJwt({ sub: 'user-reporting', tenantId: 'client-1', roles: ['admin_client'] }),
          refreshToken: 'refresh-token-stub'
        })
      });
      return;
    }

    if (url.pathname === '/budget-referentiels/exercices') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ex-2026',
            clientId: 'client-1',
            libelle: 'Exercice 2026',
            code: 'EX2026',
            dateDebut: '2026-01-01',
            dateFin: '2026-12-31',
            statut: 'ouvert'
          }
        ])
      });
      return;
    }

    if (url.pathname === '/reporting-analytique/tableau-croise') {
      state.tableauRequests.push(url.search);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          view: 'tableau-croise',
          filters: {
            exerciceId: 'ex-2026',
            periode: '2026-03-01:2026-03-31',
            dateDebut: '2026-03-01',
            dateFin: '2026-03-31',
            rowDimension: 'axe-analytique',
            columnDimension: 'periode',
            measure: 'montant-depense',
            page: 1,
            pageSize: 100
          },
          pagination: { total: 1, page: 1, pageSize: 100 },
          summary: { totalRows: 1, totalColumns: 1, grandTotal: 500 },
          rowKeys: ['ACT-1'],
          columnKeys: ['2026-03'],
          rows: [{ rowKey: 'ACT-1', values: [{ columnKey: '2026-03', value: 500 }] }]
        })
      });
      return;
    }

    if (url.pathname === '/reporting-analytique/dashboard') {
      state.dashboardRequests.push(url.search);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          view: 'dashboard',
          filters: {
            exerciceId: 'ex-2026',
            periode: '2026-03-01:2026-03-31',
            dateDebut: '2026-03-01',
            dateFin: '2026-03-31',
            rowDimension: 'axe-analytique',
            columnDimension: 'periode',
            measure: 'montant-depense',
            page: 1,
            pageSize: 100
          },
          kpis: {
            totalMesure: 500,
            volumeLignes: 1,
            totalMontantBudgetModifie: 1000,
            totalMontantPaye: 250
          },
          topRows: [{ key: 'ACT-1', total: 500 }],
          topColumns: [{ key: '2026-03', total: 500 }],
          anomalies: [],
          chart: {
            rowDimension: 'axe-analytique',
            measure: 'montant-depense',
            points: [{ key: 'ACT-1', total: 500 }]
          }
        })
      });
      return;
    }

    if (url.pathname === '/reporting-analytique/cycle-time') {
      state.cycleTimeRequests.push(url.search);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          view: 'cycle-time',
          filters: {
            exerciceId: 'ex-2026',
            periode: '2026-03-01:2026-03-31',
            dateDebut: '2026-03-01',
            dateFin: '2026-03-31',
            seuilsHeures: {
              'reservation-engagement': 72,
              'engagement-bon-commande': 120,
              'bon-commande-facture': 168,
              'facture-depense': 120,
              'depense-paiement': 240
            },
            seuilVariationPct: 20
          },
          summary: {
            stages: 1,
            volumeTotal: 2,
            alerts: 1
          },
          metrics: [
            {
              stage: 'depense-paiement',
              stageLabel: 'Depense -> Paiement',
              p50: 48,
              p95: 96,
              volume: 2,
              trend: [{ period: '2026-03', p50: 48, p95: 96, volume: 2 }],
              variationPct: 25,
              thresholds: { p95Hours: 72, variationPct: 20 },
              alert: { active: true, reasons: ['p95 96h > seuil 72h'] }
            }
          ],
          alerts: [{ stage: 'depense-paiement', stageLabel: 'Depense -> Paiement', reasons: ['p95 96h > seuil 72h'] }]
        })
      });
      return;
    }

    if (request.method() === 'POST' && url.pathname === '/reporting-analytique/exports') {
      state.exportStartCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exportId: 'export-analytique-1',
          status: 'completed'
        })
      });
      return;
    }

    if (url.pathname === '/reporting-analytique/exports/status') {
      state.exportStatusCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exportId: 'export-analytique-1',
          status: 'completed',
          downloadUrl: '/reporting-analytique/exports/export-analytique-1/download?token=token-1',
          filename: 'reporting-analytique-tableau-croise.csv'
        })
      });
      return;
    }

    if (url.pathname === '/reporting-analytique/exports/export-analytique-1/download') {
      state.exportDownloadCount += 1;
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="reporting-analytique-tableau-croise.csv"'
        },
        body: 'rowKey,2026-03\nACT-1,500'
      });
      return;
    }

    if (url.pathname.startsWith('/reporting-execution-tresorerie') || url.pathname.startsWith('/reporting-comptable') || url.pathname.startsWith('/reporting-fournisseurs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          view: 'noop',
          rows: [],
          summary: {},
          pagination: { total: 0, page: 1, pageSize: 100 },
          filters: {}
        })
      });
      return;
    }

    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  return state;
};

test('reporting conserve les onglets existants et affiche analytique avance', async ({ page }) => {
  const accessToken = makeJwt({
    sub: 'user-reporting-1',
    tenantId: 'client-1',
    roles: ['admin_client'],
    exp: Math.floor(Date.now() / 1000) + 600
  });

  const routeState = await setupReportingRoutes(page);

  await page.addInitScript((token: string) => {
    window.localStorage.setItem('agilys.auth.accessToken', token);
    window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
  }, accessToken);

  await page.goto(`${UI_BASE_URL}/app/reporting`);

  await expect(page.getByRole('tab', { name: /Exécution Budgétaire/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /États Financiers/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Analytique Avancé/i })).toBeVisible();

  await page.getByRole('tab', { name: /Exécution Budgétaire/i }).click();
  await expect(page.getByText('Filtres execution budgetaire et tresorerie')).toBeVisible();

  await page.getByRole('tab', { name: /États Financiers/i }).click();
  await expect(page.getByText('Balance Comptable')).toBeVisible();

  await page.getByRole('tab', { name: /Analytique Avancé/i }).click();
  await expect(page.getByText('Tableau croise multi-dimensions')).toBeVisible();
  await page.getByRole('tab', { name: 'Dashboard' }).click();
  await expect(page.getByText('Top lignes')).toBeVisible();
  await expect(page.getByText('ACT-1')).toBeVisible();

  const analytiqueFiltersCard = page.locator('div').filter({ has: page.getByText('Filtres tableau croise, dashboard et cycle-time') }).first();
  await analytiqueFiltersCard.getByRole('combobox').nth(0).click();
  await page.getByRole('option', { name: 'Fournisseur' }).click();

  await analytiqueFiltersCard.getByRole('combobox').nth(2).click();
  await page.getByRole('option', { name: 'Nombre de lignes' }).click();

  await expect
    .poll(() => routeState.tableauRequests.some((search) => search.includes('rowDimension=fournisseur')))
    .toBeTruthy();
  await expect
    .poll(() => routeState.tableauRequests.some((search) => search.includes('measure=count')))
    .toBeTruthy();

  await page.getByRole('button', { name: 'Exporter' }).click();

  await expect.poll(() => routeState.exportStartCount).toBeGreaterThan(0);
  await expect.poll(() => routeState.exportStatusCount).toBeGreaterThan(0);
  await expect.poll(() => routeState.exportDownloadCount).toBeGreaterThan(0);

  await page.getByRole('tab', { name: 'Cycle-time' }).click();
  await expect(page.getByText('Metriques cycle-time par etape')).toBeVisible();
  await expect(page.getByText('Depense -> Paiement')).toBeVisible();
  await expect.poll(() => routeState.cycleTimeRequests.length).toBeGreaterThan(0);
});
