import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';

const UI_BASE_URL = 'http://127.0.0.1:45177';
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

const setupDepenseRoutes = async (
  page: Page,
  accessToken: string,
  options: {
    sourceEcritures?: unknown[];
    allEcritures?: unknown[];
    statsResponse?: Record<string, unknown>;
    generateResponse: Record<string, unknown>;
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

    if (url.pathname === '/ecritures-comptables/stats' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          options.statsResponse ?? {
            nombreTotal: 0,
            montantTotalDebit: 0,
            montantTotalCredit: 0,
            parTypeOperation: {
              reservation: { nombre: 0, montant: 0 },
              engagement: { nombre: 0, montant: 0 },
              bon_commande: { nombre: 0, montant: 0 },
              facture: { nombre: 0, montant: 0 },
              depense: { nombre: 0, montant: 0 },
              paiement: { nombre: 0, montant: 0 }
            }
          }
        )
      });
      return;
    }

    if (url.pathname === '/ecritures-comptables' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.allEcritures ?? [])
      });
      return;
    }

    if (url.pathname === '/depenses' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'dep-1',
            clientId: 'client-1',
            exerciceId: 'ex-2026',
            numero: 'DEP000001',
            dateDepense: '2026-03-08',
            objet: 'Mission terrain',
            montant: 1250,
            montantPaye: 0,
            statut: 'ordonnancee',
            ecrituresCount: options.sourceEcritures?.length ?? 0,
            createdAt: '2026-03-08T10:00:00.000Z',
            updatedAt: '2026-03-08T10:00:00.000Z',
            ligneBudgetaireId: 'lb-1',
            ligneBudgetaire: {
              id: 'lb-1',
              libelle: 'Frais missions',
              disponible: 5000
            }
          }
        ])
      });
      return;
    }

    if (url.pathname.startsWith('/paiements') && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
      return;
    }

    if (url.pathname === '/ecritures-comptables/source' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.sourceEcritures ?? [])
      });
      return;
    }

    if (url.pathname === '/ecritures-comptables/generate' && request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.generateResponse)
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

test.describe('ecritures generation ui', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    uiServerProcess = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '45177'], {
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

  test('affiche le detail des ecritures et la preuve de la regle dans le snapshot de depense', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-ecritures-ui',
      tenantId: 'client-1',
      clientId: 'client-1',
      roles: ['admin_client'],
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await setupDepenseRoutes(page, accessToken, {
      sourceEcritures: [
        {
          id: 'ecr-1',
          clientId: 'client-1',
          exerciceId: 'ex-2026',
          numeroPiece: 'DEP/2026/001',
          numeroLigne: 1,
          dateEcriture: '2026-03-08',
          compteDebitId: 'compte-1',
          compteCreditId: 'compte-2',
          montant: 1250,
          libelle: 'Depense integration',
          typeOperation: 'depense',
          sourceId: 'dep-1',
          regleComptableId: 'reg-1',
          statutEcriture: 'validee',
          createdAt: '2026-03-08T10:00:00.000Z',
          updatedAt: '2026-03-08T10:00:00.000Z',
          compteDebit: { numero: '601', libelle: 'Achats' },
          compteCredit: { numero: '401', libelle: 'Fournisseurs' },
          regleComptable: {
            code: 'RG-DEP-001',
            nom: 'Depense fonctionnement',
            versionNumber: 3,
            versionStatus: 'published'
          }
        },
        {
          id: 'ecr-2',
          clientId: 'client-1',
          exerciceId: 'ex-2026',
          numeroPiece: 'DEP/2026/001',
          numeroLigne: 2,
          dateEcriture: '2026-03-08',
          compteDebitId: 'compte-2',
          compteCreditId: 'compte-1',
          montant: 1250,
          libelle: 'Annulation: Depense integration - Correction audit',
          typeOperation: 'depense',
          sourceId: 'dep-1',
          regleComptableId: 'reg-1',
          statutEcriture: 'contrepassation',
          ecritureOrigineId: 'ecr-1',
          createdAt: '2026-03-08T11:00:00.000Z',
          createdBy: 'auditeur-1',
          updatedAt: '2026-03-08T11:00:00.000Z',
          compteDebit: { numero: '401', libelle: 'Fournisseurs' },
          compteCredit: { numero: '601', libelle: 'Achats' },
          regleComptable: {
            code: 'RG-DEP-001',
            nom: 'Depense fonctionnement',
            versionNumber: 3,
            versionStatus: 'published'
          }
        }
      ],
      generateResponse: {
        success: true,
        status: 'already_generated',
        code: 'ECRITURES_DEJA_PRESENTES',
        message: 'Les ecritures comptables existent deja pour cette source et cette configuration.',
        ecritures_count: 1
      }
    });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/depenses/dep-1`);

    await expect(page.getByText('Écritures comptables')).toBeVisible();
    await expect(page.getByText('Validée')).toBeVisible();
    await expect(page.getByText('Depense fonctionnement').first()).toBeVisible();
    await expect(page.getByText('601 Achats').first()).toBeVisible();
    await expect(page.getByText('401 Fournisseurs').first()).toBeVisible();
    await expect(page.getByText('Annulation', { exact: true })).toBeVisible();
    await expect(page.getByText('auditeur-1')).toBeVisible();
    await expect(page.getByText(/origine liée/i)).toBeVisible();
    await expect(page.locator('div.text-right > p.text-sm.font-semibold').last()).toHaveText(/1\s*250/);
  });

  test('affiche les statistiques et ecritures du JournalComptable', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-ecritures-journal',
      tenantId: 'client-1',
      clientId: 'client-1',
      roles: ['admin_client'],
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await setupDepenseRoutes(page, accessToken, {
      allEcritures: [
        {
          id: 'ecr-journal-1',
          clientId: 'client-1',
          exerciceId: 'ex-2026',
          numeroPiece: 'ENG/2026/001',
          numeroLigne: 1,
          dateEcriture: '2026-03-08',
          compteDebitId: 'compte-1',
          compteCreditId: 'compte-2',
          montant: 850,
          libelle: 'Engagement integration',
          typeOperation: 'engagement',
          sourceId: 'eng-1',
          regleComptableId: 'reg-eng-1',
          statutEcriture: 'validee',
          createdAt: '2026-03-08T10:00:00.000Z',
          updatedAt: '2026-03-08T10:00:00.000Z',
          compteDebit: { numero: '601', libelle: 'Achats' },
          compteCredit: { numero: '401', libelle: 'Fournisseurs' },
          regleComptable: {
            code: 'RG-ENG-001',
            nom: 'Engagement integration',
            versionNumber: 2,
            versionStatus: 'published'
          }
        },
        {
          id: 'ecr-journal-2',
          clientId: 'client-1',
          exerciceId: 'ex-2026',
          numeroPiece: 'ENG/2026/001',
          numeroLigne: 1001,
          dateEcriture: '2026-03-08',
          compteDebitId: 'compte-2',
          compteCreditId: 'compte-1',
          montant: 850,
          libelle: 'Annulation: Engagement integration - Correction audit',
          typeOperation: 'engagement',
          sourceId: 'eng-1',
          regleComptableId: 'reg-eng-1',
          statutEcriture: 'contrepassation',
          ecritureOrigineId: 'ecr-journal-1',
          createdAt: '2026-03-08T12:15:00.000Z',
          createdBy: 'auditeur-1',
          updatedAt: '2026-03-08T12:15:00.000Z',
          compteDebit: { numero: '401', libelle: 'Fournisseurs' },
          compteCredit: { numero: '601', libelle: 'Achats' },
          regleComptable: {
            code: 'RG-ENG-001',
            nom: 'Engagement integration',
            versionNumber: 2,
            versionStatus: 'published'
          }
        }
      ],
      statsResponse: {
        nombreTotal: 2,
        montantTotalDebit: 1700,
        montantTotalCredit: 1700,
        parTypeOperation: {
          reservation: { nombre: 0, montant: 0 },
          engagement: { nombre: 2, montant: 1700 },
          bon_commande: { nombre: 0, montant: 0 },
          facture: { nombre: 0, montant: 0 },
          depense: { nombre: 0, montant: 0 },
          paiement: { nombre: 0, montant: 0 }
        }
      },
      generateResponse: {
        success: true,
        status: 'created',
        code: 'ECRITURES_CREEES',
        message: 'Les ecritures comptables ont ete generees avec succes.',
        ecritures_count: 1
      }
    });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/journal-comptable`);

    await expect(page.getByText('Journal Comptable')).toBeVisible();
    await expect(page.getByText('Total Écritures')).toBeVisible();
    await expect(page.locator('div').filter({ hasText: /^Total Écritures2$/ }).first()).toBeVisible();
    await expect(page.getByText('RG-ENG-001 · v2').first()).toBeVisible();
    await expect(page.getByText('Engagement', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('ENG/2026/001').first()).toBeVisible();
    await expect(page.getByText('Contre-passation')).toBeVisible();
    await expect(page.getByText('auditeur-1')).toBeVisible();
    await expect(page.getByText('Origine ecr-jour')).toBeVisible();
  });

  test('affiche une erreur actionnable si le moteur backend rejette la generation', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-ecritures-error',
      tenantId: 'client-1',
      clientId: 'client-1',
      roles: ['admin_client'],
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await setupDepenseRoutes(page, accessToken, {
      sourceEcritures: [],
      generateResponse: {
        success: false,
        status: 'error',
        code: 'REGLE_COMPTABLE_MANQUANTE',
        message: 'Aucune regle comptable publiee ne couvre cette operation pour la date et le contexte fournis.',
        ecritures_count: 0
      }
    });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/depenses/dep-1`);
    await page.getByRole('button', { name: 'Générer les écritures' }).click();

    await expect(page.getByText('Erreur lors de la génération des écritures')).toBeVisible();
    await expect(page.getByText('Aucune regle comptable publiee ne couvre cette operation')).toBeVisible();
  });
});
