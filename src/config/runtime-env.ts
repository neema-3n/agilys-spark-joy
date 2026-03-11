export type AppEnv = 'development' | 'preview' | 'staging' | 'production';

type PublicEnv = NodeJS.ProcessEnv;

const APP_ENV_VALUES: readonly AppEnv[] = ['development', 'preview', 'staging', 'production'];

const normalizeValue = (value?: string): string | null => {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
};

const toAppEnv = (value?: string): AppEnv | null => {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  if (normalized === 'development' || normalized === 'dev' || normalized === 'local') {
    return 'development';
  }

  if (normalized === 'preview') {
    return 'preview';
  }

  if (normalized === 'staging') {
    return 'staging';
  }

  if (normalized === 'production' || normalized === 'prod') {
    return 'production';
  }

  return null;
};

const readExplicitAppEnv = (env: PublicEnv): AppEnv | null => {
  const explicit = normalizeValue(env.NEXT_PUBLIC_APP_ENV) ?? normalizeValue(env.APP_ENV);
  if (!explicit) {
    return null;
  }

  const appEnv = toAppEnv(explicit);
  if (!appEnv) {
    throw new Error(
      `Unsupported APP_ENV value "${explicit}". Expected one of: ${APP_ENV_VALUES.join(', ')}.`
    );
  }

  return appEnv;
};

const readVercelAppEnv = (env: PublicEnv): AppEnv | null => {
  const vercelEnv = normalizeValue(env.VERCEL_ENV);
  if (vercelEnv === 'preview' || vercelEnv === 'production') {
    return vercelEnv;
  }

  return null;
};

const readNodeAppEnv = (env: PublicEnv): AppEnv => {
  return normalizeValue(env.NODE_ENV) === 'production' ? 'production' : 'development';
};

const readPreferredValue = (...values: Array<string | undefined>): string => {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return '';
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export interface PublicRuntimeEnv {
  appEnv: AppEnv;
  apiBaseUrl: string;
  apiPort: string;
  siteUrl: string;
}

export const resolveAppEnv = (env: PublicEnv = process.env): AppEnv => {
  return readExplicitAppEnv(env) ?? readVercelAppEnv(env) ?? readNodeAppEnv(env);
};

export const isDevelopmentAppEnv = (appEnv: AppEnv): boolean => appEnv === 'development';

export const resolveApiPort = (env: PublicEnv = process.env): string => {
  return readPreferredValue(env.NEXT_PUBLIC_API_PORT, env.VITE_API_PORT, env.PORT) || '3001';
};

export const resolvePublicApiBaseUrl = (env: PublicEnv = process.env): string => {
  const configured = readPreferredValue(env.NEXT_PUBLIC_API_BASE_URL, env.VITE_API_BASE_URL);
  return configured ? trimTrailingSlash(configured) : '';
};

export const resolvePublicSiteUrl = (env: PublicEnv = process.env): string => {
  const configured = readPreferredValue(env.NEXT_PUBLIC_SITE_URL, env.VITE_PUBLIC_SITE_URL);
  return configured ? trimTrailingSlash(configured) : '';
};

export const resolvePublicRuntimeEnv = (env: PublicEnv = process.env): PublicRuntimeEnv => {
  return {
    appEnv: resolveAppEnv(env),
    apiBaseUrl: resolvePublicApiBaseUrl(env),
    apiPort: resolveApiPort(env),
    siteUrl: resolvePublicSiteUrl(env)
  };
};
