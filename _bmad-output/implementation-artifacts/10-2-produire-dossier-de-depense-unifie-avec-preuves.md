# Story 10.2: Produire dossier de depense unifie avec preuves

Status: ready-for-dev

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

- [ ] Definir contrat API du dossier unifie (AC: 1)
  - [ ] Endpoint detail dossier par `depenseId` avec timeline de chaine complete.
  - [ ] Endpoint export PDF/ZIP avec preuves et metadonnees d'audit.
  - [ ] DTO filtres pour scope tenant/exercice/periode et niveau de detail.

- [ ] Implementer composition backend de la chaine documentaire (AC: 1)
  - [ ] Relier reservation, engagement, bon de commande, facture(s), depense, paiement(s).
  - [ ] Inclure pieces justificatives, statuts, transitions et controles executes.
  - [ ] Inclure actions utilisateurs (qui/quand/quoi) avec correlation et horodatage.

- [ ] Integrer surface front de consultation du dossier (AC: 1)
  - [ ] Ajouter service API type `dossier-depense-unifie.service.ts`.
  - [ ] Ajouter vue detail dans Reporting ou route dediee auditable.
  - [ ] Afficher timeline chainage + liste preuves + synthese des ecarts/contrôles.

- [ ] Ajouter export probatoire (AC: 1)
  - [ ] Export PDF (lecture) et ZIP (preuves + manifest + metadata JSON).
  - [ ] Verifier permissions avant generation/telechargement.
  - [ ] Journaliser export avec contexte utilisateur et cible depense.

- [ ] Couvrir les tests critiques (AC: 1)
  - [ ] Backend: chainage complet, tenant isolation, permissions, depense introuvable.
  - [ ] Backend: coherence pieces/actions/timeline et robustesse sur donnees partielles.
  - [ ] Frontend: consultation dossier, navigation timeline, export, erreurs API.

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

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- _bmad-output/implementation-artifacts/10-2-produire-dossier-de-depense-unifie-avec-preuves.md
