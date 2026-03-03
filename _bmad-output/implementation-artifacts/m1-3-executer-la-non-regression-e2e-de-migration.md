# Story M1.3: Executer la non-regression E2E de migration

Status: ready-for-dev

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

- [ ] Deriver la liste scenarios critiques depuis la matrice de parite (AC: 1)
- [ ] Implementer/adapter les tests E2E Playwright pour auth + budget + parcours depense minimum (AC: 1)
- [ ] Ajouter tagging des tests par flux migration (AC: 1)
- [ ] Configurer archivage rapport, screenshots et traces (AC: 2)
- [ ] Integrer gate No-Go dans pipeline migration (AC: 3)

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

### File List

- `_bmad-output/implementation-artifacts/m1-3-executer-la-non-regression-e2e-de-migration.md`

### Change Log

- 2026-03-02: Creation de la story d'implementation M1.3 (ready-for-dev).
