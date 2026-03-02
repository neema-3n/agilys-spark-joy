# Story CC-01.04 - Migration npm vers pnpm

Status: review
Epic: CC-01 - Fondations techniques migration
Story Key: cc-01-04-migration-npm-vers-pnpm
Created: 2026-03-02

## Story

As a equipe plateforme,
I want standardiser le package manager sur pnpm,
so that les executions locales et CI utilisent un outillage unique.

## Acceptance Criteria

1. **Given** le repo courant
   **When** l'installation est lancee
   **Then** `pnpm install` est la commande de reference.

2. **Given** les scripts projet
   **When** lint/build/test/dev sont executes
   **Then** ils sont alignes sur `pnpm`.

3. **Given** le lockfile du projet
   **When** la migration est validee
   **Then** `pnpm-lock.yaml` est la source de verite
   **And** le plan de retrait de `package-lock.json` est applique/trace.

## Tasks / Subtasks

- [x] Normaliser scripts `package.json` pour execution `pnpm` (AC: 1, 2)
- [ ] Aligner les jobs CI touches par ce lot sur `pnpm` (AC: 2) - N/A pour ce repo (aucun workflow CI versionne)
- [x] Retirer/archiver progressivement les usages `npm` et `package-lock.json` (AC: 3)
- [x] Mettre a jour la doc de demarrage developpeur (AC: 1, 2)

## Dependencies / Blockers

- Aucune technique bloquante.

## Dev Notes

- Changement outillage uniquement, sans refactor metier.
- Garder les commandes equivalentes existantes pendant transition si necessaire.

## Story Completion Status

- Story ID: `CC-01.04`
- Story Key: `cc-01-04-migration-npm-vers-pnpm`
- Final Status: `review`

## Dev Agent Record

### Implementation Plan

- Normaliser les scripts root autour de `pnpm` avec couverture frontend/backend.
- Activer le workspace pnpm pour inclure `backend`.
- Migrer la documentation de demarrage vers `pnpm`.
- Retirer les lockfiles npm et regenerer le lockfile pnpm.
- Valider avec lint/test/build via scripts `pnpm`.

### Debug Log

- `pnpm install`
- `pnpm run lint && pnpm run test && pnpm run build`

### Completion Notes

- Scripts root aligns sur `pnpm` pour `dev`, `lint`, `test`, `build`, avec wrappers frontend/backend.
- Workspace `pnpm` ajoute pour inclure `backend` dans la resolution des dependances.
- Usages `npm` remplaces dans les docs de demarrage (`README.md`, `tests/README.md`) pour alignement `pnpm`.
- Lockfiles npm retires (`package-lock.json`, `backend/package-lock.json`), `pnpm-lock.yaml` regenere.
- Aucun job CI versionne dans ce repo n'a necessite de mise a jour pour ce lot.

## File List

- README.md
- tests/README.md
- package.json
- pnpm-workspace.yaml
- pnpm-lock.yaml
- package-lock.json (deleted)
- backend/package-lock.json (deleted)
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/cc-01-04-migration-npm-vers-pnpm.md

## Change Log

- 2026-03-02: Standardisation outillage npm -> pnpm (scripts, doc, workspace, lockfiles) et validations lint/test/build executees.
