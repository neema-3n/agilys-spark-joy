# Story 10.2: Produire dossier de depense unifie avec preuves

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a auditeur interne,
I want tracer un dossier de depense de bout en bout,
so that je verifie la conformite complete de la chaine.

## Acceptance Criteria

1. **Given** une depense cible
   **When** le dossier unifie est consulte ou exporte
   **Then** toutes les etapes reservation -> paiement sont reliees
   **And** les pieces, controles et actions utilisateurs sont inclus.

## Tasks / Subtasks

- [x] Definir contrat API du dossier unifie (AC: 1)
  - [x] Endpoint detail dossier par `depenseId` avec timeline de chaine complete.
  - [x] Endpoint export PDF/ZIP avec preuves et metadonnees d'audit.
  - [x] DTO filtres pour scope tenant/exercice/periode et niveau de detail.

- [x] Implementer composition backend de la chaine documentaire (AC: 1)
  - [x] Relier reservation, engagement, bon de commande, facture(s), depense, paiement(s).
  - [x] Inclure pieces justificatives, statuts, transitions et controles executes.
  - [x] Inclure actions utilisateurs (qui/quand/quoi) avec correlation et horodatage.

- [x] Integrer surface front de consultation du dossier (AC: 1)
  - [x] Ajouter service API type `dossier-depense-unifie.service.ts`.
  - [x] Ajouter vue detail dans Reporting ou route dediee auditable.
  - [x] Afficher timeline chainage + liste preuves + synthese des ecarts/contrôles.

- [x] Ajouter export probatoire (AC: 1)
  - [x] Export PDF (lecture) et ZIP (preuves + manifest + metadata JSON).
  - [x] Verifier permissions avant generation/telechargement.
  - [x] Journaliser export avec contexte utilisateur et cible depense.

- [x] Couvrir les tests critiques (AC: 1)
  - [x] Backend: chainage complet, tenant isolation, permissions, depense introuvable.
  - [x] Backend: coherence pieces/actions/timeline et robustesse sur donnees partielles.
  - [x] Frontend: consultation dossier, navigation timeline, export, erreurs API.

## Dev Notes

### Story Requirements

- Story cible: **10.2** dans l'**Epic 10**.
- FR couvert principal: **FR70**.
- Le dossier unifie doit etre probatoire (audit) et exploitable en controle interne.

### Developer Context Section

- Le projet dispose deja des modules metier de la chaine depense (`reservations`, `engagements`, `bons-commande`, `factures`, `depenses`, `paiements`) et de plusieurs traces dans `exercice-cloture`/`controle-interne`.
- La story doit assembler ces informations sans re-implémenter la logique transactionnelle existante.
- En cas de donnees manquantes, le dossier doit rester lisible et expliciter les trous de preuve.

### Technical Requirements

- Aucun ajout de dependance runtime Supabase.
- Isolation tenant stricte sur toutes les requetes composees.
- Timeline ordonnee deterministement (date evenement + sequence).
- Structures de preuve normalisees pour export (manifest lisible machine + synthese humaine).
- Messages d'erreur actionnables (ex: depense hors scope, preuves absentes, export en echec).

### Architecture Compliance

- Backend: module dedie type `dossier-depense-unifie` suivant pattern NestJS standard.
- Backend: composer services existants au lieu de dupliquer SQL metier dans plusieurs endroits.
- Front: service API typed + composants dedies + integration progressive sans casser reporting existant.
- Respect des permissions audit/read deja utilisees dans le backend.

### Library & Framework Requirements

- Garder stack repo actuelle (React 18.3.1 / NestJS 10.4.22 / React Query 5.83.0 / pnpm 9.12.0).
- Pas d'upgrade de versions dans cette story.

### File Structure Requirements

- Backend recommandé:
  - `backend/src/dossier-depense-unifie/`
  - `backend/src/dossier-depense-unifie/dto/`
- Frontend recommandé:
  - `src/services/api/dossier-depense-unifie.service.ts`
  - `src/components/dossier-depense-unifie/`
  - integration dans `src/pages/app/Reporting.tsx` ou route `src/pages/app/DossierDepense.tsx`
- Nommage explicite metier et types stricts sans `any`.

### Testing Requirements

- Backend:
  - cas nominal chaine complete,
  - cas partiel (etape absente),
  - isolation tenant,
  - permission audit.
- Frontend:
  - consultation dossier,
  - visualisation timeline et preuves,
  - export PDF/ZIP,
  - gestion erreurs et etats vides.
- Definition of Done:
  - AC1 valide,
  - lint/typecheck clean,
  - tests critiques passants,
  - export probatoire exploitable.

### Previous Story Intelligence

- Les stories 10.1/9.x ont installe un pattern stable: extension progressive des vues reporting + services API typed + garde-fous tenant.
- Reprendre ce pattern pour 10.2 afin de conserver coherence architecture et UX.

### Git Intelligence Summary

- Flux de delivery orienté stories incrementales et statut progressif `ready-for-dev`.
- Recommandation: livrer 10.2 en lot atomique backend+frontend+tests+export, sans refactor transversal.

### Latest Tech Information

- Les versions npm plus recentes existent, mais pas de mise a niveau en scope story.
- Priorite a la coherence avec l'etat actuel du repo et la stabilite des parcours metier.

### Project Structure Notes

- Architecture en transition vers cible Next.js/NestJS; frontend courant encore Vite/React.
- Maintenir separation claire des couches pour faciliter migration continue.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md) - Epic 10, Story 10.2
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md) - FR70
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md) - règles migration
- [engagements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.service.ts) - chainage engagement/reservation
- [factures.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/factures/factures.service.ts) - donnees facture/preuves
- [depenses.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/depenses/depenses.service.ts) - depense/paiements valides
- [Reporting.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Reporting.tsx) - surface de restitution reporting

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story key detectee: `10-2-produire-dossier-de-depense-unifie-avec-preuves`
- Contexte utilise: sprint-status + epics/prd + services backend chaine depense
- Implementation backend: module NestJS `dossier-depense-unifie` + endpoints detail/export + DTO filtres scope.
- Implementation frontend: service/hook/composant dossier + integration onglet Reporting.
- Validation executee: `pnpm run lint:frontend`, `pnpm --dir backend run lint`, `pnpm exec playwright test tests/dossier-depense-unifie-ui.spec.ts`, `pnpm run test`.

### Implementation Plan

- Composer un dossier unique a partir des tables metier existantes (`depenses`, `depense_factures`, `factures`, `paiements`, `operations_tresorerie`, `ecritures_comptables`, `engagements`, `reservations_credits`, `bons_commande`) sans dupliquer la logique transactionnelle.
- Exposer un endpoint de consultation auditable avec timeline deterministe, preuves, controles et ecarts.
- Exposer un endpoint d'export probatoire PDF/ZIP avec manifest machine-readable et metadata d'audit.
- Integrer une surface front dediee dans Reporting avec filtres, consultation, export et gestion d'erreurs.
- Verrouiller le comportement avec tests backend unitaires et test UI Playwright.

### Completion Notes List

- Module backend `dossier-depense-unifie` implemente avec endpoints detail/export, permission `referentiels:audit:read` et journalisation des exports.
- Composition de chaine complete reservation -> engagement -> bon de commande -> facture(s) -> depense -> paiement(s), avec timeline ordonnee et actions utilisateurs correlees.
- Preuves normalisees (reference piece, piece justificative, references paiement), detection explicite des trous de preuve, synthese controles/ecarts.
- Export probatoire PDF et ZIP implemente (manifest JSON + dossier JSON + preuves.txt).
- Frontend integre dans Reporting via nouvel onglet `Dossier Depense` avec consultation detaillee et export PDF/ZIP.
- Tests critiques ajoutes pour backend et frontend; regression complete executee avec succes.

### File List

- backend/src/app.module.ts
- backend/src/dossier-depense-unifie/dto/dossier-depense-unifie.dto.ts
- backend/src/dossier-depense-unifie/dossier-depense-unifie.controller.ts
- backend/src/dossier-depense-unifie/dossier-depense-unifie.module.ts
- backend/src/dossier-depense-unifie/dossier-depense-unifie.service.ts
- backend/src/dossier-depense-unifie/dossier-depense-unifie.service.spec.ts
- src/components/dossier-depense-unifie/DossierDepenseUnifieReport.tsx
- src/hooks/useDossierDepenseUnifie.ts
- src/pages/app/Reporting.tsx
- src/services/api/dossier-depense-unifie.service.ts
- src/types/dossier-depense-unifie.types.ts
- tests/dossier-depense-unifie-ui.spec.ts
- _bmad-output/implementation-artifacts/10-2-produire-dossier-de-depense-unifie-avec-preuves.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Senior Developer Review (AI)

Date: 2026-03-10
Reviewer: Max (AI)
Outcome: Approved

- AC1 validee: chainage reservation -> paiement, timeline, preuves, controles et actions utilisateurs verifies dans le backend + surface frontend.
- Validation d'execution confirmee: `pnpm --dir backend run lint`, `pnpm --dir backend run test -- dossier-depense-unifie.service.spec.ts`, `pnpm run lint:frontend`, `pnpm exec playwright test tests/dossier-depense-unifie-ui.spec.ts`.
- Ecart corrige pendant review: ajout de l'affichage d'erreur d'export dans le composant UI pour couvrir explicitement le cas d'echec de telechargement.
- Ecart documentaire corrige: synchronisation de la File List avec les fichiers reellement modifies (`sprint-status.yaml` inclus).

## Change Log

- 2026-03-10: Implementation complete de la story 10.2 (backend module dossier, front reporting, export probatoire PDF/ZIP, tests backend+frontend, validation lint/typecheck/regression).
- 2026-03-10: Revue senior AI terminee, ecarts resolus, story passee a `done`.
