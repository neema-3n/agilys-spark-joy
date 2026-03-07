import { expect, test } from '@playwright/test';
import { httpClient } from '../src/services/api/http-client';
import { ApiError, requestJson } from '../src/services/api/api-utils';
import { buildCashRiskBlockedInfo, toCashRiskBlockedInfo } from '../src/lib/cash-risk-ui';
import type { CashRiskDecision } from '../src/types/cash-risk.types';

const decisionFixture: CashRiskDecision = {
  riskLevel: 'high',
  riskScore: 82.5,
  decision: 'block',
  reasons: [
    'Gap de trésorerie projeté positif après transition.',
    'Des opérations bancaires restent non rapprochées.',
  ],
  snapshot: {
    transition: 'paiement:execute',
    availableCash: 1000,
    projectedExposure: 1400,
    projectedGap: 400,
    remainingEngagements: 3,
    outstandingDepenses: 2,
    nonReconciledOperations: 5,
  },
};

test.describe('cash risk blocked mapping', () => {
  test('préserve le payload structuré CASH_RISK_BLOCKED dans requestJson', async () => {
    const originalRequest = httpClient.request;

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async () =>
      new Response(
        JSON.stringify({
          statusCode: 400,
          error: 'CashRiskBlocked',
          code: 'CASH_RISK_BLOCKED',
          message: 'Transition bloquée: Gap de trésorerie projeté positif après transition.',
          riskDecision: decisionFixture,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );

    try {
      await requestJson('/paiements/pay-1/executer', { method: 'PATCH', body: JSON.stringify({}) }, "Erreur d'exécution");
      throw new Error('requestJson aurait dû lancer une erreur');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.code).toBe('CASH_RISK_BLOCKED');
      expect(apiError.statusCode).toBe(400);
      expect(apiError.riskDecision).toEqual(decisionFixture);

      const mapped = toCashRiskBlockedInfo(apiError);
      expect(mapped?.title).toContain('Action bloquée');
      expect(mapped?.summary).toContain('trésorerie projetée devient insuffisante');
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });

  test('dérive des remédiations déterministes et contextualisées par transition', async () => {
    const info = buildCashRiskBlockedInfo(decisionFixture);

    expect(info.transitionLabel).toBe('Exécution de paiement');
    expect(info.riskLevelLabel).toBe('Élevé');
    expect(info.remediations).toContain('Décaler le paiement, fractionner la sortie de cash ou privilégier une facture prioritaire.');
    expect(info.remediations).toContain(
      'Traiter les engagements déjà ouverts pour réduire le reste engagé avant de lancer une nouvelle transition.'
    );
    expect(info.remediations).toContain(
      'Préparer une demande d\'exception gouvernée si aucune correction immédiate n\'est possible.'
    );
  });
});
