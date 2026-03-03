# Story 2.3 - Isoler les donnees et politiques par tenant

Status: done
Epic: 2 - Gouvernance d'acces, roles et isolation multi-tenant
Story Key: 2-3-isoler-les-donnees-et-politiques-par-tenant
Created: 2026-03-02

## Story

As a admin plateforme,
I want une isolation stricte par tenant,
So that les donnees et configurations ne fuient jamais entre organisations.

## Acceptance Criteria

1. **Given** plusieurs tenants actifs
   **When** un utilisateur interroge des ressources
   **Then** seules les donnees de son tenant sont retournees
   **And** tout acces cross-tenant est refuse explicitement.

2. **Given** des politiques de retention configurees
   **When** un admin client met a jour la politique de son tenant
   **Then** la politique est persistante et versionnee par tenant
   **And** elle n'impacte aucun autre tenant.

## Scope Technique (MVP Story 2.3)

- Backend NestJS:
  - renforcement de l'isolation tenant sur la lecture/ecriture des ressources metier ciblees,
  - endpoint(s) de gestion de politique de retention par tenant,
  - verification d'autorisation sur les operations de gouvernance.
- Persistence PostgreSQL:
  - migration versionnee pour stocker les politiques de retention tenant-scoped,
  - contraintes d'integrite garantissant l'unicite et la non-fuite inter-tenant.
- Audit:
  - journalisation des operations de changement de politique (`tenantId`, auteur, version, horodatage, action).

## Out of Scope

- Decommission complete de Supabase.
- Refactor global de tous les modules metier vers le meme modele tenant (a traiter story par story).
- Moteur legal complet multi-juridiction avance (MVP = parametres de retention tenant avec base extensible).

## Tasks / Subtasks

- [x] Definir le schema de politique de retention tenant-scoped (AC: 2)
  - [x] Ajouter migration SQL versionnee pour table de politiques tenant (`tenant_id`, parametres, version, `updated_at`).
  - [x] Ajouter index/contrainte d'unicite sur la cle fonctionnelle par tenant.
  - [x] Garantir strategy non destructive (historique/version ou audit de changement).

- [x] Exposer les endpoints de politique de retention par tenant (AC: 2)
  - [x] Implementer lecture + mise a jour sur API NestJS.
  - [x] Restreindre l'acces via `JwtAuthGuard` + `AuthorizationPolicyGuard` (role de gouvernance).
  - [x] Refuser toute mutation si `actor.tenantId !== targetTenantId` (sauf `super_admin`).

- [x] Renforcer l'isolation tenant sur ressources existantes prioritaires (AC: 1)
  - [x] Verifier et harmoniser les filtres tenant sur services cibles deja actifs (auth, referentiels budgetaires) - verification explicite sur `backend/src/auth/auth.service.ts` + `backend/src/budget-referentiels/budget-referentiels.service.ts`, aucun changement necessaire sur referentiels.
  - [x] Uniformiser les erreurs cross-tenant (`ForbiddenException: Access hors tenant refuse`).
  - [x] Eviter toute duplication: reutiliser les helpers/gardes existants avant de creer de nouveaux composants.

- [x] Etendre la tracabilite des decisions tenant/politiques (AC: 1, 2)
  - [x] Journaliser les refus/allow critiques sans donnees sensibles.
  - [x] Ajouter event payload minimal et stable pour audit externe.

- [x] Couvrir par tests unitaires + integration/e2e (AC: 1, 2)
  - [x] Unit: service de politique retention (tenant ownership, versioning, validation).
  - [x] E2E: acces autorise dans tenant A, refus cross-tenant tenant B.
  - [x] E2E: update politique tenant A n'affecte pas tenant B.

## Dev Notes

### Contexte architecture et continuite

- Story precedente 2.2 a deja etabli:
  - RBAC/ABAC et separation des responsabilites,
  - blocage explicite inter-tenant pour assign/revoke role,
  - audit minimal des decisions d'autorisation.
- Story 2.5 a introduit persistence PostgreSQL et discipline "migrations versionnees d'abord".
- Story 3.1 a deja prouve un pattern robuste d'isolation tenant sur referentiels (filtres `clientId`, guards, tests e2e cross-tenant).

### Reuse obligatoire (ne pas reinventer)

- Reutiliser `JwtAuthGuard` pour reconstruire le `request.user` depuis les donnees courantes (`backend/src/auth/jwt-auth.guard.ts`).
- Reutiliser `AuthorizationPolicyGuard` / `AuthorizationPolicyService` pour les permissions endpoint.
- Reutiliser les patterns de controle inter-tenant dans `AuthService.assertTenantRoleManagement`.
- Reutiliser les patterns de filtrage et de refus dans `BudgetReferentielsService`:
  - `filterByTenant(...)`,
  - `getByTenantOrThrow(...)`,
  - erreurs `Access hors tenant refuse`.
- Reutiliser le pattern migration + repository DB deja applique dans `refresh-token.store.ts`.

### Contraintes techniques critiques

- Aucune nouvelle dependance runtime Supabase cote backend metier.
- Toutes les nouvelles donnees de politique doivent etre stockees en PostgreSQL via migration SQL versionnee.
- Les requetes doivent toujours appliquer le scope tenant explicitement (`WHERE tenant_id = $currentTenantId`) avant toute logique supplementaire.
- Ne jamais exposer de donnees sensibles dans les logs d'autorisation.
- Conserver des DTO stricts (class-validator) pour config retention.

### Bibliotheques et versions en place (reference repo)

- NestJS `^10.4.22`
- `@nestjs/jwt` `^10.2.0`
- `pg` `^8.19.0`
- TypeScript backend `^5.9.3`
- Package manager: `pnpm@9.12.0`

Aucun changement de version n'est requis pour cette story; priorite a la coherence avec le stack deja en production locale.

### Structure de fichiers recommandee

- Backend auth/policies:
  - `backend/src/auth/*` (guards, policies, audit)
- Nouveau module retention (suggestion de structure):
  - `backend/src/tenant-policies/tenant-policies.controller.ts`
  - `backend/src/tenant-policies/tenant-policies.service.ts`
  - `backend/src/tenant-policies/dto/*.ts`
- Migration SQL:
  - `supabase/migrations/<timestamp>_tenant_retention_policies.sql`

Si le module est tres leger, preferer extension minimale d'un module existant au lieu d'introduire un nouveau module.

### Risques / pieges a eviter

- Reintroduire une creation de schema runtime au lieu d'une migration versionnee.
- Verifier uniquement le tenant dans le token sans revalidation utilisateur courant.
- Oublier de tester le cas "meme endpoint, token autre tenant".
- Coder une politique retention globale non scopee tenant.

### Test strategy minimale (obligatoire)

- `pnpm --dir backend run lint`
- `pnpm --dir backend run test`
- Tests a ajouter:
  - integration/e2e cross-tenant denial sur endpoints retention,
  - validation de non-propagation des changements entre tenants,
  - verification du payload audit minimal (pas de champs sensibles).

## Project Structure Notes

- Respecter l'architecture migration en cours: logique metier dans NestJS, frontend decouple via client API.
- Garder des changements atomiques sur le domaine Epic 2 (IAM/multi-tenant), sans refactor transverse non lie.
- Toute evolution DB doit rester rejouable localement via les scripts existants (`pnpm run db:migrate`).

## References

- Story source (Epic 2 / Story 2.3): `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md`
- PRD multi-tenant et retention (FR40-FR42, NFR14): `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md`
- Regles projet migration/NestJS: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md`
- Pattern d'isolation tenant deja en place: `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/budget-referentiels/budget-referentiels.service.ts`
- Guard scope tenant/exercice: `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/tenant-exercice-scope.guard.ts`
- Guard JWT + revalidation user: `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/jwt-auth.guard.ts`
- Service autorisation et SoD: `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization-policy.service.ts`
- Story precedente (2.2): `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/2-2-appliquer-rbac-et-separation-des-responsabilites.md`
- Story PostgreSQL/migrations (2.5): `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/2-5-persister-refresh-tokens-en-postgresql.md`
- Historique git recent (patterns auth): `fdcea16`, `c47ab9b`, `b2a3d27`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow `create-story` execute avec selection explicite de story key `2-3-isoler-les-donnees-et-politiques-par-tenant`.
- Contexte charge: `epics.md`, `prd.md` (sections FR40-FR42/NFR14), `project-context.md`, stories 2.2 + 2.5, services backend et tests e2e.
- Mode `#yolo` active sur dev-story: implementation continue de l'etape 3 a l'etape 10 sans pause interactive.
- RED -> GREEN -> REFACTOR execute sur la story: e2e retention ecrits en premier (404 attendu), puis module NestJS + migration + tests unitaires/e2e.
- Validations executees: `pnpm --dir backend run lint`, `pnpm --dir backend run test` (toutes suites passantes).

### Completion Notes List

- Story context enrichi avec garde-fous de reuse et anti-duplication.
- Dependances inter-story documentees (2.2, 2.5, 3.1 patterns).
- Tests critiques cross-tenant explicites pour prevenir regressions de securite.
- Module `tenant-policies` ajoute (controller + service + DTO) avec guards `JwtAuthGuard` + `AuthorizationPolicyGuard` et permissions de gouvernance dediees.
- Persistence/versioning implementes via migration SQL `tenant_retention_policies` (historique non destructif, index d'unicite tenant+cle+version, current unique).
- Isolation cross-tenant renforcee: refus explicite `Access hors tenant refuse` pour mutations hors scope (sauf `super_admin`) et harmonisation du message dans `AuthService`.
- Audit minimal stable ajoute sur policies (allow/deny, tenantId, actorId, action, version, reason, timestamp) sans donnees sensibles.
- Correctif review P1/P2 applique: verrou transactionnel + retry sur versioning concurrent, validation d'existence du tenant cible, test e2e de lecture cross-tenant, et migration de borne max DB (`retention_days <= 36500`).
- Correctifs review complementaires appliques: refus strict de lecture cross-tenant (y compris `super_admin`), couverture e2e deny/audit renforcee, et introduction d'un catalogue `tenants` comme source de verite prioritaire pour l'existence tenant.

### File List

- _bmad-output/implementation-artifacts/2-3-isoler-les-donnees-et-politiques-par-tenant.md
- backend/src/tenant-policies/tenant-policies.service.spec.ts
- backend/src/tenant-policies/tenant-policies.service.ts
- backend/src/users/users.service.ts
- backend/test/tenant-policies.e2e.spec.ts
- supabase/migrations/20260303023500_tenant_retention_policies_max_retention_days.sql
- supabase/migrations/20260303031000_create_tenants_catalog.sql

## Change Log

- 2026-03-02: Story 2.3 creee avec contexte implementation complet et statut `ready-for-dev`.
- 2026-03-02: Story 2.3 implementee (module tenant policies, migration versionnee, tests unitaires/e2e, harmonisation erreur cross-tenant) et statut passe a `review`.
- 2026-03-02: Correctifs de review appliques (P1/P2): robustesse concurrence versioning, validation tenant cible, couverture e2e lecture cross-tenant et contrainte DB de borne max.
- 2026-03-02: Correctifs review P2/P3 appliques: isolation stricte sur lecture cross-tenant, renforcement tests e2e (read deny super-admin + audit deny), verification tenant via catalogue dedie (`public.tenants`), et synchronisation File List avec les fichiers modifies.

## Senior Developer Review (AI)

### Date

2026-03-02

### Reviewer

Max (AI)

### Findings Addressed

- [x] [P2] Couverture e2e completee: ajout scenario explicite de lecture cross-tenant par `super_admin` (refus attendu) et test dedie de payload audit deny minimal sur `tenant-policies`.
- [x] [P3] AC1 aligne avec implementation: lecture cross-tenant desormais refusee explicitement, y compris pour `super_admin`.
- [x] [P3] Tracabilite story/git regularisee: File List alignee sur les fichiers modifies dans cette vague de correction.
- [x] [P2] Existence tenant decouplee des seuls utilisateurs actifs: verification prioritaire via catalogue `public.tenants` (fallback legacy si table absente).

### Verification

- `pnpm --dir backend run lint` ✅
- `pnpm --dir backend run test -- tenant-policies` ✅

### Outcome

- Decision: **Approve**
- Story status: **done**
