import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';

const UI_BASE_URL = 'http://127.0.0.1:45180';
const UI_SERVER_START_TIMEOUT_MS = 60_000;
let uiServerProcess: ChildProcess | null = null;

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
};

const waitForUiServer = async (timeoutMs: number): Promise<void> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(UI_BASE_URL);
      const html = await response.text();
      if (response.ok && html.includes('id="root"')) {
        return;
      }
    } catch {
      // Server still booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`UI server did not start within ${timeoutMs}ms`);
};

const setupDashboardApi = async (
  page: Page,
  options: {
    failSections?: boolean;
    failEcarts?: boolean;
    onEcartsRequest?: (url: URL) => void;
  } = {}
) => {
  await page.route('**://127.0.0.1:3001/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.startsWith('/budget-referentiels/exercices')) {
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
            statut: 'ouvert',
          },
          {
            id: 'ex-2025',
            clientId: 'client-1',
            libelle: 'Exercice 2025',
            code: 'EX2025',
            dateDebut: '2025-01-01',
            dateFin: '2025-12-31',
            statut: 'cloture',
          },
        ]),
      });
      return;
    }

    if (url.pathname.startsWith('/budget-referentiels/sections')) {
      if (options.failSections) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Service sections indisponible' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'sec-1',
            clientId: 'client-1',
            exerciceId: 'ex-2026',
            code: 'SEC-OPS',
            libelle: 'Operations',
            ordre: 1,
            statut: 'actif',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            createdBy: 'user-1',
          },
        ]),
      });
      return;
    }

    if (url.pathname.startsWith('/budget-referentiels/programmes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'prg-1',
            sectionId: 'sec-1',
            clientId: 'client-1',
            exerciceId: 'ex-2026',
            code: 'PRG-INV',
            libelle: 'Investissement',
            ordre: 1,
            statut: 'actif',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            createdBy: 'user-1',
          },
        ]),
      });
      return;
    }

    if (url.pathname.startsWith('/budget-referentiels/actions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'act-1',
            programmeId: 'prg-1',
            clientId: 'client-1',
            exerciceId: 'ex-2026',
            code: 'ACT-1',
            libelle: 'Action 1',
            ordre: 1,
            statut: 'actif',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            createdBy: 'user-1',
          },
        ]),
      });
      return;
    }

    if (url.pathname.startsWith('/budget-referentiels/enveloppes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'env-1',
            clientId: 'client-1',
            exerciceId: 'ex-2026',
            code: 'ENV-OPS',
            nom: 'Enveloppe OPS',
            sourceFinancement: 'interne',
            montantAlloue: 1200000,
            montantConsomme: 450000,
            statut: 'actif',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            createdBy: 'user-1',
          },
        ]),
      });
      return;
    }

    if (url.pathname.startsWith('/budget-referentiels/lignes-budgetaires')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ligne-1',
            exerciceId: 'ex-2026',
            actionId: 'act-1',
            compteId: 'cmp-1',
            enveloppeId: 'env-1',
            libelle: 'Ligne OPS',
            montantInitial: 500000,
            montantModifie: 600000,
            montantEngage: 300000,
            montantLiquide: 150000,
            montantPaye: 120000,
            disponible: 300000,
            statut: 'actif',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]),
      });
      return;
    }

    if (url.pathname.startsWith('/previsions/ecarts')) {
      options.onEcartsRequest?.(url);
      if (options.failEcarts) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Periode invalide: format attendu AAAA-MM' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              periode: '2026-01',
              axe: {
                sectionCode: 'SEC-OPS',
                programmeCode: 'PRG-INV',
                actionCode: 'ACT-1',
                enveloppeId: 'env-1',
              },
              montantPrevu: 200000,
              montantExecute: 260000,
              ecartMontant: 60000,
              ecartTaux: 30,
            },
          ],
          filtres: { exerciceId: 'ex-2026' },
          totaux: {
            montantPrevu: 200000,
            montantExecute: 260000,
            ecartMontant: 60000,
            ecartTaux: 30,
            nombreAxes: 1,
          },
        }),
      });
      return;
    }

    if (url.pathname.startsWith('/tresorerie/supervision')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exerciceId: 'ex-2026',
          generatedAt: '2026-03-09T10:00:00.000Z',
          currentPosition: 1000000,
          shortTermProjection: 900000,
          pendingDisbursements: 150000,
          pendingDisbursementsCount: 2,
          remainingCommitments: 200000,
          remainingCommitmentsCount: 3,
          nonReconciledOperations: 4,
          pendingReconciliations: 4,
          qualifiedDiscrepancies: 1,
          projectedExposure: 350000,
          projectedGap: -100000,
          activeExceptions: 1,
          expiredExceptions: 0,
          consumedExceptions: 1,
          alerts: [
            {
              key: 'cash-gap',
              severity: 'critical',
              code: 'CASH_GAP',
              label: 'Risque cash',
              message: 'Le gap projete depasse le seuil.',
              value: -100000,
              threshold: -50000,
            },
          ],
        }),
      });
      return;
    }

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
};

test.describe('dashboard budgetaire ui', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async () => {
    uiServerProcess = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '45180'], {
      cwd: '/Volumes/mySD1.5/projects/agilys-spark-joy',
      stdio: 'ignore',
    });

    await waitForUiServer(UI_SERVER_START_TIMEOUT_MS);
  });

  test.afterAll(() => {
    if (uiServerProcess) {
      uiServerProcess.kill('SIGTERM');
      uiServerProcess = null;
    }
  });

  test('charge des donnees reelles, applique les filtres et expose le drill-down signal', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-dashboard',
      tenantId: 'client-1',
      roles: ['super_admin'],
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const ecartsRequests: URL[] = [];
    await setupDashboardApi(page, {
      onEcartsRequest: (url) => {
        ecartsRequests.push(url);
      },
    });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/dashboard`);
    await expect(page).toHaveURL(/\/app\/dashboard$/);

    await expect(page.getByRole('heading', { name: 'Tableau de bord budgetaire' })).toBeVisible();
    await expect(page.getByLabel('Entite')).toBeVisible();
    await expect(page.getByLabel('Exercice')).toBeVisible();
    await expect(page.getByText('Signaux d\'action prioritaires')).toBeVisible();

    await page.getByLabel('Periode').fill('2026-01');
    await page.getByLabel('Section').fill('SEC-OPS');
    await page.getByLabel('Programme').fill('PRG-INV');
    await page.getByLabel('Action').fill('ACT-1');
    await page.getByLabel('Enveloppe').fill('ENV-OPS');
    await page.getByRole('button', { name: 'Appliquer' }).click();

    await expect.poll(() => ecartsRequests.length).toBeGreaterThan(1);
    const last = ecartsRequests.at(-1);
    expect(last?.searchParams.get('periode')).toBe('2026-01');
    expect(last?.searchParams.get('sectionCode')).toBe('SEC-OPS');
    expect(last?.searchParams.get('programmeCode')).toBe('PRG-INV');
    expect(last?.searchParams.get('actionCode')).toBe('ACT-1');
    expect(last?.searchParams.get('enveloppeId')).toBe('ENV-OPS');

    await page.getByRole('link', { name: /Supervision tresorerie/ }).click();
    await expect(page).toHaveURL(/\/app\/tresorerie\?tab=supervision$/);
  });

  test('affiche une erreur actionnable si le chargement des ecarts echoue', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-dashboard-error',
      tenantId: 'client-1',
      roles: ['super_admin'],
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    await setupDashboardApi(page, { failEcarts: true });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/dashboard`);
    await expect(page).toHaveURL(/\/app\/dashboard$/);
    await expect(page.getByText('Impossible de charger le dashboard')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Periode invalide: format attendu AAAA-MM')).toBeVisible({ timeout: 20_000 });
  });
});
