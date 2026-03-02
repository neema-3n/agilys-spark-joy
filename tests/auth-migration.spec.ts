import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { createTokenStorage, StorageLike } from '../src/services/auth/token-storage';
import { createHttpClient } from '../src/services/api/http-client';
import { decodeAccessTokenClaims, isTokenExpired } from '../src/services/auth/auth-session';
import { buildRequestedPath, resolveLoginRedirect } from '../src/services/auth/auth-routing';
import { authService } from '../src/services/api/auth.service';
import { httpClient } from '../src/services/api/http-client';
import { tokenStorage } from '../src/services/auth/token-storage';

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

const UI_BASE_URL = 'http://127.0.0.1:45173';
const UI_SERVER_START_TIMEOUT_MS = 60_000;
let uiServerProcess: ChildProcess | null = null;

const waitForUiServer = async (timeoutMs: number): Promise<void> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(UI_BASE_URL);
      const html = await response.text();
      if (response.ok && html.includes('id="root"')) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`UI server did not start within ${timeoutMs}ms`);
};

test.beforeAll(() => {
  if (typeof globalThis.atob !== 'function') {
    globalThis.atob = (value: string) => Buffer.from(value, 'base64').toString('binary');
  }
});

test.describe('auth ui routing flows', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(async () => {
    test.setTimeout(120_000);

    uiServerProcess = spawn(
      'pnpm',
      ['exec', 'vite', '--host', '127.0.0.1', '--port', '45173'],
      {
        cwd: '/Volumes/mySD1.5/projects/agilys-spark-joy',
        stdio: 'ignore'
      }
    );

    await waitForUiServer(UI_SERVER_START_TIMEOUT_MS);
  });

  test.afterAll(() => {
    if (uiServerProcess) {
      uiServerProcess.kill('SIGTERM');
      uiServerProcess = null;
    }
  });

  test('protected route redirects to login and successful login returns to requested route', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-7',
      tenantId: 'tenant-1',
      roles: ['admin_client'],
      email: 'user@agilys.local',
      nom: 'Test',
      prenom: 'User',
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken,
          refreshToken: 'refresh-token'
        })
      });
    });

    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto(`${UI_BASE_URL}/app/dashboard?fromSpec=1`);
    await page.waitForURL('**/auth/login', { timeout: 20_000 });

    await page.getByLabel('Email').fill('user@agilys.local');
    await page.getByLabel('Mot de passe').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/app\/dashboard\?fromSpec=1$/);
  });

  test('logout redirects to login and clears local tokens', async ({ page }) => {
    const accessToken = makeJwt({
      sub: 'user-8',
      tenantId: 'tenant-1',
      roles: ['admin_client'],
      email: 'logout@agilys.local',
      nom: 'Logout',
      prenom: 'User',
      exp: Math.floor(Date.now() / 1000) + 600
    });

    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken,
          refreshToken: 'refresh-token-logout'
        })
      });
    });

    await page.route('**/auth/logout', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.fulfill({ status: 204 });
    });

    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto(`${UI_BASE_URL}/auth/login?from=%2Fapp%2Fdashboard`);
    await page.getByLabel('Email').fill('logout@agilys.local');
    await page.getByLabel('Mot de passe').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/app\/dashboard$/);

    await page.getByRole('button', { name: /User Logout/i }).click();
    await page.getByRole('menuitem', { name: 'Déconnexion' }).click();

    await page.waitForURL('**/auth/login', { timeout: 2_000 });
    await expect(page).toHaveURL(/\/auth\/login$/);

    const tokens = await page.evaluate(() => ({
      accessToken: window.localStorage.getItem('agilys.auth.accessToken'),
      refreshToken: window.localStorage.getItem('agilys.auth.refreshToken')
    }));
    expect(tokens.accessToken).toBeNull();
    expect(tokens.refreshToken).toBeNull();
  });
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

test('http client clears session and notifies when refresh network call throws', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'expired-access', refreshToken: 'expired-refresh' });

  const fetchImpl: typeof fetch = (async (url: RequestInfo | URL) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();

    if (requestUrl.endsWith('/auth/refresh')) {
      throw new Error('network down');
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

test('http client preserves requested path on auth failure redirect flow', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'expired-access', refreshToken: 'expired-refresh' });

  const originalWindow = (globalThis as { window?: unknown }).window;
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: {
        pathname: '/app/engagements',
        search: '?status=open',
        hash: '#details'
      }
    },
    configurable: true
  });

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

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    storage
  });

  let preservedPath: string | undefined;
  client.setAuthFailureHandler((path) => {
    preservedPath = path;
  });

  await client.request('/secure', { method: 'GET' });

  expect(preservedPath).toBe('/app/engagements?status=open#details');
  expect(storage.read()).toBeNull();

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
  } else {
    Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
  }
});

test('http client clears session when retried request is still unauthorized', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'expired-access', refreshToken: 'refresh-token' });

  let refreshCallCount = 0;
  let authFailureNotified = false;

  const fetchImpl: typeof fetch = (async (url: RequestInfo | URL) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();

    if (requestUrl.endsWith('/auth/refresh')) {
      refreshCallCount += 1;
      return new Response(JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (requestUrl.endsWith('/secure')) {
      return new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

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
  expect(refreshCallCount).toBe(1);
  expect(authFailureNotified).toBeTruthy();
  expect(storage.read()).toBeNull();
});

test('http client returns normalized 503 response when request network call throws', async () => {
  const storage = createTokenStorage(new MockStorage());
  storage.write({ accessToken: 'access-token', refreshToken: 'refresh-token' });

  const fetchImpl: typeof fetch = (async () => {
    throw new Error('network down');
  }) as typeof fetch;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    storage
  });

  const response = await client.request('/secure', { method: 'GET' });
  const payload = await response.json();

  expect(response.status).toBe(503);
  expect(payload).toMatchObject({ message: 'Network error' });
});

test('JWT claims parsing and expiry detection', async () => {
  const validToken = makeJwt({
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin_client'],
    exp: Math.floor(Date.now() / 1000) + 120
  });

  const expiredToken = makeJwt({
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin_client'],
    exp: Math.floor(Date.now() / 1000) - 120
  });

  expect(decodeAccessTokenClaims(validToken)).toMatchObject({
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin_client']
  });

  expect(isTokenExpired(validToken)).toBeFalsy();
  expect(isTokenExpired(expiredToken)).toBeTruthy();
});

test('JWT claims parsing supports UTF-8 payload values', async () => {
  const utf8Token = makeJwt({
    sub: 'user-2',
    tenantId: 'tenant-2',
    roles: ['admin_client'],
    nom: 'Élodie',
    prenom: 'João',
    exp: Math.floor(Date.now() / 1000) + 120
  });

  expect(decodeAccessTokenClaims(utf8Token)).toMatchObject({
    sub: 'user-2',
    tenantId: 'tenant-2',
    roles: ['admin_client'],
    nom: 'Élodie',
    prenom: 'João'
  });
});

test('resolve post-login redirect from state, query then fallback', async () => {
  expect(resolveLoginRedirect({ stateFrom: '/app/depenses?tab=all' })).toBe('/app/depenses?tab=all');
  expect(resolveLoginRedirect({ search: '?from=%2Fapp%2Fengagements%3Fq%3Dopen' })).toBe('/app/engagements?q=open');
  expect(resolveLoginRedirect({ stateFrom: '/auth/login', fallback: '/app/dashboard' })).toBe('/app/dashboard');
  expect(resolveLoginRedirect({ search: '?from=https://malicious.example', fallback: '/app/dashboard' })).toBe('/app/dashboard');
});

test('build protected-route from path preserves search and hash', async () => {
  expect(buildRequestedPath('/app/factures', '?status=unpaid', '#section-2')).toBe('/app/factures?status=unpaid#section-2');
});

test('logout calls /auth/logout and clears token storage', async () => {
  tokenStorage.write({ accessToken: 'access-token', refreshToken: 'refresh-token' });

  const originalRequest = httpClient.request;
  let logoutCalled = false;

  httpClient.request = (async (path: string) => {
    if (path === '/auth/logout') {
      logoutCalled = true;
      return new Response(null, { status: 204 });
    }
    return new Response('{}', { status: 404 });
  }) as typeof httpClient.request;

  try {
    await authService.logout();
  } finally {
    httpClient.request = originalRequest;
  }

  expect(logoutCalled).toBeTruthy();
  expect(tokenStorage.read()).toBeNull();
});

test('signup returns actionable error when network call fails', async () => {
  const originalRequest = httpClient.request;

  httpClient.request = (async () => {
    throw new Error('network down');
  }) as typeof httpClient.request;

  try {
    const result = await authService.signup('user@example.com', 'ChangeMe123!', 'Nom', 'Prenom');
    expect(result.error).toContain("Impossible de joindre l'API d'inscription");
  } finally {
    httpClient.request = originalRequest;
  }
});

test('signup returns first backend validation error from message array', async () => {
  const originalRequest = httpClient.request;

  httpClient.request = (async () => {
    return new Response(
      JSON.stringify({ message: ['Le mot de passe est trop faible', 'Autre erreur'] }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof httpClient.request;

  try {
    const result = await authService.signup('user@example.com', 'weak', 'Nom', 'Prenom');
    expect(result.error).toBe('Le mot de passe est trop faible');
  } finally {
    httpClient.request = originalRequest;
  }
});

test('signup does not send implicit clientId when not provided', async () => {
  const originalRequest = httpClient.request;
  let requestBody: Record<string, unknown> | null = null;

  httpClient.request = (async (_path: string, options?: RequestInit) => {
    if (typeof options?.body === 'string') {
      requestBody = JSON.parse(options.body) as Record<string, unknown>;
    }

    return new Response(JSON.stringify({ id: 'user-123' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof httpClient.request;

  try {
    await authService.signup('user@example.com', 'ChangeMe123!', 'Nom', 'Prenom');
    expect(requestBody).toBeTruthy();
    expect(requestBody).not.toHaveProperty('clientId');
  } finally {
    httpClient.request = originalRequest;
  }
});

test('hydrate session returns null when refresh throws and clears storage', async () => {
  const originalRefresh = httpClient.refresh;
  tokenStorage.write({ accessToken: makeJwt({
    sub: 'user-3',
    tenantId: 'tenant-1',
    roles: ['admin_client'],
    exp: Math.floor(Date.now() / 1000) - 120
  }), refreshToken: 'refresh-token' });

  httpClient.refresh = (async () => {
    throw new Error('network down');
  }) as typeof httpClient.refresh;

  try {
    const result = await authService.hydrateSession();
    expect(result).toBeNull();
    expect(tokenStorage.read()).toBeNull();
  } finally {
    httpClient.refresh = originalRefresh;
  }
});
