# Preview Deploy

Preview deployments are triggered by `.github/workflows/ci-preview.yml`.

Checklist:

1. Configure `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` in GitHub secrets.
2. Optionally configure `BACKEND_PREVIEW_DEPLOY_HOOK_URL` if the preview backend should be redeployed together with the frontend.
3. Open or update a pull request.
4. Read the workflow summary for the frontend deployment URL.

Notes:

- The workflow prints an environment summary before deploy.
- If Vercel secrets are missing, the preview deployment is skipped explicitly.
