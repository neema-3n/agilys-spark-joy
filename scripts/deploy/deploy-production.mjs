import { runDeploy } from './_deploy.mjs';

await runDeploy(['--environment', 'production', ...process.argv.slice(2)]);
