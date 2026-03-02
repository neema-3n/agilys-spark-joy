# Story CC-01.04 - Migration npm vers pnpm

Status: ready-for-dev
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

- [ ] Normaliser scripts `package.json` pour execution `pnpm` (AC: 1, 2)
- [ ] Aligner les jobs CI touches par ce lot sur `pnpm` (AC: 2)
- [ ] Retirer/archiver progressivement les usages `npm` et `package-lock.json` (AC: 3)
- [ ] Mettre a jour la doc de demarrage developpeur (AC: 1, 2)

## Dependencies / Blockers

- Aucune technique bloquante.

## Dev Notes

- Changement outillage uniquement, sans refactor metier.
- Garder les commandes equivalentes existantes pendant transition si necessaire.

## Story Completion Status

- Story ID: `CC-01.04`
- Story Key: `cc-01-04-migration-npm-vers-pnpm`
- Final Status: `ready-for-dev`
