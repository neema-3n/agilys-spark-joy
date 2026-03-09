import { expect, test, type Page } from '@playwright/test';

const UI_BASE_URL = 'http://127.0.0.1:45179';

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
};

const buildAuditPayload = () => ({
  items: [
    {
      id: 'exc-1',
      exerciceId: 'ex-2026',
      status: 'exception-approved',
      severity: 'critical',
      decision: 'block',
      transition: 'paiement:execute',
      sourceType: 'paiement',
      sourceId: 'pay-1',
      entityId: 'dep-1',
      correlationId: 'corr-1',
      motif: 'Paiement urgent sous exception',
      justification: 'Risque de rupture opérationnelle',
      quorumRequired: 2,
      requestedBy: 'user-requester-1',
      approvedAt: '2026-03-07T10:00:00.000Z',
      expiresAt: '2030-03-09T10:00:00.000Z',
      createdAt: '2026-03-07T09:00:00.000Z',
      updatedAt: '2026-03-07T10:00:00.000Z',
      reasons: ['Le besoin projeté dépasse la trésorerie disponible.'],
      snapshot: {
        tenantId: 'client-1',
        exerciceId: 'ex-2026',
        transition: 'paiement:execute',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        entityId: 'dep-1',
        projectedAmount: 450000,
        availableCash: 120000,
        outstandingDepenses: 300000,
        remainingEngagements: 50000,
        projectedExposure: 800000,
        projectedGap: 680000,
        nonReconciledOperations: 6,
        threshold: 60,
        correlationId: 'corr-1',
      },
      approvers: [
        {
          actorUserId: 'approver-1',
          decision: 'approuver',
          commentaire: 'Validé',
          createdAt: '2026-03-07T10:00:00.000Z',
        },
      ],
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  },
});

const setupApi = async (
  page: Page,
  accessToken: string,
  options: {
    denyAudit?: boolean;
    dossierError?: boolean;
  } = {}
) => {
  const createdPlans: Array<{
    id: string;
    title: string;
    description?: string;
    ownerUserId: string;
    dueDate: string;
    priority: 'basse' | 'moyenne' | 'haute' | 'critique';
    status: 'a_traiter' | 'en_cours' | 'resolu' | 'rejete' | 'cloture';
    sourceType: string;
    sourceId: string;
    correlationId?: string;
  }> = [];
  const createdPlanEvents = new Map<
    string,
    Array<{
      id: string;
      actionPlanId: string;
      tenantId: string;
      exerciceId: string;
      eventType: 'created' | 'updated' | 'status_changed';
      changedBy: string;
      reason?: string;
      payload: Record<string, unknown>;
      createdAt: string;
    }>
  >();
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

    if (url.pathname === '/comptes-tresorerie' || url.pathname === '/comptes-tresorerie/actifs') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.pathname === '/recettes' || url.pathname === '/operations-tresorerie') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
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

    if (url.pathname === '/controle-interne/workspace') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exerciceId: 'ex-2026',
          generatedAt: '2026-03-09T11:00:00.000Z',
          roleStrategy: {
            requiredPermission: 'referentiels:audit:read',
            mappedRoles: ['auditeur', 'directeur_financier'],
            note: 'Mapping role existant',
          },
          summary: {
            openDiscrepancies: 3,
            activeExceptions: 1,
            overdueActionPlans: 0,
            totalActionPlans: 0,
          },
          controlItems: [
            {
              id: 'alert-liquidity-gap',
              itemType: 'ecart',
              severity: 'critical',
              sourceType: 'tresorerie-supervision',
              sourceId: 'LIQUIDITY_GAP',
              label: 'Tension de liquidité',
              message: 'Le besoin projeté dépasse la position courante.',
              status: 'open',
              createdAt: '2026-03-09T11:00:00.000Z',
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/controle-interne/action-plans' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: createdPlans,
          pagination: {
            page: 1,
            pageSize: 20,
            total: createdPlans.length,
            totalPages: 1,
          },
        }),
      });
      return;
    }

    if (url.pathname === '/controle-interne/action-plans' && request.method() === 'POST') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, string>;
      const created = {
        id: `plan-${createdPlans.length + 1}`,
        tenantId: 'client-1',
        exerciceId: 'ex-2026',
        title: payload.title,
        description: payload.description,
        ownerUserId: payload.ownerUserId,
        dueDate: payload.dueDate,
        priority: (payload.priority ?? 'moyenne') as 'basse' | 'moyenne' | 'haute' | 'critique',
        status: (payload.status ?? 'a_traiter') as 'a_traiter' | 'en_cours' | 'resolu' | 'rejete' | 'cloture',
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        correlationId: payload.correlationId,
        evidenceRefs: [],
        createdBy: 'user-2',
        updatedBy: 'user-2',
        createdAt: '2026-03-09T11:00:00.000Z',
        updatedAt: '2026-03-09T11:00:00.000Z',
      };
      createdPlans.push(created);
      createdPlanEvents.set(created.id, [
        {
          id: `evt-${created.id}-1`,
          actionPlanId: created.id,
          tenantId: 'client-1',
          exerciceId: 'ex-2026',
          eventType: 'created',
          changedBy: 'user-2',
          payload: { after: created },
          createdAt: '2026-03-09T11:00:00.000Z',
        },
      ]);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }

    if (url.pathname.startsWith('/controle-interne/action-plans/') && request.method() === 'PATCH') {
      const id = url.pathname.split('/').pop();
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, string>;
      const index = createdPlans.findIndex((item) => item.id === id);
      if (index >= 0 && payload.status) {
        createdPlans[index] = { ...createdPlans[index], status: payload.status as typeof createdPlans[number]['status'] };
        const previousEvents = createdPlanEvents.get(createdPlans[index].id) ?? [];
        createdPlanEvents.set(createdPlans[index].id, [
          {
            id: `evt-${createdPlans[index].id}-${previousEvents.length + 1}`,
            actionPlanId: createdPlans[index].id,
            tenantId: 'client-1',
            exerciceId: 'ex-2026',
            eventType: 'status_changed',
            changedBy: 'user-2',
            reason: payload.reason,
            payload: { status: payload.status },
            createdAt: '2026-03-09T11:05:00.000Z',
          },
          ...previousEvents,
        ]);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createdPlans[index]),
      });
      return;
    }

    if (url.pathname.includes('/controle-interne/action-plans/') && url.pathname.endsWith('/events')) {
      const id = url.pathname.split('/')[3];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: createdPlanEvents.get(id) ?? [],
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
          generatedAt: '2026-03-07T11:00:00.000Z',
          currentPosition: 2500000,
          shortTermProjection: 1620000,
          pendingDisbursements: 620000,
          pendingDisbursementsCount: 4,
          remainingCommitments: 260000,
          remainingCommitmentsCount: 3,
          nonReconciledOperations: 6,
          projectedExposure: 880000,
          projectedGap: 120000,
          activeExceptions: 1,
          expiredExceptions: 1,
          consumedExceptions: 2,
          alerts: [
            {
              key: 'liquidity-gap',
              severity: 'critical',
              code: 'LIQUIDITY_GAP',
              label: 'Tension de liquidité',
              message: 'Le besoin projeté dépasse la position courante.',
              value: 120000,
              threshold: 0,
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/tresorerie/exception-audit') {
      if (options.denyAudit) {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Forbidden' }),
        });
        return;
      }

      const sourceId = url.searchParams.get('sourceId');
      if (sourceId === 'missing-source') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [],
            pagination: {
              page: 1,
              pageSize: 20,
              total: 0,
              totalPages: 1,
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildAuditPayload()),
      });
      return;
    }

    if (url.pathname === '/tresorerie/exception-audit/detail') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...buildAuditPayload().items[0],
          votes: [
            {
              id: 'vote-1',
              actorUserId: 'approver-1',
              actorRoles: ['directeur_financier'],
              decision: 'approuver',
              commentaire: 'ok',
              createdAt: '2026-03-07T10:00:00.000Z',
            },
          ],
          events: [
            {
              id: 'evt-1',
              actorUserId: 'user-requester-1',
              actorRoles: ['comptable'],
              eventType: 'soumise',
              payload: { commentaire: 'creation' },
              createdAt: '2026-03-07T09:00:00.000Z',
            },
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/tresorerie/exception-audit/dossier') {
      if (options.dossierError) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Erreur dossier' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: '2026-03-07T12:00:00.000Z',
          dossierId: 'audit-dossier-ex-2026-2026-03-07',
          scope: {
            tenantId: 'client-1',
            exerciceId: 'ex-2026',
            filters: {
              fromDate: null,
              toDate: null,
              sourceType: null,
              sourceId: null,
              entityId: null,
              correlationId: null,
            },
          },
          status: 'ready',
          timeline: [
            {
              id: 'exc-1',
              correlationId: 'corr-1',
              actorUserId: 'user-requester-1',
              status: 'exception-approved',
              transition: 'paiement:execute',
              sourceType: 'paiement',
              sourceId: 'pay-1',
              createdAt: '2026-03-07T09:00:00.000Z',
              approvedAt: '2026-03-07T10:00:00.000Z',
              decidedAt: '2026-03-07T10:00:00.000Z',
              consumedAt: null,
            },
          ],
          decisionLog: [],
          evidences: [],
          coverage: [
            { section: 'scope', objective: 'scope', status: 'covered', critical: true, evidenceIds: [] },
            { section: 'timeline', objective: 'timeline', status: 'covered', critical: true, evidenceIds: [] },
            { section: 'decision_log', objective: 'decision', status: 'covered', critical: true, evidenceIds: [] },
            { section: 'evidences', objective: 'evidences', status: 'covered', critical: true, evidenceIds: [] },
            { section: 'coverage', objective: 'coverage', status: 'covered', critical: false, evidenceIds: [] },
            { section: 'manifest', objective: 'manifest', status: 'covered', critical: false, evidenceIds: [] },
            { section: 'deliverables', objective: 'deliverables', status: 'covered', critical: false, evidenceIds: [] },
          ],
          manifest: {
            generatedAt: '2026-03-07T12:00:00.000Z',
            durationMs: 310,
            durationWithinSla: true,
            totalEntries: 1,
            missingCritical: [],
          },
          deliverables: {
            suggestedFileName: 'audit-dossier-ex-2026-2026-03-07.json',
            archiveZipFileName: 'audit-dossier-ex-2026-2026-03-07.zip',
            indexFileName: 'audit-dossier-index-ex-2026-2026-03-07.md',
            printableFileName: 'audit-dossier-index-ex-2026-2026-03-07.html',
            pdfStrategy: 'printable-html-first',
          },
        }),
      });
      return;
    }

    if (url.pathname === '/tresorerie/closeout-dossier') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: '2026-03-07T12:00:00.000Z',
          dossierType: 'cloture_exercice',
          status: 'go',
          scope: {
            tenantId: 'client-1',
            exerciceId: 'ex-2026',
          },
          decisionLog: [],
          evidences: [],
          reconciliation: {
            found: true,
            batchId: 'lot-standard',
            decision: 'GO',
            anomalies: {
              critical: 0,
              high: 0,
              medium: 1,
            },
            reportFiles: [],
          },
          exceptions: {
            supervision: {
              exerciceId: 'ex-2026',
              generatedAt: '2026-03-07T11:00:00.000Z',
              currentPosition: 2500000,
              shortTermProjection: 1620000,
              pendingDisbursements: 620000,
              pendingDisbursementsCount: 4,
              remainingCommitments: 260000,
              remainingCommitmentsCount: 3,
              nonReconciledOperations: 6,
              pendingReconciliations: 1,
              qualifiedDiscrepancies: 1,
              projectedExposure: 880000,
              projectedGap: 120000,
              activeExceptions: 1,
              expiredExceptions: 1,
              consumedExceptions: 2,
              alerts: [],
            },
          },
          manifest: {
            generatedAt: '2026-03-07T12:00:00.000Z',
            durationMs: 430,
            durationWithinSla: true,
            requirementsCoverage: {
              total: 4,
              covered: 4,
              missing: 0,
            },
            missingCritical: [],
          },
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

test.describe('tresorerie supervision + audit UI', () => {
  test('affiche les KPI/alertes de supervision et preserve la page Tresorerie', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-1',
      tenantId: 'client-1',
      roles: ['directeur_financier'],
      email: 'user@agilys.local',
      nom: 'Finance',
      prenom: 'Lead',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await setupApi(page, accessToken);
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/tresorerie`);
    await expect(page).toHaveURL(/\/app\/tresorerie$/);

    await expect(page.getByRole('tab', { name: 'Comptes' })).toBeVisible();
    await page.getByRole('tab', { name: 'Supervision' }).click();
    await expect(page.getByText('Journal des alertes cash')).toBeVisible();
    await expect(page.getByText('Tension de liquidité')).toBeVisible();
  });

  test('affiche la table audit, filtres, drill-down detail et table lisible', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-2',
      tenantId: 'client-1',
      roles: ['auditeur'],
      email: 'audit@agilys.local',
      nom: 'Audit',
      prenom: 'Reader',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await setupApi(page, accessToken);
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/controle-interne`);
    await expect(page).toHaveURL(/\/app\/controle-interne$/);

    await expect(page.getByText('Synthèse de supervision')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Plans d action' })).toBeVisible();
    await expect(page.getByText("Dossier d'audit exportable")).toBeVisible();
    await expect(page.getByText('Dossier de clôture et migration')).toBeVisible();
    await expect(page.getByText('Audit des exceptions cash-risk')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Statut' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Risque' })).toBeVisible();

    await page.getByText('Paiement urgent sous exception').dblclick();
    await page.getByRole('tab', { name: 'Détail / preuves' }).click();
    await expect(page.getByText('Détail d\'audit')).toBeVisible();
    await expect(page.getByText('Raisons du blocage')).toBeVisible();

    await page.getByRole('tab', { name: 'Écarts' }).click();
    const searchInput = page.getByLabel('Rechercher dans la liste');
    await searchInput.click();
    await searchInput.fill('missing-source');
    await expect(page.getByText('Aucune entrée d’audit trouvée.')).toBeVisible({ timeout: 15000 });
    await searchInput.press('Tab');
    await expect(searchInput).not.toBeFocused();

    await page.getByRole('tab', { name: 'Plans d action' }).click();
    await page.getByLabel('Titre').fill('Corriger écart de caisse');
    await page.getByLabel('Responsable').fill('user-controller-1');
    await page.getByLabel('Échéance').fill('2030-03-09T12:00');
    await page.getByLabel('Source ID').fill('exc-1');
    await page.getByRole('button', { name: 'Créer le plan d action' }).click();
    await expect(page.getByText('Corriger écart de caisse')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Marquer résolu' }).click();
    await expect(page.getByText('Résolu')).toBeVisible({ timeout: 15000 });

    await page.getByLabel('Motif de rejet (obligatoire pour rejeter)').fill('Preuve insuffisante');
    await page.getByRole('button', { name: 'Rejeter' }).click();
    await expect(page.getByText('Rejeté')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Historique' }).click();
    await expect(page.getByText('Historique du plan sélectionné')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Preuve insuffisante').last()).toBeVisible({ timeout: 15000 });
  });

  test('affiche un message d accès restreint sans permission audit', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-3',
      tenantId: 'client-1',
      roles: ['operateur_saisie'],
      email: 'ops@agilys.local',
      nom: 'Ops',
      prenom: 'Reader',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await setupApi(page, accessToken, { denyAudit: true });
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/controle-interne`);
    await expect(page.getByText('Accès restreint')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('referentiels:audit:read')).toBeVisible();
  });

  test('affiche une erreur dédiée si la préparation du dossier échoue', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-4',
      tenantId: 'client-1',
      roles: ['auditeur'],
      email: 'audit-error@agilys.local',
      nom: 'Audit',
      prenom: 'Error',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await setupApi(page, accessToken, { dossierError: true });
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('agilys.auth.accessToken', token);
      window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
    }, accessToken);

    await page.goto(`${UI_BASE_URL}/app/controle-interne`);
    await expect(page.getByText('Erreur dossier')).toBeVisible({ timeout: 15000 });
  });
});
