# Story M1.3: Executer la non-regression E2E de migration

Status: done

## Story

As a QA migration,
I want couvrir les parcours critiques en E2E,
so that la bascule soit validee de bout en bout.

## Acceptance Criteria

1. **Couverture parcours critiques**
   - **Given** la liste des parcours critiques migration
   - **When** la suite E2E est executee
   - **Then** auth, budget referentiels et parcours depense minimum sont testes
   - **And** chaque echec est rattache a un AC/flux

2. **Evidence d'execution**
   - **Given** un run E2E termine
   - **When** les resultats sont collectes
   - **Then** un rapport horodate est archive
   - **And** captures/logs sont accessibles

3. **Gate de non-regression**
   - **Given** un scenario critique en echec
   - **When** le pipeline evalue le run
   - **Then** le gate migration passe en No-Go
   - **And** les anomalies sont priorisees pour correction

## Tasks / Subtasks

- [x] Deriver la liste scenarios critiques depuis la matrice de parite (AC: 1)
- [x] Implementer/adapter les tests E2E Playwright pour auth + budget + parcours depense minimum (AC: 1)
- [x] Ajouter tagging des tests par flux migration (AC: 1)
- [x] Configurer archivage rapport, screenshots et traces (AC: 2)
- [x] Integrer gate No-Go dans pipeline migration (AC: 3)

## Dev Notes

### References

- `/_bmad-output/planning-artifacts/migration-parity-matrix.md`
- `/_bmad-output/planning-artifacts/migration-data-strategy.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Story M1.3 preparee au format implementation avec AC et taches executables.
- Liste des scenarios critiques derivee depuis la matrice de parite et archivee dans `_bmad-output/implementation-artifacts/migration-e2e-critical-scenarios.md`.
- Suite E2E migration adaptee avec tags AC/flux: `@migration-auth`, `@migration-budget`, `@migration-depense` et `@ac1/@flux-*`.
- Gate migration implemente via `scripts/migration-e2e-gate.mjs` avec rapport horodate, traceabilite AC/flux, decision Go/No-Go et archivage des artefacts (logs + traces + screenshots sur echec) dans `test-results/migration-e2e/<timestamp>/`.
- Gate migration renforce pour exiger la couverture complete des flux critiques derives du catalogue (`migration-e2e-critical-scenarios.md`) avant decision **Go**.
- Pipeline CI dedie ajoute: `.github/workflows/migration-e2e-non-regression.yml`.
- Validation locale:
  - `pnpm run test:e2e:migration:gate` -> **Go** (4/4 scenarios critiques passes).
  - `pnpm run lint` -> OK.
  - `pnpm run test` -> frontend OK; backend en echec sur test preexistant `backend/test/tenant-policies.e2e.spec.ts` (attendu 403, recu 404), hors perimetre M1.3.

### File List

- `.github/workflows/migration-e2e-non-regression.yml`
- `scripts/migration-e2e-gate.mjs`
- `playwright.migration.config.ts`
- `tests/auth-migration.spec.ts`
- `package.json`
- `_bmad-output/implementation-artifacts/migration-e2e-critical-scenarios.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/m1-3-executer-la-non-regression-e2e-de-migration.md`

### Change Log

- 2026-03-02: Creation de la story d'implementation M1.3 (ready-for-dev).
- 2026-03-03: Implementation completee (E2E critiques + tagging AC/flux + gate CI No-Go + rapport horodate + artefacts).
- 2026-03-03: Correctifs review AI appliques (gate couverture minimale des flux critiques + scenarios Playwright budgets/depenses renforces + File List synchronisee).
- 2026-03-03: Story passee en `done` apres correction des findings review et validation gate `Go` (4/4 flux critiques couverts).

## Senior Developer Review (AI)

Date: 2026-03-03  
Outcome: **Approved**

- [RESOLVED][P1] Gate couverture minimale: `scripts/migration-e2e-gate.mjs` exige maintenant la couverture complete des flux critiques derives du catalogue scenarios.
- [RESOLVED][P1] Budget E2E: flux `@flux-BUD-02` converti en scenario Playwright UI avec tags migration/AC/flux.
- [RESOLVED][P1] Depense minimum: flux `@flux-OPS-05` renforce au-dela de la reachability (ouverture dialogue creation + validation metier minimale).
- [RESOLVED][P2] File List synchronisee avec les changements reels (`sprint-status.yaml` ajoute).
