export type AppEnv = 'development' | 'preview' | 'staging' | 'production';

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

const readExplicitAppEnv = (env: NodeJS.ProcessEnv): AppEnv | null => {
  const explicit = normalizeValue(env.APP_ENV);
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

const readVercelAppEnv = (env: NodeJS.ProcessEnv): AppEnv | null => {
  const vercelEnv = normalizeValue(env.VERCEL_ENV);
  if (vercelEnv === 'preview' || vercelEnv === 'production') {
    return vercelEnv;
  }

  return null;
};

const readNodeAppEnv = (env: NodeJS.ProcessEnv): AppEnv => {
  return normalizeValue(env.NODE_ENV) === 'production' ? 'production' : 'development';
};

const requireTrimmedEnv = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const readIntegerEnv = (env: NodeJS.ProcessEnv, name: string, fallback: number): number => {
  const rawValue = env[name]?.trim();
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer for ${name}: ${rawValue}`);
  }

  return parsed;
};

export interface BackendRuntimeEnv {
  appEnv: AppEnv;
  isDevelopment: boolean;
  isProductionLike: boolean;
  port: number;
  corsOrigins: string[];
}

export interface PostgresRuntimeConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export const resolveAppEnv = (env: NodeJS.ProcessEnv = process.env): AppEnv => {
  return readExplicitAppEnv(env) ?? readVercelAppEnv(env) ?? readNodeAppEnv(env);
};

export const isDevelopmentAppEnv = (appEnv: AppEnv): boolean => appEnv === 'development';

export const parseCorsOrigins = (env: NodeJS.ProcessEnv = process.env): string[] => {
  const rawOrigins = env.CORS_ORIGINS;
  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

export const resolveBackendRuntimeEnv = (env: NodeJS.ProcessEnv = process.env): BackendRuntimeEnv => {
  const appEnv = resolveAppEnv(env);

  return {
    appEnv,
    isDevelopment: isDevelopmentAppEnv(appEnv),
    isProductionLike: appEnv === 'production' || appEnv === 'staging',
    port: readIntegerEnv(env, 'PORT', 3001),
    corsOrigins: parseCorsOrigins(env)
  };
};

export const hasConfiguredPostgresRuntime = (env: NodeJS.ProcessEnv = process.env): boolean => {
  const appEnv = resolveAppEnv(env);
  if (isDevelopmentAppEnv(appEnv)) {
    return true;
  }

  return Boolean(env.POSTGRES_PASSWORD?.trim());
};

export const resolvePostgresRuntimeConfig = (
  env: NodeJS.ProcessEnv = process.env
): PostgresRuntimeConfig => {
  const appEnv = resolveAppEnv(env);
  const defaultPassword = isDevelopmentAppEnv(appEnv) ? 'change-me-local-only' : undefined;

  return {
    host: env.POSTGRES_HOST?.trim() || '127.0.0.1',
    port: readIntegerEnv(env, 'POSTGRES_PORT', 5432),
    database: env.POSTGRES_DB?.trim() || 'agilys',
    user: env.POSTGRES_USER?.trim() || 'agilys_app',
    password: env.POSTGRES_PASSWORD?.trim() || (defaultPassword ?? requireTrimmedEnv(env, 'POSTGRES_PASSWORD'))
  };
};

export const applyResolvedAppEnv = (env: NodeJS.ProcessEnv = process.env): AppEnv => {
  const appEnv = resolveAppEnv(env);
  env.APP_ENV = appEnv;
  return appEnv;
};
