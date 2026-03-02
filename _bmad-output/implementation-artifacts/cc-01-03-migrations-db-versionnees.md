# Story CC-01.03 - Migrations DB versionnees

Status: ready-for-dev
Epic: CC-01 - Fondations techniques migration
Story Key: cc-01-03-migrations-db-versionnees
Created: 2026-03-02

## Story

As a equipe plateforme,
I want des scripts DB versionnes et rejouables,
so that l'etat PostgreSQL est stable et reproductible entre developpeurs.

## Acceptance Criteria

1. **Given** PostgreSQL local Docker est operationnel
   **When** `pnpm run db:migrate` est execute
   **Then** les migrations s'appliquent sans erreur.

2. **Given** une base locale existante
   **When** `pnpm run db:reset` puis `pnpm run db:seed` sont executes
   **Then** la base est reinitialisee puis peuplee de donnees de base.

3. **Given** un nouvel environnement dev
   **When** la procedure DB est suivie
   **Then** les commandes `db:migrate`, `db:reset`, `db:seed` sont documentees et rejouables.

## Tasks / Subtasks

- [ ] Ajouter/normaliser scripts `db:migrate`, `db:reset`, `db:seed` via `pnpm` (AC: 1, 2)
- [ ] Verifier la rejouabilite complete sur base vierge (AC: 1, 2, 3)
- [ ] Documenter prerequis et ordre d'execution (AC: 3)

## Dependencies / Blockers

- Dependance: `CC-01.02` completee.

## Dev Notes

- Reutiliser au maximum les scripts/migrations deja existants dans le repo.
- Garder ce lot strictement DB, sans melanger outillage CI global.

## Story Completion Status

- Story ID: `CC-01.03`
- Story Key: `cc-01-03-migrations-db-versionnees`
- Final Status: `ready-for-dev`
