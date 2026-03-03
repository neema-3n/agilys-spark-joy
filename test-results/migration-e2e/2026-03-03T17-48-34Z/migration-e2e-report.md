# Migration E2E Non-Regression Report

- Generated at: 2026-03-03T17:48:34.765Z
- Command: `pnpm exec playwright test --config playwright.migration.config.ts tests/auth-migration.spec.ts --grep @migration- --reporter=json --output /Volumes/mySD1.5/projects/agilys-spark-joy/test-results/migration-e2e/2026-03-03T17-48-34Z/artifacts`
- Gate decision: **Go**

## Summary

- Total critical tests: 4
- Passed: 4
- Failed: 0
- Skipped/Other: 0

## AC/Flow Traceability

| AC | Flux | Migration Tag | Status | Test |
|---|---|---|---|---|
| @ac1 | @flux-BUD-02 | @migration-budget | PASSED | tests/auth-migration.spec.ts > @migration-budget @ac1 @flux-BUD-02 applyModificationsToLignes projects allocation and reallocation on budget lines |
| @ac1 | @flux-AUTH-01 | @migration-auth | PASSED | tests/auth-migration.spec.ts > auth ui routing flows > @migration-auth @ac1 @flux-AUTH-01 protected route redirects to login and successful login returns to requested route |
| @ac1 | @flux-AUTH-03 | @migration-auth | PASSED | tests/auth-migration.spec.ts > auth ui routing flows > @migration-auth @ac1 @flux-AUTH-03 logout redirects to login and clears local tokens |
| @ac1 | @flux-OPS-05 | @migration-depense | PASSED | tests/auth-migration.spec.ts > auth ui routing flows > @migration-depense @ac1 @flux-OPS-05 depenses route is reachable after authenticated login |

## Failures mapped to AC/Flow

- Aucun echec critique.
