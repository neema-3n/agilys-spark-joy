# Story 7.1: Exposer dashboard budgetaire de pilotage

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a directeur financier,
I want visualiser consommation, ecarts et risques,
so that je priorise les actions correctives.

## Acceptance Criteria

1. **Vue budgetaire consolidee par periode et entite**
   - **Given** un exercice actif avec des lignes budgetaires, des consommations et des contextes d'entite disponibles
   - **When** le dashboard est consulte
   - **Then** il affiche des indicateurs consolides de budget modifie, montant engage, montant paye, disponible et taux d'execution
   - **And** les donnees sont scopees au tenant courant avec selection explicite de l'exercice et de la periode active.

2. **Blocages et risques visibles en priorite**
   - **Given** des signaux de risque cash, des ecarts de prevision/execution ou des operations non rapprochees existent
   - **When** l'utilisateur ouvre le dashboard
   - **Then** les alertes critiques et blocages sont presents avant les visualisations secondaires
   - **And** chaque signal expose un niveau de severite, une explication actionnable et un lien vers la surface source pertinente.

3. **Filtres et drill-down coherents avec les domaines existants**
   - **Given** un utilisateur applique un filtre par periode, entite, section, programme, action ou enveloppe
   - **When** le dashboard se met a jour
   - **Then** les KPI, graphiques et listes detaillees restent coherents entre eux
   - **And** les agregations reutilisent les contrats budget, previsions et tresorerie existants au lieu d'introduire des calculs divergents cote client.

4. **Abandon du mock statique au profit de donnees reelles**
   - **Given** la page `Dashboard` actuelle utilise encore `executionData` et `MOCK_ENGAGEMENTS`
   - **When** la story est implementee
   - **Then** les cartes, graphes et listes du dashboard reposent sur des services backend/API reels
   - **And** aucun nouveau flux runtime ne depend de Supabase, de donnees hardcodees ou de duplication de logique metier dans React.

5. **Performance, auditabilite et permissions respectees**
   - **Given** un tenant standard consulte le dashboard de pilotage
   - **When** les donnees sont chargees et affichees
   - **Then** le parcours reste compatible avec les NFR de chargement et de gouvernance du produit
   - **And** les acces, erreurs et eventuels exports/navigation associes restent aligns avec RBAC/ABAC, journalisation et isolation multi-tenant.

## Tasks / Subtasks

- [ ] Revalider le perimetre story 7.1 contre `FR26`, `FR27`, `FR28`, `FR32`, `NFR2`, `NFR8`, `NFR9`, `NFR11`, `NFR19`, `NFR21` et l'addendum reporting FR65-FR69 avant tout dev (AC: 1, 2, 3, 4, 5)
- [ ] Cartographier et reutiliser les briques existantes avant d'ajouter une nouvelle abstraction:
  - [ ] `src/pages/app/Dashboard.tsx`
  - [ ] `src/components/reporting/ExecutionBudgetaireReport.tsx`
  - [ ] `src/hooks/useLignesBudgetaires.ts`
  - [ ] `src/services/api/budget.service.ts`
  - [ ] `src/services/api/previsions.service.ts`
  - [ ] `src/hooks/useTresorerie.ts`
  - [ ] `src/services/api/tresorerie.service.ts`
  - [ ] `backend/src/budget-referentiels/*`
  - [ ] `backend/src/previsions/*`
  - [ ] `backend/src/cash-risk/*`
  - [ ] `src/pages/app/ControleInterne.tsx` et `src/pages/app/Tresorerie.tsx` pour le drill-down/contexte (AC: 1, 2, 3, 4, 5)
- [ ] Remplacer les sources mockees du dashboard actuel par une orchestration de donnees reelles:
  - [ ] supprimer l'usage de `executionData`
  - [ ] supprimer l'usage de `MOCK_ENGAGEMENTS`
  - [ ] definir un contrat d'agregation unique pour les KPI et tuiles de priorisation
  - [ ] conserver la logique metier et les calculs de severite cote backend ou couche service API, pas dans les composants React (AC: 1, 2, 4, 5)
- [ ] Concevoir un modele de dashboard budgetaire canonique et type:
  - [ ] resume KPI (budget modifie, engage, paye, disponible, taux execution, taux engagement)
  - [ ] serie d'execution par periode
  - [ ] liste des risques/blocages prioritaires
  - [ ] liste des axes/entites les plus sous tension
  - [ ] eventuels liens d'action vers `ControleInterne`, `Tresorerie`, `Budget` ou `Previsions` (AC: 1, 2, 3, 5)
- [ ] Evaluer si un endpoint backend dedie est necessaire:
  - [ ] si oui, creer une agregation NestJS orientee lecture dans un domaine coherent (`budget-referentiels`, `previsions` ou module de reporting/pilotage)
  - [ ] si non, composer proprement a partir des contrats existants dans une couche hook/service sans recalcul divergent
  - [ ] dans les deux cas, eviter un N+1 d'appels front qui degraderait le chargement du dashboard (AC: 1, 2, 3, 4, 5)
- [ ] Reutiliser les donnees budgetaires et previsionnelles deja exposees:
  - [ ] lignes budgetaires via `budgetService.getLignesBudgetaires`
  - [ ] ecarts prevision/execution via `previsionsService.getEcartsPrevisionExecution`
  - [ ] supervision/risques via `tresorerieService.getSupervision` et, si pertinent, audit des exceptions
  - [ ] harmoniser les formats numeriques et statuts au lieu de dupliquer des mappings locaux (AC: 1, 2, 3, 5)
- [ ] Prioriser la vue "signaux d'action" dans l'UX:
  - [ ] afficher les alertes critiques avant les graphiques secondaires
  - [ ] fournir une copy explicite sur les blocages, ecarts et actions attendues
  - [ ] garantir une navigation claire vers les ecrans source (`ControleInterne`, `Tresorerie`, budget, previsions) (AC: 2, 3, 5)
- [ ] Etendre les composants existants plutot que repliquer des cartes/graphiques:
  - [ ] reutiliser le pattern `StatsCard`
  - [ ] reutiliser ou faire evoluer `ExecutionBudgetaireReport`
  - [ ] extraire un composant partage si plusieurs sections du dashboard reutilisent la meme structure KPI/alertes
  - [ ] rester coherent avec les conventions `recharts`, `Card`, `PageHeader` et le design system existant (AC: 1, 2, 3, 4)
- [ ] Garantir permissions et isolation:
  - [ ] dashboard scope au tenant courant et a l'exercice courant
  - [ ] refuser toute lecture backend hors scope tenant/exercice
  - [ ] respecter les guards backend et ne pas exposer de details sensibles non necessaires au role de pilotage (AC: 1, 2, 5)
- [ ] Instrumenter la qualite et l'observabilite du dashboard:
  - [ ] erreurs metier actionnables si aucune donnee ou exercice absent
  - [ ] etats loading/empty/error clairs
  - [ ] eventuelle instrumentation analytics de consultation du dashboard si un plan de marquage applicatif existe deja (AC: 1, 2, 5)
- [ ] Ajouter les tests backend / integration necessaires:
  - [ ] agregations correctes des KPI budgetaires
  - [ ] priorisation correcte des signaux de risque/blocage
  - [ ] refus cross-tenant / exercice incoherent
  - [ ] stabilite des mappings de montants, statuts et periodes (AC: 1, 2, 3, 5)
- [ ] Ajouter les tests frontend / contrat necessaires:
  - [ ] rendu du dashboard sur donnees reelles
  - [ ] absence de regression quand les jeux de donnees sont vides ou partiels
  - [ ] rendu des alertes prioritaires
  - [ ] navigation/drill-down vers les surfaces source
  - [ ] non-regression du remplacement des mocks par les hooks/services reels (AC: 2, 3, 4, 5)
- [ ] Verifier explicitement qu'aucune nouvelle dependance runtime Supabase ou calcul critique duplique cote React n'est introduit par le lot (AC: 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 7, Story 7.1).
- FR directes:
  - `FR26`: tableau de bord budgetaire avec consommation, ecarts, blocages, risques
  - `FR27`: vues d'analyses financieres et reporting periodique
  - `FR28`: rattachement aux axes analytiques pour l'analyse
  - `FR32`: historique non destructif complet avec double temporalite
- NFR prioritaires:
  - `NFR2`: chargement des ecrans principaux `<= 2 s` en p95
  - `NFR8`, `NFR9`: RBAC/ABAC et journalisation des actions critiques
  - `NFR11`: historique/audit non destructif
  - `NFR19`, `NFR20`, `NFR21`: accessibilite, utilisabilite clavier et messages explicites
- Addendum reporting du PRD:
  - priorite lot 1 sur pilotage operationnel et preuve
  - filtres communs tenant/periode/entite/axes
  - parite ecran/export et performance conforme.

### Developer Context Section

- Le repo dispose deja d'une page [`Dashboard.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Dashboard.tsx), mais elle est encore alimentee par `executionData` et `MOCK_ENGAGEMENTS`. La story 7.1 doit donc transformer une coquille UI en vrai dashboard metier.
- Les sources reelles deja disponibles a reutiliser:
  - lignes budgetaires via [`useLignesBudgetaires.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useLignesBudgetaires.ts) et [`budget.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/budget.service.ts)
  - ecarts prevision/execution via [`previsions.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/previsions.service.ts)
  - supervision et audit des risques via [`useTresorerie.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useTresorerie.ts), [`tresorerie.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/tresorerie.service.ts) et [`cash-risk.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/cash-risk/cash-risk.service.ts)
  - pattern de restitution budgetaire via [`ExecutionBudgetaireReport.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/reporting/ExecutionBudgetaireReport.tsx)
- Le besoin central de 7.1 est d'orchestrer des signaux budget/prevision/risque dans une seule vue de pilotage sans dupliquer la logique metier:
  - eviter de recalculer en React les formules de risque cash deja detenues par le backend
  - eviter des mappings incoherents de montants ou statuts
  - prioriser les alertes d'action avant la simple visualisation descriptive.
- Surfaces de drill-down deja pertinentes:
  - [`ControleInterne.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/ControleInterne.tsx) pour audit des exceptions et signaux de conformite
  - [`Tresorerie.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Tresorerie.tsx) pour supervision et signaux de tresorerie
  - pages budget/previsions existantes pour les details d'axe ou de consommation.

### Technical Requirements

- Backend / aggregation
  - La source de verite des calculs de risque et des agregations sensibles reste cote NestJS ou dans les contrats API existants.
  - Si la composition front de plusieurs endpoints existants degrade le temps de chargement ou la coherence, introduire un endpoint dedie de lecture agregée.
  - Les montants doivent etre normalises explicitement avant calcul/affichage; ne pas supposer les types runtime venant de la persistence.
  - Les severites et raisons de blocage doivent reutiliser les structures existantes du moteur cash-risk plutot que de reconstruire une taxonomie parallele dans l'UI.
- Frontend
  - Remplacer les mocks par des hooks React Query et des etats `loading/empty/error` coherents.
  - Reutiliser `StatsCard`, `Card`, `PageHeader`, `recharts` et le pattern `ChartContainer` deja presents.
  - Garder un dashboard scannable: tuiles KPI, panneau de priorites/alertes, chart d'execution, liste detaillee ou top anomalies.
  - Toute navigation depuis une alerte doit etre actionnable et mener a la bonne surface metier.
- Data model
  - Centraliser les types de dashboard si une nouvelle structure est introduite, idealement cote contrats partages ou au minimum dans un type dedie, pas en litteraux ad hoc dans la page.
  - Preserver le scope `tenant + exercice + filtres eventuels`.
  - Si des dimensions analytiques (section/programme/action/enveloppe) sont exposees, reutiliser les filtres deja portes par les previsions et les lignes budgetaires.

### Architecture Compliance

- Respecter les regles du [`project-context.md`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md):
  - aucune nouvelle dependance runtime Supabase
  - toute nouvelle logique metier cote NestJS
  - front via client API unifie et React Query
  - reutilisation avant creation.
- Toute lecture backend doit respecter l'isolation multi-tenant et les guards JWT + RBAC/ABAC deja en place.
- Le dashboard ne doit pas devenir une seconde source de verite:
  - le backend decide des chiffres agreges sensibles et des statuts de risque
  - le front affiche et orchestre.
- Garder la trajectoire du repo:
  - Vite/React transitoire aujourd'hui, mais implementation "Next.js-ready" par separation nette UI/data/contracts.

### Library / Framework Requirements

Versions observees localement:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, Recharts `2.15.4`, React Hook Form `7.61.1`, Zod `3.25.76`.
- Backend NestJS `10.4.22`.
- Package manager: `pnpm@9.12.0`.

Decisions pour cette story:

- Aucun upgrade de dependance n'est necessaire.
- Reutiliser `recharts` pour les visualisations et les patterns `StatsCard`/`ChartContainer` deja presents.
- Ne pas introduire une librairie de dashboard supplementaire tant que les composants existants couvrent le besoin.
- Aucune veille web technique externe n'est requise; les versions et contraintes utiles proviennent du repo.

### File Structure Requirements

Points d'extension prioritaires:

- Frontend
  - `src/pages/app/Dashboard.tsx`
  - `src/components/reporting/ExecutionBudgetaireReport.tsx`
  - eventuellement nouveaux composants sous `src/components/dashboard/` si une extraction est necessaire
  - `src/hooks/useLignesBudgetaires.ts`
  - `src/hooks/useTresorerie.ts`
  - eventuellement un hook dedie de composition type `useDashboardBudgetaire.ts`
  - `src/services/api/budget.service.ts`
  - `src/services/api/previsions.service.ts`
  - `src/services/api/tresorerie.service.ts`
- Backend
  - `backend/src/budget-referentiels/*`
  - `backend/src/previsions/*`
  - `backend/src/cash-risk/*`
  - eventuellement un module/endpoint de lecture agrégée si necessaire pour la perf et la coherence

Regles de structure:

- Etendre `Dashboard.tsx` plutot que creer une nouvelle page de pilotage concurrente.
- Etendre `ExecutionBudgetaireReport` ou extraire un composant partage si cela evite la duplication de chart/KPI.
- Eviter des appels disperses depuis la page si une orchestration hook/service peut encapsuler le besoin proprement.
- Toute nouvelle abstraction doit etre justifiee par la reutilisation ou la reduction de duplication, pas par convenance.

### Project Structure Notes

- Le repo contient deja plusieurs briques de pilotage, mais elles sont dispersees entre budget, previsions, tresorerie et controle interne. `7.1` doit les unifier visuellement sans les reimplementer.
- Conflit principal detecte:
  - la page dashboard actuelle est encore demo/mockee
  - les composants reporting et hooks domaine utilisent deja des donnees reelles.
  - la story doit donc converger vers les contrats reels existants et supprimer la divergence mock vs reel.
- Aucun `architecture.md` exploitable n'a ete trouve dans `/_bmad-output/planning-artifacts`; l'architecture a ete derivee du code reel, de `project-context.md`, du PRD et des stories deja creees.
- Le projet reste hybride SPA React + backend NestJS en transition. Cette story doit respecter le pattern de migration: pas de logique metier critique cote client, pas de retour vers Supabase, contrats API types.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [Dashboard.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Dashboard.tsx)
- [ExecutionBudgetaireReport.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/reporting/ExecutionBudgetaireReport.tsx)
- [useLignesBudgetaires.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useLignesBudgetaires.ts)
- [budget.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/budget.service.ts)
- [previsions.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/previsions.service.ts)
- [useTresorerie.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useTresorerie.ts)
- [tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/tresorerie.service.ts)
- [cash-risk.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/cash-risk/cash-risk.service.ts)
- [ControleInterne.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/ControleInterne.tsx)
- [Tresorerie.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Tresorerie.tsx)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Story 7.1 formalisee a partir des artefacts Epic 7/PRD et du code reel du repo.
- Le guardrail principal impose le remplacement des mocks du dashboard par des donnees reelles issues des contrats budget, previsions et tresorerie.
- La story privilegie la reutilisation des hooks/services/composants existants et interdit toute duplication de logique de risque ou de calcul sensible cote React.
- Les points d'extension probables sont `Dashboard.tsx`, `ExecutionBudgetaireReport`, les hooks domaine existants et possiblement un endpoint backend d'agregation si necessaire pour la performance.
- Validation checklist effectuee manuellement; le fichier `_bmad/core/tasks/validate-workflow.xml` reference par le workflow n'a pas ete charge via un automatisme dedie dans ce tour.

### File List

- `_bmad-output/implementation-artifacts/7-1-exposer-dashboard-budgetaire-de-pilotage.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
