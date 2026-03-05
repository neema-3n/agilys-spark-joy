# Story 4.2: Gerer bons de commande et factures

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a gestionnaire depense,
I want lier BC et factures a un engagement,
so that le suivi documentaire reste coherent.

## Acceptance Criteria

1. **Creation d'un BC rattache a un engagement actif**
   - **Given** un engagement actif du tenant/exercice courant
   - **When** l'utilisateur cree un bon de commande
   - **Then** le BC est persiste avec lien `engagementId` coherent
   - **And** les controles de scope (tenant, exercice, references) sont appliques.

2. **Creation d'une facture reliee au BC (et donc a l'engagement)**
   - **Given** un BC valide/en cours/receptionne du meme tenant
   - **When** l'utilisateur enregistre une facture avec pieces et metadonnees obligatoires
   - **Then** la facture conserve les references BC + engagement
   - **And** les montants et liens restent coherents pour les etapes suivantes (depense/paiement).

3. **Cycle de statut facture explicite et bloque sur transitions interdites**
   - **Given** une facture en cycle de vie
   - **When** une transition de statut est demandee
   - **Then** seules les transitions autorisees par le workflow courant sont acceptees
   - **And** toute transition interdite renvoie une erreur metier actionnable.

4. **Traçabilite, securite et non-regression**
   - **Given** un environnement multi-tenant avec RBAC/ABAC
   - **When** un utilisateur consulte/modifie BC ou facture
   - **Then** les acces sont strictement controles et scoper au tenant
   - **And** les ecritures/journaux necessaires sont conserves sans destruction d'historique.

## Tasks / Subtasks

- [x] Verifier et documenter le contrat metier Story 4.2 (FR11-FR13) dans code + story, en explicitant la limite actuelle des statuts facture implementes (AC: 1, 2, 3)
- [x] Durcir la creation/update BC backend pour imposer coherence de rattachement engagement/ligne/projet/exercice (AC: 1, 4)
- [x] Durcir la creation/update facture backend pour imposer coherence BC <-> engagement et presence des metadonnees/pieces obligatoires selon regles metier (AC: 2, 4)
- [x] Verifier la transition de statut facture et messages d'erreur (etat courant code: brouillon/validee/payee/annulee) avec anti-regression vers depenses/paiements (AC: 3, 4)
- [x] Aligner types front (`facture.types.ts`, services API, composants) avec le contrat backend reel et ne pas introduire de litteraux incoherents (AC: 2, 3)
- [x] Consolider les composants BC/factures pour reutiliser les abstractions existantes (dialogs/tables/hooks), sans duplication de regles metier cote UI (AC: 1, 2, 3)
- [x] Ajouter/adapter tests backend sur chainage engagement -> BC -> facture, refus cross-tenant, et transitions facture interdites (AC: 1, 2, 3, 4)
- [x] Ajouter/adapter tests frontend cibles sur creation BC/facture et affichage d'erreurs metier actionnables (AC: 2, 3, 4)
- [x] Verifier explicitement qu'aucun nouvel appel runtime Supabase n'est introduit dans ce flux (AC: 4)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 4, Story 4.2).
- Portee FR directe: FR11 (BC rattache engagement), FR12 (facture + metadonnees/pieces), FR13 (cycle facture explicite).
- Dependances directes:
  - Story 4.1 livree (`4-1-gerer-reservations-et-engagements.md`) qui a verrouille l'entree reservation -> engagement.
  - Story 4.3 consommera les factures valides pour constituer la depense (`1..20`).

### Developer Context Section

- Le socle technique existe deja:
  - Backend NestJS: modules `bons-commande` et `factures` actifs et connectes dans `AppModule`.
  - Frontend: hooks/services/composants BC + factures deja en place.
- Risque principal a gerer dans cette story: **coherence de chainage documentaire** (engagement -> BC -> facture) sans casser les flux deja utilises par depenses/paiements.
- Ecart fonctionnel connu avec le PRD:
  - PRD cible FR13 avec machine etendue (`Brouillon -> Soumise -> Controlee -> Validee -> Partiellement payee -> Payee -> Rejetee -> Annulee`).
  - Le code courant implemente une machine simplifiee facture (`brouillon|validee|payee|annulee`).
  - Cette story doit **au minimum** verrouiller la coherence et les transitions supportees; extension de la machine complete peut etre planifiee en lot dedie si hors perimetre technique immediat.

### Technical Requirements

- Backend (priorite):
  - Forcer la coherence entre `engagementId`, `bonCommandeId`, `ligneBudgetaireId`, `exerciceId` et `client_id`.
  - Refuser toute creation facture sur BC hors scope tenant/exercice.
  - Garantir que la facture herite/maintient un lien engagement coherent quand BC est renseigne.
  - Verrouiller les transitions de statut facture avec messages d'erreur actionnables.
  - Preserver la compatibilite avec `depenses.service.ts` (qui exige des factures `validee`).
- Frontend:
  - Continuer via `requestJson`/client HTTP unifie.
  - Centraliser les appels dans `services/api/*` et hooks React Query.
  - Afficher les erreurs backend sans les masquer par des messages generiques.
- Data/Schema:
  - Aucun changement schema requis si les contraintes actuelles couvrent la coherence.
  - Si contrainte DB necessaire, livrer migration versionnee et rejouable.

### Architecture Compliance

- Garder `JwtAuthGuard` + `AuthorizationPolicyGuard` + `@RequirePermissions` sur endpoints BC/factures.
- Maintenir `client_id = tenantId` comme filtre obligatoire en lecture/ecriture.
- Aucune logique metier critique de validation chainage dans les composants React.
- Reutiliser les abstractions existantes avant toute nouvelle couche.
- Ne pas introduire de nouvelle dependance runtime Supabase dans ce flux.

### Library / Framework Requirements

Versions observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, Vite `5.4.19`.
- Backend: NestJS `10.4.22`, `class-validator`, `class-transformer`, `pg`.

Decision story 4.2:

- Aucun upgrade technique requis pour atteindre les AC.
- Priorite a la robustesse metier et a la coherence documentaire sur les versions en place.

### File Structure Requirements

Points d'extension attendus:

- Backend:
  - `backend/src/bons-commande/bons-commande.controller.ts`
  - `backend/src/bons-commande/bons-commande.service.ts`
  - `backend/src/bons-commande/dto/bons-commande.dto.ts`
  - `backend/src/factures/factures.controller.ts`
  - `backend/src/factures/factures.service.ts`
  - `backend/src/factures/dto/factures.dto.ts`
  - `backend/src/ecritures-comptables/ecritures-comptables.service.ts` (si impact de statuts/ecritures)
- Frontend:
  - `src/services/api/bonsCommande.service.ts`
  - `src/services/api/factures.service.ts`
  - `src/hooks/useBonsCommande.ts`
  - `src/hooks/useFactures.ts`
  - `src/components/bonsCommande/*`
  - `src/components/factures/*`
  - `src/pages/app/Factures.tsx`
  - `src/pages/app/Engagements.tsx` (si actions contextuelles BC/facture)
  - `src/types/facture.types.ts`

Regles de structure:

- Ne pas dupliquer les regles de transition entre plusieurs composants.
- Si une regle de coherence est partagee, la centraliser cote backend.

### Testing Requirements

1. Backend (obligatoire)
   - creation BC avec engagement actif et scope valide,
   - refus BC/facture cross-tenant ou references incoherentes,
   - creation facture avec lien BC/engagement coherent,
   - refus transitions facture interdites,
   - non-regression sur parcours de liquidation depense depuis facture validee.

2. Frontend
   - creation BC/facture nominale depuis UI,
   - affichage erreurs metier backend (coherence references/transitions),
   - invalidations cache React Query coherentes apres mutations BC/factures.

3. Qualite transversale
   - lint/typecheck propres front + backend,
   - verification absence nouvel import `@supabase/supabase-js` dans le flux story.

### Previous Story Intelligence

Lecons extraites de Story 4.1:

- Les transitions metier doivent etre enforcees cote backend (source de verite).
- Les messages d'erreur doivent etre precis et actionnables (pas de "invalid request" generique).
- Le scope tenant/exercice doit etre verifie a chaque jointure et chaque operation.
- Les tests doivent couvrir explicitement les cas cross-tenant et les transitions interdites.
- Les composants front doivent rester fins: orchestration UI + appel service, sans logique metier critique.

### Git Intelligence Summary

Observations sur les derniers commits:

- Le dernier lot a surtout renforce `reservations/engagements` et leurs tests.
- Le pattern etabli: corriger d'abord la logique backend, puis aligner types/services front, puis verrouiller avec tests cibles.
- `sprint-status.yaml` et story doc sont maintenus a jour apres chaque lot.

Action pour 4.2:

- Repliquer ce pattern d'execution sur BC/factures pour minimiser le risque de regression.

### Latest Tech Information

- Verifications "latest" effectuees sur le repository courant (versions package et stack active du projet).
- Aucun signal imposant une migration de version immediate pour implementer 4.2.
- Point de vigilance fonctionnel (pas technique): aligner progressivement la machine de statut facture codee avec la cible PRD, sans casser les flux en production de migration.

### Project Structure Notes

- Architecture en transition vers NestJS + PostgreSQL avec front Vite type-safe.
- Cette story reste dans le meme axe que 4.1: verrouiller le maillon suivant de la chaine operationnelle sans refactor transversal.
- Les stories 4.3/4.4 dependent directement de la qualite de chainage BC/facture livree ici.

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic 4 / Story 4.2)
- `/_bmad-output/planning-artifacts/prd.md` (FR11-FR13, contraintes operations)
- `/_bmad-output/project-context.md` (guardrails migration et qualite)
- `/_bmad-output/implementation-artifacts/4-1-gerer-reservations-et-engagements.md`
- `backend/src/bons-commande/*`
- `backend/src/factures/*`
- `backend/src/depenses/depenses.service.ts`
- `src/services/api/bonsCommande.service.ts`
- `src/services/api/factures.service.ts`
- `src/hooks/useBonsCommande.ts`
- `src/hooks/useFactures.ts`
- `src/components/bonsCommande/*`
- `src/components/factures/*`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Contrat metier 4.2 applique avec validation stricte du chainage engagement -> BC -> facture et controles tenant/exercice.
- Limite explicite maintenue sur le cycle facture courant (`brouillon|validee|payee|annulee`) avec transitions interdites bloquees et messages actionnables.
- Metadonnee facture obligatoire (`numeroFactureFournisseur`) enforcee backend + formulaire frontend.
- Gestion d'erreurs UI consolidee via abstraction partagee `useMutationErrorToast` pour BC/factures.
- Tests backend ajoutes sur coherence documentaire et transitions facture, tests frontend adaptes sur remontee d'erreurs metier en creation BC/facture.
- Metadonnee documentaire complementaire `referencePiece` rendue obligatoire sur la creation de facture (backend + frontend) pour couvrir l'exigence "pieces et metadonnees obligatoires".
- Transition de statut via `PATCH /factures/:id` bloquee pour imposer les endpoints metier dedies (`/valider`, `/marquer-payee`, `/annuler`) et eviter les contournements.
- Tests backend completes avec cas cross-tenant/exercice sur BC et facture; tests frontend API complets avec cas nominal + erreur metier actionnable.
- Verifications globales executees: `pnpm lint:frontend`, `pnpm --dir backend lint`, `pnpm test:backend`, `pnpm test:frontend`, controle explicite absence nouvel appel Supabase runtime.

### File List

- `_bmad-output/implementation-artifacts/4-2-gerer-bons-de-commande-et-factures.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/bons-commande/bons-commande.service.ts`
- `backend/src/bons-commande/bons-commande.service.spec.ts`
- `backend/src/factures/factures.service.ts`
- `backend/src/factures/factures.service.spec.ts`
- `backend/src/factures/dto/factures.dto.ts`
- `src/components/factures/FactureDialog.tsx`
- `src/pages/app/Factures.tsx`
- `src/pages/app/BonsCommande.tsx`
- `src/hooks/useBonsCommande.ts`
- `src/hooks/useFactures.ts`
- `src/hooks/useMutationErrorToast.ts`
- `src/services/api/factures.service.ts`
- `src/types/facture.types.ts`
- `tests/auth-migration.spec.ts`
- `supabase/migrations/20260305101000_add_facture_reference_piece.sql`

## Senior Developer Review (AI)

Date: 2026-03-05
Reviewer: Max (AI)
Outcome: Changes applied and validated

### Findings Addressed

1. AC2 "pieces et metadonnees obligatoires" etait partiellement couvert (metadonnee seule).
   - Fix: ajout de la metadonnee obligatoire `referencePiece` sur le contrat backend/frontend.
2. Contournement possible du workflow statut via update generique facture.
   - Fix: blocage explicite des transitions de statut dans `update`, avec message orientant vers endpoints dedies.
3. Couverture tests cross-tenant insuffisante par rapport aux taches cochees.
   - Fix: tests backend ajoutes pour BC/facture hors scope tenant/exercice.
4. Couverture frontend creation nominale BC/facture manquante.
   - Fix: tests frontend API ajoutes pour creation nominale BC/facture (en plus des erreurs actionnables).
5. Appel API direct dans `FactureDialog` (logique metier cote composant).
   - Fix: suppression de l'appel `facturesService.getAll` dans le composant; consommation des factures via props depuis les pages.

### Validation

- `pnpm lint:frontend` ✅
- `pnpm lint:backend` ✅
- `pnpm --dir backend test backend/src/bons-commande/bons-commande.service.spec.ts backend/src/factures/factures.service.spec.ts` ✅
- `pnpm exec playwright test tests/auth-migration.spec.ts --grep "bonsCommandeService.create|facturesService.create"` ✅

## Change Log

- 2026-03-04: Story 4.2 creee en mode contexte complet et statut `ready-for-dev`.
- 2026-03-04: Implementation story 4.2 completee, validations/tests executes et statut passe a `review`.
- 2026-03-05: Revue senior AI executee; correctifs appliques (metadonnee `referencePiece`, garde-fou workflow statut, tests cross-tenant/creation nominale), statut passe a `done`.
