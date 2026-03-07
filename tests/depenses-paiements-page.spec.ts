import { test, expect, type Page } from '@playwright/test';

const UI_BASE_URL = 'http://127.0.0.1:45176';

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
};

type DepenseFixture = {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateDepense: string;
  objet: string;
  montant: number;
  montantPaye: number;
  statut: 'ordonnancee' | 'partiellement_payee' | 'payee' | 'validee' | 'brouillon' | 'annulee';
  createdAt: string;
  updatedAt: string;
  fournisseur?: {
    id: string;
    nom: string;
    code: string;
  };
};

const makeDepenseFixture = (overrides: Partial<DepenseFixture> = {}): DepenseFixture => ({
  id: 'dep-1',
  clientId: 'client-1',
  exerciceId: 'ex-2026',
  numero: 'DEP000001',
  dateDepense: '2026-03-06',
  objet: 'Achat fournitures',
  montant: 400,
  montantPaye: 0,
  statut: 'ordonnancee',
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
  fournisseur: {
    id: 'fou-1',
    nom: 'ACME',
    code: 'F001',
  },
  ...overrides,
});

const setupAuthenticatedDepensesApi = async (
  page: Page,
  accessToken: string,
  depenses: DepenseFixture[],
  events: {
    paiements: Array<{ body: unknown }>;
  },
  options?: {
    blockPaiementCreation?: boolean;
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
          refreshToken: 'refresh-token-stub',
        }),
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
            statut: 'ouvert',
          },
        ]),
      });
      return;
    }

    if (url.pathname === '/depenses' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(depenses),
      });
      return;
    }

    if (url.pathname.startsWith('/paiements') && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.pathname === '/paiements' && request.method() === 'POST') {
      if (options?.blockPaiementCreation) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 400,
            error: 'CashRiskBlocked',
            code: 'CASH_RISK_BLOCKED',
            message: 'Transition bloquée: Gap de trésorerie projeté positif après transition.',
            riskDecision: {
              riskLevel: 'high',
              riskScore: 84,
              decision: 'block',
              reasons: [
                'Gap de trésorerie projeté positif après transition.',
                'Des opérations bancaires restent non rapprochées.',
              ],
              snapshot: {
                transition: 'paiement:execute',
                availableCash: 1000,
                projectedExposure: 1600,
                projectedGap: 600,
                remainingEngagements: 3,
                outstandingDepenses: 2,
                nonReconciledOperations: 4,
              },
            },
          }),
        });
        return;
      }

      const body = request.postDataJSON() as {
        depenseId: string;
        montant: number;
        datePaiement: string;
        modePaiement: string;
        referencePaiement?: string;
        exerciceId: string;
      };
      events.paiements.push({ body });

      const depense = depenses.find((item) => item.id === body.depenseId);
      if (depense) {
        depense.montantPaye += Number(body.montant ?? 0);
        depense.statut = depense.montantPaye >= depense.montant ? 'payee' : 'partiellement_payee';
        depense.updatedAt = '2026-03-06T12:00:00.000Z';
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `pay-${events.paiements.length}`,
          clientId: 'client-1',
          exerciceId: body.exerciceId,
          numero: `PAY00000${events.paiements.length}`,
          depenseId: body.depenseId,
          montant: body.montant,
          datePaiement: body.datePaiement,
          modePaiement: body.modePaiement,
          referencePaiement: body.referencePaiement,
          statut: 'transmis',
          tentativeNumero: 1,
          createdAt: '2026-03-06T12:00:00.000Z',
          updatedAt: '2026-03-06T12:00:00.000Z',
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

test.describe('depenses paiement ui', () => {
  test.describe.configure({ timeout: 120_000 });

  test('ouvre le dialogue de paiement et passe une dépense ordonnancée en partiellement payée', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-depense-1',
      tenantId: 'client-1',
      roles: ['admin_client'],
      email: 'depenses@agilys.local',
      nom: 'Depense',
      prenom: 'Test',
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const depenses = [
      makeDepenseFixture({
        id: 'dep-1',
        numero: 'DEP000001',
        montant: 400,
        montantPaye: 0,
        statut: 'ordonnancee',
      }),
    ];
    const events = { paiements: [] as Array<{ body: unknown }> };

    await setupAuthenticatedDepensesApi(page, accessToken, depenses, events);

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/depenses`);
    await expect(page).toHaveURL(/\/app\/depenses$/);
    const row = page.getByRole('row', { name: /DEP000001/i });
    await expect(row).toBeVisible();

    await row.locator('button').last().click();
    await page.getByRole('menuitem', { name: 'Enregistrer un paiement' }).click();

    await expect(page.getByRole('dialog')).toContainText('Enregistrer un paiement');
    await expect(page.getByText('Reste à payer : 400.00 €')).toBeVisible();
    await page.getByLabel('Montant *').fill('150');
    await page.getByLabel('Référence').fill('VIR-150');
    await page.getByRole('button', { name: 'Enregistrer le paiement' }).click();

    await expect.poll(() => events.paiements.length).toBe(1);
    expect(events.paiements[0]?.body).toMatchObject({
      depenseId: 'dep-1',
      montant: 150,
      referencePaiement: 'VIR-150',
      exerciceId: 'ex-2026',
    });

    await expect(page.getByRole('row', { name: /DEP000001/i })).toContainText('150');
    await expect(page.getByRole('row', { name: /DEP000001/i })).toContainText('Partiellement payée');
  });

  test('autorise un paiement final sur une dépense partiellement payée et affiche le statut payée', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-depense-2',
      tenantId: 'client-1',
      roles: ['admin_client'],
      email: 'depenses-final@agilys.local',
      nom: 'Depense',
      prenom: 'Final',
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const depenses = [
      makeDepenseFixture({
        id: 'dep-2',
        numero: 'DEP000002',
        montant: 400,
        montantPaye: 150,
        statut: 'partiellement_payee',
      }),
    ];
    const events = { paiements: [] as Array<{ body: unknown }> };

    await setupAuthenticatedDepensesApi(page, accessToken, depenses, events);

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/depenses`);
    await expect(page).toHaveURL(/\/app\/depenses$/);
    const row = page.getByRole('row', { name: /DEP000002/i });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Partiellement payée');

    await row.locator('button').last().click();
    await page.getByRole('menuitem', { name: 'Enregistrer un paiement' }).click();

    await expect(page.getByText('Reste à payer : 250.00 €')).toBeVisible();
    await page.getByLabel('Référence').fill('SOLDE-250');
    await page.getByRole('button', { name: 'Enregistrer le paiement' }).click();

    await expect.poll(() => events.paiements.length).toBe(1);
    expect(events.paiements[0]?.body).toMatchObject({
      depenseId: 'dep-2',
      montant: 250,
      referencePaiement: 'SOLDE-250',
      exerciceId: 'ex-2026',
    });

    await expect(page.getByRole('row', { name: /DEP000002/i })).toContainText('400');
    await expect(page.getByRole('row', { name: /DEP000002/i })).toContainText('Payée');
  });

  test('conserve le formulaire ouvert et affiche les remédiations en cas de blocage cash', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-depense-3',
      tenantId: 'client-1',
      roles: ['admin_client'],
      email: 'depenses-risk@agilys.local',
      nom: 'Depense',
      prenom: 'Risk',
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const depenses = [
      makeDepenseFixture({
        id: 'dep-3',
        numero: 'DEP000003',
        montant: 900,
        montantPaye: 0,
        statut: 'ordonnancee',
      }),
    ];
    const events = { paiements: [] as Array<{ body: unknown }> };

    await setupAuthenticatedDepensesApi(page, accessToken, depenses, events, {
      blockPaiementCreation: true,
    });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/depenses`);
    await expect(page).toHaveURL(/\/app\/depenses$/);
    const row = page.getByRole('row', { name: /DEP000003/i });
    await row.locator('button').last().click();
    await page.getByRole('menuitem', { name: 'Enregistrer un paiement' }).click();

    await page.getByLabel('Montant *').fill('350');
    await page.getByRole('button', { name: 'Enregistrer le paiement' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Action bloquée par le contrôle de risque cash');
    await expect(page.getByRole('dialog')).toContainText('La trésorerie projetée devient insuffisante après cette action.');
    await expect(page.getByRole('dialog')).toContainText('Remédiations proposées');
    await expect(page.getByRole('button', { name: /Demander une exception/ })).toBeDisabled();

    const dismissButton = page.getByRole('button', { name: 'Fermer ce message' });
    await dismissButton.focus();
    await expect(dismissButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).not.toContainText('Action bloquée par le contrôle de risque cash');
    await expect.poll(() => events.paiements.length).toBe(0);
  });
});
