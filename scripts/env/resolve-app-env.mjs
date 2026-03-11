import { parseArgs, resolveEnvironmentConfig } from './_environment.mjs';

const options = parseArgs(process.argv.slice(2));
const environmentName = options.environment ?? options.env ?? 'local';
const format = (options.format ?? 'json').toLowerCase();

const config = resolveEnvironmentConfig(environmentName);

if (format === 'shell') {
  process.stdout.write(`ENVIRONMENT_NAME=${config.name}\n`);
  process.stdout.write(`APP_ENV=${config.appEnv}\n`);
  process.stdout.write(`VERCEL_ENVIRONMENT=${config.vercelEnvironment}\n`);
  process.stdout.write(`VERCEL_TARGET=${config.vercelTarget ?? ''}\n`);
  process.exit(0);
}

process.stdout.write(
  `${JSON.stringify(
    {
      environment: config.name,
      appEnv: config.appEnv,
      vercelEnvironment: config.vercelEnvironment,
      vercelTarget: config.vercelTarget,
      backendHookVar: config.backendHookVar,
    },
    null,
    2
  )}\n`
);
