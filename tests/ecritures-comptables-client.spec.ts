import { expect, test } from '@playwright/test';
import { ecrituresComptablesService } from '../src/services/api/ecritures-comptables.service';
import { httpClient } from '../src/services/api/http-client';

test.describe('ecritures comptables api client', () => {
  test('mappe explicitement le resultat idempotent du moteur comptable', async () => {
    const originalRequest = httpClient.request;

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async () =>
      new Response(
        JSON.stringify({
          success: true,
          status: 'already_generated',
          code: 'ECRITURES_DEJA_PRESENTES',
          message: 'Les ecritures comptables existent deja pour cette source et cette configuration.',
          ecritures_count: 2
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    try {
      const result = await ecrituresComptablesService.generateForOperation('depense', 'dep-1', 'tenant-1', 'ex-1');

      expect(result.success).toBe(true);
      expect(result.status).toBe('already_generated');
      expect(result.code).toBe('ECRITURES_DEJA_PRESENTES');
      expect(result.ecrituresCount).toBe(2);
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });

  test('mappe les erreurs metier actionnables du backend', async () => {
    const originalRequest = httpClient.request;

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async () =>
      new Response(
        JSON.stringify({
          success: false,
          status: 'error',
          code: 'REGLE_COMPTABLE_MANQUANTE',
          message: 'Aucune regle comptable publiee ne couvre cette operation pour la date et le contexte fournis.',
          ecritures_count: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    try {
      const result = await ecrituresComptablesService.generateForOperation('paiement', 'pay-1', 'tenant-1', 'ex-1');

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.message).toContain('Aucune regle comptable');
      expect(result.ecrituresCount).toBe(0);
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });
});
