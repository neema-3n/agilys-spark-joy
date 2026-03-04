# M3.3 Risk Acceptance - Cloud Freeze Supabase

Date: 2026-03-04
Story: `m3-3-decommissionner-supabase-de-facon-controlee`
Decision: Accepted risk for deferred Supabase cloud decommission

## Context

M3.3 is closed with a strict "no Supabase cloud mutation" policy.
Runtime dependency removal is validated on active application surfaces.
Supabase cloud resources remain present and are explicitly deferred.

## Validated controls

1. `pnpm run test:supabase:runtime-gate` -> PASS (2026-03-04)
2. `pnpm --dir backend run test -- auth.service.spec.ts` -> PASS (5/5)
3. `pnpm run test:frontend` -> PASS (24/24)
4. Read-only cloud inventory captured (functions/secrets/project status), no destructive action executed.

## Deferred risks (accepted)

1. Edge Functions still deployed and active in Supabase cloud.
2. Supabase cloud secrets still present.
3. Storage inventory and webhook dashboard verification remain manual and deferred.
4. Cloud-side decommission tasks are postponed to a dedicated, approved future lot.

## Guardrails until future cloud lot

1. No cloud delete/prune/unset operation without explicit approval.
2. Keep `test:supabase:runtime-gate` mandatory in local/CI validation.
3. Keep replacement map and rollback notes updated in M3.3 artifacts.
4. Any regression suggesting runtime Supabase use reopens M3.3 immediately.

## Sign-off

- Tech Lead: ____________________  Date: __________
- Product Owner: ________________ Date: __________
- Platform/SRE: _________________ Date: __________
