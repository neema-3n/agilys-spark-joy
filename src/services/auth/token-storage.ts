export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const ACCESS_TOKEN_KEY = 'agilys.auth.accessToken';
const REFRESH_TOKEN_KEY = 'agilys.auth.refreshToken';

class MemoryStorage implements StorageLike {
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

const memoryStorage = new MemoryStorage();

const resolveStorage = (storage?: StorageLike): StorageLike => {
  if (storage) {
    return storage;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  return memoryStorage;
};

export const createTokenStorage = (storage?: StorageLike) => {
  const effectiveStorage = resolveStorage(storage);

  return {
    read(): AuthTokens | null {
      const accessToken = effectiveStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = effectiveStorage.getItem(REFRESH_TOKEN_KEY);

      if (!accessToken || !refreshToken) {
        return null;
      }

      return { accessToken, refreshToken };
    },

    write(tokens: AuthTokens): void {
      effectiveStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      effectiveStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    },

    clear(): void {
      effectiveStorage.removeItem(ACCESS_TOKEN_KEY);
      effectiveStorage.removeItem(REFRESH_TOKEN_KEY);
    },

    getAccessToken(): string | null {
      return effectiveStorage.getItem(ACCESS_TOKEN_KEY);
    },

    getRefreshToken(): string | null {
      return effectiveStorage.getItem(REFRESH_TOKEN_KEY);
    }
  };
};

export type TokenStorage = ReturnType<typeof createTokenStorage>;

export const tokenStorage = createTokenStorage();
