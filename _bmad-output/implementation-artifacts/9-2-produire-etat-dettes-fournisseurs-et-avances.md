# Story 9.2: Produire etat dettes fournisseurs et avances

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a responsable fournisseur,
I want suivre dettes, echeances et regularisations,
so that je maitrise les engagements a payer.

## Acceptance Criteria

1. **Given** les factures et depenses du tenant
   **When** les rapports fournisseurs sont generes
   **Then** l'anciennete, les restes a payer et regularisations sont visibles
   **And** les rapports sont filtrables par entite/periode.

## Tasks / Subtasks

- [x] Definir le contrat API des rapports fournisseurs (AC: 1)
  - [x] Ajouter DTO filtres: `periode`, `entite`, `fournisseurId`, `statut`, `agingBucket`
  - [x] Definir deux vues API: `etat-dettes-fournisseurs` et `etat-avances-regularisations`
  - [x] Definir endpoint export CSV/XLSX/PDF avec verifications tenant/permission

- [x] Implementer agregations backend tenant-safe (AC: 1)
  - [x] Reutiliser les donnees `factures`, `depenses`, `paiements`, `ecritures_comptables` deja existantes
  - [x] Calculer les indicateurs d'anciennete (J0-30, J31-60, J61-90, J90+)
  - [x] Calculer reste a payer, avance initiale, consommation, ecart et statut de regularisation

- [x] Integrer la surface front dans Reporting (AC: 1)
  - [x] Ajouter service API type `reporting-fournisseurs.service.ts`
  - [x] Ajouter vue ou onglet dedie dans `src/pages/app/Reporting.tsx`
  - [x] Afficher tableaux + filtres + etats de chargement/erreur/empty

- [x] Ajouter exports et garde-fous (AC: 1)
  - [x] CSV synchrone petits volumes, XLSX/PDF asynchrone pour gros volumes
  - [x] Verifier RBAC/ABAC avant generation et telechargement
  - [x] Journaliser le lancement et le telechargement d'export

- [x] Couvrir les tests critiques (AC: 1)
  - [x] Tests backend: nominal, erreurs filtres, isolation tenant, permissions
  - [x] Tests backend: justesse calcul anciennete/reste-a-payer/regularisation
  - [x] Tests frontend: parcours consultation + filtres + export + erreur API

## Dev Notes

### Story Requirements

- Story cible: **9.2** dans l'**Epic 9**.
- FR couverts: **FR63** (etat dettes fournisseurs) et **FR64** (etat avances/regularisations).
- Le livrable doit rester coherent avec Story 9.1 (reporting comptable deja contexted) et reutiliser les patterns de reporting existants.

### Developer Context Section

- Cette story doit produire deux rapports metier exploitables:
  - **Dettes fournisseurs**: anciennete, echeances, historique de reglement, reste a payer.
  - **Avances et regularisations**: avance initiale, consommation, ecarts, statut de regularisation.
- Le scope est **reporting**, pas la refonte du cycle facture/depense/paiement.
- Toute interpretation metier ambiguë doit rester explicite dans les DTO et dans la doc inline (ex: definition des buckets d'anciennete).

### Technical Requirements

- Aucune nouvelle dependance runtime Supabase.
- Requetes backend obligatoirement filtrees par `client_id = tenantId`.
- Les montants doivent etre normalises en `number` avant calcul/aggregation.
- Les colonnes date utilises pour l'anciennete doivent etre stables et documentees (date facture echeance/piece).
- L'agregation doit etre deterministe (tri stable, pas de doubles comptages sur jointures).
- Les erreurs doivent etre actionnables cote UI (cause + action attendue).

### Architecture Compliance

- Backend: respecter le pattern NestJS existant (`controller + service + dto + spec`).
- Backend: reutiliser les modules source de verite existants (factures/depenses/paiements/ecritures), sans dupliquer la logique metier.
- Frontend: passer par `src/services/api/*` + hooks React Query; pas d'appel infra direct dans les composants.
- Permissions: aligner la lecture reporting avec les guards/policies deja en place.

### Library & Framework Requirements

- Stack repo actuelle (declaree): React 18.3.1, React Query 5.83.0, NestJS 10.4.22, pg 8.19.0, class-validator 0.14.4, pnpm 9.12.0.
- Verification registre npm (2026-03-09) pour info de compatibilite:
  - react: 19.2.4
  - @tanstack/react-query: 5.90.21
  - @nestjs/common: 11.1.16
  - pg: 8.20.0
  - class-validator: 0.15.1
  - typescript: 5.9.3
  - pnpm: 10.31.0
- Decision pour cette story: **pas d'upgrade de version en scope**; garder compatibilite avec versions repo et eviter risque de regression hors story.

### File Structure Requirements

- Backend (nouveau module recommande):
  - `backend/src/reporting-fournisseurs/`
  - `backend/src/reporting-fournisseurs/dto/`
  - tests associes dans le meme module
- Frontend:
  - `src/services/api/reporting-fournisseurs.service.ts`
  - composants sous `src/components/reporting-fournisseurs/`
  - integration dans `src/pages/app/Reporting.tsx`
- Nommage: francais metier explicite (`dettes-fournisseurs`, `avances-regularisations`) et types explicites sans `any`.

### Testing Requirements

- Backend:
  - cas nominal multi-filtres
  - isolation multi-tenant
  - autorisation/permission
  - robustesse sur donnees partielles (facture sans reglement, avance sans regularisation finale)
  - verification de non-duplication d'agrégats
- Frontend:
  - rendu des tableaux
  - comportement des filtres
  - exports
  - gestion erreurs/timeouts API
- Definition of Done:
  - AC1 valide
  - lint/typecheck propres
  - aucun nouveau couplage Supabase
  - tests story critiques passants

### Previous Story Intelligence

Extraits reutilisables depuis Story 9.1:

- Pattern cible deja etabli: module backend reporting dedie + service API front type + integration progressive dans `Reporting.tsx`.
- Guardrails utiles a conserver:
  - isolation tenant stricte
  - normalisation des montants
  - tri stable et agregations deterministes
  - extension progressive de la page Reporting (pas de remplacement brutal)
- Risques deja identifies et encore valides:
  - fuites cross-tenant
  - erreurs d'aggregation dues aux jointures
  - regressions UX sur les vues existantes

### Git Intelligence Summary

Commits recents (5 derniers) montrent:

- Continuite de travail sur stories et statuts BMAD (`done`/`continue`).
- Presence d'un commit fonctionnel significatif en analyses (`feat(analyses): complete story 7.2 ...`).
- Implication pratique pour 9.2: rester sur des changements atomiques orientes reporting, avec couverture UI + backend + tests, sans refactor transverse.

### Latest Tech Information

- Source primaire utilisee: registre npm (`https://registry.npmjs.org/<package>/latest`) verifie le **2026-03-09**.
- Conclusion:
  - Des versions plus recentes existent pour plusieurs dependances.
  - Pour cette story, priorite a la stabilite et a la coherence du repo.
  - Toute mise a niveau majeure (ex: Nest 11 / React 19) doit etre traitee dans une story dediee de migration technique.

### Project Structure Notes

- Le projet est en migration progressive vers architecture cible Next.js/NestJS/PostgreSQL, mais le frontend courant est encore Vite/React.
- Les regles de `project-context.md` restent obligatoires:
  - pas de nouvelle logique metier dans Supabase
  - centraliser la verite metier backend
  - conserver la continuite UX

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md) - Epic 9, Story 9.2, AC story
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md) - FR63, FR64, NFR de fiabilite/compliance
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md) - guardrails migration et qualite
- [9-1-generer-balance-grand-livre-et-fiche-compte.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/9-1-generer-balance-grand-livre-et-fiche-compte.md) - patterns de mise en oeuvre story precedente
- [Reporting.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Reporting.tsx) - surface reporting front
- [factures.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/factures/factures.service.ts) - source metier factures/fournisseurs
- [comptes.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/comptes/comptes.service.ts) - conventions comptables backend

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story key detectee automatiquement via sprint-status: `9-2-produire-etat-dettes-fournisseurs-et-avances`
- Module backend ajoute: `reporting-fournisseurs` (controller/service/dto/module + specs)
- Surface frontend ajoutee: service API + hook React Query + composant `ReportingFournisseursReport`
- Validations executees:
  - `pnpm --dir backend run lint` ✅
  - `pnpm --dir backend run test -- reporting-fournisseurs` ✅
  - `pnpm exec playwright test tests/auth-migration.spec.ts --grep "reportingFournisseursService"` ✅
  - `pnpm run lint:frontend` ⚠️ echec sur erreurs ESLint preexistantes dans `backend/src/reporting-comptable/reporting-comptable.service.spec.ts`
  - `pnpm exec eslint ...` (fichiers modifies) ✅

### Completion Notes List

- Contrat API fournisseurs implemente avec filtres `periode`, `entite`, `fournisseurId`, `statut`, `agingBucket`.
- Deux vues de reporting implementees: dettes fournisseurs et avances/regularisations, avec pagination et resumes.
- Export CSV synchrone + XLSX/PDF asynchrone avec token de telechargement signe et verification tenant/user.
- Journalisation des actions export (lancement + telechargement) et audit authorization sur les actions export.
- Integration frontend complete dans Reporting avec onglet dedie, filtres, tableaux, etats loading/error/empty, et export.
- Couverture de tests backend et frontend service ajoutee pour scenario nominal, filtres, export et erreurs API.
- Correctif post-review: suppression du double comptage paiements par facture (allocation proportionnelle par depense facture).
- Correctif post-review: generation export conforme (vrai XLSX zip OpenXML + vrai PDF), avec tests de signature binaire.
- Correctif post-review: ajout test UI Playwright pour parcours consultation + filtres + export + erreur API sur reporting fournisseurs.

### Senior Developer Review (AI)

- Revue adversariale executee.
- Findings HIGH/MEDIUM traites et verifies.
- Validation finale:
  - `pnpm --dir backend run test -- reporting-fournisseurs` ✅
  - `pnpm exec playwright test tests/auth-migration.spec.ts --grep "@story-9-2"` ✅
  - `pnpm --dir backend run lint` ✅
  - `pnpm exec eslint tests/auth-migration.spec.ts` ✅

### File List

- _bmad-output/implementation-artifacts/9-2-produire-etat-dettes-fournisseurs-et-avances.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/src/app.module.ts
- backend/src/reporting-fournisseurs/dto/reporting-fournisseurs.dto.ts
- backend/src/reporting-fournisseurs/reporting-fournisseurs.controller.ts
- backend/src/reporting-fournisseurs/reporting-fournisseurs.controller.spec.ts
- backend/src/reporting-fournisseurs/reporting-fournisseurs.module.ts
- backend/src/reporting-fournisseurs/reporting-fournisseurs.service.ts
- backend/src/reporting-fournisseurs/reporting-fournisseurs.service.spec.ts
- src/components/reporting-fournisseurs/ReportingFournisseursReport.tsx
- src/hooks/useReportingFournisseurs.ts
- src/pages/app/Reporting.tsx
- src/services/api/reporting-fournisseurs.service.ts
- src/types/index.ts
- src/types/reporting-fournisseurs.types.ts
- tests/auth-migration.spec.ts

## Change Log

- 2026-03-10: Implémentation complète Story 9.2 (API backend + UI Reporting + exports + tests critiques).
- 2026-03-09: Revue senior appliquee, correctifs HIGH/MEDIUM implementes, story basculee en `done`.
