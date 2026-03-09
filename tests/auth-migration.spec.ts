import { test, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { createTokenStorage, StorageLike } from '../src/services/auth/token-storage';
import { createHttpClient } from '../src/services/api/http-client';
import { decodeAccessTokenClaims, isTokenExpired } from '../src/services/auth/auth-session';
import { buildRequestedPath, resolveLoginRedirect } from '../src/services/auth/auth-routing';
import { authService } from '../src/services/api/auth.service';
import { httpClient } from '../src/services/api/http-client';
import { tokenStorage } from '../src/services/auth/token-storage';
import { applyModificationsToLignes, computeDecisionVersionDiff } from '../src/services/api/budget-modifications.service';
import { buildEcartsPrevisionQueryKey } from '../src/hooks/usePrevisions';
import { bonsCommandeService } from '../src/services/api/bonsCommande.service';
import { facturesService } from '../src/services/api/factures.service';
import { createDepenseFromFacture } from '../src/services/api/depenses.service';
import { reportingComptableService } from '../src/services/api/reporting-comptable.service';

class MockStorage implements StorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
};

const UI_BASE_URL = 'http://127.0.0.1:45173';
const UI_SERVER_START_TIMEOUT_MS = 60_000;
let uiServerProcess: ChildProcess | null = null;

const setupMigrationBudgetApiStubs = async (page: Page) => {
  await page.route('**/budget-referentiels/**', async (route) => {
    const requestUrl = route.request().url();
    const isExercicesEndpoint = requestUrl.includes('/budget-referentiels/exercices');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        isExercicesEndpoint
          ? [
              {
                id: 'ex-2026',
                clientId: 'client-1',
                libelle: 'Exercice 2026',
                code: 'EX2026',
                dateDebut: '2026-01-01',
                dateFin: '2026-12-31',
                statut: 'ouvert'
              }
            ]
          : []
      )
    });
  });
};

const setupAuthenticatedAppApiFallback = async (page: Page, accessToken: string) => {
  await page.route('**://127.0.0.1:3001/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === '/auth/login') {
      await route.fallback();
      return;
    }

    if (pathname === '/auth/refresh') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken,
          refreshToken: 'refresh-token-stub',
        }),
      });
      return;
    }

    if (pathname === '/auth/logout') {
      await route.fulfill({ status: 204 });
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

const readAnalyticsEvents = async (page: Page) =>
  page.evaluate(() => {
    const maybeWindow = window as Window & {
      __agilysAnalyticsEvents?: Array<Record<string, unknown>>;
    };

    return Array.isArray(maybeWindow.__agilysAnalyticsEvents)
      ? maybeWindow.__agilysAnalyticsEvents
      : [];
  });

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

test.beforeAll(() => {
  if (typeof globalThis.atob !== 'function') {
    globalThis.atob = (value: string) => Buffer.from(value, 'base64').toString('binary');
  }
});

test.describe('auth ui routing flows', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async () => {
    test.setTimeout(120_000);

    uiServerProcess = spawn(
      'pnpm',
      ['exec', 'vite', '--host', '127.0.0.1', '--port', '45173'],
      {
        cwd: '/Volumes/mySD1.5/projects/agilys-spark-joy',
        stdio: 'ignore'
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

  test('@migration-auth @ac1 @flux-AUTH-01 protected route redirects to login and successful login returns to requested route', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-7',
      tenantId: 'tenant-1',
      roles: ['admin_client'],
      email: 'user@agilys.local',
      nom: 'Test',
      prenom: 'User',
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken,
          refreshToken: 'refresh-token'
        })
      });
    });

    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto(`${UI_BASE_URL}/app/dashboard?fromSpec=1`);
    await page.waitForURL('**/auth/login', { timeout: 20_000 });

    await page.getByLabel('Email').fill('user@agilys.local');
    await page.getByLabel('Mot de passe').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/app\/dashboard\?fromSpec=1$/);
  });

  test('@migration-auth @ac1 @flux-AUTH-03 logout redirects to login and clears local tokens', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-8',
      tenantId: 'tenant-1',
      roles: ['admin_client'],
      email: 'logout@agilys.local',
      nom: 'Logout',
      prenom: 'User',
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken,
          refreshToken: 'refresh-token-logout'
        })
      });
    });

    await page.route('**/auth/logout', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.fulfill({ status: 204 });
    });

    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto(`${UI_BASE_URL}/auth/login?from=%2Fapp%2Fdashboard`);
    await page.getByLabel('Email').fill('logout@agilys.local');
    await page.getByLabel('Mot de passe').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/app\/dashboard$/);

    await page.getByRole('button', { name: /User Logout/i }).click();
    await page.getByRole('menuitem', { name: 'Déconnexion' }).click();

    await page.waitForURL('**/auth/login', { timeout: 2_000 });
    await expect(page).toHaveURL(/\/auth\/login$/);

    const tokens = await page.evaluate(() => ({
      accessToken: window.localStorage.getItem('agilys.auth.accessToken'),
      refreshToken: window.localStorage.getItem('agilys.auth.refreshToken')
    }));
    expect(tokens.accessToken).toBeNull();
    expect(tokens.refreshToken).toBeNull();
  });

  test('@migration-depense @ac1 @flux-OPS-05 depenses flow allows opening creation dialog and enforces minimal validation', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-9',
      tenantId: 'tenant-1',
      roles: ['super_admin'],
      email: 'depense@agilys.local',
      nom: 'Depense',
      prenom: 'User',
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await setupAuthenticatedAppApiFallback(page, accessToken);

    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken,
          refreshToken: 'refresh-token-depense'
        })
      });
    });
    await setupMigrationBudgetApiStubs(page);

    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto(`${UI_BASE_URL}/auth/login?from=%2Fapp%2Fdepenses`);
    await page.getByLabel('Email').fill('depense@agilys.local');
    await page.getByLabel('Mot de passe').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/app\/depenses$/);
    await expect(page.getByRole('link', { name: 'Dépenses' })).toBeVisible();
    await page.getByRole('button', { name: 'Nouvelle dépense' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Nouvelle dépense' })).toBeVisible();
    await page.getByLabel('Objet de la dépense *').fill('Achat minimal de test migration');
    await page.getByLabel('Montant (€) *').fill('1500');
    await page.getByRole('button', { name: 'Créer la dépense' }).click();
    await expect(page.getByText('Au moins une imputation budgétaire est requise').first()).toBeVisible();
  });

  test('@migration-budget @ac1 @flux-BUD-02 budgets flow exposes allocation/reallocation entrypoint in UI', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-10',
      tenantId: 'tenant-1',
      roles: ['super_admin'],
      email: 'budget@agilys.local',
      nom: 'Budget',
      prenom: 'User',
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await setupAuthenticatedAppApiFallback(page, accessToken);

    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken,
          refreshToken: 'refresh-token-budget'
        })
      });
    });
    await setupMigrationBudgetApiStubs(page);

    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto(`${UI_BASE_URL}/auth/login?from=%2Fapp%2Fbudgets%3Ftab%3Dmodifications`);
    await page.getByLabel('Email').fill('budget@agilys.local');
    await page.getByLabel('Mot de passe').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/app\/budgets\?tab=modifications$/);
    await expect(page.getByRole('heading', { name: 'Modifications Budgétaires' })).toBeVisible();
    await page.getByRole('button', { name: 'Nouvelle modification' }).click();
    await expect(page.getByRole('dialog', { name: 'Nouvelle modification budgétaire' })).toBeVisible();
    await expect(page.getByText('Type de modification')).toBeVisible();
    await expect(page.getByText('Ligne budgétaire')).toBeVisible();
    await expect(page.getByLabel('Montant')).toBeVisible();
    await expect(page.getByLabel('Motif')).toBeVisible();
  });

  test('@story-4-3 @depenses-from-facture invalidates depenses and factures queries after creation', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-43',
      tenantId: 'tenant-1',
      roles: ['super_admin'],
      email: 'story43@agilys.local',
      nom: 'Story',
      prenom: 'FourThree',
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const factureFixture = {
      id: 'fac-43-1',
      clientId: 'tenant-1',
      exerciceId: 'ex-2026',
      numero: 'FAC/EX2026/0001',
      dateFacture: '2026-03-05',
      fournisseurId: 'fr-1',
      objet: 'Facture eligible liquidation',
      montantHT: 100,
      montantTVA: 20,
      montantTTC: 120,
      montantLiquide: 0,
      statut: 'validee',
      createdAt: '2026-03-05T10:00:00.000Z',
      updatedAt: '2026-03-05T10:00:00.000Z',
    };

    let depensesGetCount = 0;
    let facturesGetCount = 0;
    let createFromFactureCount = 0;
    let createFromFacturePayload: Record<string, unknown> | null = null;

    await page.route('**://127.0.0.1:3001/**', async (route) => {
      const request = route.request();
      const requestUrl = new URL(request.url());
      const { pathname } = requestUrl;

      if (pathname === '/auth/login') {
        await route.fallback();
        return;
      }

      if (pathname === '/auth/refresh') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken,
            refreshToken: 'refresh-token-story43',
          }),
        });
        return;
      }

      if (pathname === '/auth/logout') {
        await route.fulfill({ status: 204 });
        return;
      }

      if (pathname === '/factures/paginated' && request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [factureFixture],
            totalCount: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
          }),
        });
        return;
      }

      if (pathname === '/factures/stats' && request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            nombreTotal: 1,
            nombreBrouillon: 0,
            nombreValidee: 1,
            nombrePayee: 0,
            montantTotal: 120,
            montantBrouillon: 0,
            montantValidee: 120,
            montantLiquide: 0,
          }),
        });
        return;
      }

      if (pathname === '/factures' && request.method() === 'GET') {
        facturesGetCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([factureFixture]),
        });
        return;
      }

      if (pathname === '/depenses' && request.method() === 'GET') {
        depensesGetCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }

      if (pathname === '/depenses/from-facture' && request.method() === 'POST') {
        createFromFactureCount += 1;
        createFromFacturePayload = JSON.parse(request.postData() || '{}') as Record<string, unknown>;

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'dep-43-1',
            clientId: 'tenant-1',
            exerciceId: 'ex-2026',
            numero: 'DEP/EX2026/0001',
            dateDepense: '2026-03-05',
            objet: 'Liquidation 1 facture',
            montant: 120,
            montantPaye: 0,
            factureId: 'fac-43-1',
            factureIds: ['fac-43-1'],
            statut: 'brouillon',
            createdAt: '2026-03-05T10:10:00.000Z',
            updatedAt: '2026-03-05T10:10:00.000Z',
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

    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken,
          refreshToken: 'refresh-token-story43-login',
        }),
      });
    });

    await setupMigrationBudgetApiStubs(page);
    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto(`${UI_BASE_URL}/auth/login?from=%2Fapp%2Ffactures`);
    await page.getByLabel('Email').fill('story43@agilys.local');
    await page.getByLabel('Mot de passe').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/app\/factures$/);
    await expect(page.getByText('FAC/EX2026/0001')).toBeVisible();

    const factureRow = page.locator('tr', { hasText: 'FAC/EX2026/0001' }).first();
    await factureRow.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'Créer une dépense' }).click();

    const createDepenseDialog = page.getByRole('dialog', { name: 'Créer une dépense depuis facture(s)' });
    await expect(createDepenseDialog).toBeVisible();
    await createDepenseDialog.locator('form').evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });

    await expect
      .poll(() => createFromFactureCount)
      .toBe(1);
    expect(createFromFacturePayload).toMatchObject({
      exerciceId: 'ex-2026',
      factureIds: ['fac-43-1'],
      dateDepense: '2026-03-05',
    });

    await expect
      .poll(() => depensesGetCount)
      .toBeGreaterThan(1);

    await expect
      .poll(() => facturesGetCount)
      .toBeGreaterThan(1);
  });

  test('@story-1-1 @vitrine public navigation uses page routes and keeps login accessible', async ({ page }) => {
    await page.goto(`${UI_BASE_URL}/`);
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Fonctionnalités' })).toBeVisible();

    await page.getByRole('link', { name: 'Fonctionnalités' }).first().click();
    await expect(page).toHaveURL(/\/fonctionnalites$/);
    await expect(page.getByRole('heading', { name: 'Fonctionnalités AGILYS' })).toBeVisible();

    await page.getByRole('link', { name: 'Cas clients' }).first().click();
    await expect(page).toHaveURL(/\/cas-clients$/);
    await expect(page.getByRole('heading', { name: 'Cas clients AGILYS' })).toBeVisible();

    await page.getByRole('link', { name: 'Contact' }).first().click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole('heading', { name: 'Contact AGILYS' })).toBeVisible();

    await page.getByRole('link', { name: /Connexion|Se connecter/i }).first().click();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('@story-1-2 @vitrine public cta hierarchy keeps auth primary and lead secondary across pages', async ({ page }) => {
    const expectCtaNavigation = async ({
      routePath,
      surface,
      primaryTarget,
      secondaryTarget,
      openMobileMenu,
    }: {
      routePath: string;
      surface: string;
      primaryTarget: string;
      secondaryTarget: string;
      openMobileMenu?: boolean;
    }) => {
      await page.goto(`${UI_BASE_URL}${routePath}`);
      if (openMobileMenu) {
        await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
      }

      const primary = page.locator(`[data-cta-surface="${surface}"][data-cta-role="primary"]`).first();
      await expect(primary).toHaveAttribute('href', primaryTarget);
      await primary.click();
      await expect(page).toHaveURL(`${UI_BASE_URL}${primaryTarget}`);

      await page.goto(`${UI_BASE_URL}${routePath}`);
      if (openMobileMenu) {
        await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
      }

      const secondary = page.locator(`[data-cta-surface="${surface}"][data-cta-role="secondary"]`).first();
      await expect(secondary).toHaveAttribute('href', secondaryTarget);
      await secondary.click();
      await expect(page).toHaveURL(`${UI_BASE_URL}${secondaryTarget}`);
    };

    await expectCtaNavigation({
      routePath: '/',
      surface: 'header-desktop',
      primaryTarget: '/auth/login',
      secondaryTarget: '/contact',
    });
    await expectCtaNavigation({
      routePath: '/',
      surface: 'hero',
      primaryTarget: '/auth/login',
      secondaryTarget: '/contact',
    });
    await expectCtaNavigation({
      routePath: '/',
      surface: 'home-cta',
      primaryTarget: '/auth/login',
      secondaryTarget: '/contact',
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await expectCtaNavigation({
      routePath: '/',
      surface: 'header-mobile',
      primaryTarget: '/auth/login',
      secondaryTarget: '/contact',
      openMobileMenu: true,
    });
    await page.setViewportSize({ width: 1280, height: 720 });

    await expectCtaNavigation({
      routePath: '/fonctionnalites',
      surface: 'page-fonctionnalites',
      primaryTarget: '/auth/login',
      secondaryTarget: '/contact',
    });
    await expectCtaNavigation({
      routePath: '/cas-clients',
      surface: 'page-cas-clients',
      primaryTarget: '/auth/login',
      secondaryTarget: '/contact',
    });
    await expectCtaNavigation({
      routePath: '/contact',
      surface: 'page-contact',
      primaryTarget: '/auth/login',
      secondaryTarget: '/fonctionnalites',
    });
  });

  test('@story-1-3 @vitrine emits funnel analytics with auth and lead conversion dimensions', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-11',
      tenantId: 'tenant-1',
      roles: ['admin_client'],
      email: 'funnel@agilys.local',
      nom: 'Funnel',
      prenom: 'User',
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken,
          refreshToken: 'refresh-token-funnel',
        }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      const analyticsWindow = window as Window & { __agilysAnalyticsEvents?: Array<Record<string, unknown>> };
      analyticsWindow.__agilysAnalyticsEvents = analyticsWindow.__agilysAnalyticsEvents ?? [];
    });

    const collectedEvents: Array<Record<string, unknown>> = [];
    const drainAnalyticsEvents = async () => {
      const snapshot = await readAnalyticsEvents(page);
      collectedEvents.push(...snapshot);
      await page.evaluate(() => {
        (window as Window & { __agilysAnalyticsEvents?: Array<Record<string, unknown>> }).__agilysAnalyticsEvents = [];
      });
    };

    const triggerPrimaryCta = async ({
      routePath,
      surface,
      mobile,
    }: {
      routePath: string;
      surface: string;
      mobile?: boolean;
    }) => {
      if (mobile) {
        await page.setViewportSize({ width: 390, height: 844 });
      } else {
        await page.setViewportSize({ width: 1280, height: 720 });
      }

      await page.goto(`${UI_BASE_URL}${routePath}`);

      if (mobile) {
        await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
      }

      await page.locator(`[data-cta-surface="${surface}"][data-cta-role="primary"]`).first().click();
      await expect(page).toHaveURL(/\/auth\/login$/);
      await drainAnalyticsEvents();
    };

    await page.goto(`${UI_BASE_URL}/`);
    await drainAnalyticsEvents();

    await page.locator('[data-cta-surface="home-cta"][data-cta-role="secondary"]').first().click();
    await expect(page).toHaveURL(/\/contact$/);
    await drainAnalyticsEvents();

    await page.goto(`${UI_BASE_URL}/fonctionnalites`);
    await expect(page).toHaveURL(/\/fonctionnalites$/);
    await drainAnalyticsEvents();
    await page.goto(`${UI_BASE_URL}/cas-clients`);
    await expect(page).toHaveURL(/\/cas-clients$/);
    await drainAnalyticsEvents();
    await page.goto(`${UI_BASE_URL}/contact`);
    await expect(page).toHaveURL(/\/contact$/);
    await drainAnalyticsEvents();

    await triggerPrimaryCta({ routePath: '/', surface: 'header-desktop' });
    await triggerPrimaryCta({ routePath: '/', surface: 'hero' });
    await triggerPrimaryCta({ routePath: '/', surface: 'home-cta' });
    await triggerPrimaryCta({ routePath: '/', surface: 'header-mobile', mobile: true });
    await triggerPrimaryCta({ routePath: '/fonctionnalites', surface: 'page-fonctionnalites' });
    await triggerPrimaryCta({ routePath: '/cas-clients', surface: 'page-cas-clients' });
    await triggerPrimaryCta({ routePath: '/contact', surface: 'page-contact' });

    await page.getByLabel('Email').fill('funnel@agilys.local');
    await page.getByLabel('Mot de passe').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/app\/dashboard$/);

    await expect
      .poll(async () => {
        const events = await readAnalyticsEvents(page);
        return events.some((event) => event.event === 'app_landing_view');
      })
      .toBeTruthy();

    await drainAnalyticsEvents();
    const events = collectedEvents;
    const eventNames = events.map((event) => String(event.event));

    expect(eventNames).toContain('vitrine_vue');
    expect(eventNames).toContain('cta_secondaire_click');
    expect(eventNames).toContain('cta_principal_click');
    expect(eventNames).toContain('auth_page_view');
    expect(eventNames).toContain('auth_success');
    expect(eventNames).toContain('app_landing_view');

    const leadEvent = events.find((event) => event.event === 'cta_secondaire_click');
    expect(leadEvent?.conversionType).toBe('lead');

    const authClickEvent = events.find((event) => event.event === 'cta_principal_click');
    expect(authClickEvent?.conversionType).toBe('auth');

    const vitrinePaths = new Set(
      events
        .filter((event) => event.event === 'vitrine_vue')
        .map((event) => String(event.path))
    );
    expect([...vitrinePaths]).toEqual(
      expect.arrayContaining(['/', '/fonctionnalites', '/cas-clients', '/contact'])
    );

    const primarySurfaces = new Set(
      events
        .filter((event) => event.event === 'cta_principal_click')
        .map((event) => String(event.surface))
    );
    expect([...primarySurfaces]).toEqual(
      expect.arrayContaining([
        'header-desktop',
        'header-mobile',
        'hero',
        'home-cta',
        'page-fonctionnalites',
        'page-cas-clients',
        'page-contact',
      ])
    );

    const authSuccessIndex = eventNames.indexOf('auth_success');
    const appLandingIndex = eventNames.indexOf('app_landing_view');
    expect(authSuccessIndex).toBeGreaterThanOrEqual(0);
    expect(appLandingIndex).toBeGreaterThan(authSuccessIndex);
  });

  test('@story-1-4 @vitrine enforces seo metadata and emits seo plus web-vitals telemetry', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      const analyticsWindow = window as Window & { __agilysAnalyticsEvents?: Array<Record<string, unknown>> };
      analyticsWindow.__agilysAnalyticsEvents = analyticsWindow.__agilysAnalyticsEvents ?? [];
    });

    const vitrinePages = [
      { path: '/', title: 'AGILYS | Pilotage budgetaire public' },
      { path: '/fonctionnalites', title: 'Fonctionnalites AGILYS | Vitrine' },
      { path: '/cas-clients', title: 'Cas clients AGILYS | Vitrine' },
      { path: '/contact', title: 'Contact AGILYS | Vitrine' },
    ];
    const collectedEvents: Array<Record<string, unknown>> = [];

    for (const vitrinePage of vitrinePages) {
      await page.goto(`${UI_BASE_URL}${vitrinePage.path}`);
      await expect(page).toHaveTitle(vitrinePage.title);

      const seoSnapshot = await page.evaluate(() => ({
        description:
          document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.getAttribute('content') ?? '',
        robots: document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.getAttribute('content') ?? '',
        canonical: document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href') ?? '',
        h1Count: document.querySelectorAll('h1').length,
      }));

      expect(seoSnapshot.description.trim().length).toBeGreaterThan(0);
      expect(seoSnapshot.robots).toContain('index');
      expect(seoSnapshot.canonical).toBe(`${UI_BASE_URL}${vitrinePage.path}`);
      expect(seoSnapshot.h1Count).toBeGreaterThanOrEqual(1);

      await expect
        .poll(async () => {
          const events = await readAnalyticsEvents(page);
          const seoEvents = events.filter((event) => event.event === 'seo_audit').length;
          const webVitalEvents = events.filter((event) => event.event === 'web_vital_metric').length;
          return { seoEvents, webVitalEvents };
        })
        .toMatchObject({ seoEvents: 1, webVitalEvents: 3 });

      const pageEvents = await readAnalyticsEvents(page);
      collectedEvents.push(...pageEvents);
      await page.evaluate(() => {
        (window as Window & { __agilysAnalyticsEvents?: Array<Record<string, unknown>> }).__agilysAnalyticsEvents = [];
      });
    }

    const seoAuditPaths = new Set(
      collectedEvents
        .filter((event) => event.event === 'seo_audit')
        .map((event) => String(event.path))
    );
    expect([...seoAuditPaths]).toEqual(expect.arrayContaining(vitrinePages.map((vitrinePage) => vitrinePage.path)));

    const measuredVitalNames = new Set(
      collectedEvents
        .filter((event) => event.event === 'web_vital_metric')
        .map((event) => String(event.webVitalName))
    );
    expect([...measuredVitalNames]).toEqual(expect.arrayContaining(['lcp', 'cls', 'inp']));

    await page.goto(`${UI_BASE_URL}/robots.txt`);
    await expect(page.locator('body')).toContainText('User-agent: *');
    await expect(page.locator('body')).toContainText('Sitemap: /sitemap.xml');

    await page.goto(`${UI_BASE_URL}/sitemap.xml`);
    await expect(page.locator('body')).toContainText('<loc>/</loc>');
    await expect(page.locator('body')).toContainText('<loc>/fonctionnalites</loc>');
    await expect(page.locator('body')).toContainText('<loc>/cas-clients</loc>');
    await expect(page.locator('body')).toContainText('<loc>/contact</loc>');
  });

  test('@story-1-1 @vitrine protected app routes still redirect anonymous users to login', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto(`${UI_BASE_URL}/app/dashboard`);
    await page.waitForURL('**/auth/login', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('@story-1-1 @vitrine mobile menu navigation works with public routes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${UI_BASE_URL}/`);

    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    await page.getByRole('link', { name: 'Fonctionnalités' }).click();
    await expect(page).toHaveURL(/\/fonctionnalites$/);
  });

  test('@story-1-1 @vitrine footer exposes legal links', async ({ page }) => {
    await page.goto(`${UI_BASE_URL}/`);

    await page.getByRole('link', { name: 'Mentions légales' }).first().click();
    await expect(page).toHaveURL(/\/mentions-legales$/);
    await expect(page.getByRole('heading', { name: 'Mentions légales' })).toBeVisible();

    await page.goto(`${UI_BASE_URL}/`);
    await page.getByRole('link', { name: 'Politique de confidentialité' }).first().click();
    await expect(page).toHaveURL(/\/politique-confidentialite$/);
    await expect(page.getByRole('heading', { name: 'Politique de confidentialité' })).toBeVisible();

    await page.goto(`${UI_BASE_URL}/`);
    await page.getByRole('link', { name: "Conditions d'utilisation" }).first().click();
    await expect(page).toHaveURL(/\/conditions-utilisation$/);
    await expect(page.getByRole('heading', { name: "Conditions d'utilisation" })).toBeVisible();
  });
});

test('token storage write/read/clear', async () => {
  const storage = createTokenStorage(new MockStorage());

  storage.write({ accessToken: 'access', refreshToken: 'refresh' });
  expect(storage.read()).toEqual({ accessToken: 'access', refreshToken: 'refresh' });

  storage.clear();
  expect(storage.read()).toBeNull();
});

test('http client retries once after refresh success', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'old-access', refreshToken: 'refresh-token' });

  let protectedCallCount = 0;
  let refreshCallCount = 0;

  const fetchImpl: typeof fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();

    if (requestUrl.endsWith('/auth/refresh')) {
      refreshCallCount += 1;
      return new Response(
        JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (requestUrl.endsWith('/secure')) {
      protectedCallCount += 1;
      if (protectedCallCount === 1) {
        return new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer new-access');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    storage
  });

  const response = await client.request('/secure', { method: 'GET' });

  expect(response.status).toBe(200);
  expect(protectedCallCount).toBe(2);
  expect(refreshCallCount).toBe(1);
  expect(storage.read()).toEqual({
    accessToken: 'new-access',
    refreshToken: 'new-refresh'
  });
});

test('http client clears session and notifies when refresh fails', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'expired-access', refreshToken: 'expired-refresh' });

  const fetchImpl: typeof fetch = (async (url: RequestInfo | URL) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();

    if (requestUrl.endsWith('/auth/refresh')) {
      return new Response(JSON.stringify({ message: 'invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (requestUrl.endsWith('/secure')) {
      return new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  let authFailureNotified = false;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    storage
  });

  client.setAuthFailureHandler(() => {
    authFailureNotified = true;
  });

  const response = await client.request('/secure', { method: 'GET' });

  expect(response.status).toBe(401);
  expect(authFailureNotified).toBeTruthy();
  expect(storage.read()).toBeNull();
});

test('http client clears session and notifies when refresh network call throws', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'expired-access', refreshToken: 'expired-refresh' });

  const fetchImpl: typeof fetch = (async (url: RequestInfo | URL) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();

    if (requestUrl.endsWith('/auth/refresh')) {
      throw new Error('network down');
    }

    if (requestUrl.endsWith('/secure')) {
      return new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  let authFailureNotified = false;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    storage
  });

  client.setAuthFailureHandler(() => {
    authFailureNotified = true;
  });

  const response = await client.request('/secure', { method: 'GET' });
  const payload = await response.json();

  expect(response.status).toBe(503);
  expect(payload).toMatchObject({ message: 'Network error' });
  expect(authFailureNotified).toBeFalsy();
  expect(storage.read()).toEqual({ accessToken: 'expired-access', refreshToken: 'expired-refresh' });
});

test('http client preserves requested path on auth failure redirect flow', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'expired-access', refreshToken: 'expired-refresh' });

  const originalWindow = (globalThis as { window?: unknown }).window;
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: {
        pathname: '/app/engagements',
        search: '?status=open',
        hash: '#details'
      }
    },
    configurable: true
  });

  const fetchImpl: typeof fetch = (async (url: RequestInfo | URL) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();

    if (requestUrl.endsWith('/auth/refresh')) {
      return new Response(JSON.stringify({ message: 'invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (requestUrl.endsWith('/secure')) {
      return new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    storage
  });

  let preservedPath: string | undefined;
  client.setAuthFailureHandler((path) => {
    preservedPath = path;
  });

  await client.request('/secure', { method: 'GET' });

  expect(preservedPath).toBe('/app/engagements?status=open#details');
  expect(storage.read()).toBeNull();

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
  } else {
    Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
  }
});

test('http client clears session when retried request is still unauthorized', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'expired-access', refreshToken: 'refresh-token' });

  let refreshCallCount = 0;
  let authFailureNotified = false;

  const fetchImpl: typeof fetch = (async (url: RequestInfo | URL) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();

    if (requestUrl.endsWith('/auth/refresh')) {
      refreshCallCount += 1;
      return new Response(JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (requestUrl.endsWith('/secure')) {
      return new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    storage
  });

  client.setAuthFailureHandler(() => {
    authFailureNotified = true;
  });

  const response = await client.request('/secure', { method: 'GET' });

  expect(response.status).toBe(401);
  expect(refreshCallCount).toBe(1);
  expect(authFailureNotified).toBeTruthy();
  expect(storage.read()).toBeNull();
});

test('http client returns normalized 503 response when request network call throws', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'access-token', refreshToken: 'refresh-token' });

  const fetchImpl: typeof fetch = (async () => {
    throw new Error('network down');
  }) as typeof fetch;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    storage
  });

  const response = await client.request('/secure', { method: 'GET' });
  const payload = await response.json();

  expect(response.status).toBe(503);
  expect(payload).toMatchObject({ message: 'Network error' });
});

test('JWT claims parsing and expiry detection', async () => {
  const validToken = makeJwt({
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin_client'],
    exp: Math.floor(Date.now() / 1000) + 120
  });

  const expiredToken = makeJwt({
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin_client'],
    exp: Math.floor(Date.now() / 1000) - 120
  });

  expect(decodeAccessTokenClaims(validToken)).toMatchObject({
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin_client']
  });

  expect(isTokenExpired(validToken)).toBeFalsy();
  expect(isTokenExpired(expiredToken)).toBeTruthy();
});

test('JWT claims parsing supports UTF-8 payload values', async () => {
  const utf8Token = makeJwt({
    sub: 'user-2',
    tenantId: 'tenant-2',
    roles: ['admin_client'],
    nom: 'Élodie',
    prenom: 'João',
    exp: Math.floor(Date.now() / 1000) + 120
  });

  expect(decodeAccessTokenClaims(utf8Token)).toMatchObject({
    sub: 'user-2',
    tenantId: 'tenant-2',
    roles: ['admin_client'],
    nom: 'Élodie',
    prenom: 'João'
  });
});

test('resolve post-login redirect from state, query then fallback', async () => {
  expect(resolveLoginRedirect({ stateFrom: '/app/depenses?tab=all' })).toBe('/app/depenses?tab=all');
  expect(resolveLoginRedirect({ search: '?from=%2Fapp%2Fengagements%3Fq%3Dopen' })).toBe('/app/engagements?q=open');
  expect(resolveLoginRedirect({ stateFrom: '/auth/login', fallback: '/app/dashboard' })).toBe('/app/dashboard');
  expect(resolveLoginRedirect({ search: '?from=https://malicious.example', fallback: '/app/dashboard' })).toBe('/app/dashboard');
});

test('build protected-route from path preserves search and hash', async () => {
  expect(buildRequestedPath('/app/factures', '?status=unpaid', '#section-2')).toBe('/app/factures?status=unpaid#section-2');
});

test('logout calls /auth/logout and clears token storage', async () => {
  tokenStorage.write({ accessToken: 'access-token', refreshToken: 'refresh-token' });

  const originalRequest = httpClient.request;
  let logoutCalled = false;

  httpClient.request = (async (path: string) => {
    if (path === '/auth/logout') {
      logoutCalled = true;
      return new Response(null, { status: 204 });
    }
    return new Response('{}', { status: 404 });
  }) as typeof httpClient.request;

  try {
    await authService.logout();
  } finally {
    httpClient.request = originalRequest;
  }

  expect(logoutCalled).toBeTruthy();
  expect(tokenStorage.read()).toBeNull();
});

test('signup returns an explicit unavailable message without calling the API', async () => {
  const originalRequest = httpClient.request;
  let requestCalled = false;

  httpClient.request = (async () => {
    requestCalled = true;
    throw new Error('should not be called');
  }) as typeof httpClient.request;

  try {
    const result = await authService.signup('user@example.com', 'ChangeMe123!', 'Nom', 'Prenom');
    expect(result.error).toContain("L'inscription en libre-service n'est pas disponible");
    expect(requestCalled).toBeFalsy();
  } finally {
    httpClient.request = originalRequest;
  }
});

test('hydrate session returns null when refresh throws and clears storage', async () => {
  const originalRefresh = httpClient.refresh;
  tokenStorage.write({ accessToken: makeJwt({
    sub: 'user-3',
    tenantId: 'tenant-1',
    roles: ['admin_client'],
    exp: Math.floor(Date.now() / 1000) - 120
  }), refreshToken: 'refresh-token' });

  httpClient.refresh = (async () => {
    throw new Error('network down');
  }) as typeof httpClient.refresh;

  try {
    const result = await authService.hydrateSession();
    expect(result).toBeNull();
    expect(tokenStorage.read()).toBeNull();
  } finally {
    httpClient.refresh = originalRefresh;
  }
});

test('applyModificationsToLignes projects allocation and reallocation on budget lines', async () => {
  const lignes = [
    {
      id: 'ligne-a',
      exerciceId: 'ex-1',
      actionId: 'act-1',
      compteId: 'cpt-1',
      libelle: 'Ligne A',
      montantInitial: 1000,
      montantModifie: 1000,
      montantEngage: 0,
      montantLiquide: 0,
      montantPaye: 0,
      disponible: 1000,
      dateCreation: '2026-03-02T00:00:00.000Z',
      statut: 'actif' as const
    },
    {
      id: 'ligne-b',
      exerciceId: 'ex-1',
      actionId: 'act-2',
      compteId: 'cpt-2',
      libelle: 'Ligne B',
      montantInitial: 500,
      montantModifie: 500,
      montantEngage: 0,
      montantLiquide: 0,
      montantPaye: 0,
      disponible: 500,
      dateCreation: '2026-03-02T00:00:00.000Z',
      statut: 'actif' as const
    }
  ];

  const result = applyModificationsToLignes(lignes, [
    {
      id: 'm1',
      exerciceId: 'ex-1',
      numero: 'ALC-2026-0001',
      type: 'augmentation',
      ligneDestinationId: 'ligne-a',
      montant: 200,
      motif: 'Dotation',
      statut: 'validee',
      dateCreation: '2026-03-02T00:00:00.000Z'
    },
    {
      id: 'm2',
      exerciceId: 'ex-1',
      numero: 'ALC-2026-0002',
      type: 'virement',
      ligneSourceId: 'ligne-a',
      ligneDestinationId: 'ligne-b',
      montant: 100,
      motif: 'Arbitrage',
      statut: 'validee',
      dateCreation: '2026-03-02T00:00:01.000Z'
    }
  ]);

  const ligneA = result.find((ligne) => ligne.id === 'ligne-a');
  const ligneB = result.find((ligne) => ligne.id === 'ligne-b');

  expect(ligneA?.montantModifie).toBe(1100);
  expect(ligneA?.disponible).toBe(1100);
  expect(ligneB?.montantModifie).toBe(600);
  expect(ligneB?.disponible).toBe(600);
});

test('applyModificationsToLignes ignores non validated modifications', async () => {
  const lignes = [
    {
      id: 'ligne-a',
      exerciceId: 'ex-1',
      actionId: 'act-1',
      compteId: 'cpt-1',
      libelle: 'Ligne A',
      montantInitial: 1000,
      montantModifie: 1000,
      montantEngage: 0,
      montantLiquide: 0,
      montantPaye: 0,
      disponible: 1000,
      dateCreation: '2026-03-02T00:00:00.000Z',
      statut: 'actif' as const
    }
  ];

  const result = applyModificationsToLignes(lignes, [
    {
      id: 'm1',
      exerciceId: 'ex-1',
      numero: 'ALC-2026-0001',
      type: 'augmentation',
      ligneDestinationId: 'ligne-a',
      montant: 200,
      motif: 'Draft',
      statut: 'brouillon',
      dateCreation: '2026-03-02T00:00:00.000Z'
    }
  ]);

  expect(result[0]?.montantModifie).toBe(1000);
  expect(result[0]?.disponible).toBe(1000);
});

test('applyModificationsToLignes supports axe ids mapped through actionId', async () => {
  const lignes = [
    {
      id: 'ligne-a',
      exerciceId: 'ex-1',
      actionId: 'action-a',
      compteId: 'cpt-1',
      libelle: 'Ligne A',
      montantInitial: 1000,
      montantModifie: 1000,
      montantEngage: 0,
      montantLiquide: 0,
      montantPaye: 0,
      disponible: 1000,
      dateCreation: '2026-03-02T00:00:00.000Z',
      statut: 'actif' as const
    },
    {
      id: 'ligne-b',
      exerciceId: 'ex-1',
      actionId: 'action-b',
      compteId: 'cpt-2',
      libelle: 'Ligne B',
      montantInitial: 500,
      montantModifie: 500,
      montantEngage: 0,
      montantLiquide: 0,
      montantPaye: 0,
      disponible: 500,
      dateCreation: '2026-03-02T00:00:00.000Z',
      statut: 'actif' as const
    }
  ];

  const result = applyModificationsToLignes(lignes, [
    {
      id: 'm1',
      exerciceId: 'ex-1',
      numero: 'ALC-2026-0001',
      type: 'augmentation',
      ligneDestinationId: 'action-a',
      montant: 200,
      motif: 'Dotation',
      statut: 'validee',
      dateCreation: '2026-03-02T00:00:00.000Z'
    },
    {
      id: 'm2',
      exerciceId: 'ex-1',
      numero: 'ALC-2026-0002',
      type: 'virement',
      ligneSourceId: 'action-a',
      ligneDestinationId: 'action-b',
      montant: 100,
      motif: 'Arbitrage',
      statut: 'validee',
      dateCreation: '2026-03-02T00:00:01.000Z'
    }
  ]);

  const ligneA = result.find((ligne) => ligne.id === 'ligne-a');
  const ligneB = result.find((ligne) => ligne.id === 'ligne-b');

  expect(ligneA?.montantModifie).toBe(1100);
  expect(ligneA?.disponible).toBe(1100);
  expect(ligneB?.montantModifie).toBe(600);
  expect(ligneB?.disponible).toBe(600);
});

test('computeDecisionVersionDiff exposes business-relevant decision changes', async () => {
  const left = {
    id: 'v1',
    decisionId: 'd1',
    allocationId: 'a1',
    exerciceId: 'ex-1',
    version: 1,
    statutDecision: 'validated' as const,
    motif: 'Validation initiale',
    auteur: 'user-1',
    horodatage: '2026-03-02T10:00:00.000Z',
    snapshotAvant: {
      operationType: 'allocation' as const,
      sourceAxeId: null,
      destinationAxeId: 'axe-a',
      montant: 1000,
      statutDecision: 'validated' as const,
      motif: 'Validation initiale',
      auteur: 'user-1',
      horodatage: '2026-03-02T10:00:00.000Z',
      soldes: {
        sourceAvant: null,
        sourceApres: null,
        destinationAvant: 0,
        destinationApres: 0
      }
    },
    snapshotApres: {
      operationType: 'allocation' as const,
      sourceAxeId: null,
      destinationAxeId: 'axe-a',
      montant: 1000,
      statutDecision: 'validated' as const,
      motif: 'Validation initiale',
      auteur: 'user-1',
      horodatage: '2026-03-02T10:00:00.000Z',
      soldes: {
        sourceAvant: null,
        sourceApres: null,
        destinationAvant: 0,
        destinationApres: 1000
      }
    }
  };
  const right = {
    ...left,
    id: 'v2',
    version: 2,
    statutDecision: 'rejected' as const,
    motif: 'Rejet pour controle',
    auteur: 'user-2',
    horodatage: '2026-03-03T09:00:00.000Z',
    snapshotApres: {
      ...left.snapshotApres,
      statutDecision: 'rejected' as const,
      motif: 'Rejet pour controle',
      auteur: 'user-2',
      horodatage: '2026-03-03T09:00:00.000Z'
    }
  };

  const diff = computeDecisionVersionDiff(left, right);

  expect(diff.statutDecision).toEqual({ from: 'validated', to: 'rejected' });
  expect(diff.motif).toEqual({ from: 'Validation initiale', to: 'Rejet pour controle' });
  expect(diff.auteur).toEqual({ from: 'user-1', to: 'user-2' });
});

test('buildEcartsPrevisionQueryKey scopes cache by client/exercice/filtres', async () => {
  const key = buildEcartsPrevisionQueryKey('client-1', 'ex-2026', {
    periode: '2026',
    sectionCode: 'SEC-OPS',
    programmeCode: 'PRG-INV',
    actionCode: 'ACT-01',
    enveloppeId: '8f36cbf4-9658-49e5-a311-731f1764892a'
  });

  expect(key).toEqual([
    'ecarts-prevision-execution',
    'client-1',
    'ex-2026',
    '2026',
    'SEC-OPS',
    'PRG-INV',
    'ACT-01',
    '8f36cbf4-9658-49e5-a311-731f1764892a'
  ]);
});

test('bonsCommandeService.create remonte un message metier actionnable du backend', async () => {
  const originalRequest = httpClient.request;

  httpClient.request = (async () =>
    new Response(JSON.stringify({ message: "Incohérence de chaînage: l'engagement est hors scope." }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })) as typeof httpClient.request;

  try {
    await expect(
      bonsCommandeService.create({
        id: 'bc-temp',
        clientId: 'client-1',
        exerciceId: 'ex-2026',
        numero: 'BC/EX2026/0001',
        dateCommande: '2026-03-01',
        fournisseurId: 'f-1',
        objet: 'Commande test',
        montant: 1000,
        statut: 'brouillon'
      })
    ).rejects.toThrow("Incohérence de chaînage");
  } finally {
    httpClient.request = originalRequest;
  }
});

test('bonsCommandeService.create reussit en creation nominale', async () => {
  const originalRequest = httpClient.request;

  httpClient.request = (async () =>
    new Response(
      JSON.stringify({
        id: 'bc-1',
        clientId: 'client-1',
        exerciceId: 'ex-2026',
        numero: 'BC/EX2026/0001',
        dateCommande: '2026-03-01',
        fournisseurId: 'f-1',
        objet: 'Commande nominale',
        montant: 1000,
        statut: 'brouillon',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    )) as typeof httpClient.request;

  try {
    const created = await bonsCommandeService.create({
      id: 'bc-temp',
      clientId: 'client-1',
      exerciceId: 'ex-2026',
      numero: 'BC/EX2026/0001',
      dateCommande: '2026-03-01',
      fournisseurId: 'f-1',
      objet: 'Commande nominale',
      montant: 1000,
      statut: 'brouillon'
    });

    expect(created.id).toBe('bc-1');
    expect(created.numero).toBe('BC/EX2026/0001');
  } finally {
    httpClient.request = originalRequest;
  }
});

test('facturesService.create remonte un message metier actionnable du backend', async () => {
  const originalRequest = httpClient.request;

  httpClient.request = (async () =>
    new Response(JSON.stringify({ message: 'Le numero de facture fournisseur est obligatoire.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })) as typeof httpClient.request;

  try {
    await expect(
      facturesService.create({
        id: 'fac-temp',
        clientId: 'client-1',
        exerciceId: 'ex-2026',
        numero: 'FAC/EX2026/0001',
        dateFacture: '2026-03-01',
        fournisseurId: 'f-1',
        objet: 'Facture test',
        montantHT: 100,
        montantTVA: 20,
        montantTTC: 120,
        montantLiquide: 0,
        statut: 'brouillon',
        numeroFactureFournisseur: '',
        referencePiece: ''
      })
    ).rejects.toThrow('numero de facture fournisseur');
  } finally {
    httpClient.request = originalRequest;
  }
});

test('facturesService.create reussit en creation nominale', async () => {
  const originalRequest = httpClient.request;

  httpClient.request = (async () =>
    new Response(
      JSON.stringify({
        id: 'fac-1',
        clientId: 'client-1',
        exerciceId: 'ex-2026',
        numero: 'FAC/EX2026/0001',
        dateFacture: '2026-03-01',
        fournisseurId: 'f-1',
        objet: 'Facture nominale',
        montantHT: 100,
        montantTVA: 20,
        montantTTC: 120,
        montantLiquide: 0,
        statut: 'brouillon',
        numeroFactureFournisseur: 'F-2026-001',
        referencePiece: 'PJ-2026-001',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    )) as typeof httpClient.request;

  try {
    const created = await facturesService.create({
      id: 'fac-temp',
      clientId: 'client-1',
      exerciceId: 'ex-2026',
      numero: 'FAC/EX2026/0001',
      dateFacture: '2026-03-01',
      fournisseurId: 'f-1',
      objet: 'Facture nominale',
      montantHT: 100,
      montantTVA: 20,
      montantTTC: 120,
      montantLiquide: 0,
      statut: 'brouillon',
      numeroFactureFournisseur: 'F-2026-001',
      referencePiece: 'PJ-2026-001'
    });

    expect(created.id).toBe('fac-1');
    expect(created.referencePiece).toBe('PJ-2026-001');
  } finally {
    httpClient.request = originalRequest;
  }
});

test('depensesService.createDepenseFromFacture envoie factureIds (1..20) et mappe la reponse', async () => {
  const originalRequest = httpClient.request;
  let requestBody: Record<string, unknown> | null = null;

  httpClient.request = (async (_path: string, options?: RequestInit) => {
    if (typeof options?.body === 'string') {
      requestBody = JSON.parse(options.body) as Record<string, unknown>;
    }

    return new Response(
      JSON.stringify({
        id: 'dep-1',
        clientId: 'client-1',
        exerciceId: 'ex-2026',
        numero: 'DEP/EX2026/0001',
        dateDepense: '2026-03-05',
        objet: 'Liquidation 2 factures',
        montant: 150,
        montantPaye: 0,
        factureId: 'f-1',
        factureIds: ['f-1', 'f-2'],
        statut: 'brouillon',
        createdAt: '2026-03-05T10:00:00.000Z',
        updatedAt: '2026-03-05T10:00:00.000Z',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }) as typeof httpClient.request;

  try {
    const created = await createDepenseFromFacture(
      {
        factureIds: ['f-1', 'f-2'],
        montantTotal: 150,
        dateDepense: '2026-03-05',
      },
      'ex-2026',
      'client-1',
      'user-1'
    );

    expect(requestBody).toMatchObject({
      exerciceId: 'ex-2026',
      factureIds: ['f-1', 'f-2'],
      montant: 150,
      dateDepense: '2026-03-05',
    });
    expect(created.factureIds).toEqual(['f-1', 'f-2']);
    expect(created.montant).toBe(150);
  } finally {
    httpClient.request = originalRequest;
  }
});

test('depensesService.createDepenseFromFacture remonte le message metier actionnable', async () => {
  const originalRequest = httpClient.request;

  httpClient.request = (async () =>
    new Response(
      JSON.stringify({
        message: 'Sélection invalide: maximum 20 factures par dépense. Action: réduisez la sélection à 20.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )) as typeof httpClient.request;

  try {
    await expect(
      createDepenseFromFacture(
        {
          factureIds: Array.from({ length: 21 }, (_, index) => `f-${index}`),
          dateDepense: '2026-03-05',
        },
        'ex-2026',
        'client-1',
        'user-1'
      )
    ).rejects.toThrow('maximum 20 factures');
  } finally {
    httpClient.request = originalRequest;
  }
});

test('reportingComptableService.getReport charge balance/grand-livre/fiche-compte', async () => {
  const originalRequest = httpClient.request;

  httpClient.request = (async () =>
    new Response(
      JSON.stringify({
        filters: {
          dateDebut: '2026-03-01',
          dateFin: '2026-03-31',
          page: 1,
          pageSize: 100,
        },
        integrity: {
          totalDebit: 100,
          totalCredit: 100,
          ecart: 0,
          isBalanced: true,
        },
        balance: {
          rows: [
            {
              compteId: 'c-1',
              numero: '601',
              libelle: 'Achats',
              debit: 100,
              credit: 0,
              solde: 100,
            },
          ],
        },
        grandLivre: {
          total: 1,
          page: 1,
          pageSize: 100,
          rows: [
            {
              ecritureId: 'e-1',
              dateEcriture: '2026-03-05',
              numeroPiece: 'PC-001',
              numeroLigne: 1,
              libelle: 'Achat fournitures',
              montant: 100,
              debitCompteId: 'c-1',
              debitCompteNumero: '601',
              debitCompteLibelle: 'Achats',
              creditCompteId: 'c-2',
              creditCompteNumero: '401',
              creditCompteLibelle: 'Fournisseurs',
            },
          ],
        },
        ficheCompte: {
          compteId: 'c-1',
          compteNumero: '601',
          compteLibelle: 'Achats',
          soldeOuverture: 0,
          totalDebit: 100,
          totalCredit: 0,
          soldeCloture: 100,
          mouvements: [],
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )) as typeof httpClient.request;

  try {
    const report = await reportingComptableService.getReport({
      dateDebut: '2026-03-01',
      dateFin: '2026-03-31',
      page: 1,
      pageSize: 100,
    });

    expect(report.integrity.isBalanced).toBeTruthy();
    expect(report.balance.rows).toHaveLength(1);
    expect(report.grandLivre.rows).toHaveLength(1);
    expect(report.ficheCompte.compteNumero).toBe('601');
  } finally {
    httpClient.request = originalRequest;
  }
});

test('reportingComptableService.startExport construit la requete export asynchrone', async () => {
  const originalRequest = httpClient.request;

  httpClient.request = (async (url: RequestInfo | URL) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();
    expect(requestUrl).toContain('/reporting-comptable/exports?');
    expect(requestUrl).toContain('view=grand-livre');
    expect(requestUrl).toContain('format=xlsx');

    return new Response(
      JSON.stringify({
        exportId: 'exp-1',
        status: 'pending',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }) as typeof httpClient.request;

  try {
    const result = await reportingComptableService.startExport({
      dateDebut: '2026-03-01',
      dateFin: '2026-03-31',
      view: 'grand-livre',
      format: 'xlsx',
    });

    expect(result).toMatchObject({ exportId: 'exp-1', status: 'pending' });
  } finally {
    httpClient.request = originalRequest;
  }
});

test('reportingComptableService.downloadExport remonte une erreur API lisible', async () => {
  const originalRequest = httpClient.request;

  httpClient.request = (async () =>
    new Response(JSON.stringify({ message: 'Lien expiré' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof httpClient.request;

  try {
    await expect(
      reportingComptableService.downloadExport('/reporting-comptable/exports/exp-1/download?token=x', 'fallback.csv')
    ).rejects.toThrow('telechargement export');
  } finally {
    httpClient.request = originalRequest;
  }
});
