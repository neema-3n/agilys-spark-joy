# Story 9.1: Generer balance, grand livre et fiche compte

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a comptable,
I want produire les rapports comptables fondamentaux,
so that je peux controler la qualite comptable periodique.

## Acceptance Criteria

1. **Given** une periode et des filtres valides
   **When** l'utilisateur demande un rapport comptable
   **Then** la balance, le grand livre et la fiche compte sont generables
   **And** les exports CSV/XLSX/PDF sont disponibles.

## Tasks / Subtasks

- [x] Concevoir le contrat API reporting comptable (AC: 1)
  - [x] Definir DTO de filtres communs (periode obligatoire, compte optionnel, axe/entite optionnels, pagination)
  - [x] Definir schema de reponse unifie pour 3 vues: balance, grand-livre, fiche-compte
  - [x] Definir endpoints d'export asynchrone CSV/XLSX/PDF avec suivi de statut d'export

- [x] Implementer les requetes backend multi-tenant pour les 3 rapports (AC: 1)
  - [x] Creer un module backend dedie `reporting-comptable` sans duplication des aggregations existantes
  - [x] Reutiliser les ecritures et comptes existants (`ecritures-comptables`, `comptes`) comme source de verite
  - [x] Garantir isolation tenant (`client_id`) et filtrage periode sur toutes les requetes

- [x] Ajouter la surface frontend de consultation des rapports (AC: 1)
  - [x] Creer un service API front type `reporting-comptable.service.ts`
  - [x] Integrer la vue dans `Reporting.tsx` via onglet ou sous-onglet sans casser les composants existants
  - [x] Afficher table balance + table grand livre + fiche compte avec etats chargement/erreur vides

- [x] Implementer l'export CSV/XLSX/PDF (AC: 1)
  - [x] Produire CSV direct pour petits volumes
  - [x] Produire XLSX/PDF via pipeline backend (job + polling statut)
  - [x] Ajouter telechargement securise (JWT + verif tenant + expiration lien)

- [x] Couvrir les tests et garde-fous de regression (AC: 1)
  - [x] Tests backend: cas nominal, filtres invalides, isolation tenant, autorisation
  - [x] Tests backend: coherence debit=credit dans balance et non-duplication des lignes grand livre
  - [x] Tests frontend: parcours consultation + export + gestion erreurs API

## Dev Notes

- **Contexte metier Story 9.1**
  - Cette story couvre FR60, FR61 et FR62 (balance, grand livre, fiche compte) dans l'Epic 9.
  - Le livrable attendu est un reporting comptable exploitable par periode avec filtres et exports CSV/XLSX/PDF.

- **Contexte codebase utile (ne pas reinventer)**
  - Backend deja structure par domaines NestJS avec gardes JWT + autorisation policy (`JwtAuthGuard`, `AuthorizationPolicyGuard`).
  - Donnees comptables de base deja exposees dans `comptes` et `ecritures-comptables`; les reutiliser comme source de verite.
  - Frontend a deja une page `Reporting.tsx` et des composants de reporting, mais `EtatsFinanciersReport` est une synthese KPI/charts et ne couvre pas encore les 3 rapports comptables attendus.

- **Exigences techniques obligatoires (guardrails)**
  - Aucune dependance runtime Supabase nouvelle.
  - Toutes les requetes doivent forcer `client_id = tenantId`.
  - Les montants doivent etre normalises en `number` avant calcul et arrondis de facon deterministe cote API.
  - Le calcul balance doit verifier la coherence debit/credit sur la periode filtree (signalement d'ecart si desynchronisation).
  - Le grand livre doit etre ordonne de facon stable (date, piece, numero ligne).
  - La fiche compte doit inclure solde ouverture, mouvements debit/credit, solde cloture sur la periode.

- **Architecture compliance**
  - Suivre pattern modules backend existants: `controller + service + dto + spec`.
  - Proteger endpoints via permissions lecture reporting (aligner avec policy actuelle `referentiels:read` ou permission dediee de meme granularite).
  - Cote front, passer uniquement par `services/api/*` + hooks React Query; pas d'appel direct infra depuis composants.

- **Libraries/Frameworks - informations a jour dans le repo**
  - Front: React 18.3.1, TypeScript 5.8.3, React Query 5.83.0, Recharts 2.15.4.
  - Back: NestJS 10.4.22, pg 8.19.0, class-validator 0.14.4.
  - Package manager impose: pnpm 9.12.0.

- **Impacts schema/donnees probables**
  - Aucun changement schema obligatoire si les rapports se basent sur `ecritures_comptables` + `comptes` existants.
  - Si besoin de performance, preferer vue SQL ou index cible au lieu de dupliquer des donnees de reporting.

- **Risques et prevention**
  - Risque de doublon d'ecritures dans agregation: eviter `SUM(DISTINCT montant)` non controle; travailler avec cles de ligne comptable.
  - Risque de fuite cross-tenant: tests obligatoires multi-tenant sur tous endpoints.
  - Risque UX: ne pas remplacer brutalement `EtatsFinanciersReport`; ajouter la fonctionnalite story 9.1 en extension progressive de la page Reporting.

- **Definition of Done story 9.1**
  - AC1 valide fonctionnellement pour balance + grand livre + fiche compte.
  - Exports CSV/XLSX/PDF disponibles et telechargeables.
  - Tests backend/frontend couvrent nominal + erreurs + permissions + isolation tenant.
  - Lint/typecheck propres, sans nouveau couplage Supabase.

### Project Structure Notes

- Backend: creer un nouveau module `backend/src/reporting-comptable/` (controller, service, dto, tests) au lieu de surcharger `analyses-financieres`.
- Frontend: ajouter composants sous `src/components/reporting-comptable/` et service API sous `src/services/api/reporting-comptable.service.ts`.
- Hooks: exposer `useReportingComptable` dans `src/hooks/` avec cles React Query dediees (`reporting-comptable/*`).
- Routing/UI: integrer dans `src/pages/app/Reporting.tsx` en preservant les onglets existants.
- Conventions: conserver nommage francais metier deja present (balance, grand-livre, fiche-compte), types explicites, pas de `any`.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 9, Story 9.1, AC (balance/grand livre/fiche compte + export CSV/XLSX/PDF)
- `_bmad-output/planning-artifacts/prd.md` - FR60, FR61, FR62, NFR26, NFR27, NFR33 (exigences comptables et qualite)
- `_bmad-output/project-context.md` - regles migration (pas de nouveau Supabase runtime, API unifiee, tests obligatoires)
- `backend/src/comptes/comptes.controller.ts` + `backend/src/comptes/comptes.service.ts` - patterns auth/tenant et gestion plan comptable
- `backend/src/analyses-financieres/analyses-financieres.controller.ts` + `backend/src/analyses-financieres/analyses-financieres.service.ts` - pattern aggregation/reporting backend
- `src/pages/app/Reporting.tsx` - surface reporting existante
- `src/components/reporting/EtatsFinanciersReport.tsx` - etat actuel des etats financiers (KPI/charts non suffisants pour Story 9.1)
- `src/services/api/comptes.service.ts` - pattern client API front type
- `package.json` + `backend/package.json` - versions stack et scripts pnpm

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story key detectee automatiquement via sprint-status: `9-1-generer-balance-grand-livre-et-fiche-compte`
- Statut story dans `sprint-status.yaml`: `ready-for-dev` -> `in-progress`
- Lint global passe (`pnpm run lint`)
- Tests cibles module reporting comptable passes (`pnpm --dir backend run test -- reporting-comptable.service.spec.ts`)
- Tests frontend cibles service reporting passes (`pnpm exec playwright test tests/auth-migration.spec.ts --grep reportingComptableService`)
- Suite backend globale executee avec echec non lie au scope sur `test/budget-referentiels.e2e.spec.ts` (timeouts + table manquante `integration_async_events`)
- Revue adverse AI: corrections securite signature export (secret non statique + comparaison timing-safe)
- Revue adverse AI: correction robustesse CSV (echappement delimiters/guillemets + neutralisation formule)
- Revue adverse AI: ajout test backend d'autorisation controller (`guards` + permission `referentiels:read`)

### Completion Notes List

- Module backend `reporting-comptable` ajoute avec DTO filtres communs, schema unifie (balance/grand-livre/fiche-compte), isolation tenant stricte et pagination.
- Export CSV direct + pipeline asynchrone XLSX/PDF implementes avec suivi de statut, lien signe avec expiration, verification tenant/utilisateur, et telechargement protege JWT.
- Integration frontend complete: service API dedie, hook React Query, composant de consultation des 3 vues avec etats loading/erreur/vide, et integration dans `Reporting.tsx` via onglet additionnel sans regression de l'existant.
- Couverture de tests ajoutee: backend (nominal, filtres invalides, scope tenant, coherence balance, non-dup grand livre, export async) + frontend service (consultation, lancement export, erreur telechargement).

### File List

- _bmad-output/implementation-artifacts/9-1-generer-balance-grand-livre-et-fiche-compte.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/src/app.module.ts
- backend/src/reporting-comptable/dto/reporting-comptable.dto.ts
- backend/src/reporting-comptable/reporting-comptable.controller.ts
- backend/src/reporting-comptable/reporting-comptable.controller.spec.ts
- backend/src/reporting-comptable/reporting-comptable.module.ts
- backend/src/reporting-comptable/reporting-comptable.service.ts
- backend/src/reporting-comptable/reporting-comptable.service.spec.ts
- src/components/reporting-comptable/ReportingComptableReport.tsx
- src/hooks/useReportingComptable.ts
- src/pages/app/Reporting.tsx
- src/services/api/reporting-comptable.service.ts
- src/types/index.ts
- src/types/reporting-comptable.types.ts
- tests/auth-migration.spec.ts

### Change Log

- 2026-03-09: Story 9.1 implementee end-to-end (API reporting comptable, UI consultation, exports securises, tests backend/frontend, passage en review).
- 2026-03-09: Revue AI adverse appliquee (fixes HIGH/MEDIUM securite export + robustesse CSV, ajout test d'autorisation controller), statut passe a `done`.

### Senior Developer Review (AI)

#### Findings resolves

- HIGH: secret de signature export previsible via fallback statique -> corrige avec secret runtime non statique (env prioritaire, fallback aleatoire process).
- MEDIUM: verification signature token non timing-safe -> corrige via `timingSafeEqual` avec controle de longueur.
- MEDIUM: export CSV non protege contre cellules dangereuses et delimiters -> corrige via echappement CSV + neutralisation des formules.
- MEDIUM: couverture explicite des exigences d'autorisation backend absente dans les tests story -> corrige via spec controller (guards + permission metadata).

#### Validation

- `pnpm --dir backend run test -- src/reporting-comptable/reporting-comptable.service.spec.ts src/reporting-comptable/reporting-comptable.controller.spec.ts` ✅
- `pnpm --dir backend run lint` ✅
