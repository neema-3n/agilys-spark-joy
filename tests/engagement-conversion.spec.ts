import { expect, test } from '@playwright/test';
import { createEngagementFromReservation } from '../src/services/api/engagements.service';
import { httpClient } from '../src/services/api/http-client';

test.describe('engagement conversion api client', () => {
  test('builds reservation -> engagement payload and maps API response', async () => {
    const originalRequest = httpClient.request;
    let capturedPath = '';
    let capturedMethod = '';
    let capturedBody = '';

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async (path, options) => {
      capturedPath = path;
      capturedMethod = String(options?.method ?? '');
      capturedBody = String(options?.body ?? '');

      return new Response(
        JSON.stringify({
          id: 'eng-1',
          numero: 'ENG/EX-2026/001',
          exerciceId: 'ex-1',
          clientId: 'tenant-1',
          reservationCreditId: 'res-1',
          ligneBudgetaireId: 'lb-1',
          objet: 'Objet test',
          montant: 450,
          statut: 'brouillon',
          dateCreation: '2026-01-01',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    };

    try {
      const result = await createEngagementFromReservation(
        'res-1',
        { montant: 450, objet: 'Objet test' },
        'ex-1',
        'tenant-1',
        'user-1'
      );

      expect(capturedPath).toBe('/engagements/from-reservation');
      expect(capturedMethod).toBe('POST');
      expect(capturedBody).toContain('"reservationId":"res-1"');
      expect(capturedBody).toContain('"exerciceId":"ex-1"');
      expect(capturedBody).toContain('"montant":450');
      expect(result.statut).toBe('brouillon');
      expect(result.reservationCreditId).toBe('res-1');
      expect(result.montant).toBe(450);
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });

  test('exposes actionable backend error message on business rejection', async () => {
    const originalRequest = httpClient.request;

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async () =>
      new Response(
        JSON.stringify({
          message: "Le montant de l'engagement dépasse le montant disponible de la réservation"
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    try {
      await expect(
        createEngagementFromReservation('res-1', { montant: 9999 }, 'ex-1', 'tenant-1', 'user-1')
      ).rejects.toThrow("dépasse le montant disponible");
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });
});
