# Decision Log - Next Migration

## 2026-03-11

- Decision: continue autonomously instead of waiting for user input.
- Reason: the implementation is functionally migrated and build-clean, but the new Next smoke test is still not passing, so verification is incomplete.
- Current focus:
  - diagnose the failing `tests/next-migration-smoke.spec.ts` flow,
  - stabilize the mocked authenticated shell path under Next,
  - rerun focused verification once fixed.
