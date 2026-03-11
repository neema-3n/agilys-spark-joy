import { runDeploy } from './_deploy.mjs';

await runDeploy(['--environment', 'staging', ...process.argv.slice(2)]);
