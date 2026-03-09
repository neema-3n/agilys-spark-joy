# Story 10.1: Offrir tableaux croises et dashboards analytiques avances

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a analyste financier,
I want explorer les donnees en multi-dimensions,
so that j'identifie rapidement tendances et anomalies.

## Acceptance Criteria

1. **Given** des dimensions analytiques disponibles
   **When** l'utilisateur cree un tableau croise ou dashboard
   **Then** les aggregations par axe/periode sont calculees correctement
   **And** les vues sont exportables.

## Tasks / Subtasks

- [ ] Definir contrat API analytique multi-dimensions (AC: 1)
  - [ ] DTO filtres: periode, entite, axeAnalytique, composanteBudgetaire, fournisseur, statut.
  - [ ] Parametres tableau croise: dimensions lignes/colonnes + mesures.
  - [ ] Contrat export CSV/XLSX/PDF des vues analytiques.

- [ ] Implementer moteur d'aggregation analytique backend (AC: 1)
  - [ ] Reutiliser jeux de donnees reporting existants (execution budgetaire, paiements, depenses, axes analytiques).
  - [ ] Garantir exactitude des aggregations multi-axes et comparatifs inter-periodes.
  - [ ] Eviter doubles comptages sur jointures (cles metier explicites).

- [ ] Integrer UI tableaux croises + dashboards (AC: 1)
  - [ ] Etendre `src/pages/app/Reporting.tsx` avec section analytique avancee.
  - [ ] Ajouter composants pour selection dimensions/mesures et visualisations (table + charts).
  - [ ] Gérer etats loading/error/empty + persistance locale filtres utilisateur.

- [ ] Ajouter export et gouvernance d'acces (AC: 1)
  - [ ] Export des vues analytiques avec metadonnees de filtre applique.
  - [ ] Verifier RBAC/ABAC pour consultation et export.
  - [ ] Journaliser generation/telechargement pour audit.

- [ ] Couvrir les tests (AC: 1)
  - [ ] Backend: exactitude agrégats, isolation tenant, autorisation, erreurs DTO.
  - [ ] Front: creation tableau croise, changement dimensions, export.
  - [ ] Non-regression des vues `ExecutionBudgetaireReport` et `EtatsFinanciersReport`.

## Dev Notes

### Story Requirements

- Story cible: **10.1** dans l'**Epic 10**.
- FR couverts: **FR68** et **FR69**.
- Objectif: exploration ad hoc multi-dimensions et dashboards analytiques exploitables en pilotage.

### Developer Context Section

- La surface `Reporting` existe deja avec composants de base (`ExecutionBudgetaireReport`, `EtatsFinanciersReport`, `DSFReport`).
- La story ajoute une couche analytique avancee sans casser les rapports deja en place.
- Les axes analytiques doivent permettre lecture par periode/entite/projet/fournisseur/composante selon donnees disponibles.

### Technical Requirements

- Aucune nouvelle dependance runtime Supabase.
- Toutes les requetes backend doivent etre filtrees par tenant (`client_id = tenantId`).
- Agrégations deterministes, precision montants stable, tri explicite.
- Eviter N+1 et jointures non bornees dans les vues analytiques.
- Export doit refléter exactement les filtres/dimensions affiches.

### Architecture Compliance

- Backend: pattern NestJS standard (`controller + service + dto + spec`).
- Front: service API typé + hooks React Query + composants UI dédiés.
- Reuse prioritaire des composants existants de reporting et dashboard.
- Aucune duplication de logique metier critique entre front et back.

### Library & Framework Requirements

- Conserver stack repo actuelle (React 18.3.1 / Nest 10.4.22 / React Query 5.83.0 / pnpm 9.12.0).
- Les upgrades majeurs restent hors scope story pour limiter regressions.

### File Structure Requirements

- Backend recommandé:
  - `backend/src/reporting-analytique/`
  - `backend/src/reporting-analytique/dto/`
- Frontend recommandé:
  - `src/services/api/reporting-analytique.service.ts`
  - `src/components/reporting-analytique/`
  - extension de `src/pages/app/Reporting.tsx`
- Types partagés explicites et sans `any`.

### Testing Requirements

- Backend:
  - validité agrégats multi-dimensions,
  - isolation tenant,
  - permissions,
  - robustesse filtres invalides.
- Frontend:
  - scénario creation tableau croise,
  - changement dimensions/mesures,
  - export,
  - non-regression des onglets existants reporting.
- Definition of Done:
  - AC1 valide,
  - lint/typecheck propres,
  - tests story critiques passants.

### Previous Story Intelligence

- 9.2 et 9.3 ont etabli un pattern de livraison reporting: service API typed + extension progressive de `Reporting.tsx` + garde-fous tenant/aggregation.
- Reprendre le meme pattern pour 10.1 afin d'eviter divergence architecture.

### Git Intelligence Summary

- Historique recent orienté stories incrementales et closes progressives.
- Recommandation: PR atomique backend+frontend+tests, sans refactor transverse hors perimetre analytique.

### Latest Tech Information

- Verification npm deja effectuee (2026-03-09): versions plus recentes existent.
- Pour 10.1: maintenir versions repo actuelles, pas d'upgrade en scope.

### Project Structure Notes

- Le projet migre vers architecture cible Next.js/NestJS; frontend courant est encore Vite/React.
- Garder separation nette UI/data/auth pour compatibilite migration.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md) - Epic 10, Story 10.1
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md) - FR68, FR69
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md) - guardrails migration
- [Reporting.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Reporting.tsx) - surface cible
- [Dashboard.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Dashboard.tsx) - patterns dashboard existants
- [Analyses.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Analyses.tsx) - patterns filtres analytiques existants

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story key detectee: `10-1-offrir-tableaux-croises-et-dashboards-analytiques-avances`
- Contexte: sprint-status + epics/prd + composants reporting/dashboard/analyses existants

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- _bmad-output/implementation-artifacts/10-1-offrir-tableaux-croises-et-dashboards-analytiques-avances.md
