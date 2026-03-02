import { User } from '@/types';
import { decodeAccessTokenClaims, isTokenExpired, mapClaimsToUser } from '@/services/auth/auth-session';
import { tokenStorage } from '@/services/auth/token-storage';
import { httpClient, TokenPairResponse } from '@/services/api/http-client';

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
  if (Array.isArray(message) && message.length > 0) {
    const firstMessage = message.find((entry) => typeof entry === 'string');
    if (typeof firstMessage === 'string' && firstMessage.trim().length > 0) {
      return firstMessage;
    }
  }

  if (response.status === 400) {
    return 'Données de connexion invalides. Vérifiez votre email et votre mot de passe.';
  }

  if (response.status === 401) {
    return 'Identifiants invalides.';
  }

  if (response.status === 403) {
    return 'Session invalide, veuillez vous reconnecter.';
  }

  return 'Une erreur de connexion est survenue.';
};

const parseSignupError = async (response: Response): Promise<string> => {
  const payload = await response.json().catch(() => null);
  const message = payload && typeof payload === 'object' ? Reflect.get(payload, 'message') : null;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  if (response.status === 404) {
    return "L'inscription n'est pas disponible actuellement.";
  }

  return "Une erreur d'inscription est survenue.";
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
    try {
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
    } catch {
      return { error: "Impossible de joindre l'API d'authentification. Vérifiez que le backend est démarré." };
    }
  },

  // Inscription via API backend
  async signup(
    email: string,
    password: string,
    nom: string,
    prenom: string,
    clientId: string = 'client-1'
  ): Promise<{ user?: unknown; error?: string }> {
    const response = await httpClient.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, nom, prenom, clientId }),
      authenticated: false,
      retryOnAuthFailure: false
    });

    if (!response.ok) {
      return { error: await parseSignupError(response) };
    }

    const payload = await response.json().catch(() => null);
    return { user: payload };
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
