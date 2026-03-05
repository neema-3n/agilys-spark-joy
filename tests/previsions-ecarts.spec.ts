import { test, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';

const UI_BASE_URL = 'http://127.0.0.1:45174';
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
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`UI server did not start within ${timeoutMs}ms`);
};

const setupAuthenticatedPrevisionsApi = async (
  page: Page,
  accessToken: string,
  options: {
    ecartsStatus?: number;
    ecartsBody: Record<string, unknown>;
    onEcartsRequest?: (url: URL) => void;
  }
) => {
  await page.route('**://127.0.0.1:3001/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/auth/refresh') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken,
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

    if (url.pathname === '/previsions/scenarios') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
      return;
    }

    if (url.pathname === '/previsions/ecarts') {
      options.onEcartsRequest?.(url);
      await route.fulfill({
        status: options.ecartsStatus ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(options.ecartsBody)
      });
      return;
    }

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    });
  });
};

test.describe('previsions ecarts view', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async () => {
    uiServerProcess = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '45174'], {
      cwd: '/Volumes/mySD1.5/projects/agilys-spark-joy',
      stdio: 'ignore'
    });

    await waitForUiServer(UI_SERVER_START_TIMEOUT_MS);
  });

  test.afterAll(() => {
    if (uiServerProcess) {
      uiServerProcess.kill('SIGTERM');
      uiServerProcess = null;
    }
  });

  test('affiche un empty state et envoie les filtres metier dans la requete', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-ecarts-empty',
      tenantId: 'tenant-1',
      roles: ['super_admin'],
      exp: Math.floor(Date.now() / 1000) + 600
    });

    const ecartsRequests: URL[] = [];

    await setupAuthenticatedPrevisionsApi(page, accessToken, {
      ecartsBody: {
        items: [],
        filtres: { exerciceId: 'ex-2026' },
        totaux: {
          montantPrevu: 0,
          montantExecute: 0,
          ecartMontant: 0,
          nombreAxes: 0
        }
      },
      onEcartsRequest: (url) => {
        ecartsRequests.push(url);
      }
    });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/previsions`);
    await expect(page).toHaveURL(/\/app\/previsions$/);
    await expect(page.getByText('Aucune donnée disponible sur le scope sélectionné.')).toBeVisible();

    await page.getByLabel('Période').fill('2026');
    await page.getByLabel('Section').fill('SEC-OPS');
    await page.getByLabel('Programme').fill('PRG-INV');
    await page.getByRole('button', { name: 'Appliquer les filtres' }).click();

    await expect
      .poll(() => ecartsRequests.length)
      .toBeGreaterThan(1);

    const latestRequest = ecartsRequests.at(-1);
    expect(latestRequest?.searchParams.get('exerciceId')).toBe('ex-2026');
    expect(latestRequest?.searchParams.get('periode')).toBe('2026');
    expect(latestRequest?.searchParams.get('sectionCode')).toBe('SEC-OPS');
    expect(latestRequest?.searchParams.get('programmeCode')).toBe('PRG-INV');
  });

  test('affiche une alerte actionnable en cas d\'erreur API', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-ecarts-error',
      tenantId: 'tenant-1',
      roles: ['super_admin'],
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await setupAuthenticatedPrevisionsApi(page, accessToken, {
      ecartsStatus: 400,
      ecartsBody: {
        message: 'Periode invalide: format attendu AAAA (ex: 2026)'
      }
    });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/previsions`);
    await expect(page).toHaveURL(/\/app\/previsions$/);
    await expect(page.getByText('Impossible de charger les écarts')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Periode invalide: format attendu AAAA (ex: 2026)')).toBeVisible({ timeout: 20_000 });
  });
});
