import { expect, test, type Page } from '@playwright/test';

const UI_BASE_URL = 'http://127.0.0.1:45177';

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
};

const setupAuthenticatedExceptionsApi = async (
  page: Page,
  accessToken: string,
  options: {
    role: 'directeur_financier' | 'operateur_saisie';
    exceptions: Array<Record<string, unknown>>;
    voteEvents: Array<{ id: string; body: unknown }>;
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

    if (url.pathname === '/workflow-exceptions' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.exceptions),
      });
      return;
    }

    const voteMatch = url.pathname.match(/^\/workflow-exceptions\/([^/]+)\/votes$/);
    if (voteMatch && request.method() === 'POST') {
      const id = voteMatch[1]!;
      const body = request.postDataJSON();
      options.voteEvents.push({ id, body });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...(options.exceptions[0] ?? {}),
          id,
          status: 'approuvee',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Unhandled route: ${url.pathname}` }),
    });
  });
};

test.describe('workflow exceptions ui', () => {
  test('affiche quorum/expiration et permet le vote pour un approbateur éligible', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-review-1',
      tenantId: 'client-1',
      roles: ['directeur_financier'],
      email: 'review@agilys.local',
      nom: 'Review',
      prenom: 'User',
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const voteEvents: Array<{ id: string; body: unknown }> = [];
    const exceptions = [
      {
        id: 'exc-1',
        tenantId: 'client-1',
        exerciceId: 'ex-2026',
        status: 'soumise',
        transition: 'paiement:execute',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        entityId: 'dep-1',
        correlationId: 'corr-1',
        motif: 'Urgence paiement fournisseur',
        justification: 'Risque opérationnel en cas de non-paiement immédiat.',
        urgence: 'haute',
        quorumRequired: 2,
        expiresAt: '2030-03-08T10:00:00.000Z',
        requestedBy: 'user-requester-1',
        createdAt: '2026-03-07T10:00:00.000Z',
        updatedAt: '2026-03-07T10:00:00.000Z',
        riskDecision: {
          riskLevel: 'critical',
          riskScore: 95,
          decision: 'block',
          reasons: ['blocked'],
          snapshot: {
            transition: 'paiement:execute',
            availableCash: 100,
            projectedExposure: 900,
            projectedGap: 800,
            remainingEngagements: 4,
            outstandingDepenses: 3,
            nonReconciledOperations: 2,
          },
        },
        votes: [
          {
            id: 'vote-1',
            actorUserId: 'user-a',
            actorRoles: ['comptable'],
            decision: 'approuver',
            createdAt: '2026-03-07T10:05:00.000Z',
          },
        ],
      },
    ];

    await setupAuthenticatedExceptionsApi(page, accessToken, {
      role: 'directeur_financier',
      exceptions,
      voteEvents,
    });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/controle-interne`);
    await expect(page).toHaveURL(/\/app\/controle-interne$/);

    await expect(page.getByText('Demandes d\'exception')).toBeVisible();
    await expect(page.getByText('Quorum: 1/2 - Expire le')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approuver' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rejeter' })).toBeVisible();

    await page.getByRole('button', { name: 'Approuver' }).click();
    await expect.poll(() => voteEvents.length).toBe(1);
    expect(voteEvents[0]).toEqual({
      id: 'exc-1',
      body: {
        exerciceId: 'ex-2026',
        decision: 'approuver',
      },
    });
  });

  test('masque les actions de vote pour un profil non approbateur', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-read-1',
      tenantId: 'client-1',
      roles: ['operateur_saisie'],
      email: 'readonly@agilys.local',
      nom: 'Readonly',
      prenom: 'User',
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    const voteEvents: Array<{ id: string; body: unknown }> = [];
    const exceptions = [
      {
        id: 'exc-2',
        tenantId: 'client-1',
        exerciceId: 'ex-2026',
        status: 'soumise',
        transition: 'engagement:validate',
        sourceType: 'engagement',
        sourceId: 'eng-1',
        entityId: 'lb-1',
        correlationId: 'corr-2',
        motif: 'Urgence validation engagement',
        justification: 'Blocage opérationnel temporaire.',
        urgence: 'normale',
        quorumRequired: 2,
        expiresAt: '2030-03-08T10:00:00.000Z',
        requestedBy: 'user-requester-2',
        createdAt: '2026-03-07T10:00:00.000Z',
        updatedAt: '2026-03-07T10:00:00.000Z',
        riskDecision: {
          riskLevel: 'high',
          riskScore: 80,
          decision: 'block',
          reasons: ['blocked'],
          snapshot: {
            transition: 'engagement:validate',
            availableCash: 200,
            projectedExposure: 1000,
            projectedGap: 800,
            remainingEngagements: 2,
            outstandingDepenses: 1,
            nonReconciledOperations: 0,
          },
        },
        votes: [],
      },
    ];

    await setupAuthenticatedExceptionsApi(page, accessToken, {
      role: 'operateur_saisie',
      exceptions,
      voteEvents,
    });

    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/controle-interne`);
    await expect(page).toHaveURL(/\/app\/controle-interne$/);

    await expect(page.getByText('Quorum: 0/2 - Expire le')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approuver' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Rejeter' })).toHaveCount(0);
    expect(voteEvents).toHaveLength(0);
  });
});
