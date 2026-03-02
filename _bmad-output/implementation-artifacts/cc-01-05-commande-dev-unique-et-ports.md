# Story CC-01.05 - Commande dev unique et ports par service

Status: ready-for-dev
Epic: CC-01 - Fondations techniques migration
Story Key: cc-01-05-commande-dev-unique-et-ports
Created: 2026-03-02

## Story

As a equipe plateforme,
I want demarrer les services avec `pnpm dev` et configurer les ports par service,
so that l'execution locale est simple et flexible.

## Acceptance Criteria

1. **Given** l'environnement local configure
   **When** `pnpm dev` est execute a la racine
   **Then** les services cibles demarrent via cette commande unique.

2. **Given** des variables de ports (`WEB_PORT`, `API_PORT`, `DB_PORT` ou equivalent)
   **When** `pnpm dev` est execute
   **Then** chaque service ecoute sur le port configure
   **And** aucune modification de code n'est requise.

3. **Given** un nouveau developpeur
   **When** il suit le runbook
   **Then** le demarrage local avec `pnpm dev` et surcharge de ports est documente clairement.

## Tasks / Subtasks

- [ ] Implementer orchestration locale via `pnpm dev` (AC: 1)
- [ ] Brancher la configuration de ports par variables d'environnement (AC: 2)
- [ ] Documenter exemples de surcharge de ports par service (AC: 3)
- [ ] Verifier absence de conflit de ports par defaut (AC: 2)

## Dependencies / Blockers

- Depend de `CC-01.02` (DB Docker).
- Peut s'executer en parallele de `CC-01.04` si scripts compatibles.

## Dev Notes

- Respect de ta preference: `dev` uniquement, pas de `dev:all`.
- Conserver une approche incrementalement compatible avec l'etat actuel du repo.

## Story Completion Status

- Story ID: `CC-01.05`
- Story Key: `cc-01-05-commande-dev-unique-et-ports`
- Final Status: `ready-for-dev`
