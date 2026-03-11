# Staging Deploy

Staging deployments are triggered manually through `.github/workflows/deploy-staging.yml`.

Checklist:

1. Choose the Git ref to promote to staging.
2. Confirm `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are configured.
3. Optionally configure `BACKEND_STAGING_DEPLOY_HOOK_URL` to redeploy the backend alongside the frontend.
4. Run the workflow from GitHub Actions.
5. Validate the generated frontend URL and the backend hook status in the workflow summary.

Notes:

- The workflow currently assumes the frontend uses the Vercel custom environment target `staging`.
- The backend deployment remains hook-based until the hosting provider is locked.
