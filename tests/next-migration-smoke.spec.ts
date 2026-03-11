import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';

const UI_BASE_URL = 'http://127.0.0.1:45178';
const UI_SERVER_START_TIMEOUT_MS = 90_000;
let uiServerProcess: ChildProcess | null = null;
const NEXT_BIN = './node_modules/next/dist/bin/next';

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
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`UI server did not start within ${timeoutMs}ms`);
};

test.describe('next migration shell smoke', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    uiServerProcess = spawn(
      process.execPath,
      [NEXT_BIN, 'dev', '--hostname', '127.0.0.1', '--port', '45178'],
      {
        cwd: '/Volumes/mySD1.5/projects/agilys-spark-joy',
        stdio: 'ignore',
      }
    );

    await waitForUiServer(UI_SERVER_START_TIMEOUT_MS);
  });

  test.afterAll(() => {
    if (uiServerProcess) {
      uiServerProcess.kill('SIGTERM');
      uiServerProcess = null;
    }
  });

  test('@migration-smoke app shell stays mounted during internal navigation', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-shell',
      tenantId: 'tenant-1',
      roles: ['super_admin'],
      email: 'shell@agilys.local',
      nom: 'Shell',
      prenom: 'User',
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    await page.route('**://127.0.0.1:3001/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (url.pathname === '/clients') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'tenant-1',
              nom: 'Client test',
            },
          ]),
        });
        return;
      }

      if (url.pathname.includes('/exercices')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'ex-2026',
              clientId: 'tenant-1',
              libelle: 'Exercice 2026',
              code: 'EX2026',
              dateDebut: '2026-01-01',
              dateFin: '2026-12-31',
              statut: 'ouverte',
            },
          ]),
        });
        return;
      }

      if (url.pathname === '/auth/refresh') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken,
            refreshToken: 'refresh-token-shell',
          }),
        });
        return;
      }

      if (url.pathname === '/auth/logout') {
        await route.fulfill({ status: 204 });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.addInitScript((token) => {
      window.localStorage.setItem('agilys.auth.accessToken', token.accessToken);
      window.localStorage.setItem('agilys.auth.refreshToken', token.refreshToken);
    }, {
      accessToken,
      refreshToken: 'refresh-token-shell',
    });

    await page.goto(`${UI_BASE_URL}/app/dashboard`);
    await expect(page).toHaveURL(/\/app\/dashboard$/);
    await expect(page.getByTestId('app-shell-brand')).toBeVisible();
    const navigationEntriesBefore = await page.evaluate(
      () => performance.getEntriesByType('navigation').length
    );

    await page.getByRole('button', { name: 'Opérations' }).click();
    await page.getByRole('link', { name: 'Budget' }).click();
    await expect(page).toHaveURL(/\/app\/budgets$/);
    await expect(page.getByTestId('app-shell-brand')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Budget' })).toBeVisible();

    const navigationEntriesAfter = await page.evaluate(
      () => performance.getEntriesByType('navigation').length
    );

    expect(navigationEntriesAfter).toBe(navigationEntriesBefore);
  });
});
