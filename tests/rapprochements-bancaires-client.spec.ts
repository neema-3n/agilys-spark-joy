import { expect, test } from '@playwright/test';
import {
  getRapprochementInvalidationKeys,
  rapprochementsBancairesService,
} from '../src/services/api/rapprochements-bancaires.service';
import { httpClient } from '../src/services/api/http-client';

test.describe('rapprochements bancaires api client', () => {
  test('envoie les lignes de relevé et mappe le détail du workflow', async () => {
    const originalRequest = httpClient.request;
    let capturedBody = '';

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async (_path, options) => {
      capturedBody = String(options?.body ?? '');

      return new Response(
        JSON.stringify({
          id: 'rap-1',
          clientId: 'tenant-1',
          exerciceId: 'ex-1',
          numero: 'RAP00001',
          compteId: 'comp-1',
          dateDebut: '2026-03-01',
          dateFin: '2026-03-31',
          soldeReleve: 1200,
          soldeComptable: 1200,
          ecart: 0,
          statut: 'en_cours',
          statutDetaille: 'en_attente_validation',
          modeGeneration: 'auto',
          scoreGlobal: 95,
          metadataAudit: {},
          totalLignes: 1,
          totalPropositionsAuto: 1,
          totalEcartsQualifies: 0,
          createdAt: '2026-03-08T00:00:00.000Z',
          updatedAt: '2026-03-08T00:00:00.000Z',
          lines: [
            {
              id: 'line-1',
              ordre: 1,
              dateOperation: '2026-03-08',
              libelle: 'Versement client',
              montant: 1200,
              typeFlux: 'encaissement',
              statut: 'proposition_unique',
              score: 95,
              reglesAppliquees: ['Montant exact', 'Date identique'],
              metadata: {},
              candidates: [
                {
                  id: 'cand-1',
                  operationTresorerieId: 'op-1',
                  score: 95,
                  statut: 'propose',
                  raisons: ['Montant exact'],
                  metadata: { numero: 'OPE000001' },
                },
              ],
            },
          ],
          decisions: [],
          invalidationKeys: [['rapprochements-bancaires'], ['operations-tresorerie'], ['tresorerie-supervision']],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    try {
      const result = await rapprochementsBancairesService.create('tenant-1', 'ex-1', {
        compteId: 'comp-1',
        dateDebut: '2026-03-01',
        dateFin: '2026-03-31',
        soldeReleve: 1200,
        observations: 'Lot mars',
        statementLines: [
          {
            dateOperation: '2026-03-08',
            libelle: 'Versement client',
            montant: 1200,
            typeFlux: 'encaissement',
            referenceBancaire: 'REF-1',
          },
        ],
      });

      expect(capturedBody).toContain('"statementLines"');
      expect(result.lines[0]?.statut).toBe('proposition_unique');
      expect(result.totalPropositionsAuto).toBe(1);
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });

  test('remonte un message métier actionnable lors d une décision manuelle rejetée', async () => {
    const originalRequest = httpClient.request;

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async () =>
      new Response(
        JSON.stringify({
          message: "L'opération est déjà rapprochée dans un autre workflow",
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );

    try {
      await expect(
        rapprochementsBancairesService.applyDecision('rap-1', {
          lineId: 'line-1',
          action: 'select_candidate',
          candidateId: 'cand-1',
          justification: 'Tentative manuelle',
        })
      ).rejects.toThrow('déjà rapprochée');
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });

  test('expose les clés React Query invalidées après mutation', async () => {
    expect(getRapprochementInvalidationKeys('rap-1')).toEqual([
      ['rapprochements-bancaires'],
      ['operations-tresorerie'],
      ['tresorerie-supervision'],
      ['rapprochements-bancaires', 'detail', 'rap-1'],
    ]);
  });
});
