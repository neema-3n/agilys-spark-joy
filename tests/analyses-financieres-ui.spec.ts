import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';

const UI_BASE_URL = 'http://127.0.0.1:45182';
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

type ApiOptions = {
  delayMs?: number;
  failPathPrefix?: string;
  failMessage?: string;
  emptyMode?: boolean;
};

const setupAnalysesApi = async (page: Page, options: ApiOptions = {}) => {
  const section = {
    id: 'sec-1',
    clientId: 'client-1',
    exerciceId: '11111111-1111-4111-8111-111111111111',
    code: 'SEC-OPS',
    libelle: 'Operations',
    ordre: 1,
    statut: 'actif',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'user-1',
  };
  const programme = {
    id: 'prg-1',
    sectionId: 'sec-1',
    clientId: 'client-1',
    exerciceId: '11111111-1111-4111-8111-111111111111',
    code: 'PRG-INV',
    libelle: 'Investissement',
    ordre: 1,
    statut: 'actif',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'user-1',
  };
  const actionA = {
    id: 'act-1',
    programmeId: 'prg-1',
    clientId: 'client-1',
    exerciceId: '11111111-1111-4111-8111-111111111111',
    code: 'ACT-1',
    libelle: 'Action A',
    ordre: 1,
    statut: 'actif',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'user-1',
  };
  const actionB = {
    id: 'act-2',
    programmeId: 'prg-1',
    clientId: 'client-1',
    exerciceId: '11111111-1111-4111-8111-111111111111',
    code: 'ACT-2',
    libelle: 'Action B',
    ordre: 2,
    statut: 'actif',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'user-1',
  };

  const lignes = options.emptyMode
    ? []
    : [
        {
          id: 'ligne-1',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          actionId: 'act-1',
          compteId: 'cmp-1',
          enveloppeId: 'env-1',
          libelle: 'Ligne A',
          montantInitial: 1000,
          montantModifie: 1000,
          montantEngage: 300,
          montantLiquide: 200,
          montantPaye: 200,
          disponible: 700,
          statut: 'actif',
          createdAt: '2026-01-05T00:00:00.000Z',
        },
        {
          id: 'ligne-2',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          actionId: 'act-2',
          compteId: 'cmp-1',
          enveloppeId: 'env-1',
          libelle: 'Ligne B',
          montantInitial: 1000,
          montantModifie: 2000,
          montantEngage: 1200,
          montantLiquide: 900,
          montantPaye: 900,
          disponible: 800,
          statut: 'actif',
          createdAt: '2026-02-10T00:00:00.000Z',
        },
      ];

  const projets = options.emptyMode
    ? []
    : [
        {
          id: 'prj-1',
          clientId: 'client-1',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          code: 'CC01-PROJ-A',
          nom: 'Projet A',
          description: '',
          responsable: 'Resp Centre 1',
          dateDebut: '2026-01-01',
          dateFin: '2026-12-31',
          budgetAlloue: 1200,
          budgetConsomme: 0,
          budgetEngage: 0,
          statut: 'en_cours',
          tauxAvancement: 20,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          createdBy: 'user-1',
        },
        {
          id: 'prj-2',
          clientId: 'client-1',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          code: 'CC02-PROJ-B',
          nom: 'Projet B',
          description: '',
          responsable: 'Resp Centre 2',
          dateDebut: '2026-01-01',
          dateFin: '2026-12-31',
          budgetAlloue: 2200,
          budgetConsomme: 0,
          budgetEngage: 0,
          statut: 'en_cours',
          tauxAvancement: 40,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          createdBy: 'user-1',
        },
      ];

  const structures = options.emptyMode
    ? []
    : [
        {
          id: 'st-1',
          clientId: 'client-1',
          exerciceId: '11111111-1111-4111-8111-111111111111',
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
          clientId: 'client-1',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          code: 'CC02',
          nom: 'Centre 02',
          type: 'centre_cout',
          responsable: 'Resp Centre 2',
          statut: 'actif',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];

  const reservations = options.emptyMode
    ? []
    : [
        {
          id: 'res-1',
          numero: 'RES-1',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          ligneBudgetaireId: 'ligne-1',
          montant: 120,
          objet: 'Reservation A',
          projetId: 'prj-1',
          dateReservation: '2026-01-07',
          statut: 'active',
          createdBy: 'user-1',
          createdAt: '2026-01-07T00:00:00.000Z',
          updatedAt: '2026-01-07T00:00:00.000Z',
          clientId: 'client-1',
          ecrituresCount: 0,
        },
        {
          id: 'res-2',
          numero: 'RES-2',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          ligneBudgetaireId: 'ligne-2',
          montant: 220,
          objet: 'Reservation B',
          projetId: 'prj-2',
          dateReservation: '2026-02-08',
          statut: 'active',
          createdBy: 'user-1',
          createdAt: '2026-02-08T00:00:00.000Z',
          updatedAt: '2026-02-08T00:00:00.000Z',
          clientId: 'client-1',
          ecrituresCount: 0,
        },
      ];

  const engagements = options.emptyMode
    ? []
    : [
        {
          id: 'eng-1',
          numero: 'ENG-1',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          clientId: 'client-1',
          ligneBudgetaireId: 'ligne-1',
          objet: 'Engagement A',
          montant: 300,
          projetId: 'prj-1',
          statut: 'valide',
          dateCreation: '2026-01-10',
          createdAt: '2026-01-10T00:00:00.000Z',
          updatedAt: '2026-01-10T00:00:00.000Z',
        },
        {
          id: 'eng-2',
          numero: 'ENG-2',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          clientId: 'client-1',
          ligneBudgetaireId: 'ligne-2',
          objet: 'Engagement B',
          montant: 1200,
          projetId: 'prj-2',
          statut: 'valide',
          dateCreation: '2026-02-11',
          createdAt: '2026-02-11T00:00:00.000Z',
          updatedAt: '2026-02-11T00:00:00.000Z',
        },
      ];

  const factures = options.emptyMode
    ? []
    : [
        {
          id: 'fac-1',
          clientId: 'client-1',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          numero: 'F-1',
          dateFacture: '2026-01-14',
          fournisseurId: 'fr-1',
          ligneBudgetaireId: 'ligne-1',
          projetId: 'prj-1',
          objet: 'Facture A',
          montantHT: 200,
          montantTVA: 0,
          montantTTC: 200,
          montantLiquide: 200,
          statut: 'payee',
          createdAt: '2026-01-14T00:00:00.000Z',
          updatedAt: '2026-01-14T00:00:00.000Z',
        },
        {
          id: 'fac-2',
          clientId: 'client-1',
          exerciceId: '11111111-1111-4111-8111-111111111111',
          numero: 'F-2',
          dateFacture: '2026-02-16',
          fournisseurId: 'fr-1',
          ligneBudgetaireId: 'ligne-2',
          projetId: 'prj-2',
          objet: 'Facture B',
          montantHT: 900,
          montantTVA: 0,
          montantTTC: 900,
          montantLiquide: 900,
          statut: 'payee',
          createdAt: '2026-02-16T00:00:00.000Z',
          updatedAt: '2026-02-16T00:00:00.000Z',
        },
      ];

  const buildAnalysesResponse = (projetId?: string) => {
    if (options.emptyMode) {
      return {
        kpis: { budgetAlloue: 0, engage: 0, paye: 0, disponible: 0, tauxExecution: 0 },
        counts: { projets: 0, structures: 0, axes: 0 },
        projetRows: [],
        structureRows: [],
        axeRows: [],
      };
    }

    const projetRows = [
      {
        id: 'projet-prj-1',
        dimensionType: 'projet',
        dimensionLabel: 'CC01-PROJ-A - Projet A',
        budgetAlloue: 1200,
        engage: 300,
        paye: 200,
        disponible: 900,
        ecart: 1000,
        tauxExecution: 16.7,
      },
      {
        id: 'projet-prj-2',
        dimensionType: 'projet',
        dimensionLabel: 'CC02-PROJ-B - Projet B',
        budgetAlloue: 2200,
        engage: 1200,
        paye: 900,
        disponible: 1000,
        ecart: 1300,
        tauxExecution: 40.9,
      },
    ].filter((row) => (projetId ? row.id === `projet-${projetId}` : true));

    const budgetAlloue = projetRows.reduce((sum, row) => sum + row.budgetAlloue, 0);
    const engage = projetRows.reduce((sum, row) => sum + row.engage, 0);
    const paye = projetRows.reduce((sum, row) => sum + row.paye, 0);

    return {
      kpis: {
        budgetAlloue,
        engage,
        paye,
        disponible: budgetAlloue - engage,
        tauxExecution: budgetAlloue > 0 ? (paye / budgetAlloue) * 100 : 0,
      },
      counts: {
        projets: projetRows.length,
        structures: projetRows.length,
        axes: 2,
      },
      projetRows,
      structureRows: projetRows.map((row) => ({
        ...row,
        id: row.id.replace('projet-', 'structure-'),
        dimensionType: 'structure',
      })),
      axeRows: [
        {
          id: 'axe-1',
          dimensionType: 'axe',
          dimensionLabel: 'SEC-OPS / PRG-INV / ACT-1',
          budgetAlloue: 1000,
          engage: 300,
          paye: 200,
          disponible: 700,
          ecart: 800,
          tauxExecution: 20,
        },
        {
          id: 'axe-2',
          dimensionType: 'axe',
          dimensionLabel: 'SEC-OPS / PRG-INV / ACT-2',
          budgetAlloue: 2000,
          engage: 1200,
          paye: 900,
          disponible: 800,
          ecart: 1100,
          tauxExecution: 45,
        },
      ],
    };
  };

  await page.route('**://127.0.0.1:3001/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/auth/refresh') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: makeJwt({
            sub: 'user-analyses',
            tenantId: 'client-1',
            roles: ['super_admin'],
            exp: Math.floor(Date.now() / 1000) + 600,
          }),
          refreshToken: 'refresh-token-stub',
        }),
      });
      return;
    }

    if (options.failPathPrefix && url.pathname.startsWith(options.failPathPrefix)) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: options.failMessage ?? 'Erreur API simulée' }),
      });
      return;
    }

    if (options.delayMs && url.pathname.startsWith('/projets')) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }

    const ok = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    if (url.pathname === '/budget-referentiels/exercices') return ok([{ id: '11111111-1111-4111-8111-111111111111', clientId: 'client-1', libelle: 'Exercice 2026', code: 'EX2026', dateDebut: '2026-01-01', dateFin: '2026-12-31', statut: 'ouvert' }]);
    if (url.pathname === '/budget-referentiels/sections') return ok([section]);
    if (url.pathname === '/budget-referentiels/programmes') return ok([programme]);
    if (url.pathname === '/budget-referentiels/actions') return ok([actionA, actionB]);
    if (url.pathname === '/budget-referentiels/lignes-budgetaires') return ok(lignes);
    if (url.pathname.startsWith('/analyses-financieres')) {
      return ok(buildAnalysesResponse(url.searchParams.get('projetId') ?? undefined));
    }
    if (url.pathname === '/projets') return ok(projets);
    if (url.pathname === '/structures') return ok(structures);
    if (url.pathname === '/reservations') return ok(reservations);
    if (url.pathname === '/engagements') return ok(engagements);
    if (url.pathname === '/factures') return ok(factures);

    if (request.method() === 'GET') return ok([]);
    return ok({});
  });
};

test.describe('analyses financieres ui', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async () => {
    uiServerProcess = spawn('pnpm', ['exec', 'vite', '--host', '127.0.0.1', '--port', '45182'], {
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

  test.beforeEach(async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-analyses',
      tenantId: 'client-1',
      roles: ['super_admin'],
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);
  });

  test('affiche un loading explicite pendant le chargement des donnees', async ({ page }) => {
    await setupAnalysesApi(page, { delayMs: 1200 });
    await page.goto(`${UI_BASE_URL}/app/analyses`);
    await expect(page).toHaveURL(/\/app\/analyses$/);
    await expect(page.getByRole('heading', { name: 'Analyses Financières' })).toBeVisible();
    await expect(page.getByText('Filtres analytiques')).not.toBeVisible();
    await expect(page.locator('.px-8 .animate-spin').first()).toBeVisible();
    await expect(page.getByText('Filtres analytiques')).toBeVisible({ timeout: 20_000 });
  });

  test('affiche un message actionnable en cas d erreur API', async ({ page }) => {
    await setupAnalysesApi(page, {
      failPathPrefix: '/projets',
      failMessage: 'Service projets indisponible',
    });
    await page.goto(`${UI_BASE_URL}/app/analyses`);
    await expect(page).toHaveURL(/\/app\/analyses$/);
    await expect(page.getByText('Impossible de charger les analyses')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Service projets indisponible')).toBeVisible({ timeout: 20_000 });
  });

  test('affiche un empty state explicite quand aucune donnee analytique nest disponible', async ({ page }) => {
    await setupAnalysesApi(page, { emptyMode: true });
    await page.goto(`${UI_BASE_URL}/app/analyses`);
    await expect(page).toHaveURL(/\/app\/analyses$/);
    await expect(page.getByText('Filtres analytiques')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Aucune donnee analytique disponible pour les filtres actifs.')).toBeVisible();
  });

  test('met a jour la vue quand un filtre projet est applique', async ({ page }) => {
    await setupAnalysesApi(page);
    await page.goto(`${UI_BASE_URL}/app/analyses`);
    await expect(page).toHaveURL(/\/app\/analyses$/);
    await expect(page.getByText('Filtres analytiques')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('combobox', { name: 'Projet' }).click();
    await page.getByRole('option', { name: /Projet A/ }).first().click();
    await page.getByRole('button', { name: 'Appliquer' }).click();

    await expect(page.getByRole('cell', { name: 'CC01-PROJ-A - Projet A' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CC02-PROJ-B - Projet B' })).not.toBeVisible();
  });
});
