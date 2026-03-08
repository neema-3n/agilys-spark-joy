import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';

const UI_BASE_URL = 'http://127.0.0.1:45175';
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
      // Server still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`UI server did not start within ${timeoutMs}ms`);
};

const setupAccountingRoutes = async (page: Page, accessToken: string) => {
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

    if (url.pathname === '/comptes') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'compte-1',
            clientId: 'client-1',
            numero: '601',
            libelle: 'Achats',
            type: 'charge',
            categorie: 'exploitation',
            niveau: 1,
            statut: 'actif',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          },
          {
            id: 'compte-2',
            clientId: 'client-1',
            numero: '401',
            libelle: 'Fournisseurs',
            type: 'passif',
            categorie: 'dette',
            niveau: 1,
            statut: 'actif',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          }
        ])
      });
      return;
    }

    if (url.pathname === '/regles-comptables') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'reg-1',
            clientId: 'client-1',
            code: 'RG-DEP-001',
            nom: 'Depense fonctionnement',
            description: 'Regle principale',
            dateDebut: '2026-01-01',
            dateFin: '2026-12-31',
            permanente: false,
            typeOperation: 'reservation',
            conditions: [],
            compteDebitId: 'compte-1',
            compteCreditId: 'compte-2',
            actif: true,
            ordre: 1,
            versionGroupId: 'group-abc-1234',
            versionNumber: 3,
            versionStatus: 'published',
            changeReason: 'Publication exercice 2026',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-03-07T00:00:00.000Z',
            compteDebit: { numero: '601', libelle: 'Achats' },
            compteCredit: { numero: '401', libelle: 'Fournisseurs' }
          }
        ])
      });
      return;
    }

    if (url.pathname === '/ecritures-comptables') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ecr-1',
            clientId: 'client-1',
            exerciceId: 'ex-2026',
            numeroPiece: 'DEP/2026/001',
            numeroLigne: 1,
            dateEcriture: '2026-03-07',
            compteDebitId: 'compte-1',
            compteCreditId: 'compte-2',
            montant: 4500,
            libelle: 'Depense fonctionnement - Mission',
            typeOperation: 'depense',
            sourceId: 'dep-1',
            regleComptableId: 'reg-1',
            statutEcriture: 'validee',
            createdAt: '2026-03-07T00:00:00.000Z',
            updatedAt: '2026-03-07T00:00:00.000Z',
            compteDebit: { numero: '601', libelle: 'Achats' },
            compteCredit: { numero: '401', libelle: 'Fournisseurs' },
            regleComptable: {
              code: 'RG-DEP-001',
              nom: 'Depense fonctionnement',
              versionGroupId: 'group-abc-1234',
              versionNumber: 3,
              versionStatus: 'published',
              dateDebut: '2026-01-01',
              dateFin: '2026-12-31'
            }
          }
        ])
      });
      return;
    }

    if (url.pathname === '/ecritures-comptables/stats') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nombreTotal: 1,
          montantTotalDebit: 4500,
          montantTotalCredit: 4500,
          parTypeOperation: {
            reservation: { nombre: 0, montant: 0 },
            engagement: { nombre: 0, montant: 0 },
            bon_commande: { nombre: 0, montant: 0 },
            facture: { nombre: 0, montant: 0 },
            depense: { nombre: 1, montant: 4500 },
            paiement: { nombre: 0, montant: 0 }
          }
        })
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

test.describe('comptabilite versioning ui', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    uiServerProcess = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '45175'], {
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

  test('affiche les metadonnees de version et bloque le vidage destructif du plan', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-versioning',
      tenantId: 'client-1',
      clientId: 'client-1',
      roles: ['super_admin'],
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await setupAccountingRoutes(page, accessToken);
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/parametres/regles-comptables`);
    await expect(page.getByText('v3 · Publiee')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Motif: Publication exercice 2026')).toBeVisible();

    await page.goto(`${UI_BASE_URL}/app/plan-comptable`);
    await expect(page.getByRole('button', { name: 'Vidage desactive' })).toBeDisabled();
    await expect(page.getByText('Le vidage global du plan comptable est desactive')).toBeVisible();
  });

  test('affiche la preuve de la regle appliquee dans le journal comptable', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-journal',
      tenantId: 'client-1',
      clientId: 'client-1',
      roles: ['super_admin'],
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await setupAccountingRoutes(page, accessToken);
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/journal-comptable`);
    await expect(page.getByText('RG-DEP-001 · v3')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Depense fonctionnement', { exact: true })).toBeVisible();
  });
});
