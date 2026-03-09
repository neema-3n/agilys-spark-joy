# Story 8.2: Gerer mode degrade et reprise apres reconnexion

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur terrain,
I want continuer en mode degrade,
so that je ne perds pas mes operations en cas de reseau instable.

## Acceptance Criteria

1. **Saisie locale sans perte en mode degrade**
   - **Given** une indisponibilite reseau detectee cote client
   - **When** l'utilisateur cree ou modifie une operation metier autorisee hors ligne
   - **Then** l'operation est stockee localement dans une file durable (persistante au refresh)
   - **And** aucune donnee n'est perdue tant que la synchronisation n'est pas confirmee.

2. **Reprise automatique et idempotente apres reconnexion**
   - **Given** des operations en attente dans la file locale
   - **When** la connectivite redevient stable
   - **Then** la synchronisation est relancee automatiquement en respectant l'ordre deterministe par entite
   - **And** les retries n'introduisent aucun doublon (idempotence front+back).

3. **Qualification explicite des conflits de synchronisation**
   - **Given** une divergence detectee entre etat local et etat serveur
   - **When** la synchronisation traite l'operation conflictuelle
   - **Then** le conflit est qualifie (`stale_version`, `forbidden_transition`, `missing_dependency`, `cross_tenant_scope`)
   - **And** une action de resolution est proposee et journalisee.

4. **Traçabilite complete de la reprise**
   - **Given** une synchronisation en cours ou terminee
   - **When** un utilisateur habilite consulte la supervision
   - **Then** il visualise pour chaque item le statut (`queued`, `syncing`, `synced`, `failed`, `conflict`), les tentatives, les horodatages et le correlationId
   - **And** les motifs d'echec sont actionnables pour reprise manuelle.

5. **Respect des contraintes de securite et de scope**
   - **Given** un contexte multi-tenant/multi-exercice
   - **When** une operation offline est re-emise vers l'API
   - **Then** le backend applique les guards/permissions existants et refuse tout scope invalide
   - **And** aucun item hors tenant/exercice courant n'est synchronise.

6. **Conformite NFR resilience/sync**
   - **Given** des coupures reseau intermittentes
   - **When** les scenarios de reprise sont executes
   - **Then** la perte locale reste a `0%` (NFR5)
   - **And** le delai de synchronisation offline -> online respecte `p95 <= 5 min` en conditions cibles (NFR6), avec instrumentation exploitable.

## Tasks / Subtasks

- [x] Definir le contrat `OfflineSyncItem` partage (id local, type operation, payload, correlationId, tenantId, exerciceId, lastAttemptAt, retryCount, status) (AC: 1, 2, 4, 5)
- [x] Implementer une file offline persistante cote front (IndexedDB ou equivalent encapsule) derriere un service dedie (AC: 1)
- [x] Integrer un orchestrateur de reprise reseau (`online`/heartbeat) avec reprise automatique et backoff borne (AC: 2, 6)
- [x] Ajouter l'idempotence de synchronisation cote backend (cle idempotente + deduplication) pour les operations eligibles (AC: 2, 5)
- [x] Etendre les endpoints backend pour retourner des codes de conflit qualifiants et normalises (AC: 3)
- [x] Exposer une vue supervision/reprise (reutilisation `controle-interne`/`tresorerie` existants) pour statuts, erreurs et relance manuelle (AC: 4)
- [x] Reutiliser `http-client.ts` pour gestion des erreurs reseau et refresh auth sans contourner la couche API unifiee (AC: 2, 5)
- [x] Ajouter instrumentation de delai de rattrapage (de `queuedAt` a `syncedAt`) et compteur de conflits/retries (AC: 4, 6)
- [x] Garantir qu'aucun nouvel appel runtime Supabase n'est introduit (AC: 5)
- [x] Ajouter tests unitaires/integration/E2E resiliences (offline, reconnexion, conflit, permissions, non-regression UX) (AC: 1..6)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 8 / Story 8.2).
- FR directes:
  - `FR36`: operation en mode degrade
  - `FR37`: synchronisation apres reconnexion + qualification des conflits
- NFR directes:
  - `NFR5`: zero perte en saisie mode degrade
  - `NFR6`: sync offline->online `p95 <= 5 min`
- NFR connexes integration:
  - `NFR22`, `NFR23`, `NFR24` pour reprise auto, detection divergences et idempotence.

### Developer Context Section

- Les patterns recents du repo montrent une trajectoire `API unifiee + React Query + guards backend` deja en place:
  - Front: `src/services/api/http-client.ts` gere retry auth + erreurs reseau de base.
  - Front: `src/services/api/controle-interne.service.ts` et `src/hooks/useControleInterne.ts` montrent le pattern attendu pour fetch/mutations + invalidation.
  - Front: `src/services/api/tresorerie.service.ts` et `src/hooks/useTresorerie.ts` montrent filtrage par `correlationId` et supervision.
  - Back: `backend/src/controle-interne/controle-interne.controller.ts` et `backend/src/controle-interne/controle-interne.service.ts` montrent journalisation, statuts et persistence Postgres transactionnelle.
  - Back: `backend/src/auth/tenant-exercice-scope.guard.ts` illustre le gate scope tenant/exercice a conserver/etendre pour les routes offline-sync.
- La story 8.1 a etabli la base asynchrone (correlationId, supervision, retries traces). Story 8.2 doit reutiliser ces mecanismes au lieu de creer une filiere parallele.

### Technical Requirements

- Implémenter une **queue offline durable** cote client avec schema versionne et migration de storage.
- Maintenir un **state machine de sync** minimal: `queued -> syncing -> synced | failed | conflict`.
- Garantir l'**idempotence** de reprise via cle stable (ex: `tenantId + exerciceId + localOperationId + operationType`) cote backend.
- Qualifier explicitement les conflits metier et de scope pour eviter le statut generique "error".
- Journaliser chaque tentative avec timestamp, code resultat, message actionnable et correlationId.
- Eviter la synchronisation en boucle infinie: retry exponentiel borne + seuil max + passage en `failed`.

### Architecture Compliance

- Respect strict de `/_bmad-output/project-context.md`:
  - aucune dependance runtime Supabase nouvelle,
  - logique metier critique cote NestJS,
  - front via client API unifie,
  - separation claire UI / orchestration sync / API.
- Reutiliser les modules existants avant creation:
  - supervision existante tresorerie/controle interne,
  - patterns DTO + guards + service backend transactionnel.
- Ne pas introduire de seconde source de verite des statuts: backend reste autorite finale apres sync.

### Library / Framework Requirements

Versions en place a respecter (pas d'upgrade impose pour cette story):

- Frontend: React `18.3.1`, TypeScript `5.8.3`, `@tanstack/react-query` `5.83.0`
- Backend: NestJS `10.4.22`, PostgreSQL via `pg` `8.19.0`

Informations techniques a appliquer:

- Guards/authorization NestJS restent la mecanique standard de protection des endpoints ([NestJS Guards](https://docs.nestjs.com/guards), [NestJS Authorization](https://docs.nestjs.com/security/authorization)).
- Les query keys React Query doivent rester stables et deterministes ([TanStack Query v5](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys)).
- `LISTEN/NOTIFY` peut aider au signalement interne, mais ne remplace pas une queue/outbox durable pour garanties de reprise ([PostgreSQL NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)).

### File Structure Requirements

Zones probables d'implementation:

- Frontend
  - `src/services/api/http-client.ts` (extension eventuelle pour strategie offline-aware)
  - `src/services/api/*` (service offline-sync dedie)
  - `src/hooks/*` (hook orchestration + supervision)
  - ecran supervision existant (`ControleInterne`/`Tresorerie`) avant creation d'une nouvelle page
- Backend
  - `backend/src/<domaine-sync>/` (service + controller + dto)
  - reutilisation des guards existants (`JwtAuthGuard`, `AuthorizationPolicyGuard`, `TenantExerciceScopeGuard`)
- Data
  - migration SQL versionnee pour table(s) de dedup/idempotence et journal de reprise si necessaire

### Testing Requirements

Tests backend minimaux:

- idempotence stricte sur replay d'items offline
- conflits qualifies (transition invalide, version stale, scope invalide)
- enforcement guards/permissions/scope tenant-exercice
- journalisation complete des tentatives

Tests frontend minimaux:

- saisie offline avec persistence locale survive refresh
- reprise automatique apres reconnexion
- affichage supervision statuts/retries/conflits
- action de relance manuelle et messages utilisateur actionnables
- non-regression du parcours auth/refresh token pendant sync

Tests E2E resiliences:

- scenario reseau down -> operations queuees -> reseau up -> sync complete sans perte
- scenario conflit reel avec resolution utilisateur
- scenario multi-tenant garantissant l'absence de cross-scope.

### Previous Story Intelligence

- Story precedente `8-1-mettre-en-place-flux-dintegration-asynchrones.md` insiste sur:
  - correlationId obligatoire,
  - idempotence,
  - supervision des rejets,
  - isolation tenant/exercice.
- Pour 8.2, ces memes invariants doivent etre appliques aux operations offline, sinon risque de divergence entre filiere "async legacy" et filiere "offline-sync".

### Git Intelligence Summary

Tendances des 5 derniers commits:

- Forte livraison de modules backend+frontend complets avec tests associes (`tresorerie`, `controle-interne`, `analyses`).
- Pattern recurrent: ajout service backend + DTO + controller + hook/service front + spec backend + spec Playwright.
- Cette story doit conserver ce pattern atomique (pas de migration partielle non testee).

### Latest Tech Information

- Le comportement de guards NestJS et d'autorisation policy-based reste la pratique recommandee pour bloquer les acces hors scope.
- Les guides React Query v5 confirment la necessite de query keys stables pour eviter invalidations imprévisibles en contexte de sync/retry.
- La doc PostgreSQL confirme que `NOTIFY` est un signal, pas un mecanisme de persistance/rejeu: conserver une queue durable pour la reprise offline.

### Project Context Reference

- `/_bmad-output/project-context.md`
- `/_bmad-output/planning-artifacts/epics.md`
- `/_bmad-output/planning-artifacts/prd.md`
- `/_bmad-output/implementation-artifacts/8-1-mettre-en-place-flux-dintegration-asynchrones.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/controle-interne/controle-interne.controller.ts`
- `backend/src/controle-interne/controle-interne.service.ts`
- `backend/src/auth/tenant-exercice-scope.guard.ts`
- `src/services/api/http-client.ts`
- `src/services/api/controle-interne.service.ts`
- `src/hooks/useControleInterne.ts`
- `src/services/api/tresorerie.service.ts`
- `src/hooks/useTresorerie.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Instructions: `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Backend lint: `pnpm --dir backend run lint` ✅
- Backend tests: `pnpm --dir backend run test -- offline-sync.service.spec.ts` ✅
- Frontend lint: `pnpm run lint:frontend` ✅
- Frontend tests: `pnpm exec playwright test tests/offline-sync-client.spec.ts` ✅

### Completion Notes List

- Ajout d'un module backend `offline-sync` (controller/service/dto/types/module) avec idempotence, journalisation des tentatives et statuts `queued/syncing/synced/failed/conflict`.
- Ajout d'une migration SQL dédiée (`offline_sync_events` + `offline_sync_attempts`) avec clé idempotente unique, index de supervision/retry et trigger `updated_at`.
- Extension du guard `TenantExerciceScopeGuard` pour couvrir les routes `offline-sync` et garantir le scope tenant/exercice.
- Ajout côté frontend d'un contrat `OfflineSyncItem`, d'une queue locale persistante (localStorage versionnée), d'un orchestrateur de reprise auto (`online` + heartbeat), et d'un hook runtime global.
- Ajout d'un panneau de supervision/reprise offline dans `Controle Interne` (statuts, retries, conflits, relance manuelle).
- Aucun nouvel appel runtime Supabase introduit.

### File List

- _bmad-output/implementation-artifacts/8-2-gerer-mode-degrade-et-reprise-apres-reconnexion.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/src/app.module.ts
- backend/src/auth/tenant-exercice-scope.guard.ts
- backend/src/offline-sync/offline-sync.controller.ts
- backend/src/offline-sync/offline-sync.module.ts
- backend/src/offline-sync/offline-sync.service.ts
- backend/src/offline-sync/offline-sync.service.spec.ts
- backend/src/offline-sync/offline-sync.types.ts
- backend/src/offline-sync/dto/offline-sync.dto.ts
- src/App.tsx
- src/pages/app/ControleInterne.tsx
- src/components/controle-interne/OfflineSyncPanel.tsx
- src/components/offline-sync/OfflineSyncRuntime.tsx
- src/hooks/useOfflineSync.ts
- src/services/api/offline-sync.service.ts
- src/services/offline/offline-sync-queue.ts
- src/types/offline-sync.types.ts
- supabase/migrations/20260309193000_story_8_2_offline_sync.sql
- tests/offline-sync-client.spec.ts

### Change Log

- 2026-03-09: Implémentation story 8.2 terminée (offline queue durable, reprise automatique, idempotence backend, conflits qualifiés, supervision/retry, tests ciblés).
