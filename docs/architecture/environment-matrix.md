# Environment Matrix

This repository uses the following stable environment model:

| Environment | APP_ENV | Frontend target | Backend trigger | Notes |
| --- | --- | --- | --- | --- |
| `local` | `development` | local `next dev` | local `NestJS` | no remote deploy |
| `preview` | `preview` | Vercel Preview | `BACKEND_PREVIEW_DEPLOY_HOOK_URL` | automatic PR validation |
| `staging` | `staging` | Vercel Custom Environment `staging` | `BACKEND_STAGING_DEPLOY_HOOK_URL` | stable pre-production validation |
| `production` | `production` | Vercel Production | `BACKEND_PRODUCTION_DEPLOY_HOOK_URL` | protected promotion |

Required GitHub secrets for frontend deployment:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Optional backend deploy hook secrets:

- `BACKEND_PREVIEW_DEPLOY_HOOK_URL`
- `BACKEND_STAGING_DEPLOY_HOOK_URL`
- `BACKEND_PRODUCTION_DEPLOY_HOOK_URL`

Notes:

- `APP_ENV` is the canonical application environment. Do not infer environment from `NODE_ENV` alone.
- `staging` is deployed through a Vercel custom environment target.
- Backend hosting remains provider-agnostic in this repository; deploy hooks are the extension point until the hosting platform is fixed.
