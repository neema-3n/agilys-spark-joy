# Story 4.4: Executer paiement et gestion des cas partiels/rejets

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a comptable payeur,
I want suivre paiements partiels, rejets et reprises,
so that les reglements sont traces jusqu'a cloture.

## Acceptance Criteria

1. **Paiement autorise uniquement pour une depense ordonnancee**
   - **Given** une depense existe dans le tenant courant
   - **When** un utilisateur tente d'enregistrer un paiement
   - **Then** l'operation est autorisee uniquement si la depense est en statut `ordonnancee`
   - **And** toute tentative sur une depense `brouillon`, `validee`, `annulee` ou deja soldee hors reste a payer est bloquee avec un message metier actionnable.

2. **Gestion explicite des paiements partiels**
   - **Given** une depense ordonnancee avec un reste a payer strictement positif
   - **When** un paiement valide est enregistre pour un montant inferieur au montant restant
   - **Then** le paiement est persiste avec son propre cycle de vie
   - **And** la depense passe en statut `partiellement_payee`
   - **And** le reste a payer, l'historique des paiements et les ecritures associees sont recalcules sans ambiguite.

3. **Cloture correcte apres paiement complet ou reprises successives**
   - **Given** une depense ordonnancee ou `partiellement_payee`
   - **When** un ou plusieurs paiements valides couvrent exactement le montant restant
   - **Then** la depense passe en statut `payee`
   - **And** le workflow permet une reprise apres paiement partiel ou rejet sans dupliquer les montants deja traites
   - **And** aucun surpaiement n'est autorise.

4. **Rejet / annulation de paiement avec reprise gouvernee**
   - **Given** un paiement deja enregistre
   - **When** il est rejete ou annule avec motif
   - **Then** le paiement conserve une trace non destructive (`motif`, `date`, auteur, reference)
   - **And** la depense revient a l'etat coherent (`ordonnancee` ou `partiellement_payee` selon les autres paiements valides restants)
   - **And** les ecritures de contre-passation et les journaux associes sont generes si necessaire.

5. **Securite, isolation tenant et auditabilite**
   - **Given** un environnement multi-tenant avec RBAC/ABAC et separation des responsabilites
   - **When** un utilisateur consulte, cree ou annule un paiement
   - **Then** les guards JWT + policy guard + permissions sont appliques
   - **And** les requetes sont scopees par `client_id`
   - **And** toute action critique reste journalisee et exploitable pour audit.

## Tasks / Subtasks

- [x] Revalider le contrat Story 4.4 contre FR16, FR17, FR18, FR32, NFR8, NFR9, NFR11, NFR24, NFR25, en explicitant les etats `partiellement_payee`, `payee`, `rejete/annule` et la notion de reprise (AC: 1, 2, 3, 4, 5)
- [x] Faire converger les contrats de statuts entre PRD/epics et code courant pour `depenses` et `paiements`, sans casser les stories 4.1-4.3 deja livrees (AC: 1, 2, 3, 4)
- [x] Etendre les DTO backend paiements pour supporter le workflow cible (creation, rejet/annulation motivee, eventuelle distinction retour externe) avec validations fortes de montant et d'etat source (AC: 1, 2, 3, 4)
- [x] Adapter `PaiementsService` pour bloquer tout paiement d'une depense non `ordonnancee`, calculer le reste a payer et interdire tout surpaiement (AC: 1, 2, 3)
- [x] Introduire la mise a jour automatique du statut de depense apres creation/annulation/rejet de paiement (`ordonnancee` -> `partiellement_payee` -> `payee`) selon la somme des paiements valides restants (AC: 2, 3, 4)
- [x] Formaliser le traitement des reprises apres rejet/annulation pour qu'un nouveau paiement puisse etre saisi sans doublon ni corruption d'historique (AC: 3, 4)
- [x] Verifier et, si necessaire, etendre la persistence SQL pour stocker le cycle de vie paiement cible, les motifs de rejet/annulation, les dates de retour et les metadonnees d'audit attendues (AC: 2, 4, 5)
- [x] Aligner `DepensesService` et les endpoints associes pour supprimer l'hypothese obsolete "un paiement valide => depense payee" quand le montant paye est partiel (AC: 2, 3, 4)
- [x] Conserver la generation d'ecritures comptables idempotentes pour les paiements et leurs contre-passations, avec recalcul coherent apres annulation/rejet (AC: 3, 4, 5)
- [x] Aligner les types frontend (`paiement.types.ts`, `depense.types.ts`) et le client API (`paiements.service.ts`, `depenses.service.ts`) sur le nouveau contrat sans `any` ni litteraux disperses (AC: 2, 3, 4, 5)
- [x] Adapter les hooks React Query (`usePaiements`, `useDepenses`, `usePaiementsByDepense`) pour invalider/refetch correctement paiements, depenses et ecritures sur creation/rejet/annulation/reprise (AC: 2, 3, 4)
- [x] Faire evoluer l'UI Paiements et les vues Depense liees pour exposer clairement reste a payer, historique des paiements, statut `partiellement_payee`, motifs de rejet/annulation et action de reprise (AC: 2, 3, 4)
- [x] Ajouter les tests backend (unit/integration) pour nominal paiement complet, nominal partiel, surpaiement refuse, refus sur depense non ordonnancee, annulation avec recalcul de statut, reprise apres rejet, refus cross-tenant (AC: 1, 2, 3, 4, 5)
- [x] Ajouter les tests frontend cibles sur affichage du reste a payer, creation de paiement partiel, statut mis a jour, annulation/rejet avec reprise, et erreurs metier actionnables (AC: 2, 3, 4, 5)
  - [x] Couvrir la logique frontend partagee (helpers workflow, filtres, invalidations React Query, contenu du dialogue motif, reprise `annule` / `rejete`) via `tests/paiements-workflow.spec.ts`
  - [x] Valider le flux UI interactif `/app/paiements` pour annulation motivee et reprise d'un paiement annule via `tests/paiements-page.spec.ts`
  - [x] Completer la couverture UI interactive sur la creation de paiement partiel et l'affichage du statut mis a jour cote page/depense via `tests/depenses-paiements-page.spec.ts`
- [x] Verifier explicitement qu'aucune nouvelle dependance runtime Supabase n'est introduite dans le flux paiements/depenses (AC: 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 4, Story 4.4).
- Portee FR directe: FR16 (cycle paiement explicite), FR17 (interdiction de payer une depense non ordonnancee), FR18 (gestion des cas partiels, rejet et reprise).
- Contraintes transverses: FR32 (historique non destructif), FR38-FR40 (RBAC/ABAC + isolation tenant), NFR8/NFR9/NFR11, NFR24/NFR25.
- Dependances directes:
  - Story 4.1 `reservations -> engagements` en `done`.
  - Story 4.2 `BC -> factures` en `done`.
  - Story 4.3 `constitution/liquidation de depense` en `done`, avec lien multi-factures et garde-fous sur les transitions depense.

### Developer Context Section

- Le repo contient deja un module paiements complet mais simplifie:
  - backend `backend/src/paiements/*`
  - frontend `src/services/api/paiements.service.ts`, `src/hooks/usePaiements.ts`, `src/pages/app/Paiements.tsx`, `src/components/paiements/*`
- L'etat actuel du code est incomplet par rapport au PRD:
  - `PaiementsService.create` insere directement un paiement `statut = 'valide'`.
  - `DepensesService.marquerPayee` repose encore sur une logique "depense ordonnancee -> payee" qui ne couvre pas le cas partiel.
  - Les types frontend paiements ne connaissent que `valide | annule`.
- Le besoin Story 4.4 impose donc un alignement de cycle de vie entre deux agregats:
  - `Paiement`: `brouillon -> transmis -> accepte -> execute -> reconcilie` ou `rejete/annule` cote PRD.
  - `Depense`: `ordonnancee -> partiellement_payee -> payee` (puis `cloturee` plus tard).
- Decision pratique pour cette story:
  - ne pas essayer d'implementer toute l'integration bancaire/reconciliation finale de l'epic 6,
  - mais livrer un noyau metier robuste qui gere les paiements partiels, le rejet/annulation motivee et la reprise sans regression.

### Technical Requirements

- Backend
  - Centraliser le calcul du `reste a payer` a partir de la somme des paiements valides/non annules d'une depense.
  - Refuser toute creation si `depense.statut` n'est pas `ordonnancee` ou `partiellement_payee`.
  - Refuser un montant `<= 0` ou `> reste a payer`.
  - Mettre a jour le statut de la depense apres chaque evenement paiement:
    - aucun paiement valide restant -> `ordonnancee`
    - somme validee `> 0` et `< depense.montant` -> `partiellement_payee`
    - somme validee `== depense.montant` -> `payee`
  - Conserver les contre-passations si des ecritures comptables valides existent lors d'une annulation/rejet.
  - Journaliser et typer les erreurs metier pour le front.
- Frontend
  - Exposer `montant deja regle`, `reste a payer`, `historique`, `motif` et statut courant sans recalcul implicite fragile.
  - Garder les invalidations React Query coherentes entre `paiements`, `depenses`, `ecritures-comptables`.
  - Rendre les messages backend visibles tels quels quand ils sont actionnables.
- Data/Schema
  - Verifier si `public.paiements` suffit ou s'il faut l'etendre avec statut cible (`transmis`, `accepte`, `execute`, `reconcilie`, `rejete`, `annule`) et traces de retour.
  - Toute evolution schema doit passer par migration SQL versionnee et rejouable compatible `pnpm db:migrate`.

### Architecture Compliance

- Conserver `JwtAuthGuard` + `AuthorizationPolicyGuard` + `@RequirePermissions` sur tous les endpoints paiements.
- Appliquer strictement `client_id = tenantId` dans les lectures/ecritures paiements et dans les jointures de recalcul depense.
- Garder la logique de workflow et de calcul des soldes cote NestJS; le front ne fait que presenter l'etat.
- Reutiliser `PaiementsService`, `DepensesService`, `usePaiements`, `PaiementDialog`, `PaiementTable`, `DepenseSnapshot` avant toute nouvelle abstraction.
- Ne pas introduire de nouvel acces runtime Supabase dans les modules paiements/depenses.

### Library / Framework Requirements

Versions observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, Vite `5.4.19`, React Hook Form `7.61.1`, Zod `3.25.76`.
- Backend: NestJS `10.4.22`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`, `pg` `8.19.0`.
- Tooling: `pnpm@9.12.0` impose.

Decision story 4.4:

- Aucun upgrade de dependance n'est requis pour livrer le workflow paiement partiel/rejet/reprise.
- La priorite est l'alignement metier + types + tests sur les versions deja presentes.

### File Structure Requirements

Points d'extension probables:

- Backend
  - `backend/src/paiements/dto/paiements.dto.ts`
  - `backend/src/paiements/paiements.controller.ts`
  - `backend/src/paiements/paiements.service.ts`
  - `backend/src/depenses/depenses.service.ts`
  - `backend/src/ecritures-comptables/ecritures-comptables.service.ts`
  - `backend/src/paiements/*.spec.ts` a creer ou completer
  - `backend/test/*.e2e.spec.ts` si un test d'integration API est necessaire
- Frontend
  - `src/types/paiement.types.ts`
  - `src/types/depense.types.ts`
  - `src/services/api/paiements.service.ts`
  - `src/services/api/depenses.service.ts`
  - `src/hooks/usePaiements.ts`
  - `src/hooks/useDepenses.ts`
  - `src/components/paiements/PaiementDialog.tsx`
  - `src/components/paiements/PaiementTable.tsx`
  - `src/components/depenses/DepenseSnapshot.tsx`
  - `src/pages/app/Paiements.tsx`
- Database
  - `supabase/migrations/*.sql` si extension du schema `paiements` ou des contraintes associees.

Regles de structure:

- Eviter de dupliquer la logique de recalcul du statut depense entre `PaiementsService` et `DepensesService`; extraire une fonction backend partagee si besoin.
- Garder les enums/status metier centralises dans les types de domaine partages du front, pas dans les composants UI.

### Testing Requirements

1. Backend (obligatoire)
   - creation d'un paiement sur depense `ordonnancee`,
   - creation d'un paiement partiel avec passage depense `partiellement_payee`,
   - creation du dernier paiement soldant la depense avec passage `payee`,
   - refus d'un paiement sur depense non `ordonnancee` / non `partiellement_payee`,
   - refus d'un surpaiement,
   - annulation/rejet d'un paiement avec recalcul correct du statut depense,
   - reprise apres rejet sans doublon,
   - refus cross-tenant et exercice incoherent.

2. Frontend
   - dialogue de paiement avec reste a payer exact,
   - creation paiement partiel et rafraichissement des donnees,
   - affichage des statuts `partiellement_payee` / `payee`,
   - annulation/rejet avec motif et message actionnable,
   - reprise apres rejet depuis la vue Paiements ou Depense.

3. Qualite transversale
   - `pnpm lint` et `pnpm test` propres sur les zones impactees,
   - verification explicite de l'absence de nouvel import `@supabase/supabase-js` dans le flux story 4.4.

### Previous Story Intelligence

Lecons consolidees depuis Story 4.3:

- Le backend doit rester source de verite des transitions metier et des montants derives.
- Les messages d'erreur doivent rester actionnables et re-exploitables tels quels dans l'UI.
- Les recalculs agreges doivent toujours etre scopes par tenant pour eviter les fuites et incoherences.
- Les tests doivent couvrir explicitement les cas cross-tenant, statuts invalides et regressions de workflow.
- Les invalidations React Query doivent inclure les ecritures comptables quand une operation a un impact comptable.

Lecons structurelles du repo:

- Le pattern recent est: verrouiller le backend et les transitions -> aligner types et client API -> adapter l'UI -> fermer par tests et documentation story.
- Le module paiement existe deja, donc la bonne strategie est l'extension de l'existant et non la creation d'un workflow parallele dans `depenses`.

### Git Intelligence Summary

Observations sur les commits recents:

- Les lots precedents ont privilegie un durcissement progressif des workflows operationnels (`reservations`, `engagements`, `factures`, `depenses`) avec tests backend denses.
- Story 4.3 a deja introduit le concept de chainage multi-factures et a repousse le prochain vrai jalon de coherence sur 4.4.
- La discipline documentaire story + sprint-status synchronises est deja installee.

Action pour 4.4:

- Reprendre le meme pattern: contrat backend paiement/depense -> recalculs et guards -> types/frontend -> tests -> story/sprint-status.

### Latest Tech Information

- Aucun besoin de recherche externe n'est retenu ici: les versions utilisees et le contrat technique de reference sont ceux du repository courant.
- Point de vigilance principal: le PRD et `AGENTS-BUSINESS.md` convergent vers la necessite de paiements partiels, alors que le code courant n'encode encore qu'un workflow de paiement simplifie.
- Story 4.4 doit donc fermer cet ecart de modele avant d'aborder des sujets plus aval comme reconciliation bancaire avancee.

### Project Structure Notes

- Architecture de transition confirmee: front React/Vite type-safe + backend NestJS + migrations SQL versionnees.
- Le domaine `paiements` est deja visible dans le backend et le frontend, ce qui limite le risque de dispersion si l'implementation reste centree sur les modules existants.
- Le principal impact structurel est la convergence entre statut depense et historique paiements, pas la creation d'un nouveau sous-systeme.

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic 4 / Story 4.4)
- `/_bmad-output/planning-artifacts/prd.md` (FR16, FR17, FR18, FR32, NFR24, NFR25)
- `/_bmad-output/project-context.md`
- `/_bmad-output/implementation-artifacts/4-3-constituer-et-liquider-une-depense.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/AGENTS-BUSINESS.md`
- `backend/src/paiements/paiements.controller.ts`
- `backend/src/paiements/paiements.service.ts`
- `backend/src/paiements/dto/paiements.dto.ts`
- `backend/src/depenses/depenses.service.ts`
- `backend/src/ecritures-comptables/ecritures-comptables.service.ts`
- `src/services/api/paiements.service.ts`
- `src/services/api/depenses.service.ts`
- `src/hooks/usePaiements.ts`
- `src/hooks/useDepenses.ts`
- `src/types/paiement.types.ts`
- `src/types/depense.types.ts`
- `src/components/paiements/PaiementDialog.tsx`
- `src/components/paiements/PaiementTable.tsx`
- `src/components/depenses/DepenseSnapshot.tsx`
- `src/pages/app/Paiements.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Story context 4.4 cree avec focalisation sur l'ecart critique entre PRD et implementation courante des paiements.
- Guardrails backend/frontend/specifies pour paiements partiels, rejet/annulation motivee, reprise et recalcul de statut depense.
- Story prete pour execution `dev-story` avec statut `ready-for-dev`.
- Aucun besoin d'upgrade de dependances identifie; l'enjeu est l'alignement metier et la couverture de tests.
- Contrat story 4.4 revalide contre FR16/17/18/32 et NFR 8/9/11/24/25, avec convergence explicite des etats `execute|reconcilie|rejete|annule` pour `paiements` et `partiellement_payee|payee` pour `depenses`.
- Backend et migration SQL etendus pour supporter paiements partiels, rejet/annulation motives, date/reference de retour, recalcul centralise du reste a payer et blocage des surpaiements.
- Frontend aligne sur le nouveau contrat: types, services API, invalidations React Query, filtres/statuts UI, historique des paiements et action de reprise apres rejet.
- Couverture ajoutee: tests Jest `paiements.service.spec.ts` + `depenses.service.spec.ts`, tests frontend de logique partagee `tests/paiements-workflow.spec.ts`, verification TypeScript/ESLint propres.
- Revue corrective 2026-03-06: reprise etendue aux paiements annules, recalcul SQL durci pour preserver une depense annulee, requetes critiques rescopees par tenant.
- Extension frontend 2026-03-06: logique de page paiements extraite dans des helpers testes (`paiement-page.ts`), spec UI Playwright `/app/paiements` prepare mais non valide ici a cause d'un demarrage Vite trop lent/instable.
- Validation UI 2026-03-06: spec Playwright `/app/paiements` execute avec succes sur l'annulation motivee et la reprise d'un paiement annule.
- Validation UI 2026-03-06: spec Playwright `/app/depenses` execute avec succes sur paiement partiel et paiement final avec verification du statut mis a jour.

### Implementation Plan

- Extraire la logique de statut paiement/depense dans des helpers partages backend/frontend pour eviter la duplication.
- Migrer le schema `depenses`/`paiements` vers les nouveaux statuts et metadonnees de retour sans reintroduire Supabase dans le flux runtime.
- Rebrancher le backend `PaiementsService` sur ce contrat, deprequer le raccourci `marquerPayee`, puis aligner types, hooks et composants front.
- Verrouiller les transitions et regressions par tests backend cibles et tests frontend sur les helpers de workflow.

### File List

- `_bmad-output/implementation-artifacts/4-4-executer-paiement-et-gestion-des-cas-partiels-rejets.md`
- `backend/src/paiements/paiement-workflow.ts`
- `backend/src/paiements/dto/paiements.dto.ts`
- `backend/src/paiements/paiements.controller.ts`
- `backend/src/paiements/paiements.service.ts`
- `backend/src/paiements/paiements.service.spec.ts`
- `backend/src/depenses/depenses.service.ts`
- `backend/src/depenses/depenses.service.spec.ts`
- `supabase/migrations/20260305120000_story_44_paiements_partiels.sql`
- `src/lib/paiement-workflow.ts`
- `src/lib/paiement-page.ts`
- `src/lib/regles-comptables-fields.ts`
- `src/types/paiement.types.ts`
- `src/types/depense.types.ts`
- `src/services/api/paiements.service.ts`
- `src/services/api/depenses.service.ts`
- `src/hooks/usePaiements.ts`
- `src/components/paiements/PaiementDialog.tsx`
- `src/components/paiements/PaiementTable.tsx`
- `src/components/paiements/PaiementStats.tsx`
- `src/components/depenses/DepenseTable.tsx`
- `src/components/depenses/DepenseSnapshot.tsx`
- `src/pages/app/Depenses.tsx`
- `src/pages/app/Paiements.tsx`
- `tests/paiements-workflow.spec.ts`
- `tests/paiements-page.spec.ts`
- `tests/depenses-paiements-page.spec.ts`
- `playwright.paiements.config.ts`
- `playwright.depenses.config.ts`

### Change Log

- 2026-03-05: implementation story 4.4 terminee avec support des paiements partiels, rejet/annulation motivee, recalcul de statut depense, invalidations front et couverture de tests backend/frontend.
- 2026-03-06: correction post-review sur reprise apres annulation, scoping tenant des requetes backend, preservation SQL du statut `annulee`, et requalification de la couverture frontend helper-only.
- 2026-03-06: couverture frontend etendue sur la logique de page paiements (filtres, invalidations, dialogue motif, reprise), avec ajout d'un spec UI Playwright `tests/paiements-page.spec.ts` encore non valide dans cet environnement faute de demarrage Vite fiable.
- 2026-03-06: spec Playwright `tests/paiements-page.spec.ts` valide pour les scenarios UI d'annulation motivee et de reprise apres annulation.
- 2026-03-06: spec Playwright `tests/depenses-paiements-page.spec.ts` valide pour les scenarios UI de paiement partiel et de paiement final avec statut depense mis a jour.
