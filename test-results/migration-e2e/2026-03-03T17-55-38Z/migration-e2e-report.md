# Migration E2E Non-Regression Report

- Generated at: 2026-03-03T17:55:38.527Z
- Command: `pnpm exec playwright test --config playwright.migration.config.ts tests/auth-migration.spec.ts --grep @migration- --reporter=json --output /Volumes/mySD1.5/projects/agilys-spark-joy/test-results/migration-e2e/2026-03-03T17-55-38Z/artifacts`
- Gate decision: **No-Go**

## Summary

- Total critical tests: 4
- Passed: 2
- Failed: 1
- Skipped/Other: 1
- Critical flow coverage: 4/4

## AC/Flow Traceability

| AC | Flux | Migration Tag | Status | Test |
|---|---|---|---|---|
| @ac1 | @flux-AUTH-01 | @migration-auth | PASSED | tests/auth-migration.spec.ts > auth ui routing flows > @migration-auth @ac1 @flux-AUTH-01 protected route redirects to login and successful login returns to requested route |
| @ac1 | @flux-AUTH-03 | @migration-auth | PASSED | tests/auth-migration.spec.ts > auth ui routing flows > @migration-auth @ac1 @flux-AUTH-03 logout redirects to login and clears local tokens |
| @ac1 | @flux-OPS-05 | @migration-depense | TIMEDOUT | tests/auth-migration.spec.ts > auth ui routing flows > @migration-depense @ac1 @flux-OPS-05 depenses flow allows opening creation dialog and enforces minimal validation |
| @ac1 | @flux-BUD-02 | @migration-budget | FAILED | tests/auth-migration.spec.ts > auth ui routing flows > @migration-budget @ac1 @flux-BUD-02 budgets flow exposes allocation/reallocation entrypoint in UI |

## Missing critical flows

- Aucun flux critique manquant.

## Failures mapped to AC/Flow

- @ac1 @flux-OPS-05 -> tests/auth-migration.spec.ts > auth ui routing flows > @migration-depense @ac1 @flux-OPS-05 depenses flow allows opening creation dialog and enforces minimal validation (errors: 2)
- @ac1 @flux-BUD-02 -> tests/auth-migration.spec.ts > auth ui routing flows > @migration-budget @ac1 @flux-BUD-02 budgets flow exposes allocation/reallocation entrypoint in UI (errors: 1)
