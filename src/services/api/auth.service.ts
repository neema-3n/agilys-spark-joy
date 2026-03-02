import { User } from '@/types';
import { decodeAccessTokenClaims, isTokenExpired, mapClaimsToUser } from '@/services/auth/auth-session';
import { tokenStorage } from '@/services/auth/token-storage';
import { httpClient, TokenPairResponse } from '@/services/api/http-client';
import { supabase } from '@/integrations/supabase/client';

export interface AuthSession {
  user: User;
  accessTokenExpiresAt: number | null;
}

const parseAuthError = async (response: Response): Promise<string> => {
  const payload = await response.json().catch(() => null);
  const message = payload && typeof payload === 'object' ? Reflect.get(payload, 'message') : null;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  if (response.status === 401) {
    return 'Identifiants invalides.';
  }

  if (response.status === 403) {
    return 'Session invalide, veuillez vous reconnecter.';
  }

  return 'Une erreur de connexion est survenue.';
};

const buildSessionFromAccessToken = (accessToken: string): AuthSession | null => {
  const claims = decodeAccessTokenClaims(accessToken);
  if (!claims) {
    return null;
  }

  return {
    user: mapClaimsToUser(claims),
    accessTokenExpiresAt: claims.exp ? claims.exp * 1000 : null
  };
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

const notifyAndClear = () => {
  tokenStorage.clear();
};

export const authService = {
  // Connexion
  async login(email: string, password: string): Promise<{ user?: User; error?: string }> {
    const response = await httpClient.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      authenticated: false,
      retryOnAuthFailure: false
    });

    if (!response.ok) {
      return { error: await parseAuthError(response) };
    }

    const tokenPair = await parseTokenPair(response);
    if (!tokenPair) {
      return { error: 'Réponse de connexion invalide.' };
    }

    tokenStorage.write(tokenPair);
    const session = buildSessionFromAccessToken(tokenPair.accessToken);

    if (!session) {
      notifyAndClear();
      return { error: 'Session invalide reçue depuis le serveur.' };
    }

    return { user: session.user };
  },

  // Inscription conservee sur flux legacy pendant la migration auth frontend
  async signup(
    email: string,
    password: string,
    nom: string,
    prenom: string,
    clientId: string = 'client-1'
  ): Promise<{ user?: unknown; error?: string }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom,
          prenom,
          client_id: clientId
        },
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      return { error: error.message };
    }

    return { user: data.user };
  },

  // Déconnexion
  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();

    if (refreshToken) {
      await httpClient.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        authenticated: false,
        retryOnAuthFailure: false
      }).catch(() => null);
    }

    notifyAndClear();
  },

  async hydrateSession(): Promise<AuthSession | null> {
    const tokens = tokenStorage.read();
    if (!tokens) {
      return null;
    }

    if (!isTokenExpired(tokens.accessToken)) {
      return buildSessionFromAccessToken(tokens.accessToken);
    }

    const refreshedAccessToken = await httpClient.refresh();
    if (!refreshedAccessToken) {
      notifyAndClear();
      return null;
    }

    return buildSessionFromAccessToken(refreshedAccessToken);
  },

  async ensureValidSession(): Promise<AuthSession | null> {
    const tokens = tokenStorage.read();
    if (!tokens) {
      return null;
    }

    if (!isTokenExpired(tokens.accessToken)) {
      return buildSessionFromAccessToken(tokens.accessToken);
    }

    const refreshedAccessToken = await httpClient.refresh();
    if (!refreshedAccessToken) {
      notifyAndClear();
      return null;
    }

    return buildSessionFromAccessToken(refreshedAccessToken);
  },

  onAuthFailure(handler: ((preservedPath?: string) => void) | null) {
    httpClient.setAuthFailureHandler(handler);
  }
};
