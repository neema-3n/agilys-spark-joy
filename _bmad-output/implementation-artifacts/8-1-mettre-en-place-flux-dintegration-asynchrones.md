# Story 8.1: Mettre en place flux d'integration asynchrones

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a integrateur SI,
I want echanger avec ERP/Tresor en asynchrone,
so that les interruptions ponctuelles ne bloquent pas l'activite.

## Acceptance Criteria

1. **Emission asynchrone avec correlation ID obligatoire**
   - **Given** une transition metier critique eligible a l'integration (engagement, depense, paiement)
   - **When** le backend publie un message sortant vers le canal legacy
   - **Then** chaque message contient un `correlationId` unique et stable, plus `tenantId`, `exerciceId`, `sourceType`, `sourceId`, `eventType`, `occurredAt`
   - **And** le message est persiste dans une file/outbox rejouable avant emission effective.

2. **Ingestion asynchrone idempotente des retours legacy**
   - **Given** des messages entrants (ACK, rejet, statut metier) du legacy
   - **When** le backend consomme un message entrant
   - **Then** le traitement est idempotent (pas de doublon sur `correlationId` + type d'evenement)
   - **And** les statuts de traitement (`received`, `processed`, `failed`, `dead-letter`) sont journalises avec horodatage et raison.

3. **Traçabilite complete des rejets et resolution**
   - **Given** un message rejete ou en erreur
   - **When** un utilisateur habilite consulte la supervision d'integration
   - **Then** le systeme expose motif, severite, date de detection, proprietaire de resolution, statut de reprise
   - **And** il permet le retry controle sans perdre l'historique des tentatives.

4. **Isolation tenant/exercice et securite**
   - **Given** un environnement multi-tenant
   - **When** des flux asynchrones sont emis/consommes
   - **Then** aucune donnee cross-tenant ou hors exercice cible n'est lue/ecrite
   - **And** les endpoints de supervision/rejeu restent proteges par `JwtAuthGuard`, `AuthorizationPolicyGuard` et permissions explicites.

5. **Observabilite operationnelle et SLA de reprise**
   - **Given** des interruptions temporaires du legacy
   - **When** le systeme reprend la connectivite
   - **Then** la file est drainable sans perte et avec ordre metier deterministe pour une meme entite
   - **And** les indicateurs de detection/reprise couvrent les cibles NFR22/NFR23/NFR24 (reprise auto, delai de detection, faible taux de doublon).

## Tasks / Subtasks

- [x] Definir le contrat d'evenement asynchrone canonical (`eventType`, `correlationId`, `tenantId`, `exerciceId`, `sourceType`, `sourceId`, `payload`, `occurredAt`, `schemaVersion`) et le partager backend/front (AC: 1, 2)
- [x] Ajouter/etendre la persistence pour outbox + journal de traitement entrant avec index d'idempotence (`correlationId`, `eventType`, `direction`) (AC: 1, 2, 3)
- [x] Implementer un service backend de publication asynchrone avec retry exponentiel borne et dead-letter (AC: 1, 5)
- [x] Implementer un consumer entrant idempotent et deterministic replay-safe (AC: 2, 5)
- [x] Exposer des endpoints de supervision/rejeu (ou etendre ceux existants) en conservant les guards/perms existants (AC: 3, 4)
- [x] Reutiliser les patterns de trace/correlation deja en place dans le domaine tresorerie/audit au lieu de creer une seconde filiere de trace (AC: 1, 3)
- [x] Etendre le service API frontend et hooks React Query pour lister erreurs/rejets et declencher retries autorises (AC: 3, 4)
- [x] Ajouter journalisation metier actionnable (reason codes normalises + metadata de reprise) (AC: 3, 5)
- [x] Valider qu'aucune nouvelle dependance runtime Supabase n'est introduite (AC: 4)
- [x] Produire tests backend + front couvrant nominal, idempotence, erreurs/retry, isolation tenant, permissions (AC: 1, 2, 3, 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 8, Story 8.1).
- FR directes:
  - `FR33`: echanges asynchrones ERP/Tresor
  - `FR34`: correlation ID obligatoire sur flux critiques
  - `FR35`: suivi des rejets/divergences jusqu'a resolution
- NFR cibles prioritaires:
  - `NFR22`: reprise automatique >= 99% en <= 15 min
  - `NFR23`: detection des divergences <= 5 min (p95)
  - `NFR24`: idempotence des integrations (doublons <= 0,01%)
  - `NFR9`: journalisation des actions critiques
  - `NFR8`: controles d'acces stricts sur operations sensibles.

### Developer Context Section

- Le repo dispose deja d'une base solide de traçabilite et correlation:
  - `backend/src/tresorerie/tresorerie.service.ts` manipule deja `correlationId`, timeline d'evenements et statuts d'audit.
  - `backend/src/tresorerie/dto/tresorerie.dto.ts` formalise les filtres de consultation (`correlationId`, `sourceType`, `status`, pagination).
  - `src/services/api/tresorerie.service.ts` + `src/hooks/useTresorerie.ts` montrent le pattern frontend officiel: service API unifie + React Query.
  - `backend/src/tresorerie/tresorerie.controller.ts` fournit deja la reference de securisation endpoint (`JwtAuthGuard` + `AuthorizationPolicyGuard` + permissions).
- Point important: il n'existe pas encore de module dedie `integration-legacy` dans `backend/src`; la story doit donc creer l'abstraction propre sans casser les conventions existantes.
- Anti-patterns a eviter:
  - implémenter une logique d'integration directement dans les composants React
  - dupliquer un schema de correlation parallele a celui deja utilise en tresorerie/audit
  - coupler le retry/replay a des actions manuelles non tracees
  - faire transiter des donnees cross-tenant faute de garde scope explicite.

### Technical Requirements

- Construire un flux asynchrone robuste autour d'une **outbox persistante** + worker de dispatch (pas de publish direct fire-and-forget depuis un use-case HTTP).
- Garantir l'idempotence d'entree et de sortie avec cle metier composee (`correlationId`, `eventType`, `direction`) et contraintes DB explicites.
- Maintenir un machine-state de traitement integration (`queued`, `sent`, `acked`, `failed`, `dead_letter`, `replayed`) et timestamp de chaque transition.
- Journaliser chaque tentative de livraison/rejeu avec `actor`, `reasonCode`, `attempt`, `nextRetryAt`.
- Definir des timeouts/retry bornes et un circuit de dead-letter pour eviter les boucles infinies.
- Exposer une supervision paginee et filtrable (statut, severite, correlationId, intervalle) reutilisant les patterns `requestJson`/`ApiError` cote frontend.

### Architecture Compliance

- Regles projet a respecter (source: `/_bmad-output/project-context.md`):
  - aucune nouvelle dependance runtime Supabase
  - logique metier critique cote NestJS
  - frontend via client API unifie + React Query
  - reutiliser avant de creer.
- Pour cette story:
  - backend NestJS doit rester source de verite de l'etat d'integration
  - pas de generation de correlation ID cote UI
  - pas de bypass de guard/permission sur endpoints de supervision/rejeu
  - mapping `snake_case` DB -> `camelCase` API explicite et teste.

### Library / Framework Requirements

Versions pertinentes observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, `@tanstack/react-query` `5.83.0`
- Backend: NestJS `10.4.22`
- Runtime scripts: Node.js APIs (`node:crypto`, `fs/promises`) deja utilisees pour integrite/manifeste

Informations techniques recentes a prendre en compte:

- NestJS guards/authorization: garder la strategie de guards declaratifs par route et policy guard, sans logique d'autorisation dans les controllers. Sources:
  - https://docs.nestjs.com/guards
  - https://docs.nestjs.com/security/authorization
- TanStack Query v5: conserver des `queryKey` stables et une couche service API unique pour eviter les invalidations fragiles. Source:
  - https://tanstack.com/query/v5
- PostgreSQL `LISTEN/NOTIFY` peut aider pour signaux internes, mais ne remplace pas une outbox durable pour garanties de livraison; l'outbox reste la base. Source:
  - https://www.postgresql.org/docs/current/sql-notify.html

Decision pour cette story:

- Aucun upgrade de dependance requis.
- Prioriser une implementation outbox + worker NestJS + supervision API.
- Toute evolution d'infrastructure (broker externe) doit etre encapsulee derriere une interface, sans fuite dans les couches UI/metier.

### File Structure Requirements

Touchpoints probables (a confirmer pendant implementation):

- Backend
  - `backend/src/tresorerie/tresorerie.controller.ts` (extension supervision integration si mutualisee)
  - `backend/src/tresorerie/tresorerie.service.ts` (reutilisation correlation/audit)
  - `backend/src/tresorerie/dto/tresorerie.dto.ts` (filtres/statuts si surface commune)
  - `backend/src/<nouveau-domaine-integration>/` pour outbox/consumer si separation nette necessaire
- Frontend
  - `src/services/api/tresorerie.service.ts` (ou nouveau service integration, si scope depasse tresorerie)
  - `src/hooks/useTresorerie.ts` (ou hook dedie integration)
  - ecran de supervision existant le plus proche (`ControleInterne`/tresorerie) avant creation de nouvel ecran
- Persistence
  - migrations SQL versionnees pour tables outbox/journal-integration + indexes idempotence

Regles structurelles:

- Garder les contrats DTO dans `backend/src/**/dto`.
- Eviter d'introduire des routes techniques non namespacees (`/integration` global) sans alignement de domaine.
- Centraliser modeles de statut/integration dans types partages si exposes au frontend.

### Testing Requirements

Tests backend obligatoires:

- publication nominale outbox -> dispatch -> ack
- redelivery idempotente (pas de doublon)
- gestion reject + dead-letter + retry borne
- refus cross-tenant / exercice incoherent
- enforcement permissions sur endpoints supervision/rejeu

Tests frontend/contrat:

- affichage supervision (loading/empty/error/data)
- filtres par `status`, `correlationId`, periode
- message utilisateur actionnable sur echec de retry
- non-regression des hooks React Query existants

Validation qualité avant `done`:

- lint/typecheck clean (front + back)
- absence d'appel runtime Supabase ajoute
- preuve que `correlationId` reste present sur 100% des evenements critiques manipules.

### Latest Tech Information

- Les patterns NestJS recommendent de garder l'autorisation dans guards/decorators et non dans la logique metier des handlers HTTP.
- TanStack Query v5 confirme les patterns de cache par `queryKey` deterministes et invalidation ciblee.
- PostgreSQL `NOTIFY` est utile comme signal, mais l'outbox transactionnelle reste la mecanique fiable pour integration asynchrone rejouable.

### Project Context Reference

- `/_bmad-output/project-context.md` (regles migration et anti-patterns)
- `/_bmad-output/planning-artifacts/epics.md` (Epic 8 / Story 8.1)
- `/_bmad-output/planning-artifacts/prd.md` (FR33-FR35, NFR22-NFR24)
- `/_bmad-output/implementation-artifacts/sprint-status.yaml` (etat de workflow)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Instructions: `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Validation: `_bmad/bmm/workflows/4-implementation/dev-story/checklist.md`

### Completion Notes List

- Module backend `integration-legacy` cree avec outbox/journal idempotent, dispatch asynchrone et retry exponentiel borne vers dead-letter.
- Contrat canonical partage backend/front (`eventType`, `correlationId`, `tenantId`, `exerciceId`, `sourceType`, `sourceId`, `payload`, `occurredAt`, `schemaVersion`).
- Endpoints securises ajoutes: enqueue sortant, dispatch, ingestion entrante idempotente, supervision paginee, retry manuel.
- Service API frontend + hooks React Query ajoutes pour supervision et retry.
- Migration SQL ajoutee pour tables `integration_async_events` et `integration_async_event_attempts` avec index de de-duplication.
- Validations executees: `pnpm --dir backend run lint`, `pnpm --dir backend run test`, `pnpm exec eslint src/services/api/integration-legacy.service.ts src/hooks/useIntegrationLegacy.ts src/types/integration-legacy.types.ts`, `pnpm exec playwright test tests/integration-legacy-client.spec.ts --workers=1`, `pnpm exec eslint tests/integration-legacy-client.spec.ts`.

### File List

- _bmad-output/implementation-artifacts/8-1-mettre-en-place-flux-dintegration-asynchrones.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/src/app.module.ts
- backend/src/integration-legacy/dto/integration-legacy.dto.ts
- backend/src/integration-legacy/integration-legacy.controller.spec.ts
- backend/src/integration-legacy/integration-legacy.controller.ts
- backend/src/integration-legacy/integration-legacy.module.ts
- backend/src/integration-legacy/integration-legacy.service.spec.ts
- backend/src/integration-legacy/integration-legacy.service.ts
- backend/src/integration-legacy/integration-legacy.transport.ts
- backend/src/integration-legacy/integration-legacy.types.ts
- src/hooks/useIntegrationLegacy.ts
- src/services/api/integration-legacy.service.ts
- src/types/integration-legacy.types.ts
- supabase/migrations/20260309170000_story_8_1_integration_async_flows.sql
- tests/integration-legacy-client.spec.ts

## Change Log

- 2026-03-09: Implementation Story 8.1 completee (module integration legacy backend + migration SQL + service/hooks frontend + tests/validations, incluant tests frontend automatises integration legacy).
- 2026-03-09: Corrections post-code-review appliquees: validation stricte `tenant/exercice`, worker backend de drainage automatique de la file outbox, et gestion explicite des statuts entrants `failed/dead_letter` avec journalisation de raison.
