import { test, expect } from '@playwright/test';
import { createTokenStorage, StorageLike } from '../src/services/auth/token-storage';
import { createHttpClient } from '../src/services/api/http-client';
import { decodeAccessTokenClaims, isTokenExpired } from '../src/services/auth/auth-session';

class MockStorage implements StorageLike {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
};

test.beforeAll(() => {
  if (typeof globalThis.atob !== 'function') {
    globalThis.atob = (value: string) => Buffer.from(value, 'base64').toString('binary');
  }
});

test('token storage write/read/clear', async () => {
  const storage = createTokenStorage(new MockStorage());

  storage.write({ accessToken: 'access', refreshToken: 'refresh' });
  expect(storage.read()).toEqual({ accessToken: 'access', refreshToken: 'refresh' });

  storage.clear();
  expect(storage.read()).toBeNull();
});

test('http client retries once after refresh success', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'old-access', refreshToken: 'refresh-token' });

  let protectedCallCount = 0;
  let refreshCallCount = 0;

  const fetchImpl: typeof fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();

    if (requestUrl.endsWith('/auth/refresh')) {
      refreshCallCount += 1;
      return new Response(
        JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (requestUrl.endsWith('/secure')) {
      protectedCallCount += 1;
      if (protectedCallCount === 1) {
        return new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer new-access');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    storage
  });

  const response = await client.request('/secure', { method: 'GET' });

  expect(response.status).toBe(200);
  expect(protectedCallCount).toBe(2);
  expect(refreshCallCount).toBe(1);
  expect(storage.read()).toEqual({
    accessToken: 'new-access',
    refreshToken: 'new-refresh'
  });
});

test('http client clears session and notifies when refresh fails', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'expired-access', refreshToken: 'expired-refresh' });

  const fetchImpl: typeof fetch = (async (url: RequestInfo | URL) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();

    if (requestUrl.endsWith('/auth/refresh')) {
      return new Response(JSON.stringify({ message: 'invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (requestUrl.endsWith('/secure')) {
      return new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  let authFailureNotified = false;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    storage
  });

  client.setAuthFailureHandler(() => {
    authFailureNotified = true;
  });

  const response = await client.request('/secure', { method: 'GET' });

  expect(response.status).toBe(401);
  expect(authFailureNotified).toBeTruthy();
  expect(storage.read()).toBeNull();
});

test('JWT claims parsing and expiry detection', async () => {
  const validToken = makeJwt({
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['USER'],
    exp: Math.floor(Date.now() / 1000) + 120
  });

  const expiredToken = makeJwt({
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['USER'],
    exp: Math.floor(Date.now() / 1000) - 120
  });

  expect(decodeAccessTokenClaims(validToken)).toMatchObject({
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['USER']
  });

  expect(isTokenExpired(validToken)).toBeFalsy();
  expect(isTokenExpired(expiredToken)).toBeTruthy();
});
