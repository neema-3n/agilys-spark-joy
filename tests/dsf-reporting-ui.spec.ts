import { test, expect } from '@playwright/test';
import { dsfReportingService } from '../src/services/api/dsf-reporting.service';
import { httpClient } from '../src/services/api/http-client';

test.describe('dsf reporting frontend flow', () => {
  test('@story-10-3 @reporting-dsf validation -> correction -> export', async () => {
    const originalRequest = httpClient.request;
    const createObjectUrl = URL.createObjectURL;
    const revokeObjectUrl = URL.revokeObjectURL;
    const originalDocument = globalThis.document;

    let validateCall = 0;
    let downloadCalled = false;

    // Minimal DOM stubs required by downloadExport.
    const fakeLink = {
      href: '',
      download: '',
      click: () => {
        downloadCalled = true;
      }
    };

    const fakeDocument = {
      createElement: (tag: string) => {
        if (tag !== 'a') {
          throw new Error(`Unsupported tag: ${tag}`);
        }

        return fakeLink;
      }
    } as unknown as Document;

    // @ts-expect-error test-only override
    globalThis.document = fakeDocument;
    URL.createObjectURL = () => 'blob:dsf-test';
    URL.revokeObjectURL = () => undefined;

    httpClient.request = (async (url: string) => {
      if (url.startsWith('/dsf-reporting/validate')) {
        validateCall += 1;

        if (validateCall === 1) {
          return new Response(
            JSON.stringify({
              status: 'non-conforme',
              isExportAllowed: false,
              referentielVersion: 'OHADA-SYCEBNL-2025',
              diagnostics: [
                {
                  code: 'DSF-MISSING-PIECE',
                  severity: 'blocking',
                  message: 'Des ecritures sans numero de piece ont ete detectees.',
                  action: 'Renseigner les numeros de piece manquants avant export.'
                }
              ],
              blockingErrors: [
                {
                  code: 'DSF-MISSING-PIECE',
                  severity: 'blocking',
                  message: 'Des ecritures sans numero de piece ont ete detectees.',
                  action: 'Renseigner les numeros de piece manquants avant export.'
                }
              ],
              warnings: [],
              checklist: [
                { id: 'presence-ecritures', label: 'Ecritures disponibles pour l exercice', ok: true },
                { id: 'comptes-ohada', label: 'Comptes OHADA 2025 (6 a 8 chiffres)', ok: true },
                { id: 'lignes-validees', label: 'Lignes comptables valides (montant > 0)', ok: true },
                { id: 'pieces-renseignees', label: 'Pieces justificatives correctement renseignees', ok: false }
              ],
              summary: { totalEcritures: 2, totalDebit: 10000, totalCredit: 10000, ecart: 0 }
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        return new Response(
          JSON.stringify({
            status: 'conforme',
            isExportAllowed: true,
            referentielVersion: 'OHADA-SYCEBNL-2025',
            diagnostics: [],
            blockingErrors: [],
            warnings: [],
            checklist: [
              { id: 'presence-ecritures', label: 'Ecritures disponibles pour l exercice', ok: true },
              { id: 'comptes-ohada', label: 'Comptes OHADA 2025 (6 a 8 chiffres)', ok: true },
              { id: 'lignes-validees', label: 'Lignes comptables valides (montant > 0)', ok: true },
              { id: 'pieces-renseignees', label: 'Pieces justificatives correctement renseignees', ok: true }
            ],
            summary: { totalEcritures: 2, totalDebit: 10000, totalCredit: 10000, ecart: 0 }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (url.startsWith('/dsf-reporting/exports?')) {
        return new Response(
          JSON.stringify({
            exportId: 'exp-dsf-1',
            status: 'completed',
            referentielVersion: 'OHADA-SYCEBNL-2025',
            hash: 'a'.repeat(64),
            validationStatus: 'conforme',
            initiatedBy: 'user-dsf-1'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (url.startsWith('/dsf-reporting/exports/status?')) {
        return new Response(
          JSON.stringify({
            exportId: 'exp-dsf-1',
            status: 'completed',
            referentielVersion: 'OHADA-SYCEBNL-2025',
            hash: 'a'.repeat(64),
            filename: 'dsf-ohada.xlsx',
            downloadUrl: '/dsf-reporting/exports/exp-dsf-1/download?token=token-ok'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (url.startsWith('/dsf-reporting/exports/exp-dsf-1/download?token=')) {
        return new Response('PK-fake-xlsx-content', {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="dsf-ohada.xlsx"'
          }
        });
      }

      throw new Error(`Unhandled request URL in DSF test: ${url}`);
    }) as typeof httpClient.request;

    try {
      const nonConforme = await dsfReportingService.validate({
        exerciceId: '11111111-1111-1111-1111-111111111111',
        referentielVersion: 'OHADA-SYCEBNL-2025',
        includeWarnings: true
      });
      expect(nonConforme.status).toBe('non-conforme');
      expect(nonConforme.blockingErrors).toHaveLength(1);

      const conforme = await dsfReportingService.validate({
        exerciceId: '11111111-1111-1111-1111-111111111111',
        referentielVersion: 'OHADA-SYCEBNL-2025',
        includeWarnings: true
      });
      expect(conforme.status).toBe('conforme');
      expect(conforme.blockingErrors).toHaveLength(0);

      const started = await dsfReportingService.startExport({
        exerciceId: '11111111-1111-1111-1111-111111111111',
        referentielVersion: 'OHADA-SYCEBNL-2025',
        includeWarnings: true,
        format: 'xlsx'
      });
      expect(started.exportId).toBe('exp-dsf-1');

      const status = await dsfReportingService.getExportStatus(started.exportId);
      expect(status.status).toBe('completed');
      expect(status.downloadUrl).toContain('/dsf-reporting/exports/exp-dsf-1/download');

      await dsfReportingService.downloadExport(status.downloadUrl, 'dsf-reporting.xlsx');
      expect(downloadCalled).toBeTruthy();
    } finally {
      httpClient.request = originalRequest;
      URL.createObjectURL = createObjectUrl;
      URL.revokeObjectURL = revokeObjectUrl;
      // @ts-expect-error test-only restore
      globalThis.document = originalDocument;
    }
  });
});
