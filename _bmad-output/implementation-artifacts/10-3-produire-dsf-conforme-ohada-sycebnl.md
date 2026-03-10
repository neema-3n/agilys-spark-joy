# Story 10.3: Produire DSF conforme OHADA/SYCEBNL

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a responsable fiscal,
I want generer une DSF controlee,
so that les obligations declaratives sont respectees.

## Acceptance Criteria

1. **Given** des donnees comptables valides
   **When** la DSF est generee
   **Then** le format exporte respecte le cadre OHADA/SYCEBNL applicable
   **And** les erreurs de conformite bloquantes sont signalees avant export final.

## Tasks / Subtasks

- [x] Definir contrat de generation DSF (AC: 1)
  - [x] DTO entree: exercice, entite, version referentiel, options export.
  - [x] DTO sortie: statut validation, erreurs bloquantes, warnings, lien export.
  - [x] Contrat de validation pre-export (checklist conformite).

- [x] Implementer moteur DSF backend conforme (AC: 1)
  - [x] Mapper donnees comptables vers structure DSF cible OHADA/SYCEBNL.
  - [x] Integrer regles de cohérence et controles bloquants avant emission.
  - [x] Produire payload d'export stable (CSV/XLSX/PDF ou format cible DSF défini).

- [x] Integrer la surface front DSF (AC: 1)
  - [x] Etendre `DSFReport` avec etat de validation pre-export.
  - [x] Afficher erreurs bloquantes vs warnings avec actions correctives.
  - [x] Proposer export uniquement si validation conforme.

- [x] Assurer traçabilité et audit (AC: 1)
  - [x] Journaliser lancement, validation, export et utilisateur initiateur.
  - [x] Conserver version du référentiel utilisé et hash du livrable.
  - [x] Assurer isolation tenant et permissions lecture/export DSF.

- [x] Couvrir les tests critiques (AC: 1)
  - [x] Backend: cas conforme, cas non conforme bloquant, cas partiel.
  - [x] Backend: validité mapping OHADA/SYCEBNL et stabilité des exports.
  - [x] Frontend: parcours validation -> correction -> export.

## Dev Notes

### Story Requirements

- Story cible: **10.3** dans l'**Epic 10**.
- FR couvert principal: **FR71**.
- La story porte sur conformité déclarative contrôlée, avec blocage des exports invalides.

### Developer Context Section

- Le front expose déjà `DSFReport` dans `Reporting.tsx`; cette story doit passer d'une vue de synthèse à une vraie capacité de validation/génération.
- Les règles comptables et données de référence existent côté backend; la DSF doit les consommer sans dupliquer les sources de vérité.
- Les écarts de conformité doivent être explicitement classés (bloquant / non bloquant).

### Technical Requirements

- Aucun ajout runtime Supabase.
- Isolation tenant stricte sur toutes les étapes de génération DSF.
- Validations déterministes et reproductibles pour éviter divergences d’un run à l’autre.
- Messages d’erreur actionnables, centrés sur correction métier.
- Export final autorisé uniquement si tous les blocants sont résolus.

### Architecture Compliance

- Backend: module dédié `dsf-reporting` (controller/service/dto/tests) ou extension propre du module reporting existant.
- Frontend: réutiliser `DSFReport` + service API typé, sans court-circuit de la couche API.
- Respect des guards/permissions et journalisation audit déjà en place.

### Library & Framework Requirements

- Maintenir stack actuelle repo (React 18 / Nest 10 / React Query 5 / pnpm 9).
- Aucun upgrade de version en scope de story.

### File Structure Requirements

- Backend recommandé:
  - `backend/src/dsf-reporting/`
  - `backend/src/dsf-reporting/dto/`
- Frontend recommandé:
  - `src/services/api/dsf-reporting.service.ts`
  - extension `src/components/reporting/DSFReport.tsx`
- Types explicites et stricts, sans `any`.

### Testing Requirements

- Backend:
  - conformité mapping,
  - contrôles bloquants,
  - isolation tenant,
  - permissions.
- Frontend:
  - affichage diagnostics,
  - blocage export sur erreurs,
  - déblocage après correction.
- Definition of Done:
  - AC1 validé,
  - lint/typecheck propres,
  - tests critiques passants,
  - export DSF conforme et traçable.

### Previous Story Intelligence

- 10.1 et 10.2 ont établi un pattern d’extension progressive du reporting avec services typés.
- Réutiliser ce pattern pour 10.3 et éviter un silo DSF isolé du reste des flux reporting.

### Git Intelligence Summary

- Flux de livraison par stories incrémentales; conserver un lot atomique backend+frontend+tests pour 10.3.

### Latest Tech Information

- Pas de changement de stack dans cette story; la priorité est la conformité métier et la stabilité.

### Project Structure Notes

- Frontend encore Vite/React en transition vers cible Next.js.
- Conserver séparation UI/data/auth pour compatibilité migration.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md) - Epic 10, Story 10.3
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md) - FR71
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md) - guardrails migration
- [Reporting.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Reporting.tsx) - intégration DSF
- [DSFReport.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/reporting/DSFReport.tsx) - composant DSF existant

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story key detectée: `10-3-produire-dsf-conforme-ohada-sycebnl`
- Contexte utilisé: sprint-status + epics/prd + surface DSF existante

### Completion Notes List

- Implémentation complète d'un module backend `dsf-reporting` (DTO, service, contrôleur, module) avec validation pré-export déterministe et export DSF CSV/XLSX/PDF.
- Mise en place des diagnostics bloquants/warnings et checklist de conformité actionnable pour le flux fiscal OHADA/SYCEBNL.
- Ajout de la traçabilité/audit (validation, lancement export, téléchargement), hash SHA-256 du livrable, et isolation stricte tenant/utilisateur sur le cycle d'export.
- Extension de la surface front `DSFReport` avec état de validation, diagnostics, checklist et blocage strict du bouton d'export tant que non-conforme.
- Ajout de la couche typée frontend (`types`, `service API`, `hook React Query`) pour orchestrer validation + export + polling téléchargement.
- Correctif conformité: génération de vrais binaires `XLSX` (ExcelJS) et `PDF` (PDFKit), et validation de comptes dépendante de la version de référentiel (`OHADA-SYCEBNL-2017` vs `OHADA-SYCEBNL-2025`).
- Couverture tests renforcée: tests backend DSF étendus + test frontend DSF (`tests/dsf-reporting-ui.spec.ts`) couvrant le parcours validation bloquante -> correction -> export.
- Validation technique exécutée: `pnpm --dir backend test -- dsf-reporting`, `pnpm --dir backend run lint`, `pnpm run lint:frontend`, `pnpm exec playwright test tests/dsf-reporting-ui.spec.ts --grep @story-10-3`.

### File List

- _bmad-output/implementation-artifacts/10-3-produire-dsf-conforme-ohada-sycebnl.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/src/app.module.ts
- backend/src/dsf-reporting/dto/dsf-reporting.dto.ts
- backend/src/dsf-reporting/dsf-reporting.controller.spec.ts
- backend/src/dsf-reporting/dsf-reporting.controller.ts
- backend/src/dsf-reporting/dsf-reporting.module.ts
- backend/src/dsf-reporting/dsf-reporting.service.spec.ts
- backend/src/dsf-reporting/dsf-reporting.service.ts
- src/components/reporting/DSFReport.tsx
- src/hooks/useDsfReporting.ts
- src/services/api/dsf-reporting.service.ts
- src/types/dsf-reporting.types.ts

## Change Log

- 2026-03-10: Implémentation story 10.3 terminée (backend + frontend + tests ciblés) avec passage du statut en `review`.
- 2026-03-10: Correctifs post-review appliqués (exports binaires valides, règles référentiel versionnées, tests frontend DSF) avec passage du statut en `done`.
