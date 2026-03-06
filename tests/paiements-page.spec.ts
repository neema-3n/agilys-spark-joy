import { test, expect, type Page } from '@playwright/test';

const UI_BASE_URL = 'http://127.0.0.1:45175';

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
};

type PaiementFixture = {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  depenseId: string;
  montant: number;
  datePaiement: string;
  modePaiement: 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';
  referencePaiement?: string;
  observations?: string;
  statut: 'transmis' | 'accepte' | 'execute' | 'reconcilie' | 'rejete' | 'annule';
  tentativeNumero: number;
  paiementOrigineId?: string;
  paiementReprisDeId?: string;
  motifAnnulation?: string;
  motifRejet?: string;
  createdAt: string;
  updatedAt: string;
  depense: {
    id: string;
    numero: string;
    objet: string;
    montant: number;
    montantPaye: number;
    resteAPayer: number;
    statut: 'ordonnancee' | 'partiellement_payee' | 'payee' | 'annulee' | 'validee' | 'brouillon';
    fournisseur?: {
      id: string;
      nom: string;
      code: string;
    };
  };
};

const makePaiementFixture = (overrides: Partial<PaiementFixture> = {}): PaiementFixture => ({
  id: 'pay-1',
  clientId: 'client-1',
  exerciceId: 'ex-2026',
  numero: 'PAY000001',
  depenseId: 'dep-1',
  montant: 150,
  datePaiement: '2026-03-06',
  modePaiement: 'virement',
  referencePaiement: 'REF-001',
  statut: 'transmis',
  tentativeNumero: 1,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
  depense: {
    id: 'dep-1',
    numero: 'DEP-001',
    objet: 'Paiement fournisseur',
    montant: 400,
    montantPaye: 150,
    resteAPayer: 250,
    statut: 'partiellement_payee',
    fournisseur: {
      id: 'fou-1',
      nom: 'ACME',
      code: 'F001',
    },
  },
  ...overrides,
});

const setupAuthenticatedPaiementsApi = async (
  page: Page,
  accessToken: string,
  paiements: PaiementFixture[],
  events: {
    annulations: Array<{ id: string; body: unknown }>;
    reprises: Array<{ id: string; body: unknown }>;
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

    if (url.pathname === '/paiements' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(paiements),
      });
      return;
    }

    const annulationMatch = url.pathname.match(/^\/paiements\/([^/]+)\/annuler$/);
    if (annulationMatch && request.method() === 'PATCH') {
      const id = annulationMatch[1]!;
      const body = request.postDataJSON();
      events.annulations.push({ id, body });

      const paiement = paiements.find((item) => item.id === id);
      if (paiement) {
        paiement.statut = 'annule';
        paiement.motifAnnulation = String((body as { motif?: string }).motif ?? '');
        paiement.updatedAt = '2026-03-06T12:00:00.000Z';
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(paiement ?? {}),
      });
      return;
    }

    const repriseMatch = url.pathname.match(/^\/paiements\/([^/]+)\/reprendre$/);
    if (repriseMatch && request.method() === 'POST') {
      const id = repriseMatch[1]!;
      const body = request.postDataJSON();
      events.reprises.push({ id, body });

      const original = paiements.find((item) => item.id === id);
      const reprise = makePaiementFixture({
        id: 'pay-3',
        numero: 'PAY000003',
        depenseId: original?.depenseId ?? 'dep-1',
        montant: original?.montant ?? 150,
        datePaiement: '2026-03-06',
        statut: 'transmis',
        tentativeNumero: 2,
        paiementOrigineId: original?.paiementOrigineId ?? original?.id ?? 'pay-2',
        paiementReprisDeId: original?.id ?? 'pay-2',
        referencePaiement: 'REF-003',
        depense: original?.depense ?? makePaiementFixture().depense,
      });
      paiements.push(reprise);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reprise),
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

test.describe('paiements page ui', () => {
  test.describe.configure({ timeout: 120_000 });

  test('affiche le filtre, ouvre le dialogue d annulation et soumet un motif actionnable', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-paiement-1',
      tenantId: 'client-1',
      roles: ['admin_client'],
      email: 'paiements@agilys.local',
      nom: 'Paiement',
      prenom: 'Test',
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const paiements = [
      makePaiementFixture({
        id: 'pay-1',
        numero: 'PAY000001',
        statut: 'transmis',
        referencePaiement: 'REF-001',
      }),
      makePaiementFixture({
        id: 'pay-2',
        numero: 'PAY000002',
        statut: 'annule',
        referencePaiement: 'REF-002',
        tentativeNumero: 1,
      }),
    ];
    const events = { annulations: [] as Array<{ id: string; body: unknown }>, reprises: [] as Array<{ id: string; body: unknown }> };

    await setupAuthenticatedPaiementsApi(page, accessToken, paiements, events);

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/paiements`);
    await expect(page).toHaveURL(/\/app\/paiements$/);
    await expect(page.getByText('PAY000001')).toBeVisible();

    await page.getByRole('button', { name: 'Statut: Tous' }).click();
    await page.getByRole('menuitem', { name: 'Annulé' }).click();
    await expect(page.getByText('PAY000002')).toBeVisible();
    await expect(page.getByText('PAY000001')).not.toBeVisible();

    const transmittedRow = page.getByRole('row', { name: /PAY000001/i });
    await page.getByRole('button', { name: 'Statut: Annulé' }).click();
    await page.getByRole('menuitem', { name: 'Réinitialiser' }).click();
    await transmittedRow.locator('button').first().click();
    await page.getByRole('menuitem', { name: 'Annuler' }).click();

    await expect(page.getByRole('alertdialog')).toContainText('Annuler ce paiement');
    await expect(page.getByRole('alertdialog')).toContainText('Les montants et écritures liés seront recalculés');
    await page.getByPlaceholder("Indiquez le motif de l'annulation...").fill('Erreur de saisie');
    await page.getByRole('button', { name: 'Confirmer' }).click();

    await expect.poll(() => events.annulations.length).toBe(1);
    expect(events.annulations[0]).toEqual({
      id: 'pay-1',
      body: { motif: 'Erreur de saisie' },
    });
  });

  test('propose la reprise pour un paiement annulé et crée une nouvelle tentative', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-paiement-2',
      tenantId: 'client-1',
      roles: ['admin_client'],
      email: 'reprise@agilys.local',
      nom: 'Reprise',
      prenom: 'Test',
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const paiements = [
      makePaiementFixture({
        id: 'pay-2',
        numero: 'PAY000002',
        statut: 'annule',
        referencePaiement: 'REF-002',
        tentativeNumero: 1,
      }),
    ];
    const events = { annulations: [] as Array<{ id: string; body: unknown }>, reprises: [] as Array<{ id: string; body: unknown }> };

    await setupAuthenticatedPaiementsApi(page, accessToken, paiements, events);

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/paiements`);
    await expect(page).toHaveURL(/\/app\/paiements$/);
    const cancelledRow = page.getByRole('row', { name: /PAY000002/i });
    await expect(cancelledRow).toBeVisible();

    await cancelledRow.locator('button').first().click();
    await page.getByRole('menuitem', { name: 'Reprendre' }).click();

    await expect.poll(() => events.reprises.length).toBe(1);
    expect(events.reprises[0]).toEqual({
      id: 'pay-2',
      body: {},
    });

    await expect(page.getByText('PAY000003')).toBeVisible();
    await expect(page.getByText('T2')).toBeVisible();
  });
});
