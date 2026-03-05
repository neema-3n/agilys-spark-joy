# Story 4.3: Constituer et liquider une depense

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a comptable,
I want constituer une depense depuis des factures valides,
so that je prepare l'ordonnancement conforme.

## Acceptance Criteria

1. **Constitution d'une depense multi-factures dans la plage autorisee (1..20)**
   - **Given** un ensemble de factures du tenant/exercice en statut `validee`
   - **When** l'utilisateur cree une depense en selectionnant `1` a `20` factures
   - **Then** la depense est creee avec chainage facture(s) coherent
   - **And** les references budgetaires/engagement/projet restent coherentes avec les factures source.

2. **Rejet explicite au-dela de 20 factures**
   - **Given** une tentative de creation de depense avec plus de `20` factures
   - **When** la requete est soumise
   - **Then** la creation est refusee
   - **And** un message metier actionnable indique la limite et l'action attendue.

3. **Liquidation conforme et protection des transitions interdites**
   - **Given** une depense creee depuis des factures valides
   - **When** les actions de cycle de vie sont executees (`valider`, `ordonnancer`, `annuler`)
   - **Then** les transitions suivent les regles autorisees du workflow depense
   - **And** toute transition invalide est bloquee avec erreur metier explicite.

4. **Securite, isolation et auditabilite**
   - **Given** un environnement multi-tenant avec RBAC/ABAC et separation des roles
   - **When** un utilisateur cree/modifie/liquide une depense
   - **Then** les controles JWT + policy guard + permissions sont appliques
   - **And** les traces/ecritures restent non destructives et exploitables pour audit.

## Tasks / Subtasks

- [x] Verifier et formaliser le contrat Story 4.3 (FR14, FR15, FR32, NFR8, NFR9, NFR11), avec limite stricte `1..20` factures (AC: 1, 2, 4)
- [x] Etendre les DTO backend `depenses` pour supporter la creation multi-factures (`factureIds: UUID[]`) avec validation forte (taille min/max, unicite, statut facture) (AC: 1, 2)
- [x] Adapter `DepensesService` pour constituer une depense depuis plusieurs factures validees et appliquer les controles de coherence tenant/exercice/engagement (AC: 1, 3, 4)
- [x] Introduire une structure de persistence explicite pour le lien depense<->factures multiples (table de liaison ou schema equivalent) avec migration SQL versionnee et rejouable (AC: 1, 2)
- [x] Bloquer explicitement les creations `>20` factures avec message metier actionnable standardise (AC: 2)
- [x] Aligner les services/front types (`depenses.service.ts`, `depense.types.ts`, hooks React Query) sur le nouveau contrat multi-factures sans `any` (AC: 1, 2)
- [x] Adapter l'UI de creation de depense depuis facture pour une selection multi-factures (1..20), avec feedback en temps reel du nombre selectionne et du montant total liquide (AC: 1, 2)
- [x] Verifier que la liquidation/ordonnancement ne contourne pas les regles metier deja en place (annulation, contre-passation, depense comptabilisee non modifiable) (AC: 3, 4)
- [x] Ajouter les tests backend (unit/integration) pour nominal 1 facture, nominal N factures, refus >20, refus cross-tenant, refus facture non `validee`, transitions depense interdites (AC: 1, 2, 3, 4)
- [x] Ajouter les tests frontend cibles sur creation multi-factures, erreurs metier actionnables, et invalidations cache depenses/factures/ecritures (AC: 1, 2, 4)
- [x] Verifier explicitement qu'aucune nouvelle dependance runtime Supabase n'est introduite (AC: 4)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 4, Story 4.3).
- Portee FR directe: FR14 (depense depuis `1..20` factures validees), FR15 (cycle depense explicite).
- Contraintes transverses: FR32 (historique non destructif), FR38-FR40 (RBAC/ABAC + isolation), NFR8/NFR9/NFR11.
- Dependances directes:
  - Story 4.1 (`reservations -> engagements`) en `done`.
  - Story 4.2 (`BC -> factures`) en `done`.
  - Story 4.4 dependra de la qualite de chainage depense -> paiement.

### Developer Context Section

- Le module depenses existe deja (`backend/src/depenses/*`, `src/services/api/depenses.service.ts`, `src/hooks/useDepenses.ts`, `src/pages/app/Depenses.tsx`) mais il est principalement modele autour d'un `facture_id` unique.
- Le besoin Story 4.3 impose une capacite multi-factures (jusqu'a 20) qui depasse le contrat actuel.
- Risque principal: implementer une multi-liquidation sans casser les gardes comptables deja presentes (annulation avec contre-passation, verrouillage des operations comptabilisees, scopes tenant/exercice).
- Risque secondaire: conserver une UX simple et typage propre alors que les APIs actuelles utilisent encore `any` sur certaines mutations depenses.

### Technical Requirements

- Backend (priorite):
  - Ajouter/adapter un endpoint de creation multi-factures de depense avec validation stricte de cardinalite `1..20`.
  - Verifier pour chaque facture: appartenance tenant, exercice coherent, statut `validee`, eligibilite a la liquidation.
  - Garantir la coherence entre factures selectionnees (engagement/ligne/projet quand requis par regle metier).
  - Retourner des erreurs metier explicites et actionnables sur limite, coherence et statut.
  - Maintenir la generation d'ecritures et les garde-fous existants (non-modification apres comptabilisation, contre-passations a l'annulation).
- Frontend:
  - Supprimer les `any` sur les create-mutations depenses en faveur de types explicites.
  - Ajouter un flux de selection multi-factures (max 20) dans les composants depenses/factures relies.
  - Conserver les invalidations React Query (`depenses`, `factures`, `ecritures-comptables`, `engagements`) apres mutation.
  - Afficher les erreurs backend sans les ecraser par des messages generiques.
- Data/Schema:
  - Le schema actuel `depenses.facture_id` couvre un lien unitaire; Story 4.3 necessite un support relationnel multi-factures.
  - Livrer une migration SQL versionnee/rejouable et compatible avec les scripts projet (`pnpm db:migrate`, reset/seed si necessaire).

### Architecture Compliance

- Conserver `JwtAuthGuard` + `AuthorizationPolicyGuard` + `@RequirePermissions` sur endpoints depenses.
- Appliquer strictement `client_id = tenantId` dans toutes les lectures/ecritures et validations de chainage.
- Garder la logique metier critique de liquidation cote NestJS (pas de duplication des regles dans les composants React).
- Reutiliser les briques existantes (`DepensesService`, hooks React Query, composants de dialogues/tables) avant d'ajouter de nouvelles abstractions.
- Ne pas introduire de nouveau couplage runtime a Supabase.

### Library / Framework Requirements

Versions observees dans le repo (source de verite courante):

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, Vite `5.4.19`.
- Backend: NestJS `10.4.22`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`, `pg` `8.19.0`.
- Tooling: `pnpm@9.12.0` impose par preinstall.

Decision story 4.3:

- Aucun upgrade de dependances requis pour satisfaire les AC.
- Priorite a l'alignement contrat metier + schema + tests sur les versions en place.

### File Structure Requirements

Points d'extension attendus:

- Backend:
  - `backend/src/depenses/dto/depenses.dto.ts`
  - `backend/src/depenses/depenses.controller.ts`
  - `backend/src/depenses/depenses.service.ts`
  - `backend/src/factures/factures.service.ts` (si verification de statut/liquidation factorisee)
  - `backend/src/ecritures-comptables/ecritures-comptables.service.ts` (si impact de chainage)
  - `backend/src/*/*.spec.ts` et/ou `backend/test/*.e2e.spec.ts` pour couverture depenses.
- Frontend:
  - `src/services/api/depenses.service.ts`
  - `src/hooks/useDepenses.ts`
  - `src/types/depense.types.ts`
  - `src/components/depenses/CreateDepenseFromFactureDialog.tsx`
  - `src/components/depenses/DepenseDialog.tsx`
  - `src/pages/app/Depenses.tsx`
- Database:
  - `supabase/migrations/*.sql` pour la structure multi-factures et contraintes associees.

Regles de structure:

- Eviter de dupliquer la validation multi-factures entre service depenses, service factures et UI.
- Si une regle est partagee (ex: cardinalite `1..20`, eligibilite facture), la centraliser dans une abstraction backend unique.

### Testing Requirements

1. Backend (obligatoire)
   - creation depense avec 1 facture validee,
   - creation depense avec plusieurs factures valides (borne haute `20`),
   - refus creation avec `0` ou `>20` factures,
   - refus facture hors tenant/exercice ou statut non `validee`,
   - non-regression transitions depense (`valider`, `ordonnancer`, `annuler`) et garde-fou post-comptabilisation.

2. Frontend
   - parcours selection multi-factures + creation nominale,
   - affichage des erreurs metier (limite, coherence, statut),
   - invalidation cache coherente apres creation et transitions.

3. Qualite transversale
   - lint/typecheck propres front + backend,
   - verification explicite absence de nouvel import `@supabase/supabase-js` dans le flux Story 4.3.

### Previous Story Intelligence

Lecons consolidees depuis Story 4.2:

- Verifier le chainage documentaire cote backend avant persistence (source de verite metier).
- Bloquer les contournements de workflow via endpoints generiques (forcer les endpoints metier dedies).
- Rendre les erreurs metier actionnables et directement exploitables dans l'UI.
- Couvrir explicitement les cas cross-tenant/exercice dans les tests.
- Reutiliser les abstractions de mutation d'erreur (toast/feedback) plutot que dupliquer la logique d'affichage.

Lecons consolidees depuis Story 4.1:

- Centraliser les regles de transition dans une couche backend unique.
- Ne pas laisser le front porter des validations metier critiques.
- Aligner strictement types frontend et contrat backend pour eviter les derives de statut.

### Git Intelligence Summary

Observations sur les 5 derniers commits:

- Le pattern recent privilegie: durcissement backend -> alignement front/types -> couverture tests -> mise a jour story/sprint-status.
- Les lots recents ont surtout cible reservations/engagements et revues de code adversariales.
- La discipline documentaire est deja en place: story file et `sprint-status.yaml` synchronises a chaque avancement.

Action pour 4.3:

- Reprendre ce meme pattern pour limiter les regressions: verrouiller d'abord le contrat backend multi-factures, puis adapter l'UI/hook/types, puis fermer avec tests cibles.

### Latest Tech Information

- Contexte "latest" derive des versions verrouillees dans le repository courant (package manifests + project-context).
- Aucun signal interne n'impose un upgrade de librairie pour Story 4.3.
- Point de vigilance fonctionnel: le PRD cible un cycle depense plus riche (`Liquidee`, `Partiellement payee`, `Cloturee`) que l'etat code actuel (`brouillon|validee|ordonnancee|payee|annulee`); cette story doit au minimum garantir la limite `1..20` et la liquidation fiable sans regression.

### Project Structure Notes

- Architecture en transition vers NestJS + PostgreSQL avec front React/Vite type-safe.
- Story 4.3 est un pivot de chaine operationnelle: elle consomme la qualite de 4.2 (factures) et conditionne 4.4 (paiements partiels/rejets).
- Le changement de cardinalite facture->depense est le principal impact structurel de cette story; il doit rester atomique et reversible.

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic 4 / Story 4.3)
- `/_bmad-output/planning-artifacts/prd.md` (FR14, FR15, FR17, FR32 + NFR associes)
- `/_bmad-output/project-context.md` (guardrails migration, qualite, anti-patterns)
- `/_bmad-output/implementation-artifacts/4-1-gerer-reservations-et-engagements.md`
- `/_bmad-output/implementation-artifacts/4-2-gerer-bons-de-commande-et-factures.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/depenses/depenses.controller.ts`
- `backend/src/depenses/depenses.service.ts`
- `backend/src/depenses/dto/depenses.dto.ts`
- `backend/src/factures/factures.service.ts`
- `src/services/api/depenses.service.ts`
- `src/hooks/useDepenses.ts`
- `src/types/depense.types.ts`
- `src/components/depenses/CreateDepenseFromFactureDialog.tsx`
- `src/pages/app/Depenses.tsx`
- `supabase/migrations/20251119172516_e5880012-ca12-47ef-acbb-0a08f11126f0.sql`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Story context 4.3 cree avec guardrails backend/frontend, impacts schema et strategie de tests.
- Story prete pour execution `dev-story` avec statut `ready-for-dev`.
- Contrat backend et front aligne sur la creation multi-factures (`factureIds`, borne 1..20, messages metier actionnables).
- Service `DepensesService` et transitions durcis: coherence factures, blocage transitions interdites, recalcul `montant_liquide` par table de liaison, maintien de la contre-passation.
- Migration SQL ajoutee pour `public.depense_factures` (avec backfill historique depuis `depenses.facture_id`).
- UI facture -> depense adaptee en selection multi-factures (feedback temps reel: nombre + montant total liquide).
- Tests ajoutes: backend `depenses.service.spec.ts` + frontend cible `auth-migration.spec.ts` (contrat API createFromFacture + erreur metier actionnable).
- Verification explicite: aucun nouvel import runtime `@supabase/supabase-js` introduit dans les fichiers modifies.

### File List

- `_bmad-output/implementation-artifacts/4-3-constituer-et-liquider-une-depense.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/depenses/dto/depenses.dto.ts`
- `backend/src/depenses/depenses.service.ts`
- `backend/src/depenses/depenses.service.spec.ts`
- `backend/src/factures/dto/factures.dto.ts`
- `backend/src/factures/factures.service.ts`
- `backend/src/factures/factures.service.spec.ts`
- `backend/src/bons-commande/bons-commande.service.ts`
- `backend/src/bons-commande/bons-commande.service.spec.ts`
- `supabase/migrations/20260305113000_add_depense_factures_link_table.sql`
- `supabase/migrations/20260305101000_add_facture_reference_piece.sql`
- `src/types/depense.types.ts`
- `src/types/facture.types.ts`
- `src/services/api/depenses.service.ts`
- `src/services/api/factures.service.ts`
- `src/hooks/useDepenses.ts`
- `src/hooks/useFactures.ts`
- `src/hooks/useBonsCommande.ts`
- `src/hooks/useMutationErrorToast.ts`
- `src/components/depenses/CreateDepenseFromFactureDialog.tsx`
- `src/components/factures/FactureDialog.tsx`
- `src/pages/app/Factures.tsx`
- `src/pages/app/BonsCommande.tsx`
- `tests/auth-migration.spec.ts`

## Change Log

- 2026-03-05: Story 4.3 creee en mode contexte complet et statut `ready-for-dev`.
- 2026-03-05: Implementation Story 4.3 completee (multi-factures 1..20, migration liaison depense-factures, UI multi-selection, tests backend/frontend cibles), statut passe a `review`.
- 2026-03-05: Revue senior corrigee (annulation facture operationnelle, garde de transition depense->payee, filtres tenant sur aggregations de liquidation, correction TypeScript FactureDialog, File List synchronisee avec git).
- 2026-03-05: Statut story repasse a `in-progress` et sprint-status synchronise, en attente de finalisation des tests frontend React Query/UI.
- 2026-03-05: Tests frontend React Query/UI completes (flux Facture -> Depense avec verification refetch depenses/factures) + invalidation `ecritures-comptables` ajoutee sur mutation `createFromFacture`.
- 2026-03-05: Validation finale effectuee, story passee a `done` et sprint-status synchronise.
