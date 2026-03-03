# Story 2.5 - Persister les refresh tokens en PostgreSQL

Status: done
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

- [x] Definir schema SQL et contraintes (unicite `jti`, index expiration/revocation, FK si applicables).
- [x] Ajouter migration SQL et script d'execution.
- [x] Implementer `RefreshTokenStore` PostgreSQL (save/find/revoke).
- [x] Adapter `AuthService` pour utiliser le store persistant.
- [x] Ajouter/adapter tests unitaires et integration.
- [x] Documenter variables d'environnement DB et prerequis locaux.

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

## Dev Agent Record

### Debug Log

- `pnpm --dir backend run lint` ✅
- `pnpm --dir backend run test` ✅
- `pnpm run db:migrate` ✅ (migration appliquee localement)
- `AUTH_STORAGE_MODE=postgres pnpm --dir backend exec jest --runInBand test/auth.e2e.spec.ts` ✅

### Completion Notes

- Migration SQL versionnee ajoutee pour `auth_refresh_tokens` avec FK vers `auth_users`, index (`expires_at`, `revoked_at`, `user_id, tenant_id`) et trigger `updated_at`.
- `RefreshTokenStore` aligne sur la migration versionnee (suppression du DDL runtime) avec message d'erreur actionnable si la migration n'a pas ete appliquee.
- Couverture tests etendue avec un spec dedie au store PostgreSQL (save/find/revoke + gestion erreur table absente).
- Documentation mise a jour pour expliciter prerequis DB et variables d'environnement en mode auth PostgreSQL.
- Rotation du refresh token rendue atomique via `revokeAndSave` (revoke + insertion nouveau token dans une meme operation DB), pour eviter les etats intermediaires.
- Validation explicite multi-instance ajoutee: token revoque sur instance A est refuse sur instance B (mode postgres).
- `UsersService` aligne sur la strategie migrations versionnees: suppression de la creation runtime de `auth_users`, message d'erreur actionnable si migration manquante.

## File List

- `supabase/migrations/20260302193000_auth_refresh_tokens_postgresql.sql` (new)
- `backend/src/auth/refresh-token.store.ts` (modified)
- `backend/src/auth/refresh-token.store.spec.ts` (new)
- `backend/src/auth/auth.service.ts` (modified)
- `backend/src/users/users.service.ts` (modified)
- `backend/test/auth.e2e.spec.ts` (modified)
- `backend/README.md` (modified)
- `README.md` (modified)
- `.env.example` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `_bmad-output/implementation-artifacts/2-5-persister-refresh-tokens-en-postgresql.md` (modified)

## Senior Developer Review (AI)

- Decision: **APPROVED WITH FIXES APPLIED**.
- Findings critiques/majeurs traites:
  - AC4 multi-instance desormais couverte par un test e2e dedie (mode postgres).
  - Rotation refresh token rendue atomique pour eviter revoke sans re-emission en cas d'erreur intermediaire.
  - Suppression du DDL runtime `auth_users` pour conserver une source de verite unique via migrations.
- Verification locale apres correction:
  - `pnpm --dir backend run lint` ✅
  - `pnpm --dir backend run test` ✅
  - `AUTH_STORAGE_MODE=postgres pnpm --dir backend exec jest --runInBand test/auth.e2e.spec.ts` ✅

## Change Log

- 2026-03-02: Implementation completee pour la persistance PostgreSQL des refresh tokens (migration versionnee, store aligne migrations, tests backend et docs), story passee a `review`.
- 2026-03-02: Revue senior adversariale executee, correctifs HIGH/MEDIUM appliques (multi-instance e2e, rotation atomique, suppression DDL runtime `auth_users`), story passee a `done`.
