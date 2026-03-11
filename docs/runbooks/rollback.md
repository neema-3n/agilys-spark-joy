# Rollback

Rollback depends on the deployed surface:

## Frontend

1. Open the Vercel deployment history.
2. Promote the previous healthy deployment for the affected target (`preview`, `staging`, or `production`).
3. Re-run smoke validation against the restored URL.

## Backend

1. Re-trigger the previous stable release through the hosting platform or deploy hook source commit.
2. Verify API health and environment-specific connectivity.
3. If database changes were part of the release, use the migration rollback runbook for that environment before reopening traffic.

## Safety Rules

- Never point a non-production frontend to a production backend during rollback.
- Confirm `APP_ENV` and target URLs after every rollback.
- Update the incident notes with the restored frontend URL and backend revision.
