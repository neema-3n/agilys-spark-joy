import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { parseArgs, resolveEnvironmentConfig } from '../env/_environment.mjs';

const runCommand = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
};

const runCommandCapture = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(stderr || `Command failed: ${command} ${args.join(' ')}`);
  }

  return result.stdout?.trim() ?? '';
};

const triggerBackendHook = (environmentConfig) => {
  if (!environmentConfig.backendHookVar) {
    return false;
  }

  const hookUrl = process.env[environmentConfig.backendHookVar]?.trim();
  if (!hookUrl) {
    process.stdout.write(
      `Backend deploy hook ${environmentConfig.backendHookVar} not configured; skipping backend trigger.\n`
    );
    return false;
  }

  const response = spawnSync(
    'node',
    [
      '--input-type=module',
      '--eval',
      `const response = await fetch(${JSON.stringify(hookUrl)}, { method: 'POST' });
if (!response.ok) {
  console.error('Backend deploy hook failed with status', response.status);
  process.exit(1);
}
console.log('Backend deploy hook accepted with status', response.status);`,
    ],
    { stdio: 'inherit' }
  );

  if (response.status !== 0) {
    throw new Error(`Backend deploy hook failed for ${environmentConfig.name}`);
  }

  return true;
};

const writeGithubOutput = (key, value) => {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    return;
  }

  appendFileSync(outputFile, `${key}=${value}\n`);
};

export const runDeploy = async (argv) => {
  const options = parseArgs(argv);
  const environmentConfig = resolveEnvironmentConfig(options.environment ?? options.env);

  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    throw new Error('Missing required environment variable: VERCEL_TOKEN');
  }

  const childEnv = {
    ...process.env,
    APP_ENV: environmentConfig.appEnv,
  };

  runCommand(
    'pnpm',
    [
      'dlx',
      'vercel@latest',
      'pull',
      '--yes',
      `--environment=${environmentConfig.vercelEnvironment}`,
      `--token=${token}`,
    ],
    { env: childEnv }
  );

  const deployArgs = ['dlx', 'vercel@latest', 'deploy', '--yes', `--token=${token}`];
  if (environmentConfig.vercelTarget === 'staging') {
    deployArgs.push('--target=staging');
  }
  if (environmentConfig.vercelTarget === 'production') {
    deployArgs.push('--prod');
  }

  const deploymentUrl = runCommandCapture('pnpm', deployArgs, {
    env: childEnv,
    stdio: ['inherit', 'pipe', 'inherit'],
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (deploymentUrl) {
    process.stdout.write(`Frontend deployment URL: ${deploymentUrl}\n`);
    await writeGithubOutput('frontend_url', deploymentUrl);
  }

  const backendTriggered = triggerBackendHook(environmentConfig);
  await writeGithubOutput('backend_triggered', backendTriggered ? 'true' : 'false');
};
