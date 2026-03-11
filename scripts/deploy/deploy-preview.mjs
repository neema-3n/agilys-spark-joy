import { runDeploy } from './_deploy.mjs';

await runDeploy(['--environment', 'preview', ...process.argv.slice(2)]);
