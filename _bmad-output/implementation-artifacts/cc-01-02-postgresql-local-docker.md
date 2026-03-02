# Story CC-01.02 - PostgreSQL local via Docker

Status: ready-for-dev
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

- [ ] Ajouter la configuration Docker PostgreSQL (service, volume, healthcheck) (AC: 1, 2)
- [ ] Documenter le runbook DB local (up/down/logs/healthcheck) (AC: 1, 2)
- [ ] Verifier le demarrage propre sur machine sans SGBD installe (AC: 1)

## Dependencies / Blockers

- Docker engine disponible.

## Dev Notes

- Contrainte utilisateur explicite: Docker-first, pas d'installation SGBD locale.
- Cette story debloque les stories DB suivantes.

## Story Completion Status

- Story ID: `CC-01.02`
- Story Key: `cc-01-02-postgresql-local-docker`
- Final Status: `ready-for-dev`
