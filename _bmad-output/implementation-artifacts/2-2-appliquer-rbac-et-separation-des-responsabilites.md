# Story 2.2 - Appliquer RBAC et separation des responsabilites

Status: done
Epic: 2 - Gouvernance d'acces, roles et isolation multi-tenant
Story Key: 2-2-appliquer-rbac-et-separation-des-responsabilites
Created: 2026-03-02

## Story

As a admin client,
I want attribuer/revoquer des roles metiers,
So that chaque acteur n'accede qu'aux actions autorisees.

## Acceptance Criteria

1. **Given** un utilisateur avec un role defini
   **When** il tente une action sensible
   **Then** les guards RBAC/ABAC appliquent les regles d'acces
   **And** la reponse HTTP est coherente avec la politique (autorise ou refuse).

2. **Given** une operation impliquant separation des responsabilites
   **When** un meme acteur cumule des droits incompatibles (ordonnateur/comptable)
   **Then** l'operation est bloquee
   **And** un motif explicite est retourne cote API.

3. **Given** une modification de role utilisateur
   **When** l'admin attribue ou revoque un role
   **Then** le changement est persiste
   **And** il prend effet sur les appels suivants sans comportement ambigu.

4. **Given** un acces refuse pour raison de role/politique
   **When** l'evenement est traite
   **Then** un log d'audit minimal est emis avec `userId`, `tenantId`, action ciblee, decision et horodatage
   **And** aucune donnee sensible n'est exposee.

## Scope Technique (MVP Story 2.2)

- Backend NestJS:
  - guards RBAC/ABAC sur endpoints sensibles
  - service/politique de separation des responsabilites
  - endpoint(s) de gestion d'attribution/revocation de roles
- Persistence:
  - stockage des roles utilisateur et regles associees
- Audit:
  - journalisation des decisions d'autorisation et refus critiques

## Out of Scope

- Isolation complete multi-tenant des donnees (Story 2.3)
- Refonte globale des ecrans frontend de gouvernance des roles
- Moteur d'autorisation generique cross-domain au-dela du perimetre Epic 2

## Tasks / Subtasks

- [x] Definir le modele d'autorisation RBAC/ABAC (AC: 1, 2)
  - [x] Lister les roles metiers et permissions associees
  - [x] Modeliser les politiques de separation ordonnateur/comptable
  - [x] Aligner les statuts d'erreur API pour refus d'autorisation

- [x] Implementer les guards d'autorisation NestJS (AC: 1, 2)
  - [x] Ajouter/etendre guards decorateurs role/policy sur endpoints sensibles
  - [x] Integrer evaluation ABAC avec contexte minimal (user, role, tenant, action)
  - [x] Bloquer explicitement les combinaisons de responsabilites incompatibles

- [x] Implementer gestion des roles utilisateur (AC: 3)
  - [x] Creer ou completer les endpoints d'attribution/revocation de roles
  - [x] Persister les changements de roles de facon idempotente
  - [x] Verifier la prise d'effet immediate sur les autorisations suivantes

- [x] Ajouter audit et tracabilite des decisions (AC: 4)
  - [x] Emettre logs structures pour autorisations/refus critiques
  - [x] Inclure userId/tenantId/action/decision/horodatage
  - [x] Exclure toute donnee sensible des logs

- [x] Couvrir par tests backend (AC: 1, 2, 3, 4)
  - [x] Tests unitaires des politiques RBAC/ABAC et separation des responsabilites
  - [x] Tests d'integration des endpoints proteges (autorise vs refuse)
  - [x] Tests d'integration attribution/revocation de roles et prise d'effet

## Dev Notes

### Contexte architecture et guardrails

- Le backend NestJS introduit en Story 2.1 est la base d'implementation.
- Les nouvelles regles d'autorisation doivent vivre cote backend (pas dans les composants UI).
- Ne pas introduire de dependance runtime Supabase pour cette story.

### Contraintes de mise en oeuvre

- Appliquer les guards sur les endpoints sensibles en priorite.
- Conserver des messages d'erreur actionnables sans fuite d'information sensible.
- Garantir une logique deterministe sur les cas de separation des responsabilites.

### Test strategy minimale

- Unit: evaluation permissions par role, conflits de separation.
- Integration: acces autorise/refuse sur endpoints critiques.
- Non-regression: aucun impact sur les flux auth deja valides en Story 2.1.

### References

- Source story: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.2)
- Story precedente: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/2-1-mettre-en-place-lauth-nestjs-jwt-refresh.md`
- Sprint tracker: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Chargement workflow BMAD `dev-story` + contexte projet + story cible 2.2.
- Story 2.2 detectee en `ready-for-dev` puis basculee en `in-progress`.
- Validation locale complete executee: `pnpm run lint`, `pnpm run test` (racine) et `pnpm --dir backend run lint/test`.

### Implementation Plan

- Introduire un modele centralise roles/permissions et une politique SoD ordonnateur/comptable.
- Ajouter un guard de policy (RBAC/ABAC) avec audit de chaque decision d'autorisation.
- Proteger les endpoints sensibles avec permissions explicites.
- Ajouter endpoints d'attribution/revocation de roles et persistance idempotente.
- Assurer prise d'effet immediate via rechargement des roles persistes dans `JwtAuthGuard`.
- Ajouter tests unitaires et d'integration/e2e couvrant AC 1-4.

### Completion Notes List

- Modele d'autorisation centralise ajoute (`authorization.types.ts`) avec roles metiers, permissions et regles SoD.
- Guard `AuthorizationPolicyGuard` implemente avec evaluation ABAC minimale (utilisateur/roles/tenant/action) et refus explicites.
- Audit minimal des decisions d'autorisation implemente (`AuthorizationAuditService`) avec `userId`, `tenantId`, `action`, `decision`, `timestamp`.
- Endpoints role management ajoutes:
  - `PATCH /auth/users/:userId/roles/assign`
  - `PATCH /auth/users/:userId/roles/revoke`
- Persistance idempotente des roles implemente dans `UsersService` (memory + postgres).
- Prise d'effet immediate des changements de role garantie en rechargeant les roles courants a chaque requete auth (guard JWT).
- Endpoints budget sensibles migres vers permissions explicites (`RequirePermissions`) avec guard de policy.
- Couverture tests ajoutee:
  - unit policy RBAC/ABAC + SoD,
  - e2e endpoints proteges autorise/refuse,
  - e2e assign/revoke avec effet immediat.
- Validation globale verte:
  - `pnpm run lint`
  - `pnpm run test`
- Correctifs review appliques:
  - `admin_client` autorise a gerer les roles (`roles:manage`) pour respecter le persona AC3.
  - Blocage explicite des operations inter-tenant sur assign/revoke role (sauf `super_admin`).
  - Blocage explicite de l'attribution de roles incompatibles SoD (`ordonnateur` + `comptable`).
  - Tests additionnels sur gestion de roles admin_client, garde-fou inter-tenant, blocage SoD a l'attribution.
  - Validation de la trace d'audit minimale via e2e + test unitaire `AuthorizationAuditService` (timestamp + absence de donnees sensibles).

### Senior Developer Review (AI)

- Review executee avec 4 findings (2 High, 2 Medium).
- Decision utilisateur: correction automatique des issues High/Medium.
- Resultat: findings corrigees et verifiees par `pnpm --dir backend run lint` et `pnpm --dir backend run test`.

### File List

- _bmad-output/implementation-artifacts/2-2-appliquer-rbac-et-separation-des-responsabilites.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/src/auth/auth.controller.ts
- backend/src/auth/auth.module.ts
- backend/src/auth/auth.service.ts
- backend/src/auth/jwt-auth.guard.ts
- backend/src/auth/authorization-audit.service.ts
- backend/src/auth/authorization-audit.service.spec.ts
- backend/src/auth/authorization-policy.guard.ts
- backend/src/auth/authorization-policy.service.ts
- backend/src/auth/authorization-policy.service.spec.ts
- backend/src/auth/authorization.types.ts
- backend/src/auth/permissions.decorator.ts
- backend/src/auth/dto/assign-role.dto.ts
- backend/src/auth/dto/revoke-role.dto.ts
- backend/src/budget-referentiels/budget-referentiels.controller.ts
- backend/src/budget-referentiels/budget-referentiels.module.ts
- backend/src/users/users.service.ts
- backend/test/auth.e2e.spec.ts
- backend/test/budget-referentiels.e2e.spec.ts

## Change Log

- 2026-03-02: Story 2.2 implementee (RBAC/ABAC + SoD + role assignment/revocation idempotent + audit decisions + tests unit/e2e), statut passe a `review`.
- 2026-03-02: Revue senior corrigee (admin_client role management, protection inter-tenant assign/revoke, blocage SoD a l'attribution, couverture audit renforcee), statut passe a `done`.
