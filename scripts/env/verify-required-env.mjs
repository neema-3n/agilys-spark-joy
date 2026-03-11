import {
  getBackendRequiredVars,
  getFrontendRequiredVars,
  parseArgs,
  parseServices,
  resolveEnvironmentConfig,
} from './_environment.mjs';

const options = parseArgs(process.argv.slice(2));
const environmentConfig = resolveEnvironmentConfig(options.environment ?? options.env ?? 'preview');
const services = parseServices(options.services);
const allowMissingBackendHook = options['allow-missing-backend-hook'] === 'true';

const missing = [];

if (services.includes('frontend')) {
  for (const variableName of getFrontendRequiredVars()) {
    if (!process.env[variableName]?.trim()) {
      missing.push(variableName);
    }
  }
}

if (services.includes('backend')) {
  for (const variableName of getBackendRequiredVars(environmentConfig)) {
    if (!process.env[variableName]?.trim() && !allowMissingBackendHook) {
      missing.push(variableName);
    }
  }
}

if (missing.length > 0) {
  process.stderr.write(
    `Missing required environment variables for ${environmentConfig.name}: ${missing.join(', ')}\n`
  );
  process.exit(1);
}

process.stdout.write(
  `Environment verification passed for ${environmentConfig.name} (${services.join(', ')}).\n`
);
