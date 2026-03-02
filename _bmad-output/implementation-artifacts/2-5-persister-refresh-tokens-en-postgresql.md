# Story 2.5 - Persister les refresh tokens en PostgreSQL

Status: ready-for-dev
Epic: 2 - Gouvernance d'acces, roles et isolation multi-tenant
Story Key: 2-5-persister-refresh-tokens-en-postgresql
Created: 2026-03-02

## Story

As a equipe plateforme,
I want stocker les refresh tokens dans PostgreSQL au lieu d'un store local,
So that la revocation survive aux redemarrages et fonctionne en multi-instance.

## Acceptance Criteria

1. **Given** une base PostgreSQL disponible et une migration appliquee
   **When** un utilisateur se connecte via `POST /auth/login`
   **Then** le hash du refresh token est persiste en base
   **And** aucune valeur de token en clair n'est stockee.

2. **Given** un refresh token valide en base
   **When** `POST /auth/refresh` est appele
   **Then** l'ancien refresh token est revoque en base
   **And** un nouveau refresh token est persiste avec un nouveau `jti`.

3. **Given** un refresh token actif
   **When** `POST /auth/logout` est appele
   **Then** le token est revoque en base
   **And** toute tentative ulterieure de refresh avec ce token est rejetee.

4. **Given** l'API demarree sur plusieurs instances
   **When** un token est revoque sur une instance
   **Then** la revocation est visible et appliquee par toutes les autres instances.

5. **Given** des operations login/refresh/logout
   **When** les tests sont executes
   **Then** les tests unitaires et integration couvrent les chemins nominaux et rejets
   **And** la suite est verte.

## Scope Technique

- Introduire un repository persistant des refresh tokens base sur PostgreSQL.
- Ajouter la migration SQL pour la table des refresh tokens (hash, `jti`, `expires_at`, `revoked_at`, `user_id`, `tenant_id`, timestamps).
- Remplacer l'implementation disque locale actuelle par un acces DB.
- Conserver les comportements API existants (codes HTTP et contrats payload).

## Out of Scope

- Refonte complete du module auth.
- Migration frontend auth.
- Refactor RBAC/ABAC.

## Tasks / Subtasks

- [ ] Definir schema SQL et contraintes (unicite `jti`, index expiration/revocation, FK si applicables).
- [ ] Ajouter migration SQL et script d'execution.
- [ ] Implementer `RefreshTokenStore` PostgreSQL (save/find/revoke).
- [ ] Adapter `AuthService` pour utiliser le store persistant.
- [ ] Ajouter/adapter tests unitaires et integration.
- [ ] Documenter variables d'environnement DB et prerequis locaux.

## Dependencies / Blockers

- **Bloquant principal:** base PostgreSQL non creee dans l'environnement actuel.
- Cette story ne doit **pas** etre implementee tant que:
  - une instance PostgreSQL locale est disponible,
  - la strategie de migration DB du projet est confirmee.

## Dev Notes

- Garder la compatibilite avec les claims existants (`sub`, `tenantId`, `roles`).
- Ne jamais stocker le refresh token brut.
- Prevoir un nettoyage periodique des tokens expires.

## Definition of Done

- Migration appliquee avec succes sur environnement local.
- Endpoints `login/refresh/logout` inchanges fonctionnellement.
- Revocation persistante apres restart API.
- Tests backend (`test`, `lint`, `build`) verts.

## References

- Story precedente: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/2-1-mettre-en-place-lauth-nestjs-jwt-refresh.md`
- Sprint status: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/sprint-status.yaml`
