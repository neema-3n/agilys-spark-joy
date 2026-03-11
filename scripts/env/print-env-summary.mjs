import {
  getBackendRequiredVars,
  getFrontendRequiredVars,
  maskValue,
  parseArgs,
  parseServices,
  resolveEnvironmentConfig,
} from './_environment.mjs';

const options = parseArgs(process.argv.slice(2));
const environmentConfig = resolveEnvironmentConfig(options.environment ?? options.env ?? 'preview');
const services = parseServices(options.services);

const rows = [
  ['environment', environmentConfig.name],
  ['appEnv', environmentConfig.appEnv],
  ['vercelEnvironment', environmentConfig.vercelEnvironment],
  ['vercelTarget', environmentConfig.vercelTarget ?? 'preview-default'],
];

if (services.includes('frontend')) {
  for (const variableName of getFrontendRequiredVars()) {
    rows.push([variableName, maskValue(process.env[variableName])]);
  }
}

if (services.includes('backend')) {
  for (const variableName of getBackendRequiredVars(environmentConfig)) {
    rows.push([variableName, maskValue(process.env[variableName])]);
  }
}

for (const [key, value] of rows) {
  process.stdout.write(`${key}=${value}\n`);
}
