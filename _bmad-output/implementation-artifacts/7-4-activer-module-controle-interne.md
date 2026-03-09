# Story 7.4: Activer module controle interne

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a controleur interne,
I want suivre ecarts, exceptions et plans d'action,
so that la maitrise interne reste active en continu.

## Acceptance Criteria

1. **Workspace controle interne active sur la route existante**
   - **Given** des ecarts, anomalies ou exceptions deja detectes dans les domaines tresorerie, rapprochement ou cloture
   - **When** l'utilisateur ouvre `/app/controle-interne`
   - **Then** il accede a un workspace metier exploitable sur la route existante `ControleInterne`
   - **And** ce workspace combine au minimum synthese des ecarts, journal des exceptions, detail d'audit et suivi des plans d'action sans recourir a des donnees mockees.

2. **Plans d'action suivis de bout en bout**
   - **Given** un ecart ou une exception necessitant une remediation
   - **When** un controleur interne cree, assigne ou met a jour un plan d'action
   - **Then** le plan d'action porte un responsable, une echeance, un statut, une priorite et un lien vers l'objet source
   - **And** son cycle de vie reste suivi jusqu'a resolution, rejet motive ou cloture.

3. **Historique non destructif et preuves auditees**
   - **Given** un plan d'action, une exception ou un ecart evolue dans le temps
   - **When** son statut change ou qu'une preuve est ajoutee
   - **Then** l'historique precedent reste consultable sans ecrasement
   - **And** les evenements restent relies a des identifiants d'audit stables (`exceptionId`, `correlationId`, source metier, timestamps).

4. **Autorisation explicite et sans role fantome**
   - **Given** le besoin metier parle d'un "controleur interne" alors que ce role n'existe pas actuellement dans `backend/src/auth/authorization.types.ts`
   - **When** le module est active
   - **Then** la strategie d'acces est explicitee de bout en bout (mapping vers roles existants ou introduction propre d'un nouveau role)
   - **And** aucune permission parallele ou bypass RBAC/ABAC n'est introduit.

5. **Reutilisation des briques existantes et alignement audit/export**
   - **Given** le repo dispose deja d'une route `ControleInterne`, d'endpoints `tresorerie/exception-audit`, d'un workflow d'exceptions gouvernees et d'une preparation d'export audit
   - **When** la story est implementee
   - **Then** ces briques sont etendues plutot que dupliquees
   - **And** le module reste coherent avec le futur dossier d'audit exportable (`7.3`) et les contraintes de performance, accessibilite et tracabilite du produit.

## Tasks / Subtasks

- [ ] Revalider le perimetre story 7.4 contre `FR31` en source principale, avec dependances directes sur `FR23`, `FR30`, `FR32`, `FR42`, `FR51`, `FR55` et `FR57`, ainsi que `NFR8`, `NFR9`, `NFR11`, `NFR13`, `NFR19`, `NFR21` et `NFR30` avant tout dev (AC: 1, 2, 3, 4, 5)
- [ ] Cartographier les briques existantes a reutiliser avant toute nouvelle abstraction:
  - [ ] `src/pages/app/ControleInterne.tsx`
  - [ ] `src/components/controle-interne/ExceptionAuditTable.tsx`
  - [ ] `src/components/controle-interne/ExceptionAuditDetail.tsx`
  - [ ] `src/hooks/useTresorerie.ts`
  - [ ] `src/hooks/useWorkflowExceptions.ts`
  - [ ] `src/components/workflow-exceptions/WorkflowExceptionsList.tsx`
  - [ ] `src/components/workflow-exceptions/WorkflowExceptionRequestDialog.tsx`
  - [ ] `src/components/export/ExportResultsBar.tsx`
  - [ ] `src/lib/export-utils.ts`
  - [ ] `backend/src/tresorerie/*`
  - [ ] `backend/src/workflow-exceptions/*`
  - [ ] `backend/src/auth/authorization.types.ts`
  - [ ] `backend/src/auth/authorization-audit.service.ts`
  - [ ] `backend/src/rapprochements-bancaires/*`
  - [ ] `backend/src/exercice-cloture/*` (AC: 1, 2, 3, 4, 5)
- [ ] Resoudre explicitement le gap RBAC du role "controleur interne":
  - [ ] confirmer si le besoin doit etre porte par `auditeur`, `directeur_financier`, une combinaison existante, ou un nouveau role metier
  - [ ] si nouveau role, l'ajouter proprement dans `authorization.types.ts`, guards, fixtures et tests de permission
  - [ ] si mapping sur role existant, le documenter dans le module et dans les tests pour eviter toute ambiguite future (AC: 4, 5)
- [ ] Transformer `ControleInterne.tsx` d'une page read-only d'audit en workspace controle interne:
  - [ ] conserver `PageHeader` et les patterns UI de l'application
  - [ ] introduire une synthese de supervision (ecarts ouverts, exceptions soumises/approuvees, plans d'action en retard)
  - [ ] structurer la page en sections ou onglets lisibles: ecarts, exceptions, plans d'action, detail/preuves
  - [ ] conserver les etats loading, empty, error et acces restreint deja etablis (AC: 1, 5)
- [ ] Definir un contrat canonique et type pour le module controle interne:
  - [ ] un type de "control item" ou equivalent pour representer exception, ecart qualifie ou anomalie bloquante
  - [ ] un type de plan d'action (owner, dueDate, priority, status, linkedSourceType, linkedSourceId, evidenceRefs)
  - [ ] des enums partagees explicites pour statuts et priorites, sans litteraux epars dans le JSX (AC: 2, 3, 4)
- [ ] Evaluer l'architecture backend la plus sure pour les plans d'action:
  - [ ] ne pas stocker l'etat des plans d'action dans le front ou dans des composants
  - [ ] si aucun stockage existant n'est reutilisable proprement, creer un module backend dedie (ex: `backend/src/controle-interne/*`) avec migration SQL associee
  - [ ] conserver `workflow-exceptions` comme source de verite des exceptions et relier le nouveau domaine par references stables plutot que dupliquer les donnees (AC: 2, 3, 5)
- [ ] Agreger les sources d'ecarts sans recreer un nouveau moteur de detection:
  - [ ] exceptions gouvernees depuis `workflow_exceptions`
  - [ ] alertes et export-prep de `tresorerie`
  - [ ] ecarts qualifies de rapprochement bancaire
  - [ ] anomalies bloquantes de pre-cloture / cloture
  - [ ] ecarts analytiques ou budgetaires deja exposes par d'autres modules si reutilisables via lecture backend (AC: 1, 2, 3, 5)
- [ ] Relier le module controle interne au continuum audit/export:
  - [ ] reutiliser les pivots `exceptionId`, `correlationId`, `sourceType`, `sourceId`, `entityId`
  - [ ] exploiter `GET /tresorerie/exception-audit/export-prep` et les patterns d'export existants avant toute nouvelle route
  - [ ] preparer une articulation claire avec la story `7.3` pour qu'un plan d'action et son historique puissent nourrir le futur dossier d'audit (AC: 3, 5)
- [ ] Preserver l'historique non destructif:
  - [ ] append-only ou journal evenementiel pour les changements critiques de plans d'action
  - [ ] aucun update silencieux qui ecrase l'ancien statut, proprietaire ou echeance
  - [ ] timestamps, auteur et raison du changement obligatoires sur les transitions critiques (AC: 2, 3)
- [ ] Etendre les hooks/services frontend sans divergence de pattern:
  - [ ] React Query avec query keys stables scopees par tenant + exercice + filtres
  - [ ] services API typés via `requestJson`
  - [ ] composants de presentation decouples des regles metier et sans calculs sensibles cote client (AC: 1, 2, 5)
- [ ] Ajouter les tests backend / integration necessaires:
  - [ ] lecture/aggregation correcte des ecarts et exceptions lies
  - [ ] refus d'acces pour role non autorise
  - [ ] isolation tenant/exercice sur toutes les lectures et mutations
  - [ ] non-destruction de l'historique des plans d'action
  - [ ] liaisons correctes entre plan d'action, exception source et preuves exportables (AC: 2, 3, 4, 5)
- [ ] Ajouter les tests frontend / contrat necessaires:
  - [ ] affichage du workspace `ControleInterne`
  - [ ] acces restreint sans `referentiels:audit:read`
  - [ ] interactions de filtrage / selection / drill-down detail
  - [ ] creation ou mise a jour d'un plan d'action si le lot inclut l'UI d'edition
  - [ ] coherence entre synthese, liste et detail sans desynchronisation React Query (AC: 1, 2, 4, 5)
- [ ] Verifier explicitement qu'aucune nouvelle dependance runtime Supabase, aucune logique metier dans le JSX, et aucune nouvelle librairie de dashboard/workflow n'est introduite sans justification forte (AC: 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 7, Story 7.4).
- FR directes et support:
  - `FR31`: module de controle interne (ecarts, exceptions, plans d'action, statut)
  - `FR23`: quorum et limite temporelle sur les exceptions
  - `FR30`: dossier d'audit exportable structure
  - `FR32`: historique non destructif avec double temporalite
  - `FR42`: traces necessaires aux inspections d'Etat et audits externes
  - `FR51`, `FR55`, `FR57`: qualification d'ecarts, checklist de pre-cloture, gestion d'exceptions tardives
- NFR prioritaires:
  - `NFR8`, `NFR9`: securite, autorisation et audit des acces
  - `NFR11`, `NFR13`: integrite de la chaine d'audit et export verifiable
  - `NFR19`, `NFR21`: accessibilite, clavier, messages explicites
  - `NFR30`: traitement trace des ecarts sur le rapprochement

### Developer Context Section

- La route [`ControleInterne.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/ControleInterne.tsx) existe deja et s'appuie sur le journal d'audit des exceptions cash. La story 7.4 doit l'activer comme workspace de controle interne, pas creer une seconde route concurrente.
- Le repo contient deja des briques solides a reutiliser:
  - lecture audit paginee via [`useTresorerie.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useTresorerie.ts) et [`tresorerie.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/tresorerie.service.ts)
  - detail et table audit via [`ExceptionAuditTable.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/controle-interne/ExceptionAuditTable.tsx) et [`ExceptionAuditDetail.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/controle-interne/ExceptionAuditDetail.tsx)
  - workflow d'exceptions gouvernees complet via [`workflow-exceptions.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/workflow-exceptions/workflow-exceptions.service.ts), [`useWorkflowExceptions.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useWorkflowExceptions.ts) et [`WorkflowExceptionRequestDialog.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/workflow-exceptions/WorkflowExceptionRequestDialog.tsx)
  - read models de supervision et export-prep cote backend via [`tresorerie.controller.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.controller.ts)
- Il n'existe pas de domaine explicite de "plan d'action" dans le code actuel. C'est le principal manque fonctionnel a cadrer: ne pas compenser en stockant cet etat dans le front.
- Le role metier `controleur interne` n'existe pas actuellement dans [`authorization.types.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization.types.ts). Ce gap doit etre resolu avant implementation pour eviter une fonctionnalite inaccessible ou un contournement de permissions.

### Technical Requirements

- Backend / domaine
  - Les exceptions restent sous la responsabilite de `workflow_exceptions`; ne pas recreer une table, un statut ou un circuit de vote parallele.
  - Si la story couvre les plans d'action, ils doivent vivre dans un domaine backend explicite avec migration SQL versionnee, pas dans un state local React ni dans `localStorage`.
  - Les liaisons minimales a conserver entre controle interne et sources metier: `tenantId`, `exerciceId`, `sourceType`, `sourceId`, `entityId`, `exceptionId`, `correlationId`, timestamps, auteur et motif.
  - Les agregations sensibles (ecarts ouverts, plans en retard, exceptions actives, rapprochements qualifies) doivent etre calculees cote backend.
- Frontend
  - React Query reste la couche standard; conserver des query keys stables par tenant/exercice/filtre.
  - Les erreurs doivent passer par `requestJson` / `ApiError`, pas par du parsing local disperse.
  - Reutiliser les patterns `PageHeader`, `Card`, `Alert`, `Tabs`, `Badge`, `ListLayout`, `ListToolbar`, `PaginationControls` et `ExportResultsBar` avant de creer de nouveaux composants.
  - Aucun calcul metier critique, aucune persistence de statut de remediation, aucun mapping de permission ne doit vivre dans les composants de presentation.
- Export / audit
  - Reutiliser `GET /tresorerie/exception-audit/export-prep` et les utilitaires d'export existants avant toute nouvelle API d'export.
  - Toute preuve ou etat de plan d'action doit rester exportable ou referencable pour la story `7.3`.

### Architecture Compliance

- Regles de [`project-context.md`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md) a respecter:
  - aucune nouvelle dependance runtime Supabase
  - toute nouvelle logique metier cote NestJS
  - appels front via client API unifie type
  - reutilisation avant creation
- Les endpoints sensibles suivent deja `JwtAuthGuard` + `AuthorizationPolicyGuard`; tout nouveau endpoint controle interne doit respecter exactement ce pattern.
- Les permissions d'audit existent deja (`referentiels:audit:read`). Ne pas inventer une deuxieme permission "controle interne" sans alignement avec la matrice RBAC existante.
- Le module backend global charge deja `WorkflowExceptionsModule`, `TresorerieModule`, `RapprochementsBancairesModule` et `ExerciceClotureModule` dans [`app.module.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/app.module.ts). La story doit s'y integrer avec des frontieres claires, pas contourner ces domaines.

### Library / Framework Requirements

Versions observees localement:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, Recharts `2.15.4`.
- Backend: NestJS `10.4.22`.
- Package manager: `pnpm@9.12.0`.

Veille technique utile pour cette story:

- TanStack Query documente toujours en `latest` les patterns de `Query Keys` et l'evitement des request waterfalls; la story doit encapsuler les lectures controle interne dans ces patterns plutot que multiplier les fetchs en cascade. Source: [TanStack Query docs](https://tanstack.com/query/latest).
- La documentation officielle NestJS reste alignee sur la branche `v10` utilisee par le repo; pas d'hypothese d'API Nest 11 ici. Source: [NestJS docs](https://docs.nestjs.com).
- Recharts a poursuivi sa ligne `3.x` avec ruptures documentees dans le guide de migration `3.0`; le repo etant en `2.15.4`, tout exemple externe doit etre verifie avant reutilisation. Sources: [Recharts migration guide 3.0](https://github.com/recharts/recharts/wiki/3.0-migration-guide), [Recharts releases](https://github.com/recharts/recharts/releases).

Decision pour cette story:

- Aucun upgrade de dependance n'est requis pour 7.4.
- Ne pas introduire de librairie de workflow/case management ni de dashboard additionnelle sans preuve que les briques existantes sont insuffisantes.
- Toute UI statistique reste compatible avec `recharts@2.15.4`.

### File Structure Requirements

Points d'extension prioritaires:

- Frontend
  - `src/pages/app/ControleInterne.tsx`
  - `src/components/controle-interne/*`
  - `src/hooks/useTresorerie.ts`
  - `src/hooks/useWorkflowExceptions.ts`
  - `src/components/workflow-exceptions/*`
  - `src/components/export/ExportResultsBar.tsx`
  - eventuellement un hook partage `src/hooks/useControleInterne.ts`
  - eventuellement un service `src/services/api/controle-interne.service.ts` si un nouveau backend dedie est cree
- Backend
  - `backend/src/tresorerie/*` pour les read models d'audit et de supervision deja existants
  - `backend/src/workflow-exceptions/*` uniquement si le contrat doit etre etendu sans casser `5.3/5.4`
  - `backend/src/rapprochements-bancaires/*` et `backend/src/exercice-cloture/*` pour remonter les ecarts existants
  - eventuellement un nouveau module `backend/src/controle-interne/*` pour les plans d'action et la vue agrégée
  - migration SQL versionnee sous `supabase/migrations/*` si un stockage persistant est necessaire

Regles de structure:

- Etendre `ControleInterne.tsx` plutot que creer une nouvelle page.
- Si plusieurs panneaux partagent filtres, badges ou cartes de synthese, extraire un composant partage au lieu de dupliquer.
- Garder les types et le mapping API hors des composants de presentation.

### Testing Requirements

- Backend
  - tests d'integration pour lecture/aggregation controle interne multi-sources
  - tests RBAC pour `referentiels:audit:read` et eventuelle nouvelle strategie de role
  - tests d'isolation tenant/exercice sur lecture et mutation
  - tests d'historique non destructif pour les plans d'action si nouveau stockage
- Frontend
  - etendre les scenarios autour de `/app/controle-interne`
  - tester acces restreint, filtres, selection detail, etats empty/loading/error
  - tester la coherence entre synthese, liste des ecarts/exceptions et detail
  - si edition de plan d'action livree, couvrir creation, mise a jour et rendu des echeances/statuts
- Reuse tests existants:
  - `tests/tresorerie-supervision-ui.spec.ts`
  - `tests/workflow-exceptions-ui.spec.ts`
  - specs backend `workflow-exceptions.service.spec.ts`, `authorization-audit.service.spec.ts`, `tresorerie.controller.spec.ts` si extension de permissions/endpoints

### Previous Story Intelligence

- La story precedente disponible dans l'epic est [`7-2-fournir-vues-danalyse-et-axes-analytiques.md`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/7-2-fournir-vues-danalyse-et-axes-analytiques.md):
  - elle insiste deja sur la reutilisation des hooks React Query, services API et composants reporting existants
  - elle rappelle que les agregations sensibles doivent rester cote backend
  - elle formalise la regle "etendre la page existante plutot que creer une surface concurrente"
- La story `5.4` deja implementee est encore plus structurante pour 7.4:
  - elle a introduit la lecture audit et supervision sous `ControleInterne`
  - elle a deja aligne `referentiels:audit:read` sur les endpoints sensibles
  - elle interdit de dupliquer la logique `workflow_exceptions` en stockage parallele
- Consequence directe pour 7.4:
  - le module controle interne doit se construire au-dessus de `5.3/5.4`, pas a cote
  - les plans d'action sont l'extension fonctionnelle majeure manquante

### Git Intelligence Summary

- Commits recents observes:
  - `25098ba Review backend parametres updates`
  - `c6d8679 Document story 7.2 ready for dev`
  - `4b83ba1 Add dashboard budgetaire story`
  - `40eb40a Perform adversarial code review`
  - `81e450b Summarize sprint status`
- Inference: l'epic 7 est encore en phase de contextualisation. Cette story doit donc verrouiller les frontieres d'implementation pour eviter que le futur dev fabrique un "mini outil de ticketing" deconnecte du domaine financier et de l'audit existants.

### Latest Tech Information

- TanStack Query: rester sur les patterns `queryKey` deterministes et sur une orchestration de lectures sans waterfalls inutiles.
- NestJS: la stack locale reste sur `10.4.22`, donc aucune adaptation a une API majeure plus recente n'est a prevoir.
- Recharts: les exemples 3.x trouves en ligne peuvent etre incompatibles avec le repo; verifier toute API de graphing avant integration.

### Project Context Reference

- Contexte source: [`project-context.md`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- Contraintes majeures a rappeler au dev:
  - pas de nouvelle dependance runtime Supabase
  - pas de logique metier critique cote client
  - contrats front/back explicites
  - typage fort et normalisation explicite des montants
  - lint/typecheck/tests propres avant fermeture du lot

### References

- `/_bmad-output/planning-artifacts/epics.md` - Epic 7, Story 7.4, FR23, FR30, FR31, FR32, FR42, FR51, FR55, FR57
- `/_bmad-output/planning-artifacts/prd.md` - sections conformite, audit, controle interne et catalogue FR/NFR
- `/_bmad-output/project-context.md`
- `/_bmad-output/implementation-artifacts/5-4-offrir-supervision-tresorerie-et-audit-des-exceptions.md`
- `/_bmad-output/implementation-artifacts/7-2-fournir-vues-danalyse-et-axes-analytiques.md`
- [`src/pages/app/ControleInterne.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/ControleInterne.tsx)
- [`src/components/controle-interne/ExceptionAuditTable.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/controle-interne/ExceptionAuditTable.tsx)
- [`src/components/controle-interne/ExceptionAuditDetail.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/controle-interne/ExceptionAuditDetail.tsx)
- [`src/hooks/useTresorerie.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useTresorerie.ts)
- [`src/hooks/useWorkflowExceptions.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useWorkflowExceptions.ts)
- [`src/services/api/tresorerie.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/tresorerie.service.ts)
- [`backend/src/tresorerie/tresorerie.controller.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.controller.ts)
- [`backend/src/tresorerie/tresorerie.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.service.ts)
- [`backend/src/workflow-exceptions/workflow-exceptions.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/workflow-exceptions/workflow-exceptions.service.ts)
- [`backend/src/auth/authorization.types.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization.types.ts)
- [`backend/src/auth/authorization-audit.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization-audit.service.ts)
- [`supabase/migrations/20260307110000_story_5_3_workflow_exceptions.sql`](/Volumes/mySD1.5/projects/agilys-spark-joy/supabase/migrations/20260307110000_story_5_3_workflow_exceptions.sql)
- [`supabase/migrations/20260307113000_workflow_exception_tenant_settings.sql`](/Volumes/mySD1.5/projects/agilys-spark-joy/supabase/migrations/20260307113000_workflow_exception_tenant_settings.sql)
- `tests/tresorerie-supervision-ui.spec.ts`
- `tests/workflow-exceptions-ui.spec.ts`

### Project Structure Notes

- Alignement avec la structure actuelle:
  - route front unique deja presente sous `/app/controle-interne`
  - hooks/services centralises sous `src/hooks` et `src/services/api`
  - domaines backend explicites par module NestJS
  - migrations SQL versionnees sous `supabase/migrations`
- Variances detectees a traiter explicitement:
  - role `controleur_interne` absent de la matrice RBAC actuelle
  - aucun stockage de plans d'action present aujourd'hui
  - la page courante est centree audit read-only et doit devenir un workspace sans casser la lecture existante
- Rationale:
  - la solution la plus propre est d'etendre les read models existants et d'ajouter un domaine de remediation si necessaire, plutot que greffer un outil parallele cote client.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- create-story workflow execute pour `7-4-activer-module-controle-interne`
- validation manuelle effectuee contre `create-story/checklist.md` car `/_bmad/core/tasks/validate-workflow.xml` est absent du repo
- analyse croisee effectuee entre Epic 7, PRD, project-context, story 5.4, story 7.2, code front `ControleInterne`, backend `workflow-exceptions` et `tresorerie`

### Completion Notes List

- 2026-03-09: contexte story 7.4 cree en mode YOLO apres validation du target story par identifiant fourni.
- 2026-03-09: guardrail critique ajoute sur le gap RBAC (`controleur_interne` absent).
- 2026-03-09: guardrail critique ajoute sur l'absence de domaine persistant pour les plans d'action.
- 2026-03-09: alignement explicite impose avec `5.3/5.4` pour eviter toute duplication du moteur d'exceptions et des endpoints d'audit.

### File List

- `/_bmad-output/implementation-artifacts/7-4-activer-module-controle-interne.md`
