const allowedEnvironments = ['local', 'preview', 'staging', 'production'];

const environmentMap = {
  local: {
    appEnv: 'development',
    vercelEnvironment: 'development',
    vercelTarget: null,
    backendHookVar: null,
  },
  preview: {
    appEnv: 'preview',
    vercelEnvironment: 'preview',
    vercelTarget: null,
    backendHookVar: 'BACKEND_PREVIEW_DEPLOY_HOOK_URL',
  },
  staging: {
    appEnv: 'staging',
    vercelEnvironment: 'preview',
    vercelTarget: 'staging',
    backendHookVar: 'BACKEND_STAGING_DEPLOY_HOOK_URL',
  },
  production: {
    appEnv: 'production',
    vercelEnvironment: 'production',
    vercelTarget: 'production',
    backendHookVar: 'BACKEND_PRODUCTION_DEPLOY_HOOK_URL',
  },
};

export const parseArgs = (argv) => {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = 'true';
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
};

export const resolveEnvironmentConfig = (environmentName) => {
  const normalized = environmentName?.trim().toLowerCase();
  if (!normalized || !environmentMap[normalized]) {
    throw new Error(
      `Unsupported environment "${environmentName ?? ''}". Expected one of: ${allowedEnvironments.join(', ')}.`
    );
  }

  return {
    name: normalized,
    ...environmentMap[normalized],
  };
};

export const parseServices = (value) => {
  if (!value) {
    return ['frontend'];
  }

  const services = value
    .split(',')
    .map((service) => service.trim().toLowerCase())
    .filter(Boolean);

  if (services.length === 0) {
    return ['frontend'];
  }

  for (const service of services) {
    if (service !== 'frontend' && service !== 'backend') {
      throw new Error(`Unsupported service "${service}". Expected frontend and/or backend.`);
    }
  }

  return services;
};

export const getFrontendRequiredVars = () => [
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
];

export const getBackendRequiredVars = (environmentConfig) => {
  return environmentConfig.backendHookVar ? [environmentConfig.backendHookVar] : [];
};

export const maskValue = (value) => {
  if (!value) {
    return 'missing';
  }

  if (value.length <= 6) {
    return 'set';
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};
