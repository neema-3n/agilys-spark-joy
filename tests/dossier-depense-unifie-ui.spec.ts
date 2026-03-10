import { expect, test, type Page } from '@playwright/test';

const UI_BASE_URL = 'http://127.0.0.1:45176';

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
};

type DossierRouteState = {
  detailCalls: string[];
  exportCalls: string[];
};

const setupRoutes = async (page: Page): Promise<DossierRouteState> => {
  const state: DossierRouteState = {
    detailCalls: [],
    exportCalls: []
  };

  await page.route('**://127.0.0.1:3001/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/auth/refresh') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: makeJwt({ sub: 'user-dossier', tenantId: 'client-1', roles: ['auditeur'] }),
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

    if (url.pathname.startsWith('/dossier-depense-unifie/') && url.pathname.endsWith('/export')) {
      state.exportCalls.push(`${url.pathname}${url.search}`);
      const format = url.searchParams.get('format') || 'pdf';
      const body = format === 'zip' ? 'PKzip-content' : '%PDF-1.4';
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': format === 'zip' ? 'application/zip' : 'application/pdf',
          'Content-Disposition': `attachment; filename="dossier-demo.${format}"`
        },
        body
      });
      return;
    }

    if (url.pathname.startsWith('/dossier-depense-unifie/')) {
      state.detailCalls.push(`${url.pathname}${url.search}`);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dossierId: 'dossier-dep-1',
          generatedAt: '2026-03-09T12:00:00.000Z',
          filters: { detailLevel: 'standard' },
          depense: {
            id: 'dep-1',
            numero: 'DEP-001',
            objet: 'Achat equipement',
            statut: 'ordonnancee',
            montant: 1000,
            montantPaye: 500,
            dateDepense: '2026-03-01',
            createdAt: '2026-03-01T08:00:00.000Z',
            createdBy: 'user-compta',
            fournisseur: { id: 'fr-1', code: 'FRN-001', nom: 'Fournisseur A' },
            projet: null
          },
          chaine: {
            reservation: null,
            engagement: null,
            bonsCommande: [],
            factures: [{ id: 'fac-1', numero: 'FAC-001', statut: 'validee', montantTTC: 1000, montantLiquide: 1000, dateFacture: '2026-03-01', referencePiece: 'PJ-1' }],
            paiements: [{ id: 'pay-1', numero: 'PAY-001', statut: 'execute', montant: 500, datePaiement: '2026-03-05', modePaiement: 'virement', referencePaiement: 'REF-1' }]
          },
          timeline: [
            {
              id: 'evt-1',
              type: 'depense',
              label: 'Depense DEP-001',
              timestamp: '2026-03-01T00:00:00.000Z',
              entityId: 'dep-1',
              entityType: 'depense',
              status: 'ordonnancee',
              actor: { userId: 'user-compta', action: 'creation-depense' },
              correlationId: 'dep-1'
            }
          ],
          preuves: [
            {
              id: 'preuve-1',
              type: 'reference-piece',
              label: 'Reference piece facture',
              source: 'factures.reference_piece',
              value: 'PJ-1',
              entityId: 'fac-1',
              entityType: 'facture',
              missing: false
            }
          ],
          synthese: {
            controles: [{ code: 'tenant-scope', label: 'Isolation tenant', status: 'ok', detail: 'OK' }],
            ecarts: [],
            indicateurs: { totalFactures: 1, totalPaiements: 1, totalPreuves: 1, preuvesManquantes: 0 }
          },
          actionsUtilisateurs: []
        })
      });
      return;
    }

    if (url.pathname.startsWith('/reporting-')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          view: 'noop',
          rows: [],
          summary: {},
          pagination: { total: 0, page: 1, pageSize: 100 },
          filters: {}
        })
      });
      return;
    }

    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  return state;
};

test('consulte un dossier de depense unifie et lance les exports probatoires', async ({ page }) => {
  const accessToken = makeJwt({
    sub: 'user-dossier-1',
    tenantId: 'client-1',
    roles: ['auditeur'],
    exp: Math.floor(Date.now() / 1000) + 600
  });

  const routeState = await setupRoutes(page);

  await page.addInitScript((token: string) => {
    window.localStorage.setItem('agilys.auth.accessToken', token);
    window.localStorage.setItem('agilys.auth.refreshToken', 'refresh-token-stub');
  }, accessToken);

  await page.goto(`${UI_BASE_URL}/app/reporting`);
  await page.getByRole('tab', { name: /Dossier Dépense/i }).click();

  await page.getByPlaceholder('UUID depense').fill('dep-1');
  await expect.poll(() => routeState.detailCalls.length).toBeGreaterThan(0);
  await expect(page.getByText('Depense DEP-001')).toBeVisible();

  await page.getByRole('button', { name: 'Export PDF' }).click();
  await page.getByRole('button', { name: 'Export ZIP' }).click();

  await expect.poll(() => routeState.exportCalls.some((call) => call.includes('format=pdf'))).toBeTruthy();
  await expect.poll(() => routeState.exportCalls.some((call) => call.includes('format=zip'))).toBeTruthy();
});
