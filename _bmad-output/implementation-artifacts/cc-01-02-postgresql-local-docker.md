# Story CC-01.02 - PostgreSQL local via Docker

Status: done
Epic: CC-01 - Fondations techniques migration
Story Key: cc-01-02-postgresql-local-docker
Created: 2026-03-02

## Story

As a equipe plateforme,
I want executer PostgreSQL en local via Docker,
so that l'environnement DB est reproductible sans installation SGBD native.

## Acceptance Criteria

1. **Given** Docker est disponible
   **When** la stack locale DB est demarree
   **Then** PostgreSQL tourne via `docker compose`
   **And** un healthcheck confirme que la DB est prete.

2. **Given** la stack DB locale est active
   **When** l'equipe relance l'environnement
   **Then** les donnees persistent via volume Docker
   **And** la procedure start/stop est documentee.

## Tasks / Subtasks

- [x] Ajouter la configuration Docker PostgreSQL (service, volume, healthcheck) (AC: 1, 2)
- [x] Documenter le runbook DB local (up/down/logs/healthcheck) (AC: 1, 2)
- [x] Verifier le demarrage propre sur machine sans SGBD installe (AC: 1)

## Dev Agent Record

### Debug Log

- `docker compose up -d postgres` (echec local initial: port `5432` deja occupe)
- Ajout mapping de port parametrable `${POSTGRES_PORT:-5432}`
- Validation reelle avec `POSTGRES_PORT=55432`:
  - healthcheck `healthy`
  - `pg_isready` OK
  - test de persistance via table `smoke_persistence` + restart
- Ajout verification reproductible versionnee: `./scripts/verify-postgres-local.sh`

### Completion Notes

- Configuration Docker PostgreSQL ajoutee avec volume persistant, healthcheck et credentials externalises via `.env`.
- Runbook documente pour cycle complet: start, stop, logs, healthcheck robuste aux overrides, reset volume.
- Verification fonctionnelle versionnee via script reproductible `./scripts/verify-postgres-local.sh`.

## File List

- `docker-compose.yml` (nouveau)
- `docs/runbooks/postgresql-local-docker.md` (nouveau)
- `README.md` (mise a jour)
- `.env.example` (nouveau)
- `scripts/verify-postgres-local.sh` (nouveau)
- `_bmad-output/implementation-artifacts/cc-01-02-postgresql-local-docker.md` (mise a jour revue + tracabilite)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (sync statut story)

## Change Log

- 2026-03-02: Mise en place PostgreSQL local via Docker Compose + runbook + verification de persistance.
- 2026-03-02: Corrections review AI (credentials externalises, healthcheck robuste, verification reproductible, file list complete).

## Senior Developer Review (AI)

- 2026-03-02 (Max):
  - HIGH fixe: credentials PostgreSQL non hardcodees (variables `.env` + `.env.example`).
  - MEDIUM fixe: commande healthcheck runbook rendue compatible overrides `POSTGRES_DB/POSTGRES_USER`.
  - MEDIUM fixe: verification de demarrage/persistance rendue reproductible via script versionne.
  - MEDIUM fixe: ecart de tracabilite git/story corrige en completant la File List.

## Dependencies / Blockers

- Docker engine disponible.

## Dev Notes

- Contrainte utilisateur explicite: Docker-first, pas d'installation SGBD locale.
- Cette story debloque les stories DB suivantes.

## Story Completion Status

- Story ID: `CC-01.02`
- Story Key: `cc-01-02-postgresql-local-docker`
- Final Status: `done`
