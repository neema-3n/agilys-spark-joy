import { applyResolvedAppEnv, resolveAppEnv, resolvePostgresRuntimeConfig } from './runtime-env';

describe('runtime-env', () => {
  it('prioritizes explicit APP_ENV over NODE_ENV', () => {
    expect(resolveAppEnv({ APP_ENV: 'staging', NODE_ENV: 'development' })).toBe('staging');
  });

  it('falls back to development when no explicit environment is configured', () => {
    expect(resolveAppEnv({ NODE_ENV: 'test' })).toBe('development');
  });

  it('rejects unsupported APP_ENV values', () => {
    expect(() => resolveAppEnv({ APP_ENV: 'qa' })).toThrow(
      'Unsupported APP_ENV value "qa". Expected one of: development, preview, staging, production.'
    );
  });

  it('requires an explicit postgres password outside development', () => {
    expect(() =>
      resolvePostgresRuntimeConfig({
        APP_ENV: 'staging',
        POSTGRES_DB: 'agilys_staging',
        POSTGRES_USER: 'agilys_app'
      })
    ).toThrow('Missing required environment variable: POSTGRES_PASSWORD');
  });

  it('normalizes APP_ENV into process.env for downstream services', () => {
    const env = { VERCEL_ENV: 'preview' } as NodeJS.ProcessEnv;
    expect(applyResolvedAppEnv(env)).toBe('preview');
    expect(env.APP_ENV).toBe('preview');
  });
});
