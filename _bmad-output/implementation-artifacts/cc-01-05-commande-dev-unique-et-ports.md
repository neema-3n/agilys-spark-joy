# Story CC-01.05 - Commande dev unique et ports par service

Status: done
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

- [x] Implementer orchestration locale via `pnpm dev` (AC: 1)
- [x] Brancher la configuration de ports par variables d'environnement (AC: 2)
- [x] Documenter exemples de surcharge de ports par service (AC: 3)
- [x] Verifier absence de conflit de ports par defaut (AC: 2)

## Dependencies / Blockers

- Depend de `CC-01.02` (DB Docker).
- Peut s'executer en parallele de `CC-01.04` si scripts compatibles.

## Dev Notes

- Respect de ta preference: `dev` uniquement, pas de `dev:all`.
- Conserver une approche incrementalement compatible avec l'etat actuel du repo.

## Story Completion Status

- Story ID: `CC-01.05`
- Story Key: `cc-01-05-commande-dev-unique-et-ports`
- Final Status: `done`

## Dev Agent Record

### Debug Log

- `pnpm run test:dev-command` -> PASS
- `pnpm run lint` -> PASS
- `pnpm run test` -> PASS (frontend Playwright + backend Jest)
- Smoke test runtime: `WEB_PORT=18080 API_PORT=13001 DB_PORT=15432 pnpm dev` -> stack demarree (web/api/db)
- Review fix: `pnpm run test:dev-command` -> PASS
- Review fix: `pnpm run lint` -> PASS
- Review fix: `pnpm run test` -> PASS

### Completion Notes

- Orchestration locale unifiee implementee via `scripts/dev.sh`, branchee sur `pnpm dev`.
- Ports parametrables sans modification de code: `WEB_PORT`, `API_PORT`, `DB_PORT` (avec compatibilite `POSTGRES_PORT`).
- Verification anti-conflit de ports ajoutee dans le script dev.
- Runbook ajoute pour onboarding et surcharge des ports.
- Tests automatiques dedies ajoutes pour valider defaults, overrides et conflits de ports.
- Durcissement review: attente de readiness PostgreSQL avant lancement API.
- Durcissement review: detection de ports localement occupes pour WEB/API.
- Traçabilite story alignee sur la liste complete des fichiers modifies du commit.
- DoR: PASS
- DoD: PASS

## File List

- package.json
- scripts/dev.sh
- tests/dev-command.test.sh
- .env.example
- README.md
- docs/runbooks/local-dev-command-and-ports.md
- pnpm-lock.yaml
- pnpm-workspace.yaml
- package-lock.json
- backend/package-lock.json
- tests/README.md
- _bmad-output/implementation-artifacts/cc-01-04-migration-npm-vers-pnpm.md
- _bmad-output/implementation-artifacts/cc-01-05-commande-dev-unique-et-ports.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-03-02: implementation CC-01.05 (commande `pnpm dev` unifiee, ports parametrables, runbook, tests, validation complete).
- 2026-03-02: review fix - robustesse du script dev (readiness DB + port occupancy check), tests renforces et File List complete.
