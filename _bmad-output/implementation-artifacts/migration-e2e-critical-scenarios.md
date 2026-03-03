# Migration E2E Critical Scenarios (M1.3)

Date: 2026-03-03
Source: `_bmad-output/planning-artifacts/migration-parity-matrix.md`

## Derived critical scenarios for non-regression gate

1. `AUTH-01` (AC1) - Login JWT: redirection route protegee -> login -> retour au flux demande.
2. `AUTH-03` (AC1) - Logout: invalidation session et retour vers login.
3. `BUD-02` (AC1) - Budget allocations/reallocations: projection correcte des modifications budgetaires.
4. `OPS-05` (AC1) - Parcours depense minimum: acces au module depenses apres authentification.

## Gate policy

- Si un scenario critique echoue, la decision migration est `No-Go`.
- Chaque echec doit etre rattache a son tag AC/flux (`@acX`, `@flux-*`) dans le rapport horodate.
