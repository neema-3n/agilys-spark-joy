import { expect, test, type Page } from '@playwright/test';

const UI_BASE_URL = 'http://127.0.0.1:45179';

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
};

const buildListPayload = () => [
  {
    id: 'rap-1',
    clientId: 'client-1',
    exerciceId: 'ex-2026',
    numero: 'RAP00001',
    compteId: 'comp-1',
    dateDebut: '2026-03-01',
    dateFin: '2026-03-31',
    soldeReleve: 1200,
    soldeComptable: 1200,
    ecart: 0,
    statut: 'en_cours',
    statutDetaille: 'a_traiter',
    modeGeneration: 'auto',
    scoreGlobal: 88,
    metadataAudit: {},
    totalLignes: 2,
    totalPropositionsAuto: 1,
    totalEcartsQualifies: 0,
    createdAt: '2026-03-08T09:00:00.000Z',
    updatedAt: '2026-03-08T09:00:00.000Z',
    compte: {
      code: 'BQ-001',
      libelle: 'Banque principale',
      type: 'banque',
    },
  },
];

const buildDetailPayload = (withQualifiedGap = false) => ({
  ...buildListPayload()[0],
  lines: [
    {
      id: 'line-1',
      ordre: 1,
      dateOperation: '2026-03-08',
      libelle: 'Versement client ACME',
      referenceBancaire: 'REF-1',
      montant: 1200,
      typeFlux: 'encaissement',
      statut: 'proposition_unique',
      score: 95,
      reglesAppliquees: ['Montant exact', 'Date identique', 'Reference bancaire identique'],
      metadata: {},
      candidates: [
        {
          id: 'cand-1',
          operationTresorerieId: 'op-1',
          score: 95,
          statut: 'propose',
          raisons: ['Montant exact', 'Date identique'],
          metadata: {
            numero: 'OPE000001',
            libelle: 'Versement client ACME',
            dateOperation: '2026-03-08',
          },
        },
      ],
    },
    {
      id: 'line-2',
      ordre: 2,
      dateOperation: '2026-03-09',
      libelle: 'Frais bancaires',
      montant: 25,
      typeFlux: 'decaissement',
      statut: withQualifiedGap ? 'ecart_qualifie' : 'sans_match',
      reglesAppliquees: ['Aucun candidat deterministe'],
      categorieEcart: withQualifiedGap ? 'anomalie_externe' : undefined,
      motifQualification: withQualifiedGap ? 'Frais bancaires sans contrepartie interne' : undefined,
      metadata: {},
      candidates: [],
    },
  ],
  decisions: withQualifiedGap
    ? [
        {
          id: 'dec-1',
          lineId: 'line-2',
          action: 'qualify_discrepancy',
          nextStatus: 'ecart_qualifie',
          justification: 'Frais bancaires sans contrepartie interne',
          category: 'anomalie_externe',
          createdAt: '2026-03-09T10:00:00.000Z',
          metadata: {},
        },
      ]
    : [],
  invalidationKeys: [['rapprochements-bancaires']],
});

const setupApi = async (page: Page, accessToken: string, options: { rejectDecision?: boolean } = {}) => {
  let qualifiedGap = false;

  await page.route('**://127.0.0.1:3001/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/auth/refresh') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken, refreshToken: 'refresh-token-stub' }),
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

    if (url.pathname === '/comptes-tresorerie' || url.pathname === '/comptes-tresorerie/actifs') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'comp-1',
            clientId: 'client-1',
            code: 'BQ-001',
            libelle: 'Banque principale',
            type: 'banque',
            soldeActuel: 5000,
            statut: 'actif',
          },
        ]),
      });
      return;
    }

    if (url.pathname === '/recettes') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    if (url.pathname === '/recettes/stats') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nombreTotal: 0,
          nombreValidees: 0,
          nombreAnnulees: 0,
          montantTotal: 0,
          montantValidees: 0,
          montantAujourdhui: 0,
          montantCeMois: 0,
          repartitionParSource: [],
        }),
      });
      return;
    }

    if (url.pathname === '/operations-tresorerie') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    if (url.pathname === '/operations-tresorerie/stats') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nombreTotal: 0,
          nombreEncaissements: 0,
          nombreDecaissements: 0,
          nombreTransferts: 0,
          montantEncaissements: 0,
          montantDecaissements: 0,
          montantTransferts: 0,
          soldeNet: 0,
          operationsNonRapprochees: 0,
        }),
      });
      return;
    }

    if (url.pathname === '/tresorerie/supervision') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exerciceId: 'ex-2026',
          generatedAt: '2026-03-09T10:00:00.000Z',
          currentPosition: 5000,
          shortTermProjection: 4500,
          pendingDisbursements: 100,
          pendingDisbursementsCount: 1,
          remainingCommitments: 400,
          remainingCommitmentsCount: 1,
          nonReconciledOperations: 1,
          pendingReconciliations: 1,
          qualifiedDiscrepancies: 0,
          projectedExposure: 500,
          projectedGap: 0,
          activeExceptions: 0,
          expiredExceptions: 0,
          consumedExceptions: 0,
          alerts: [],
        }),
      });
      return;
    }

    if (url.pathname === '/rapprochements-bancaires' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildListPayload()),
      });
      return;
    }

    if (url.pathname === '/rapprochements-bancaires/rap-1' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildDetailPayload(qualifiedGap)),
      });
      return;
    }

    if (url.pathname === '/rapprochements-bancaires/rap-1/decision' && request.method() === 'PATCH') {
      if (options.rejectDecision) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: "L'opération est déjà rapprochée dans un autre workflow" }),
        });
        return;
      }

      qualifiedGap = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildDetailPayload(true)),
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

test.describe('rapprochements bancaires ui', () => {
  test('affiche le workflow de rapprochement avec propositions et écarts', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-1',
      tenantId: 'client-1',
      roles: ['directeur_financier'],
      email: 'treso@agilys.local',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await setupApi(page, accessToken);
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/tresorerie`);
    await page.getByRole('tab', { name: 'Rapprochement' }).click();

    await expect(page.getByText('Rapprochement bancaire assisté')).toBeVisible();
    await expect(page.getByText('RAP00001')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ligne 1 • Versement client ACME' })).toBeVisible();
    await expect(page.getByText('Aucun candidat détecté. Qualifiez l’écart')).toBeVisible();

    await page.getByRole('combobox', { name: "Catégorie d'écart" }).nth(1).click();
    await page.getByRole('option', { name: 'Anomalie externe' }).click();
    await page.getByLabel('Justification manuelle').nth(1).fill('Frais bancaires sans contrepartie interne');
    await page.getByRole('button', { name: "Qualifier l'écart" }).nth(1).click();

    await expect(page.getByText('Écart qualifié: anomalie_externe')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Journal des décisions')).toBeVisible();
  });

  test('affiche une erreur métier actionnable en cas de conflit de décision', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-2',
      tenantId: 'client-1',
      roles: ['directeur_financier'],
      email: 'ops@agilys.local',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await setupApi(page, accessToken, { rejectDecision: true });
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/tresorerie`);
    await page.getByRole('tab', { name: 'Rapprochement' }).click();

    await page.getByRole('button', { name: 'Accepter' }).first().click();
    await expect(page.getByText("déjà rapprochée dans un autre workflow")).toBeVisible({ timeout: 15000 });
  });
});
