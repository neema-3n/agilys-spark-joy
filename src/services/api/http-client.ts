import { tokenStorage, TokenStorage } from '@/services/auth/token-storage';

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

export interface HttpClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  storage?: TokenStorage;
}

export interface RequestOptions extends RequestInit {
  authenticated?: boolean;
  retryOnAuthFailure?: boolean;
}

const resolveBaseUrl = (baseUrl?: string): string => {
  const fromEnv = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';
  const resolved = baseUrl ?? fromEnv ?? '';
  return resolved.endsWith('/') ? resolved.slice(0, -1) : resolved;
};

export const createHttpClient = (options?: HttpClientOptions) => {
  const baseUrl = resolveBaseUrl(options?.baseUrl);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const storage = options?.storage ?? tokenStorage;

  let refreshPromise: Promise<string | null> | null = null;
  let onAuthFailure: ((preservedPath?: string) => void) | null = null;

  const makeUrl = (path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  };

  const applyBodyHeader = (headers: Headers, body: RequestInit['body']) => {
    if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  };

  const notifyAuthFailure = () => {
    const preservedPath = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : undefined;

    onAuthFailure?.(preservedPath);
  };

  const parseTokenPair = async (response: Response): Promise<TokenPairResponse | null> => {
    const payload = await response.json().catch(() => null);

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const accessToken = Reflect.get(payload, 'accessToken');
    const refreshToken = Reflect.get(payload, 'refreshToken');

    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      return null;
    }

    return { accessToken, refreshToken };
  };

  const refresh = async (): Promise<string | null> => {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      const refreshToken = storage.getRefreshToken();
      if (!refreshToken) {
        storage.clear();
        notifyAuthFailure();
        return null;
      }

      const response = await fetchImpl(makeUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        storage.clear();
        notifyAuthFailure();
        return null;
      }

      const tokenPair = await parseTokenPair(response);
      if (!tokenPair) {
        storage.clear();
        notifyAuthFailure();
        return null;
      }

      storage.write(tokenPair);
      return tokenPair.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  };

  const request = async (path: string, options?: RequestOptions): Promise<Response> => {
    const authenticated = options?.authenticated ?? true;
    const retryOnAuthFailure = options?.retryOnAuthFailure ?? true;
    const { authenticated: _authenticated, retryOnAuthFailure: _retry, ...fetchOptions } = options ?? {};

    const headers = new Headers(fetchOptions.headers ?? {});
    const body = fetchOptions.body;

    if (authenticated) {
      const accessToken = storage.getAccessToken();
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
    }

    applyBodyHeader(headers, body);

    const response = await fetchImpl(makeUrl(path), {
      ...fetchOptions,
      headers
    });

    const shouldRetry =
      authenticated &&
      retryOnAuthFailure &&
      response.status === 401 &&
      !path.includes('/auth/refresh');

    if (!shouldRetry) {
      return response;
    }

    const nextAccessToken = await refresh();
    if (!nextAccessToken) {
      return response;
    }

    const retryHeaders = new Headers(fetchOptions.headers ?? {});
    retryHeaders.set('Authorization', `Bearer ${nextAccessToken}`);
    applyBodyHeader(retryHeaders, body);

    const retriedResponse = await fetchImpl(makeUrl(path), {
      ...fetchOptions,
      headers: retryHeaders
    });

    if (retriedResponse.status === 401) {
      storage.clear();
      notifyAuthFailure();
    }

    return retriedResponse;
  };

  return {
    request,
    refresh,
    setAuthFailureHandler(handler: ((preservedPath?: string) => void) | null) {
      onAuthFailure = handler;
    }
  };
};

export const httpClient = createHttpClient();
