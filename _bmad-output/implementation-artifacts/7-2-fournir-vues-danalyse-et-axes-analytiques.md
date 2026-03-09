# Story 7.2: Fournir vues d'analyse et axes analytiques

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a controleur de gestion,
I want analyser par projets/centres/axes,
so that je peux expliquer la performance financiere.

## Acceptance Criteria

1. **Filtres analytiques coherents sur donnees reelles**
   - **Given** des flux budgetaires, operationnels et comptables relies a un exercice actif
   - **When** l'utilisateur applique des filtres par projet, centre de cout/structure, periode, entite ou axe budgetaire
   - **Then** les vues d'analyse se recalculent de facon coherente sur toutes les cartes, tableaux et graphiques
   - **And** les donnees restent scopees au tenant courant et a l'exercice courant sans derive cross-tenant.

2. **Vue analytique multi-axes exploitable**
   - **Given** des rattachements existants vers `projets`, `structures` et axes budgetaires
   - **When** l'utilisateur consulte le module `Analyses`
   - **Then** il peut comparer la performance financiere par projet, centre/structure et axe budgetaire
   - **And** la vue met en evidence au minimum budget alloue, engage, paye, disponible, taux d'execution et ecarts pertinents.

3. **Exports alignes avec la vue ecran**
   - **Given** un utilisateur a applique des filtres analytiques
   - **When** il exporte ou prepare un export de la vue d'analyse
   - **Then** les rattachements analytiques actifs (projet, centre, axes, periode, entite) sont preserves dans le livrable
   - **And** la restitution exportee reste coherente avec les donnees visibles a l'ecran.

4. **Reutilisation des abstractions existantes sans duplication metier**
   - **Given** le repo dispose deja de services API, hooks React Query et composants de reporting
   - **When** la story est implementee
   - **Then** le lot etend ces briques existantes au lieu de re-creer un moteur de filtrage ou de calcul parallele
   - **And** aucune logique metier critique ou agrégation sensible n'est dupliquee dans les composants React.

5. **Permissions, auditabilite et performance preservees**
   - **Given** un controleur de gestion consulte les analyses
   - **When** les donnees sont chargees, filtrees et eventuellement exportees
   - **Then** les guards JWT + RBAC/ABAC, la journalisation et les contraintes de performance du produit restent respectes
   - **And** l'experience gere clairement les etats loading, empty et error avec messages actionnables.

## Tasks / Subtasks

- [ ] Revalider le perimetre story 7.2 contre `FR27`, `FR28`, `FR30`, `FR32`, l'addendum reporting du PRD et `NFR2`, `NFR8`, `NFR9`, `NFR19`, `NFR21`, `NFR43` avant tout dev (AC: 1, 2, 3, 4, 5)
- [ ] Cartographier les briques existantes a reutiliser avant toute nouvelle abstraction:
  - [ ] `src/pages/app/Analyses.tsx`
  - [ ] `src/pages/app/Reporting.tsx`
  - [ ] `src/components/reporting/ExecutionBudgetaireReport.tsx`
  - [ ] `src/hooks/useBudgetSearch.ts`
  - [ ] `src/components/search/ActiveFiltersBar.tsx`
  - [ ] `src/hooks/useProjets.ts`
  - [ ] `src/services/api/projets.service.ts`
  - [ ] `src/services/api/structures.service.ts`
  - [ ] `src/hooks/useSections.ts`, `src/hooks/useProgrammes.ts`, `src/hooks/useActions.ts`
  - [ ] `backend/src/projets/*`
  - [ ] `backend/src/structures/*`
  - [ ] `backend/src/engagements/*`, `backend/src/factures/*`, `backend/src/reservations/*` pour les rattachements analytiques deja existants (AC: 1, 2, 3, 4, 5)
- [ ] Remplacer l'etat "module en construction" de `Analyses.tsx` par une vraie surface analytique:
  - [ ] conserver `PageHeader` et les patterns UI du repo
  - [ ] introduire une zone filtres + un resume KPI + au moins une vue comparative graphique + un tableau detaille
  - [ ] rendre la page utilisable meme avec des jeux de donnees partiels ou incomplets (AC: 1, 2, 5)
- [ ] Definir un contrat analytique canonique, type et centralise:
  - [ ] dimensions minimales: projet, structure/centre de cout, section, programme, action, periode, entite
  - [ ] mesures minimales: budget alloue/modifie, engage, paye, disponible, taux d'execution, ecarts
  - [ ] types partages ou types dedies explicites, pas de litteraux ad hoc dans la page (AC: 1, 2, 4, 5)
- [ ] Evaluer si un endpoint backend dedie de lecture analytique est necessaire:
  - [ ] si la composition de services existants suffit sans waterfall critique, encapsuler dans un hook/service analytique
  - [ ] si plusieurs appels front degradent coherence ou performance, creer un endpoint NestJS d'agregation en lecture
  - [ ] dans tous les cas, laisser les agrégations sensibles cote backend/couche service, pas dans le JSX (AC: 1, 2, 4, 5)
- [ ] Reutiliser les dimensions deja presentes dans le domaine:
  - [ ] `projets` comme axe analytique principal
  - [ ] `structures` avec type `centre_cout` comme dimension organisationnelle
  - [ ] sections/programmes/actions/enveloppes pour les axes budgetaires
  - [ ] references projet deja rattachees aux reservations, engagements et factures plutot que creation de nouvelles entites d'axes (AC: 1, 2, 4)
- [ ] Harmoniser le modele de filtres analytiques:
  - [ ] etendre `useBudgetSearch` si pertinent, ou extraire un hook partage `useAnalysesFilters`
  - [ ] reutiliser `ActiveFiltersBar` si le pattern couvre le besoin
  - [ ] garder des query keys React Query stables et scopees par tenant/exercice/filtres (AC: 1, 2, 4, 5)
- [ ] Garantir la coherence ecran/export:
  - [ ] reutiliser `src/lib/export-utils.ts` et les patterns d'export existants si disponibles
  - [ ] serialiser explicitement les filtres actifs et labels analytiques
  - [ ] s'assurer que l'export ne perd pas les axes analytiques ni les agrégations visibles (AC: 3, 5)
- [ ] Respecter les contraintes de securite et d'isolation:
  - [ ] aucun appel sans JWT
  - [ ] aucun acces backend hors tenant/exercice
  - [ ] permissions de lecture alignees avec les domaines de pilotage/reporting existants
  - [ ] journalisation des refus/decisions si un nouvel endpoint est ajoute (AC: 1, 3, 5)
- [ ] Prevoir les etats UX et observabilite:
  - [ ] loading explicite
  - [ ] empty state actionnable si aucun axe ou aucune donnee n'est disponible
  - [ ] erreurs API traduites via `ApiError` en messages comprehensibles
  - [ ] si un marquage analytics applicatif existe pour les surfaces de pilotage, l'etendre sans divergence (AC: 5)
- [ ] Ajouter les tests backend / integration necessaires:
  - [ ] agrégation correcte par projet / structure / axe
  - [ ] refus cross-tenant ou exercice absent/incoherent
  - [ ] preservation des rattachements analytiques dans les reponses/export-prep
  - [ ] non-regression sur les dimensions deja rattachees aux reservations/engagements/factures (AC: 1, 2, 3, 5)
- [ ] Ajouter les tests frontend / contrat necessaires:
  - [ ] rendu nominal de la page `Analyses`
  - [ ] mise a jour coherente des widgets sur changement de filtres
  - [ ] rendu empty/error/loading
  - [ ] non-regression sur le pattern de filtres actifs et sur l'alignement vue/export (AC: 1, 2, 3, 5)
- [ ] Verifier explicitement qu'aucune nouvelle dependance runtime Supabase ni aucune librairie analytics/chart supplementaire n'est introduite par le lot sans justification forte (AC: 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 7, Story 7.2).
- FR directes:
  - `FR27`: vues d'analyses financieres et reporting periodique
  - `FR28`: rattachement des flux aux axes analytiques (projets/centres)
  - `FR30`: cohérence future avec les exports/audit
  - `FR32`: historique non destructif et double temporalite
- Addendum reporting du PRD pertinent:
  - filtres communs `tenant`, `periode`, `entite`, `axes analytiques`, `statut`
  - capacite d'analyse multidimensionnelle pour exploration ad hoc et comparaison inter-periodes
  - exigence de parite ecran/export.
- NFR prioritaires:
  - `NFR2`: ecrans principaux rapides
  - `NFR8`, `NFR9`: controles d'acces et audit
  - `NFR19`, `NFR20`, `NFR21`: accessibilite, clavier, messages explicites
  - `NFR43`: performance des pages produit sur reseau mobile standard.

### Developer Context Section

- La page [`Analyses.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Analyses.tsx) existe deja mais n'est qu'un placeholder. La story doit donc livrer une vraie surface analytique en retenant les patterns UI existants plutot qu'en creant une nouvelle route.
- Le repo dispose deja d'axes analytiques concrets:
  - [`projets.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/projets.service.ts) et [`useProjets.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useProjets.ts) exposent une dimension projet avec budgets alloues, engages, consommes et taux d'avancement.
  - [`structures.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/structures.service.ts) et [`StructuresService`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/structures/structures.service.ts) supportent le type `centre_cout`, utile comme axe analytique organisationnel.
  - Les domaines [`engagements.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.service.ts), [`factures.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/factures/factures.service.ts) et [`reservations.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/reservations/reservations.service.ts) portent deja des references `projetId` et valident leur scope tenant/exercice.
- Le repo dispose deja d'un moteur de filtres exploitable:
  - [`useBudgetSearch.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useBudgetSearch.ts) gere une hierarchie section -> programme -> action, des plages de montants et des filtres de statut.
  - [`ActiveFiltersBar.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/search/ActiveFiltersBar.tsx) fournit le pattern d'affichage et de suppression des filtres actifs.
- La story 7.2 doit reutiliser ces briques pour converger vers un modele analytique unique, pas ouvrir une seconde famille de filtres incompatible.

### Technical Requirements

- Backend / aggregation
  - Le backend doit rester source de verite pour toute agrégation financiere sensible.
  - Si la page `Analyses` doit combiner `projets`, `structures`, budget, previsions ou flux operationnels, privilegier un contrat d'agregation unique cote NestJS plutot qu'un assemblage JSX fragile.
  - Les rattachements analytiques a preserv­er sont au minimum `projetId`, references structurelles (`centre_cout` via `structures`) et la hierarchie budgetaire section/programme/action.
  - Toute reponse doit normaliser explicitement les montants numeriques et exposer des labels prets pour affichage/export.
- Frontend
  - React Query reste la couche standard pour fetch/cache.
  - Les erreurs doivent passer par [`requestJson`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/api-utils.ts) / `ApiError`, pas par du parsing local disperse.
  - Reutiliser `Card`, `Tabs`, `StatsCard`, `ChartContainer`, `recharts` et les patterns de reporting existants.
  - Ne pas re-encoder une logique metier complexe dans les callbacks de graphiques ou dans des `useMemo` opaques de page.
- Exports
  - Le mapping des colonnes exportees doit porter les labels analytiques visibles a l'ecran.
  - Les filtres actifs doivent etre serialisables pour reproduire la meme vue dans l'export ou l'`export-prep`.

### Architecture Compliance

- Regles de [`project-context.md`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md) a respecter:
  - aucune nouvelle dependance runtime Supabase
  - toute nouvelle logique metier cote NestJS
  - front via client API unifie type + React Query
  - reutilisation avant creation.
- Les endpoints existants `projets` sont deja proteges par [`JwtAuthGuard`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/jwt-auth.guard.ts) et [`AuthorizationPolicyGuard`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization-policy.guard.ts). Tout nouvel endpoint analytique doit suivre exactement le meme pattern.
- La garde [`tenant-exercice-scope.guard.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/tenant-exercice-scope.guard.ts) montre que le scope exercice est traite explicitement dans certains referentiels. Si l'analyse introduit une nouvelle route scopee exercice, cette contrainte doit etre preservee, pas implicite.
- La story doit rester "Next.js-ready": separation nette entre couche UI, couche hooks/services et couche contrat/API.

### Library / Framework Requirements

Versions observees localement:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, Recharts `2.15.4`.
- Backend: NestJS `10.4.22`.
- Package manager: `pnpm@9.12.0`.

Veille technique utile pour cette story:

- La documentation TanStack Query actuelle est en `v5`; rester sur les patterns `queryKey` stables, filtres derives et limitation des request waterfalls. Source: [TanStack Query docs](https://tanstack.com/query/latest).
- La documentation NestJS officielle reference actuellement `Version 10`, ce qui est aligne avec le repo. Source: [NestJS docs](https://docs.nestjs.com).
- Recharts a poursuivi sa ligne `3.x` et le guide de migration `3.0` signale plusieurs ruptures de compatibilite (`TooltipContentProps`, `ResponsiveContainer`, ordre des legendes, accessibilite active par defaut). Le repo etant en `2.15.4`, la story ne doit pas supposer les APIs `3.x`. Sources: [Recharts releases](https://github.com/recharts/recharts/releases), [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide).

Decision pour cette story:

- Aucun upgrade de dependance n'est requis pour livrer 7.2.
- Toute extension chart doit rester strictement compatible Recharts `2.15.4`.
- Aucune nouvelle librairie de BI/dashboard ne doit etre introduite tant que `recharts` + composants existants couvrent le besoin.

### File Structure Requirements

Points d'extension prioritaires:

- Frontend
  - `src/pages/app/Analyses.tsx`
  - `src/pages/app/Reporting.tsx` si une mutualisation d'onglets/exports est necessaire
  - `src/components/reporting/ExecutionBudgetaireReport.tsx`
  - `src/hooks/useBudgetSearch.ts`
  - `src/components/search/ActiveFiltersBar.tsx`
  - `src/hooks/useProjets.ts`
  - `src/services/api/projets.service.ts`
  - `src/services/api/structures.service.ts`
  - eventuellement un hook partage `src/hooks/useAnalyses.ts` ou `src/hooks/useAnalysesFilters.ts` si la reutilisation le justifie
- Backend
  - `backend/src/projets/*`
  - `backend/src/structures/*`
  - eventuellement un nouveau module de lecture analytique si la composition directe devient trop couteuse ou trop dispersee
  - points de verification des rattachements existants dans `backend/src/reservations/*`, `backend/src/engagements/*`, `backend/src/factures/*`.

Regles de structure:

- Etendre `Analyses.tsx` plutot que creer une nouvelle page concurrente.
- Si plusieurs vues analytiques partagent les memes tuiles/filtres, extraire un composant ou hook partage au lieu de dupliquer le JSX.
- Garder les filtres et le mapping API hors des composants de presentation.

### Testing Requirements

- Backend
  - tests d'integration pour l'agregation analytique et l'isolation tenant/exercice
  - tests sur preservation des rattachements projet / structure / axes budgetaires
  - tests d'autorisation sur toute nouvelle route de lecture/export analytique.
- Frontend
  - tests de rendu et de bascule des filtres
  - tests `loading/empty/error`
  - tests de coherence entre widgets (les cartes/tableaux/graphes reagissent aux memes filtres)
  - test de non-regression sur l'export si un flux export est livre dans le lot.

### Previous Story Intelligence

- La story precedente [`7-1-exposer-dashboard-budgetaire-de-pilotage.md`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/7-1-exposer-dashboard-budgetaire-de-pilotage.md) formalise deja plusieurs guardrails directement reutilisables ici:
  - abandonner les mocks statiques au profit de donnees reelles
  - prioriser la reutilisation de `StatsCard`, `ExecutionBudgetaireReport`, `PageHeader`, `recharts`
  - eviter les recalculs divergents cote React
  - garder une navigation de drill-down vers des surfaces metier deja existantes.
- 7.2 doit s'aligner avec 7.1 plutot que creer une experience de pilotage incompatible:
  - filtres communs
  - contrats numeriques coherents
  - memes conventions de presentation et de gestion des erreurs.

### Git Intelligence Summary

- Les commits recents montrent une preparation de contexte plutot qu'une implementation de la surface analytique:
  - `4b83ba1 Add dashboard budgetaire story`
  - `40eb40a Perform adversarial code review`
  - `81e450b Summarize sprint status`
- Inference: la story 7.2 doit fournir au futur dev un cadrage fort sur la reutilisation et les risques de duplication, car le lot vient juste apres un travail de cadrage/reporting sur le dashboard.

### Latest Tech Information

- TanStack Query v5 documente explicitement les patterns de `Query Keys`, `Filters` et `Performance & Request Waterfalls`; c'est le bon cadre pour encapsuler les filtres analytiques sans cascade d'appels front inutile.
- NestJS Version 10 reste la reference officielle visible dans la documentation. Il n'y a donc pas de raison de preparer la story autour d'APIs Nest 11 inexistantes dans le repo.
- Recharts 3.x a introduit des changements cassants; comme le projet est encore en `2.15.4`, toute implementation doit rester prudente sur les exemples trouves en ligne et verifier leur compatibilite 2.x avant copie.

### Project Context Reference

- Contexte source: [`project-context.md`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- Contraintes majeures a rappeler au dev:
  - pas de nouvelle dependance Supabase
  - pas de logique metier critique cote client
  - contrats front/back explicites
  - query keys React Query stables
  - typage fort et normalisation explicite des montants.

### Project Structure Notes

- `Analyses.tsx` est actuellement le point d'entree le plus logique mais il ne contient aucune logique metier.
- Le repo a deja des domaines analytiques partiels, mais ils sont fragmentes entre:
  - `projets`
  - `structures`
  - budget/previsions/reporting
  - rattachements projet dans reservations/engagements/factures.
- Le vrai enjeu de 7.2 est donc d'unifier ce qui existe deja sans introduire une nouvelle taxonomie analytique ni casser la performance.
- Aucun document `architecture.md` exploitable n'a ete trouve dans `/_bmad-output/planning-artifacts`; l'architecture de cette story a ete derivee du code reel, du PRD, du `project-context` et de la story 7.1 deja preparee.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [7-1-exposer-dashboard-budgetaire-de-pilotage.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/7-1-exposer-dashboard-budgetaire-de-pilotage.md)
- [Analyses.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Analyses.tsx)
- [Reporting.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Reporting.tsx)
- [ExecutionBudgetaireReport.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/reporting/ExecutionBudgetaireReport.tsx)
- [useBudgetSearch.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useBudgetSearch.ts)
- [ActiveFiltersBar.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/search/ActiveFiltersBar.tsx)
- [useProjets.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useProjets.ts)
- [projets.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/projets.service.ts)
- [structures.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/structures.service.ts)
- [projets.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/projets/projets.controller.ts)
- [projets.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/projets/projets.service.ts)
- [structures.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/structures/structures.service.ts)
- [engagements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.service.ts)
- [factures.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/factures/factures.service.ts)
- [reservations.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/reservations/reservations.service.ts)
- [authorization-policy.guard.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization-policy.guard.ts)
- [tenant-exercice-scope.guard.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/tenant-exercice-scope.guard.ts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Story 7.2 formalisee a partir des artefacts Epic 7/PRD, du `project-context`, du code reel du repo et des guardrails de la story 7.1.
- L'analyse recommande de partir de `Analyses.tsx`, de reutiliser les dimensions `projets` + `structures` existantes et de ne pas supposer les APIs Recharts 3.x.
- Aucun upgrade de dependances n'est requis pour preparer ce lot.

### File List

- `_bmad-output/implementation-artifacts/7-2-fournir-vues-danalyse-et-axes-analytiques.md`
