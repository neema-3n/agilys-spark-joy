# Story 3.4: Produire previsions et ecarts prevision/execution

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a controleur budget,
I want consolider les previsions et ecarts,
so that je pilote les risques de depassement.

## Acceptance Criteria

1. **Calcul d'ecart prevision/execution par axe et periode**
   - **Given** des lignes de prevision et des lignes budgetaires d'execution existent pour un tenant/exercice
   - **When** le calcul est lance pour une periode cible
   - **Then** l'ecart absolu et le taux d'ecart sont calcules par axe (section/programme/action/enveloppe)
   - **And** le resultat expose au minimum `montantPrevu`, `montantExecute`, `ecartMontant`, `ecartTaux`, `periode`, `axe`

2. **Consolidation multi-axes et filtrage metier**
   - **Given** un jeu de donnees multi-entites et multi-periodes
   - **When** l'utilisateur applique des filtres entite/periode/axe
   - **Then** les vues de suivi retournent une consolidation coherente avec le scope demande
   - **And** les aggregats restent consistants entre backend et affichage front

3. **Isolation stricte tenant + exercice + autorisation**
   - **Given** plusieurs tenants et exercices actifs
   - **When** un utilisateur consulte les ecarts
   - **Then** seules les donnees du `tenantId` et de l'exercice autorise sont accessibles
   - **And** les acces hors scope sont refuses via guards/policies et journalises

4. **Messages actionnables et robustesse de parcours**
   - **Given** une requete invalide ou des donnees insuffisantes
   - **When** le calcul/consolidation est execute
   - **Then** l'API renvoie une erreur metier explicite et actionnable
   - **And** le front affiche un etat degrade non bloquant (empty state ou alerte claire)

## Tasks / Subtasks

- [x] Ajouter un endpoint backend dedie au calcul d'ecart prevision/execution (AC: 1, 2, 3)
- [x] Implementer la logique de consolidation par axes et periode dans `PrevisionsService` en reutilisant les patterns SQL existants (AC: 1, 2)
- [x] Definir DTOs de requete/reponse types pour le rapport d'ecarts (AC: 1, 2, 4)
- [x] Garantir le scope `tenant + exercice` et permissions `referentiels:read` sur le nouvel endpoint (AC: 3)
- [x] Brancher le service API front `previsions.service.ts` avec une methode de recuperation des ecarts (AC: 1, 2)
- [x] Etendre `usePrevisions` (ou hook dedie) pour l'orchestration query/cache des ecarts (AC: 2, 4)
- [x] Integrer une vue de suivi ecarts dans `Previsions.tsx` en reutilisant composants UI existants (AC: 2, 4)
- [x] Ajouter tests backend (service + e2e) et tests frontend (hook/composant) couvrant nominal, autorisation, erreurs et non-regression (AC: 1, 2, 3, 4)
- [x] Verifier l'absence de nouvel appel direct Supabase dans le parcours metier (AC: 3)

## Dev Notes

### Story Requirements

- Source: `/_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.4).
- FR cible: FR4 (previsions periodiques) et FR5 (ecart prevision/execution), avec exigences transverses FR8/FR32 sur traçabilite.
- NFR a respecter prioritairement: NFR1, NFR2, NFR9, NFR11, NFR21.

### Developer Context Section

- Le module `previsions` existe deja cote backend (`backend/src/previsions/*`) avec CRUD scenarios/lignes et generation automatique, mais sans endpoint dedie de calcul d'ecarts consolides.
- Le front dispose deja de `Previsions.tsx`, `usePrevisions`, `previsions.service.ts` et composants `previsions/*`; la story doit etendre ce socle sans dupliquer la logique.
- Les donnees d'execution budgetaire sont deja exposees via lignes budgetaires (`useLignesBudgetaires`, composants reporting), ce qui permet de construire la comparaison prevision/execution en couche API backend.
- Le pattern d'isolement tenant/exercice et de guards JWT + policy est deja etabli dans le backend et doit etre conserve strictement.

### Technical Requirements

- Backend:
  - Ajouter un contrat d'API explicite (ex: `GET /previsions/ecarts` avec filtres `exerciceId`, `periode`, `sectionCode`, `programmeCode`, `actionCode`, `enveloppeId`).
  - Calculer pour chaque axe: `montantPrevu`, `montantExecute`, `ecartMontant`, `ecartTaux` (+ agregats globaux).
  - Utiliser aggregation SQL deterministe (group by axe/periode) et normalisation numerique explicite.
  - Retourner des erreurs metier actionnables (`periode invalide`, `exercice absent`, `aucune donnee`).
- Frontend:
  - Ajouter methode API typée dans `src/services/api/previsions.service.ts`.
  - Exposer query React Query pour les ecarts (cles scopees par client/exercice/periode/filtres).
  - Ajouter un onglet ou bloc de visualisation ecarts dans `src/pages/app/Previsions.tsx` avec etats loading/empty/error.
- Data/Schema impact:
  - Favoriser une implementation sans changement de schema si possible (jointure `lignes_prevision` + `lignes_budgetaires`).
  - Si migration necessaire, fournir SQL versionnee et rollback local compatible scripts pnpm.

### Architecture Compliance

- Aucune nouvelle dependance runtime Supabase dans le flux metier.
- Logique metier de consolidation exclusivement cote backend NestJS.
- Authz maintenue via `JwtAuthGuard` + `AuthorizationPolicyGuard` + permission `referentiels:read`.
- Une seule source de verite des ecarts: calcul backend (pas de recomputation divergente cote UI).
- Reuse obligatoire des abstractions existantes (`previsions.service.ts`, `usePrevisions`, composants UI `Card/Tabs/Table/Chart`).

### Library / Framework Requirements

Versions repository a conserver:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, Vite `5.4.19`.
- Backend: NestJS `10.4.22`, class-validator `0.14.4`, `pg` `8.19.0`.

Decision:

- Aucun upgrade de librairie requis pour cette story.
- Pas de nouvelle librairie de calcul/reporting: reutiliser stack actuelle.

### File Structure Requirements

Cibles probables (selon architecture existante):

- Backend:
  - `backend/src/previsions/previsions.controller.ts`
  - `backend/src/previsions/previsions.service.ts`
  - `backend/src/previsions/dto/previsions.dto.ts`
  - `backend/src/previsions/previsions.module.ts` (si wiring necessaire)
  - Tests: nouveau `backend/src/previsions/previsions.service.spec.ts` et extension `backend/test/*` pour e2e
- Frontend:
  - `src/services/api/previsions.service.ts`
  - `src/hooks/usePrevisions.ts`
  - `src/pages/app/Previsions.tsx`
  - Optionnel: nouveau composant dedie sous `src/components/previsions/` pour tableau/carte ecarts
  - Types: `src/types/prevision.types.ts`

Regles de structure:

- Eviter toute duplication du calcul d'ecart entre composants.
- Extraire un utilitaire type-safe si mapping/format ecart est reutilise a plusieurs endroits.

### Testing Requirements

1. Backend (obligatoire)
   - test nominal calcul ecart par axe/periode,
   - test consolidation multi-filtres,
   - test authorization/scope tenant-exercice,
   - test erreurs metier actionnables.

2. Frontend
   - test hook query ecarts (loading/success/error),
   - test rendu de la vue ecarts (donnees, empty state, erreur),
   - test non-regression parcours `Previsions` (creation scenario + affichage ecarts).

3. Qualite transversale
   - lint/typecheck clean,
   - verification explicite d'absence d'appels directs Supabase ajoutes.

### Previous Story Intelligence

Lecons de 3.3 a reutiliser:

- Garder les endpoints backend comme source unique de verite metier, avec DTO stricts et mappings explicites.
- Conserver l'exigence d'auditabilite et de scope fort tenant/exercice sur toutes lectures sensibles.
- Reutiliser les patterns de review: validations d'entree defensives, erreurs actionnables, couverture tests service + e2e.
- Eviter les `any` dans le front; privilegier des types partages stables pour limiter les regressions.

### Git Intelligence Summary

Observations recentes (5 commits):

- Accent fort sur stories atomiques, validation review et synchro de `sprint-status.yaml`.
- Activite recente sur vitrine/auth et audit migration, donc risque de regression transverse faible sur module previsions si scope respecte.
- Discipline de mise a jour documentaire et statut workflow deja en place; a conserver pour cette story.

Implication pour 3.4:

- Livrer un increment strictement borne au domaine previsions/ecarts.
- Eviter les refactors transverses non lies.

### Latest Tech Information

- Les versions lockees du repository couvrent les besoins de la story.
- Aucun changement de version/framework requis pour implementer le calcul d'ecarts.
- L'objectif est la fiabilite metier et la coherence des agregats, pas l'introduction de nouvelles technologies.

### Project Structure Notes

- Le projet est en migration progressive vers stack cible NestJS/PostgreSQL; cette story doit rester compatible avec cette trajectoire.
- Le domaine `previsions` est deja encapsule et constitue le point d'extension naturel pour FR4/FR5.
- Les visualisations existantes d'execution budgetaire peuvent etre reutilisees/adaptees pour presenter les ecarts de facon coherente UX.

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.4)
- `/_bmad-output/planning-artifacts/prd.md` (FR4, FR5 + NFR associes)
- `/_bmad-output/project-context.md` (regles migration et guardrails)
- `/_bmad-output/implementation-artifacts/3-3-versionner-les-decisions-budgetaires.md` (learnings)
- `backend/src/previsions/previsions.controller.ts`
- `backend/src/previsions/previsions.service.ts`
- `src/services/api/previsions.service.ts`
- `src/hooks/usePrevisions.ts`
- `src/pages/app/Previsions.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`
- Validation backend: `pnpm --dir backend run lint`
- Validation backend tests: `pnpm --dir backend run test`
- Validation frontend lint: `pnpm run lint:frontend`
- Validation frontend test cible: `pnpm exec playwright test tests/auth-migration.spec.ts --grep "buildEcartsPrevisionQueryKey"`
- Validation backend e2e cible: `pnpm --dir backend exec jest test/previsions.e2e.spec.ts`
- Validation frontend ecarts: `pnpm exec playwright test tests/previsions-ecarts.spec.ts`

### Completion Notes List

- Endpoint `GET /previsions/ecarts` ajoute avec filtres metier (`exerciceId`, `periode`, `sectionCode`, `programmeCode`, `actionCode`, `enveloppeId`) et protection `referentiels:read`.
- Consolidation backend implantee avec agrégations SQL previsions/execution, calculs `ecartMontant`/`ecartTaux`, controle scope tenant+exercice, et erreurs actionnables.
- Couche frontend etendue avec contrat typé ecarts, hook query/cache dedie, bloc de visualisation des ecarts dans `Previsions.tsx`, et composant de tableau reutilisable.
- Couverture de tests ajoutee (service backend + e2e backend + test frontend hook query key), avec lint/typecheck/tests backend passes.
- Correctifs review appliques: filtres metier UI (periode/axe/enveloppe), suppression des `any` sur le flux story, et journalisation explicite des acces hors scope tenant/exercice.
- Couverture de tests completee: assertions backend sur filtres SQL + logging hors scope, test e2e backend 404 hors scope, et tests frontend ecarts (empty state, erreur actionnable, propagation des filtres).

### File List

- `backend/src/previsions/dto/previsions.dto.ts`
- `backend/src/previsions/previsions.controller.ts`
- `backend/src/previsions/previsions.service.ts`
- `backend/src/previsions/previsions.service.spec.ts`
- `backend/test/previsions.e2e.spec.ts`
- `src/types/prevision.types.ts`
- `src/services/api/previsions.service.ts`
- `src/hooks/usePrevisions.ts`
- `src/components/previsions/EcartsPrevisionTable.tsx`
- `src/pages/app/Previsions.tsx`
- `tests/auth-migration.spec.ts`
- `tests/previsions-ecarts.spec.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-04: Implémentation complète Story 3.4 livrée (backend ecarts, front ecarts, tests, validations lint/typecheck/test).
- 2026-03-04: Correctifs code review appliqués (filtres UI, robustesse type-safe, journalisation hors scope, renforcement tests backend/frontend).

## Senior Developer Review (AI)

### Date

2026-03-04

### Reviewer

Max (AI Senior Developer Review)

### Review Outcome

Changes requested initialement, puis corrections appliquées et validées.

### Findings Summary

- Tâche tests frontend déclarée comme complète mais couverture insuffisante (hook/composant) -> **corrigé** via tests Playwright dédiés sur la vue écarts.
- AC2 partielle (filtres métier non exposés côté UI) -> **corrigé** via bloc de filtres et application explicite des filtres à la requête écarts.
- AC3 partielle (journalisation accès hors scope non visible sur le flux) -> **corrigé** via log warning backend sur exercice hors tenant.
- Couverture backend insuffisante sur multi-filtres et hors-scope -> **corrigé** par tests unitaires + e2e additionnels.
- Écart qualité (usage de `any` sur ce flux) -> **corrigé** avec typage strict des handlers et erreurs.

### Verification Notes

- Lint frontend/backend: OK
- Tests backend ciblés story: OK
- Tests frontend ciblés story: OK

## Story Completion Status

- Story ID: `3.4`
- Story Key: `3-4-produire-previsions-et-ecarts-prevision-execution`
- Final Status: `done`
- Completion note: `Story corrigée post-review, ACs couvertes et validations ciblées passées.`
