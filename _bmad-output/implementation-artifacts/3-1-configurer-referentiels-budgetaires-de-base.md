# Story 3.1: Configurer referentiels budgetaires de base

Status: ready-for-dev

## Story

As a admin client,
I want gerer exercices, enveloppes et structure budgetaire,
so that le cadre de gestion est operationnel.

## Acceptance Criteria

1. **CRUD referentiels budgetaires**
   - **Given** un tenant configure
   - **When** l'admin cree, modifie ou archive des exercices, enveloppes, sections, programmes et actions
   - **Then** les donnees sont persistees de facon fiable
   - **And** l'interface renvoie un etat coherent (listes et details a jour)

2. **Historisation non destructive**
   - **Given** une modification d'un referentiel budgetaire
   - **When** l'operation est validee
   - **Then** une trace d'audit (auteur, horodatage, avant/apres) est conservee
   - **And** aucune suppression destructive n'est executee sur les entites metier critiques

3. **Validation de coherence minimale**
   - **Given** des donnees saisies par l'admin
   - **When** une creation/modification est soumise
   - **Then** les regles minimales sont appliquees (unicite code par scope, rattachement parent valide, cohérence exercice)
   - **And** les erreurs sont explicites et actionnables

4. **Isolation tenant + exercice**
   - **Given** plusieurs tenants et/ou exercices actifs
   - **When** un utilisateur consulte ou modifie un referentiel
   - **Then** seules les donnees de son `tenant` et de l'`exercice` cible sont visibles/modifiables
   - **And** les acces hors perimetre sont refuses

## Tasks / Subtasks

- [ ] Concevoir et exposer les API backend referentiels (AC: 1, 3, 4)
- [ ] Definir DTO NestJS de creation/mise a jour avec validations `class-validator` (AC: 3)
- [ ] Ajouter la couche service/use-case avec controles metier (AC: 1, 3, 4)
- [ ] Implementer l'historisation/audit des changements referentiels (AC: 2)
- [ ] Integrer le front via client API unifie (pas d'appel Supabase direct) (AC: 1, 4)
- [ ] Mettre a jour les ecrans de parametrage (`exercices`, `enveloppes`, `sections`, `programmes`, `actions`) (AC: 1, 3)
- [ ] Ajouter la gestion des erreurs utilisateur actionnables (AC: 3)
- [ ] Verifier l'isolation `client_id` + `exercice_id` sur toutes les lectures/ecritures (AC: 4)

## Dev Notes

### Story Requirements

- Story source: Epic 3 / Story 3.1 dans `epics.md`.
- Objectif metier: rendre operationnel le socle de parametrage budgetaire (FR1) sans casser les contraintes transverses (RBAC/ABAC, audit, isolation multi-tenant).
- Cette story conditionne les stories 3.2 a 3.4 (allocations, versioning, previsions/ecarts).

### Developer Context Section

- Le repo est en migration progressive vers une architecture cible `Frontend Next.js + API NestJS + PostgreSQL`, mais l'etat courant garde un front React/Vite avec heritage Supabase.
- Regle projet stricte: **aucune nouvelle logique metier en Supabase/Edge Functions**; toute nouvelle logique doit vivre cote NestJS.
- Le domaine budget existe deja cote front (composants, hooks, types, pages), ce qui impose un design d'integration incremental sans regression UX.
- Cette story doit preparer le terrain pour deplacer les CRUD referentiels vers backend NestJS en gardant la compatibilite du parcours actuel.

### Technical Requirements

- Backend NestJS (source de verite):
  - Controller + Service + DTO dedies au domaine referentiels budgetaires.
  - Validation d'entree avec `class-validator`.
  - Erreurs typees (metier vs technique), messages actionnables.
- Regles metier minimales a imposer:
  - unicite des codes par scope metier,
  - rattachement parent valide (`section -> programme -> action`),
  - coherence avec exercice actif.
- Gouvernance des donnees:
  - isolation obligatoire par `tenant/client_id`,
  - filtrage obligatoire par `exercice_id` sur entites budgetaires.
- Historisation:
  - journaliser creations/modifications/archivages avec auteur, date, contexte.

### Architecture Compliance

Contraintes a respecter strictement (project-context):

- Pas de nouvelle dependance runtime Supabase pour ce flux.
- Pas de logique metier critique dans le front.
- Frontend: appels via client API unifie type.
- Backend: guards JWT + RBAC/ABAC pour endpoints sensibles.
- Pas de double source de verite pour statuts/regles: backend decide.

### Library / Framework Requirements

Versions du projet (actuel):

- Front: React `18.3.1`, Vite `5.4.19`, TanStack Query `5.83.0`, TypeScript `5.8.3`.
- Backend: NestJS `10.4.22`.

Verification registre npm (2026-03-02):

- React latest: `19.2.4`
- NestJS core/common latest: `11.1.14`
- Vite latest: `7.3.1`
- TypeScript latest: `5.9.3`
- TanStack Query latest: `5.90.21`

Decision pour cette story:

- **Ne pas upgrader de versions majeures dans 3.1** (risque transverse inutile).
- Implementer en restant compatible avec les versions lockees du repo.
- Noter les upgrades React/Nest/Vite pour un chantier dedie, hors scope de 3.1.

### File Structure Requirements

Implantation recommandee (alignee structure actuelle):

- Backend:
  - `backend/src/budget-referentiels/` (nouveau module)
  - `backend/src/budget-referentiels/dto/`
  - `backend/src/budget-referentiels/*.controller.ts`
  - `backend/src/budget-referentiels/*.service.ts`
  - `backend/src/budget-referentiels/*.spec.ts`
- Front:
  - reutiliser `src/components/budget/*` existants
  - reutiliser/etendre `src/services/api/*` pour brancher les endpoints backend
  - conserver conventions de types dans `src/types/*`

Important:

- Eviter la duplication de logique formulaire deja presente dans les dialogs budget.
- Etendre les abstractions existantes (services/hooks/composants) avant creation de nouveaux blocs.

### Testing Requirements

Minimum attendu pour valider 3.1:

1. Backend (obligatoire)
   - cas nominal CRUD par entite,
   - cas d'autorisation (RBAC/ABAC),
   - cas erreurs metier (unicite, parent invalide, exercice absent),
   - cas isolation tenant/exercice.

2. Frontend
   - parcours admin de parametrage sans regression UX,
   - affichage erreurs actionnables,
   - invalidation cache/query coherente apres mutation.

3. Non-regression
   - verifier qu'aucun nouvel appel direct `@supabase/supabase-js` n'est introduit dans le code metier cible par la story.

### Git Intelligence Summary

Tendances recentes (5 derniers commits):

- focus migration auth frontend/backend,
- introduction d'un `project-context` fort en regles migration,
- presence d'un pattern de tests de non-regression (`tests/auth-migration.spec.ts`),
- mise a jour continue de `sprint-status.yaml` et des artefacts implementation.

Implication pour 3.1:

- suivre la meme discipline: story atomique, testable, traçable,
- documenter clairement l'impact migration,
- ne pas melanger refactor cosmetique massif avec migration budget referentiels.

### Latest Tech Information

Rappels pratiques pour l'implementation immediate:

- Le repo tourne actuellement sur versions pre-upgrade; coder contre ces versions pour limiter les regressions.
- Les API NestJS 10 utilisees aujourd'hui restent valides pour cette story.
- Toute proposition d'adoption React 19 / Nest 11 / Vite 7 doit etre geree dans une story technique dediee (plan de migration + tests).

### Project Structure Notes

- Le domaine budget est deja present dans le front (composants/pages/services), mais le backend est encore minimal (auth/users).
- Cette story doit etablir le module backend budget-referentiels comme premier socle du lot Epic 3.
- Respecter l'organisation navigation existante (`/app/parametres/*` et `/app/budgets/*`) sans rupture de parcours.

### References

- Source story: `/_bmad-output/planning-artifacts/epics.md` (Epic 3, Story 3.1).
- Contraintes globales migration: `/_bmad-output/project-context.md`.
- Backlog global et exigences metier/NFR: `/_bmad-output/planning-artifacts/prd.md`.
- Tracking sprint: `/_bmad-output/implementation-artifacts/sprint-status.yaml`.
- Intelligence commit: `git log` local (5 derniers commits de `ee0034b` a `42bf24b`).

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story cible detectee depuis input utilisateur: `3-1-configurer-referentiels-budgetaires-de-base`.
- Story status fixe a `ready-for-dev`.

### File List

- `_bmad-output/implementation-artifacts/3-1-configurer-referentiels-budgetaires-de-base.md`

## Story Completion Status

- Story ID: `3.1`
- Story Key: `3-1-configurer-referentiels-budgetaires-de-base`
- Final Status: `ready-for-dev`
- Validation checklist: effectuee manuellement selon `checklist.md` (coherence AC, taches, contexte dev, references).
