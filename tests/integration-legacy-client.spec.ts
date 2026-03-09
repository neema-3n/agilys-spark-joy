import { expect, test } from '@playwright/test';
import { integrationLegacyService } from '../src/services/api/integration-legacy.service';
import { httpClient } from '../src/services/api/http-client';

test.describe('integration legacy api client', () => {
  test('compose les query params de supervision avec filtres et pagination', async () => {
    const originalRequest = httpClient.request;
    let capturedPath = '';

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async (path) => {
      capturedPath = path;
      return new Response(
        JSON.stringify({
          items: [],
          pagination: { page: 2, pageSize: 25, total: 0, totalPages: 1 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    try {
      await integrationLegacyService.getSupervision('tenant-1', '11111111-1111-1111-1111-111111111111', {
        status: 'failed',
        severity: 'error',
        correlationId: 'corr-ops-001',
        fromDate: '2026-03-01',
        toDate: '2026-03-09',
        page: 2,
        pageSize: 25,
      });

      expect(capturedPath).toContain('/integration-legacy/supervision?');
      expect(capturedPath).toContain('exerciceId=11111111-1111-1111-1111-111111111111');
      expect(capturedPath).toContain('status=failed');
      expect(capturedPath).toContain('severity=error');
      expect(capturedPath).toContain('correlationId=corr-ops-001');
      expect(capturedPath).toContain('fromDate=2026-03-01');
      expect(capturedPath).toContain('toDate=2026-03-09');
      expect(capturedPath).toContain('page=2');
      expect(capturedPath).toContain('pageSize=25');
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });

  test('retry manuel remonte le statut de dispatch et event mis a jour', async () => {
    const originalRequest = httpClient.request;
    let capturedPath = '';
    let capturedBody: Record<string, unknown> | null = null;

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async (path, options) => {
      capturedPath = path;
      capturedBody = typeof options?.body === 'string' ? (JSON.parse(options.body) as Record<string, unknown>) : null;

      return new Response(
        JSON.stringify({
          dispatchedStatus: 'acked',
          event: {
            id: 'evt-1',
            direction: 'outgoing',
            status: 'acked',
            severity: 'info',
            tenantId: 'tenant-1',
            exerciceId: '11111111-1111-1111-1111-111111111111',
            eventType: 'paiement.executed',
            correlationId: 'corr-1',
            sourceType: 'paiement',
            sourceId: 'pay-1',
            payload: { amount: 1500 },
            schemaVersion: '1.0.0',
            occurredAt: '2026-03-09T10:00:00.000Z',
            attemptCount: 2,
            maxAttempts: 5,
            createdBy: 'user-1',
            updatedBy: 'user-1',
            createdAt: '2026-03-09T10:00:00.000Z',
            updatedAt: '2026-03-09T10:02:00.000Z',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    try {
      const result = await integrationLegacyService.retry('tenant-1', {
        eventId: 'evt-1',
        exerciceId: '11111111-1111-1111-1111-111111111111',
        reasonCode: 'MANUAL_RETRY',
        reasonMessage: 'Relance operateur',
      });

      expect(capturedPath).toBe('/integration-legacy/events/evt-1/retry');
      expect(capturedBody).toMatchObject({
        exerciceId: '11111111-1111-1111-1111-111111111111',
        reasonCode: 'MANUAL_RETRY',
        reasonMessage: 'Relance operateur',
      });
      expect(result.dispatchedStatus).toBe('acked');
      expect(result.event.status).toBe('acked');
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });

  test('retry manuel remonte un message metier actionnable en cas echec', async () => {
    const originalRequest = httpClient.request;

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async () =>
      new Response(
        JSON.stringify({
          message: 'Retry non autorise pour le statut processed. Action: verifier le correlationId et choisir un event failed/dead_letter.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );

    try {
      await expect(
        integrationLegacyService.retry('tenant-1', {
          eventId: 'evt-processed',
          exerciceId: '11111111-1111-1111-1111-111111111111',
        })
      ).rejects.toThrow('Retry non autorise');
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });

  test('enqueue sortant envoie les champs canonical obligatoires', async () => {
    const originalRequest = httpClient.request;
    let capturedBody: Record<string, unknown> | null = null;

    (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = async (_path, options) => {
      capturedBody = typeof options?.body === 'string' ? (JSON.parse(options.body) as Record<string, unknown>) : null;

      return new Response(
        JSON.stringify({
          id: 'evt-queued',
          direction: 'outgoing',
          status: 'queued',
          severity: 'info',
          tenantId: 'tenant-1',
          exerciceId: '11111111-1111-1111-1111-111111111111',
          eventType: 'engagement.created',
          correlationId: 'corr-generated',
          sourceType: 'engagement',
          sourceId: 'eng-1',
          payload: { montant: 900 },
          schemaVersion: '1.0.0',
          occurredAt: '2026-03-09T11:00:00.000Z',
          attemptCount: 0,
          maxAttempts: 5,
          createdBy: 'user-1',
          updatedBy: 'user-1',
          createdAt: '2026-03-09T11:00:00.000Z',
          updatedAt: '2026-03-09T11:00:00.000Z',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    try {
      await integrationLegacyService.createOutgoing('tenant-1', {
        exerciceId: '11111111-1111-1111-1111-111111111111',
        eventType: 'engagement.created',
        sourceType: 'engagement',
        sourceId: 'eng-1',
        occurredAt: '2026-03-09T11:00:00.000Z',
        payload: { montant: 900 },
      });

      expect(capturedBody).toMatchObject({
        exerciceId: '11111111-1111-1111-1111-111111111111',
        eventType: 'engagement.created',
        sourceType: 'engagement',
        sourceId: 'eng-1',
        occurredAt: '2026-03-09T11:00:00.000Z',
      });
      expect(capturedBody).toHaveProperty('payload');
    } finally {
      (httpClient as typeof httpClient & { request: typeof httpClient.request }).request = originalRequest;
    }
  });
});
