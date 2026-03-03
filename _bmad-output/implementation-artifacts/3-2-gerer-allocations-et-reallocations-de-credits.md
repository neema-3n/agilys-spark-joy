# Story 3.2: Gerer allocations et reallocations de credits

Status: done

## Story

As a gestionnaire budget,
I want allouer et reallouer les credits,
so that les besoins metiers evoluent sans perdre la trace des arbitrages.

## Acceptance Criteria

1. **Allocation de credits avec contraintes budgetaires**
   - **Given** des lignes budgetaires actives pour un tenant et un exercice
   - **When** le gestionnaire enregistre une allocation
   - **Then** les plafonds et contraintes metier sont verifies avant persistance
   - **And** la nouvelle repartition est visible immediatement dans les vues budgetaires

2. **Reallocation traçable sans suppression destructive**
   - **Given** une allocation existante
   - **When** une reallocation est soumise entre axes budgetaires
   - **Then** la reallocation est persistee sans ecraser l'historique
   - **And** un enregistrement d'audit complet (auteur, horodatage, avant/apres, motif) est conserve

3. **Isolation stricte tenant + exercice**
   - **Given** plusieurs tenants/exercices dans le systeme
   - **When** un utilisateur consulte ou modifie les allocations
   - **Then** seules les allocations de son tenant et de l'exercice cible sont accessibles
   - **And** toute tentative hors perimetre est refusee

4. **Erreurs metier actionnables et UX stable**
   - **Given** une demande invalide (plafond depasse, montant incoherent, axe invalide)
   - **When** l'operation est executee
   - **Then** l'utilisateur recoit un message explicite et actionnable
   - **And** le parcours front reste coherent (pas de blocage silencieux, pas de regression de navigation)

## Tasks / Subtasks

- [x] Etendre le module backend `budget-referentiels` pour gerer allocations/reallocations (AC: 1, 2, 3)
- [x] Definir DTO NestJS dedies avec validations de montants et coherence des axes (AC: 1, 4)
- [x] Ajouter les regles metier de plafonds/contraintes dans le service backend (AC: 1)
- [x] Ajouter journalisation d'audit detaillee sur allocations/reallocations (AC: 2)
- [x] Reutiliser le client API unifie front pour brancher endpoints allocation/reallocation (AC: 1, 3, 4)
- [x] Etendre hooks/composants budget existants (sans duplication) pour la saisie et visualisation des reallocations (AC: 1, 4)
- [x] Verifier isolation `client_id` + `exercice_id` sur toutes les lectures/ecritures (AC: 3)
- [x] Completer les tests backend/frontend de non-regression du parcours budget (AC: 1, 2, 3, 4)

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] La repartition budgetaire est maintenant projetee immediatement sur les lignes via `applyModificationsToLignes` apres chargement des allocations/reallocations backend.
- [x] [AI-Review][HIGH] Les ecritures front des lignes budgetaires sont scopees explicitement par `id + client_id + exercice_id` sur `update` et `delete`.
- [x] [AI-Review][MEDIUM] Couverture frontend ajoutee avec tests cibles sur la projection allocation/reallocation (`tests/auth-migration.spec.ts`).
- [x] [AI-Review][MEDIUM] Le flux allocation/reallocation est extrait dans `budget-modifications.service.ts` (client API unifie); `budget.service.ts` reste limite au legacy CRUD lignes.

## Dev Notes

### Story Requirements

- Source story: Epic 3 / Story 3.2 dans `epics.md`.
- Objectif metier: permettre l'allocation/reallocation gouvernee des credits (FR2), tout en preservant traçabilite et contraintes transverses.
- Dependance immediate: s'appuyer sur la base livree en Story 3.1 (`budget-referentiels`, scope guard tenant/exercice, audit patterns).

### Developer Context Section

- Le projet est en migration progressive: front React/Vite actuel, cible architecture Next.js + API NestJS + PostgreSQL.
- Regle forte projet: ne pas ajouter de nouvelle logique metier Supabase/Edge Functions.
- Le front dispose deja d'un socle budget (hooks, composants, services API) a etendre, pas a dupliquer.
- La story doit rester atomique et testable: pas de refactor transverse non lie au domaine allocations.

### Technical Requirements

- Backend NestJS (source de verite):
  - endpoints et services explicites pour `allocation` et `reallocation`,
  - validations d'entree strictes (`class-validator`) sur montants, axes, exercice, tenant,
  - controle metier des plafonds/contraintes avant ecriture.
- Data governance:
  - filtrage obligatoire par `client_id` et `exercice_id`,
  - interdiction des modifications hors scope tenant/exercice.
- Audit:
  - journaliser `create/update/reallocate` avec `authorId`, `timestamp`, `before/after`, `reason`.
- Frontend:
  - utiliser `src/services/api/*` + hooks existants,
  - afficher erreurs metier actionnables et conserver la continite UX.

### Architecture Compliance

Contraintes obligatoires (project-context):

- Aucun nouvel appel metier direct `@supabase/supabase-js`.
- Toute regle metier critique reste cote backend NestJS.
- Endpoints sensibles proteges par guards JWT + RBAC/ABAC + scope tenant/exercice.
- Pas de double source de verite pour les montants/statuts budgetaires.
- Reuse prioritaire des abstractions existantes (services/hooks/composants) avant ajout de nouveaux blocs.

### Library / Framework Requirements

Versions lockees du repo (a respecter pour cette story):

- Front: React `18.3.1`, TanStack Query `5.83.0`, TypeScript `5.8.3`, Vite `5.4.19`.
- Back: NestJS `10.4.22`, class-validator `0.14.4`.

Decision implementation:

- Pas d'upgrade majeur de librairies dans cette story.
- Coder strictement compatible avec les versions actuelles pour limiter les regressions.
- Reporter toute migration de version dans un chantier technique dedie.

### File Structure Requirements

Zones probables a toucher (selon patterns existants):

- Backend:
  - `backend/src/budget-referentiels/budget-referentiels.controller.ts`
  - `backend/src/budget-referentiels/budget-referentiels.service.ts`
  - `backend/src/budget-referentiels/dto/referentiels.dto.ts` (ou DTO dedie allocation)
  - tests: `backend/src/budget-referentiels/*.spec.ts`, `backend/test/budget-referentiels.e2e.spec.ts`
- Front:
  - services API budget: `src/services/api/budget.service.ts` et/ou services referentiels deja utilises
  - hooks budget: `src/hooks/useLignesBudgetaires.ts`, `src/hooks/useEnveloppes.ts`, `src/hooks/useSections.ts`, `src/hooks/useProgrammes.ts`, `src/hooks/useActions.ts`
  - composants budget: `src/components/budget/*`, `src/components/parametres/*` (selon UX reellement impactee)

Important:

- Ne pas dupliquer logique de calcul/mutation budget dans plusieurs hooks.
- Extraire utilitaire partage si la meme regle de reallocation apparait a plusieurs endroits.

### Testing Requirements

Minimum attendu:

1. Backend (obligatoire)
   - cas nominal allocation et reallocation,
   - cas erreur metier (plafond, montant negatif/incoherent, axe invalide),
   - cas d'autorisation/scope (RBAC/ABAC + tenant/exercice),
   - verification audit trail complet.

2. Frontend
   - parcours gestionnaire budget sans regression UX,
   - erreurs utilisateur explicites et non bloquantes,
   - invalidation cache React Query coherente apres mutation.

3. Non-regression migration
   - verifier qu'aucun nouvel appel direct Supabase n'est introduit dans le perimetre de la story.

### Previous Story Intelligence

Lecons utiles de 3.1 a reutiliser:

- Le guard `TenantExerciceScopeGuard` a ete durci: conserver ce pattern pour toutes nouvelles routes allocations.
- Les corrections review ont impose un bornage strict des writes par `exerciceId`: appliquer la meme rigueur sur reallocations.
- La persistance snapshot et l'audit ont ete consolides pour eviter pertes concurrentes: reutiliser les memes mecanismes, ne pas reimplementer un stockage parallele.
- Les cles React Query ont ete scopees `clientId/exerciceId`: garder ce schema pour eviter fuite de donnees/caches.

### Git Intelligence Summary

Tendances recentes observees:

- sequence de travail par stories atomiques (`2.2`, `2.3`, `3.1`),
- forte discipline de correction post-review (securite, scope, persistance, tests),
- mise a jour systmatique des artefacts `implementation-artifacts` et `sprint-status.yaml`.

Implications pour 3.2:

- livrer avec preuves de tests et lint/typecheck propres,
- maintenir la trace documentaire et l'etat sprint synchronises,
- prioriser robustesse multi-tenant plutot que vitesse de livraison.

### Latest Tech Information

Contexte technique applicable immediatement:

- Les dependances lockees du repo sont suffisantes pour 3.2.
- Pas de besoin d'introduire de nouvelles libraries pour allocation/reallocation.
- L'accent doit etre mis sur la coherence metier et l'isolation des donnees, pas sur un refresh technologique.

### Project Structure Notes

- Le domaine budget est deja present a la fois cote front (`components/hooks/services`) et cote backend (`budget-referentiels`).
- Cette story doit etendre ces modules existants pour ouvrir le flux allocations/reallocations.
- Eviter d'introduire un second sous-domaine concurrent si les capacites peuvent etre rattachees proprement a `budget-referentiels`.

### References

- Source story: `/_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.2).
- Contraintes migration et regles agent: `/_bmad-output/project-context.md`.
- Exigences metier/NFR transverses: `/_bmad-output/planning-artifacts/prd.md`.
- Tracking sprint: `/_bmad-output/implementation-artifacts/sprint-status.yaml`.
- Story precedente (intelligence implementation): `/_bmad-output/implementation-artifacts/3-1-configurer-referentiels-budgetaires-de-base.md`.
- Tendances commits recentes: `git log -n 5` local.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Ajout des endpoints backend `GET /allocations`, `POST /allocations`, `POST /reallocations` dans `budget-referentiels`, avec guards JWT/RBAC/scope exercice.
- Ajout des DTO `AllocationCreateDto` et `ReallocationCreateDto` avec validations strictes (montant > 0, axes obligatoires, motif borne).
- Ajout des regles metier: verification plafond destination, verification solde source pour reallocation, refus des axes identiques, messages metier actionnables.
- Ajout de la persistance non destructive des allocations/reallocations et enrichissement audit (`allocate` / `reallocate`, avant/apres, auteur, horodatage, motif).
- Cote front, branchement du flux modification budgetaire sur le client API unifie (`requestJson` + `http-client`) pour `allocations/reallocations`.
- Stabilisation UX: gestion d'erreur explicite dans la page Budgets et suppression de l'option de type non supportee (`diminution`) dans le dialogue.
- Durcissement metier allocation/reallocation: verification d'existence/scope tenant+exercice des axes sur actions actives backend avant persistance.
- Alignement contrat frontend/backend: suppression definitive du type `diminution` et mapping coherent axe (`actionId`) pour creation/projection/affichage des modifications.
- Fiabilisation de la numerotation allocation: generation collision-safe par exercice avec verification d'unicite.
- Validation effectuee: `pnpm --dir backend run test`, `pnpm --dir backend run lint`, `pnpm exec eslint ...`, `pnpm run build:frontend`.

### Senior Developer Review (AI)

- Revue adversariale executee sur les fichiers source declares et les changements git reels.
- Resultat initial: **Changes Requested** (2 HIGH, 2 MEDIUM).
- Resultat final: **Approved** (issues HIGH/MEDIUM traitees et reverifiees).
- Git vs Story:
  - Aucun ecart de tracabilite entre fichiers modifies (git) et file list declaree pour le code source.
  - Story file creee localement en non-versionne (`??`) au moment de la review.
- Verification d'execution:
- `pnpm --dir backend run test -- budget-referentiels.service.spec.ts --runInBand` OK
- `pnpm --dir backend run test -- budget-referentiels.e2e.spec.ts --runInBand` OK
- `pnpm exec eslint src/services/api/budget.service.ts src/services/api/budget-modifications.service.ts src/components/budget/ModificationBudgetaireDialog.tsx src/pages/app/Budgets.tsx src/types/budget.types.ts` OK
- `pnpm exec playwright test tests/auth-migration.spec.ts -g "applyModificationsToLignes"` OK

### File List

- `backend/src/auth/tenant-exercice-scope.guard.ts`
- `backend/src/budget-referentiels/budget-referentiels.controller.ts`
- `backend/src/budget-referentiels/budget-referentiels.service.ts`
- `backend/src/budget-referentiels/budget-referentiels.store.ts`
- `backend/src/budget-referentiels/budget-referentiels.types.ts`
- `backend/src/budget-referentiels/dto/referentiels.dto.ts`
- `backend/src/budget-referentiels/budget-referentiels.service.spec.ts`
- `backend/test/budget-referentiels.e2e.spec.ts`
- `src/services/api/budget.service.ts`
- `src/services/api/budget-modifications.service.ts`
- `src/types/budget.types.ts`
- `src/hooks/useLignesBudgetaires.ts`
- `src/components/budget/ModificationBudgetaireDialog.tsx`
- `src/pages/app/Budgets.tsx`
- `tests/auth-migration.spec.ts`
- `_bmad-output/implementation-artifacts/3-2-gerer-allocations-et-reallocations-de-credits.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-03: Correctifs adversarial review appliques et verifies (axes validates en scope action, numerotation allocation collision-safe, suppression type `diminution`, mapping `actionId` front + tests completes), statut passe a `done`.
- 2026-03-02: Correctifs post-review appliques (validation UUID des axes allocation/reallocation, messages d'erreur actionnables, suppression actions UI non supportees, synchronisation File List).
- 2026-03-03: Implementation completee de la story 3.2 (allocation/reallocation backend + integration front + validations/tests).
- 2026-03-02: Senior Developer Review (AI) executee - issues HIGH/MEDIUM ajoutees en follow-ups, statut repasse `in-progress`.
- 2026-03-02: Correctifs review appliques (projection immediate allocations, scope writes lignes, extraction service API modifications, tests frontend cibles), statut remis `review`.

## Story Completion Status

- Story ID: `3.2`
- Story Key: `3-2-gerer-allocations-et-reallocations-de-credits`
- Final Status: `done`
- Completion note: `Revue adversariale soldee: correctifs HIGH/MEDIUM appliques, verifies et synchronises sprint`
