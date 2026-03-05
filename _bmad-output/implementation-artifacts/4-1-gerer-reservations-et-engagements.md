# Story 4.1: Gerer reservations et engagements

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a acteur habilite,
I want creer reservation puis engagement,
so that je transforme un besoin en obligation juridique controlee.

## Acceptance Criteria

1. **Creation d'une reservation sur ligne budgetaire disponible**
   - **Given** une ligne budgetaire disponible pour le tenant et l'exercice actifs
   - **When** l'utilisateur cree une reservation
   - **Then** la reservation est creee avec un numero metier, statut initial coherent et donnees obligatoires valides
   - **And** les controles budgetaires minimum sont appliques (montant valide, scope tenant/exercice, references existantes)

2. **Conversion reservation -> engagement sous contraintes budgetaires**
   - **Given** une reservation existante et eligible
   - **When** l'utilisateur cree un engagement depuis cette reservation
   - **Then** le montant engage ne peut pas depasser le disponible de la reservation
   - **And** l'engagement est persiste avec lien explicite vers la reservation et statut initial conforme au workflow

3. **Evolution de statuts metier et coherence du workflow**
   - **Given** des reservations et engagements en cycle de vie
   - **When** les actions metier (utiliser/valider/annuler) sont executees
   - **Then** les statuts evoluent uniquement selon les transitions autorisees
   - **And** les transitions interdites retournent des erreurs actionnables

4. **Securite, isolation et traçabilite**
   - **Given** un environnement multi-tenant avec roles differencies
   - **When** un utilisateur consulte ou modifie une reservation/engagement
   - **Then** les acces sont controles par JWT + policy guard + permissions
   - **And** les donnees restent strictement scopees au tenant, avec journalisation des actions critiques

## Tasks / Subtasks

- [ ] Verifier et aligner le contrat de statuts reservation/engagement entre PRD, types front et backend (AC: 1, 2, 3)
- [ ] Completer/ajuster les DTO backend `reservations` et `engagements` pour couvrir les validations metier attendues (AC: 1, 2, 3)
- [ ] Renforcer `ReservationsService.create/update/utiliser/annuler` avec controles explicites de transition et messages metier actionnables (AC: 1, 3)
- [ ] Renforcer `EngagementsService.createFromReservation` pour imposer toutes les contraintes de conversion (montant disponible, reservation valide, scope exercice) (AC: 2, 3)
- [ ] Centraliser les regles de transition reservation/engagement dans des utilitaires/references partages backend pour eviter la duplication (AC: 3)
- [ ] Verifier la coherence front `reservations.service.ts` / `engagements.service.ts` et hooks React Query (cles cache + invalidations) avec le contrat backend (AC: 1, 2, 3)
- [ ] Mettre a jour les composants d'operations (`ReservationDialog`, `EngagementDialog`, pages `Reservations`/`Engagements`) pour afficher des erreurs metier actionnables sans regression UX (AC: 3, 4)
- [ ] Ajouter/adapter les tests backend (unit + e2e) pour nominal, depassement de montant, transitions interdites, et acces hors tenant (AC: 1, 2, 3, 4)
- [ ] Ajouter/adapter des tests front cibleds pour le flux conversion reservation->engagement et les etats d'erreur principaux (AC: 2, 3)
- [ ] Verifier explicitement l'absence de nouvelle dependance runtime Supabase dans le flux story (AC: 4)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 4, Story 4.1).
- Portee FR directe: FR9, FR10.
- Contraintes transverses a garder des le premier increment Epic 4: FR38-FR40 (acces et isolation), FR32 (historique non destructif), NFR8/NFR9/NFR10/NFR11.

### Developer Context Section

- Le socle reservation/engagement existe deja sur les deux couches:
  - Front: pages, composants, hooks et services API dedies.
  - Backend: modules NestJS `reservations` et `engagements` deja branches dans `AppModule`.
- Le flux de conversion est deja materialise via `POST /engagements/from-reservation`, avec controle du montant disponible.
- Les stories precedentes ont etabli une discipline forte: backend comme source de verite metier, front type-safe, erreurs actionnables, et synchronisation du `sprint-status.yaml`.
- Cette story doit passer de "fonctionnel de base" a "workflow metier verrouille" pour l'entree Epic 4, sans refactor transversal non lie.

### Technical Requirements

- Backend (priorite):
  - Durcir les preconditions de conversion reservation->engagement:
    - reservation existante, meme tenant,
    - reservation dans un statut autorisant la conversion,
    - `montantEngagement <= montantDisponibleReservation`.
  - Encadrer toutes les transitions reservation/engagement par regles explicites (pas seulement par conventions UI).
  - Conserver les ecritures/contre-passations existantes sur validation/annulation, sans suppression destructive.
  - Garder des messages d'erreur metier explicites et actionnables.
- Frontend:
  - Conserver le pattern API unifie (`requestJson`) et hooks React Query existants.
  - Aligner les enums/status dans `src/types/*` avec les statuts reelement acceptes cote backend.
  - Preserver l'UX de creation rapide depuis snapshot reservation vers engagement.
- Data/Schema:
  - Aucune migration schema imposee a priori pour 4.1.
  - Si une contrainte SQL devient necessaire, la livrer en migration versionnee et rejouable via scripts pnpm.

### Architecture Compliance

- Garder `JwtAuthGuard` + `AuthorizationPolicyGuard` + `@RequirePermissions` sur tous les endpoints sensibles.
- Appliquer strictement le filtrage `client_id = actor.tenantId` en lecture/ecriture.
- Eviter toute nouvelle logique metier dans le front; la validation critique reste cote backend.
- Ne pas introduire de nouveau couplage au SDK Supabase dans ce flux.
- Reutiliser les abstractions existantes avant toute nouvelle couche:
  - `useReservations`, `useEngagements`,
  - `reservations.service.ts`, `engagements.service.ts`,
  - composants `ListLayout/ListToolbar` et snapshots operationnels.

### Library / Framework Requirements

Versions observees dans le repository:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, Vite `5.4.19`.
- Backend: NestJS `10.4.22`, `class-validator`/`class-transformer`, PostgreSQL via `pg`.

Decision story 4.1:

- Aucun upgrade de librairie requis.
- Priorite a la robustesse metier et a la coherence du workflow sur les versions en place.

### File Structure Requirements

Points d'extension attendus:

- Backend:
  - `backend/src/reservations/dto/reservations.dto.ts`
  - `backend/src/reservations/reservations.controller.ts`
  - `backend/src/reservations/reservations.service.ts`
  - `backend/src/engagements/dto/engagements.dto.ts`
  - `backend/src/engagements/engagements.controller.ts`
  - `backend/src/engagements/engagements.service.ts`
  - tests associes sous `backend/src/*/*.spec.ts` et/ou `backend/test/*.e2e.spec.ts`
- Frontend:
  - `src/services/api/reservations.service.ts`
  - `src/services/api/engagements.service.ts`
  - `src/hooks/useReservations.ts`
  - `src/hooks/useEngagements.ts`
  - `src/pages/app/Reservations.tsx`
  - `src/pages/app/Engagements.tsx`
  - `src/components/reservations/*`
  - `src/components/engagements/*`
  - `src/types/reservation.types.ts`
  - `src/types/engagement.types.ts`

Regles de structure:

- Aucun doublon de regles de transition entre plusieurs composants.
- Si une regle est partagee (ex: conversion eligibility), l'extraire dans une abstraction backend unique.

### Testing Requirements

1. Backend (obligatoire)
   - creation reservation nominale,
   - conversion depuis reservation avec montant limite,
   - refus depassement de montant,
   - refus transitions interdites,
   - refus acces hors tenant.

2. Frontend
   - flux UI "creer engagement depuis reservation" nominal,
   - affichage erreur metier de depassement,
   - invalidation cache `reservations/engagements/ecritures-comptables` apres mutations critiques.

3. Qualite transversale
   - lint/typecheck propres,
   - verification absence nouvel appel direct `@supabase/supabase-js` dans ce flux.

### Latest Tech Information

- Contexte technique "latest" derive du repository courant (pas de changement externe necessaire pour cette story).
- Les modules reservation/engagement sont deja actifs dans l'architecture backend NestJS actuelle; l'effort porte sur le durcissement metier et la couverture de tests.

### Project Structure Notes

- Le projet suit une migration progressive vers backend NestJS + PostgreSQL.
- Le domaine `reservation -> engagement` est deja implemente et constitue le point d'ancrage naturel pour demarrer Epic 4.
- Cette story doit rester atomique: verrouiller l'entree de chaine de depense, sans embarquer BC/facture/depense/paiement (stories 4.2 a 4.4).

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic 4 / Story 4.1)
- `/_bmad-output/planning-artifacts/prd.md` (FR9-FR10, modele de statuts et contraintes operations)
- `/_bmad-output/project-context.md` (regles migration et guardrails)
- `backend/src/reservations/reservations.controller.ts`
- `backend/src/reservations/reservations.service.ts`
- `backend/src/engagements/engagements.controller.ts`
- `backend/src/engagements/engagements.service.ts`
- `src/services/api/reservations.service.ts`
- `src/services/api/engagements.service.ts`
- `src/hooks/useReservations.ts`
- `src/hooks/useEngagements.ts`
- `src/pages/app/Reservations.tsx`
- `src/pages/app/Engagements.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Story context file cree pour `4-1-gerer-reservations-et-engagements` avec statut `ready-for-dev`.
- Exigences Epic 4.1 traduites en AC actionnables et checklist de taches orientee implementation.
- Guardrails architecture/front/back alignes avec les patterns reels du repository.
- Statut sprint mis a jour de `backlog` vers `ready-for-dev` pour la story `4-1`.

### File List

- `_bmad-output/implementation-artifacts/4-1-gerer-reservations-et-engagements.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
