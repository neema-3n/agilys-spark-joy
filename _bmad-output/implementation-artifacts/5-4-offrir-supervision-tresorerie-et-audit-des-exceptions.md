# Story 5.4: Offrir supervision tresorerie et audit des exceptions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a controleur interne,
I want auditer les transitions en exception,
so that je peux suivre les risques et conformites.

## Acceptance Criteria

1. **Read model de supervision tresorerie fiable et explicable**
   - **Given** un utilisateur habilite consulte la supervision de tresorerie pour un exercice
   - **When** le backend calcule la vue de synthese
   - **Then** il expose au minimum la position courante, la projection court terme, les decaissements en attente, les engagements restants et des alertes derivees de seuils explicites
   - **And** cette vue reutilise les donnees deja consolidees dans `comptes_tresorerie`, `operations_tresorerie`, `depenses`, `engagements`, `previsions` et `cash-risk`
   - **And** aucune source de verite parallele n'est creee.

2. **Journal d'exceptions et de transitions a risque auditable**
   - **Given** des blocages cash, exceptions approuvees ou exceptions expirees existent
   - **When** le controleur interne consulte le journal
   - **Then** chaque entree expose identite, horodatage, transition, decision, justification, approbateurs, validite, correlation et statut final
   - **And** le journal permet de distinguer clairement `blocked`, `exception-requested`, `exception-approved`, `exception-expired` et `executed-under-exception`
   - **And** les lectures restent strictement scopees par `tenant + exercice`.

3. **UX read-only coherente avec les pages existantes**
   - **Given** le frontend actuel possede deja `Tresorerie` et `ControleInterne`
   - **When** la story est implemente
   - **Then** la supervision de tresorerie s'integre en priorite dans `src/pages/app/Tresorerie.tsx`
   - **And** l'audit des exceptions s'integre en priorite dans `src/pages/app/ControleInterne.tsx`
   - **And** les patterns `StatsCard`, `ListLayout`, `ListToolbar`, `ListTable` et composants shadcn existants sont reutilises avant toute nouvelle abstraction.

4. **Filtres, alertes et drill-down actionnables sans logique metier dupliquee**
   - **Given** des alertes ou exceptions doivent etre investiguees
   - **When** l'utilisateur filtre par severite, transition, statut, periode ou entite
   - **Then** le backend expose ces filtres via des endpoints types et paginables
   - **And** le frontend affiche badges, compteurs et liens vers le contexte metier sans recalculer les decisions cash ou les droits
   - **And** un drill-down permet de voir le snapshot de risque et le contexte d'exception sans perdre la liste courante.

5. **Securite, audit trail et non-regression**
   - **Given** que ces ecrans exposent des informations sensibles de controle
   - **When** les endpoints et pages sont ajoutes
   - **Then** les endpoints de supervision respectent `JwtAuthGuard`, `AuthorizationPolicyGuard` et les permissions adequates
   - **And** la lecture de l'audit des exceptions requiert `referentiels:audit:read`
   - **And** des tests couvrent RBAC, scoping tenant/exercice, exactitude des agregats, rendu des alertes et absence de regression sur la tresorerie existante.

## Tasks / Subtasks

- [x] Revalider le contrat story contre `FR24`, `FR25`, `FR30`, `FR31`, `FR42`, `NFR1`, `NFR8`, `NFR9`, `NFR11`, `NFR13`, `NFR19`, `NFR20` et `NFR21`, puis expliciter la dependance fonctionnelle a la story `5.3` pour la persistence des exceptions gouvernees (AC: 1, 2, 5)
- [x] Formaliser un read model backend partage pour la supervision tresorerie, au lieu de continuer a exposer des stats derivees artificiellement depuis les seuls paiements valides (AC: 1, 4, 5)
- [x] Etendre `backend/src/tresorerie/*` avec des DTO et endpoints read-only dedies a:
  - [x] synthese position/projection/alertes
  - [x] journal des alertes cash
  - [x] liste paginee des exceptions auditees avec filtres
  - [x] detail d'une exception ou d'une decision risque via `correlationId`/identifiant stable (AC: 1, 2, 4, 5)
- [x] Reutiliser et etendre le contrat `backend/src/cash-risk/cash-risk.types.ts` plutot que definir un second format d'audit pour les decisions cash (AC: 1, 2, 4)
- [x] Definir l'articulation avec la story `5.3`:
  - [x] la story `5.3` reste source de verite des demandes/approbations d'exception
  - [x] la story `5.4` consomme cette source pour la supervision et l'audit
  - [x] aucun journal parallele d'exceptions n'est cree si une persistence dediee existe deja ou est livree avec `5.3` (AC: 2, 5)
- [x] Etendre `backend/src/tresorerie/tresorerie.service.ts` pour calculer des alertes deterministes basees sur seuils et ecarts reels:
  - [x] tension de liquidite (`projectedGap > 0`)
  - [x] operations non rapprochees
  - [x] concentration d'engagements/depenses en attente
  - [x] exceptions critiques actives ou expirees (AC: 1, 2, 4)
- [x] Introduire des types front dedies pour la supervision et l'audit au lieu de surcharger `src/types/tresorerie.types.ts` avec des structures implicites (AC: 1, 2, 4)
- [x] Etendre `src/services/api/tresorerie.service.ts` avec des appels types vers les nouveaux endpoints, en conservant `requestJson` comme point d'entree unique (AC: 1, 2, 4, 5)
- [x] Etendre `src/hooks/useTresorerie.ts` ou extraire des hooks read-only specialises si necessaire:
  - [x] `useTresorerieSupervision`
  - [x] `useExceptionAudit`
  - [x] partager les query keys et filtres plutot que dupliquer des `useQuery` locaux dans les pages (AC: 1, 2, 4)
- [x] Reutiliser les patterns UI existants:
  - [x] `src/components/tresorerie/TresorerieStats.tsx` pour les KPI de synthese
  - [x] `src/components/tresorerie/PrevisionsTresorerie.tsx` pour la projection
  - [x] `src/components/lists/*` pour le journal et les filtres
  - [x] extraire un composant partage de badge/alerte si le meme code apparait dans `Tresorerie` et `ControleInterne` (AC: 3, 4)
- [x] Implementer la page `src/pages/app/Tresorerie.tsx` pour afficher un onglet ou bloc "Supervision" en plus des comptes/operations existants, sans casser les flows CRUD actuels (AC: 1, 3, 5)
- [x] Remplacer le placeholder `src/pages/app/ControleInterne.tsx` par une vue read-only d'audit des exceptions:
  - [x] liste paginee
  - [x] filtres de severite/statut/periode/transition
  - [x] panneau de detail ou snapshot de lecture seule
  - [x] indicateurs de conformite et exceptions ouvertes/expirees (AC: 2, 3, 4, 5)
- [x] Garantir que les permissions restent segmentees:
  - [x] supervision tresorerie visible avec `referentiels:read`
  - [x] audit d'exception visible uniquement avec `referentiels:audit:read`
  - [x] masquer ou desactiver proprement les zones UI non autorisees sans recalcul de role cote composant (AC: 2, 3, 5)
- [x] Prevoir un export ou une structure preparatoire pour le dossier d'audit, sans essayer de livrer le dossier complet de `FR30` si le perimetre du sprint ne le couvre pas integralement (AC: 2, 5)
- [x] Ajouter les tests backend obligatoires:
  - [x] agregats de supervision corrects sur donnees mixtes
  - [x] filtres du journal d'exception
  - [x] refus cross-tenant
  - [x] enforcement RBAC (`referentiels:read` vs `referentiels:audit:read`)
  - [x] non-regression des endpoints existants `/tresorerie/stats`, `/flux`, `/previsions` si conserves (AC: 1, 2, 4, 5)
- [x] Ajouter les tests frontend obligatoires:
  - [x] rendu des KPI/alertes
  - [x] rendu de la table d'audit et de ses filtres
  - [x] accessibilite clavier/lecteurs d'ecran des vues de controle
  - [x] non-regression de `src/pages/app/Tresorerie.tsx` et `src/pages/app/ControleInterne.tsx` (AC: 3, 4, 5)
- [x] Confirmer explicitement qu'aucune nouvelle dependance runtime Supabase ni librairie de dashboard/table additionnelle n'est introduite (AC: 3, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 5, Story 5.4).
- FR directes:
  - `FR24` pour le suivi de tresorerie (position, projection, alertes).
  - `FR25` pour l'audit de toutes les transitions passees en exception.
- FR connexes a respecter:
  - `FR19` a `FR23` pour le contexte cash-risk + exceptions gouvernees.
  - `FR30`, `FR31` et `FR42` pour la piste d'audit exportable, le module de controle interne et les traces d'inspection.
- NFR prioritaires:
  - `NFR1` pour garder des lectures critiques rapides.
  - `NFR8`, `NFR9`, `NFR11`, `NFR13` pour droits, journalisation, historique non destructif et export audit.
  - `NFR19`, `NFR20`, `NFR21` pour accessibilite et clarte des interfaces de controle.
- Dependance fonctionnelle critique:
  - la partie "audit des exceptions traitees" ne doit pas inventer un stockage alternatif si la story `5.3` livre deja une entite ou un journal d'exception gouvernee.
  - si `5.3` n'est pas encore livree au moment du dev, definir une read model compatible avec elle plutot qu'un format jetable.

### Developer Context Section

- Le repo possede deja les briques a reutiliser:
  - backend `backend/src/tresorerie/*`
  - backend `backend/src/cash-risk/*`
  - backend `backend/src/auth/*`
  - frontend `src/pages/app/Tresorerie.tsx`
  - frontend `src/pages/app/ControleInterne.tsx`
  - frontend `src/components/tresorerie/*`
  - frontend `src/components/lists/*`
  - frontend `src/services/api/tresorerie.service.ts`
  - frontend `src/hooks/useTresorerie.ts`
- Etat actuel du code a corriger:
  - `backend/src/tresorerie/tresorerie.service.ts` calcule des stats simplifiees (encaissements derives artificiellement des decaissements), insuffisantes pour `FR24`.
  - `src/pages/app/Tresorerie.tsx` n'exploite pas encore `useTresorerie`, `TresorerieStats` ni `PrevisionsTresorerie`.
  - `src/pages/app/ControleInterne.tsx` est un placeholder sans audit trail.
- L'architecture cible de cette story est donc:
  - backend NestJS = source de verite read-only pour supervision et audit
  - services API front = transport type
  - hooks React Query = orchestration de lecture/filtres/pagination
  - pages/app = rendu et navigation
  - composants reutilisables = stats, tableaux, badges, panneaux de detail.

### Technical Requirements

- Backend
  - Etendre `TresorerieService` pour produire un read model credible au lieu des approximations actuelles.
  - Exposer des DTO explicites pour:
    - synthese de supervision
    - alerte de tresorerie
    - entree d'audit d'exception
    - filtres/pagination d'audit.
  - Reutiliser `CashRiskDecision.snapshot` et `correlationId` comme briques de raccordement a l'audit.
  - Conserver le scoping strict `client_id = tenantId` et `exercice_id`.
  - Ne jamais recalculer les approbations/quorum d'exception dans la couche read si un workflow dedie existe deja.
- Frontend
  - Ne pas construire un dashboard ad hoc en dehors des pages existantes.
  - Reutiliser `StatsCard`, `ListLayout`, `ListToolbar`, `ListTable`, `Tabs`, `Alert`, `Badge`, `Card`.
  - Garder les query keys explicites et stables du type:
    - `['tresorerie-supervision', clientId, exerciceId, filters]`
    - `['exception-audit', clientId, exerciceId, filters, page]`
  - Le front presente les alertes et l'historique mais ne decide ni le score ni la conformite.
- Data / Persistence
  - Si `5.3` introduit une table/structure d'exception, la story `5.4` doit la consommer.
  - Si une nouvelle persistence est requise pour l'audit, elle doit passer par migration versionnee Nest/PostgreSQL, jamais par Supabase ni stockage local.
  - Le journal doit rester non destructif et triable par horodatage descendant.

### Architecture Compliance

- Reutiliser la permission existante `referentiels:audit:read` pour les endpoints et vues d'audit, comme deja vu dans `budget-referentiels.controller.ts`.
- Conserver `JwtAuthGuard` + `AuthorizationPolicyGuard` sur tous les endpoints sensibles.
- Ne pas ajouter de logique metier critique cote React; tout calcul d'alerte et tout filtrage sensible doivent etre supportes cote backend.
- Eviter la duplication entre `Tresorerie` et `ControleInterne`:
  - shared badges/rows/components si necessaire
  - meme couche service/hook pour les lectures.
- Ne pas ecraser ni casser les endpoints actuels `/tresorerie/stats`, `/flux`, `/previsions`; preferer une extension compatible ou un nouveau contrat read-only versionnable.

### Library / Framework Requirements

Versions lockees observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, React Hook Form `7.61.1`, Zod `3.25.76`, Vite `5.4.19`.
- Backend: NestJS `10.4.22`, `pg` `8.19.0`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`.
- Package manager: `pnpm@9.12.0`.

Decision pour cette story:

- Aucun upgrade de dependance n'est requis.
- Les tableaux doivent reutiliser les abstractions liste maison plutot qu'une nouvelle librairie de data-grid.
- Les notifications ou alertes doivent reutiliser `sonner` et les composants UI existants si besoin.
- Aucune nouvelle dependance runtime Supabase n'est autorisee.

### File Structure Requirements

Points d'extension prioritaires:

- Backend
  - `backend/src/tresorerie/tresorerie.controller.ts`
  - `backend/src/tresorerie/tresorerie.service.ts`
  - `backend/src/tresorerie/dto/tresorerie.dto.ts`
  - eventuellement un nouveau fichier read model / mapper dans `backend/src/tresorerie/`
  - eventuellement un domaine partage pour l'audit des exceptions si `5.3` l'a deja cree
  - `backend/src/auth/authorization.types.ts` si une permission supplementaire est indispensable, mais la preference est de reutiliser l'existant
- Frontend
  - `src/services/api/tresorerie.service.ts`
  - `src/hooks/useTresorerie.ts`
  - `src/types/tresorerie.types.ts` ou types dedies associes
  - `src/pages/app/Tresorerie.tsx`
  - `src/pages/app/ControleInterne.tsx`
  - `src/components/tresorerie/TresorerieStats.tsx`
  - `src/components/tresorerie/PrevisionsTresorerie.tsx`
  - nouveaux composants read-only possibles:
    - `src/components/tresorerie/TresorerieAlertsTable.tsx`
    - `src/components/controle-interne/ExceptionAuditTable.tsx`
    - `src/components/controle-interne/ExceptionAuditDetail.tsx`
  - reutiliser `src/components/lists/*` avant toute table bespoke.

Regles de structure:

- Ne pas creer une nouvelle page autonome si `Tresorerie` et `ControleInterne` peuvent absorber le besoin.
- Ne pas dupliquer la logique de formatage monnaie, dates, badges et pagination dans plusieurs composants.
- Si la meme vue detaillee d'exception est necessaire dans plusieurs endroits, extraire un composant partage read-only.

### Testing Requirements

1. Backend (obligatoire)
   - calcul des KPI de supervision sur jeu de donnees realistement melange
   - generation d'alertes de seuil et d'exceptions actives/expirees
   - filtres de journal d'audit
   - refus cross-tenant
   - enforcement des permissions `referentiels:read` et `referentiels:audit:read`
   - non-regression des endpoints tresorerie deja existants.

2. Frontend (obligatoire)
   - rendu des cartes de supervision et du tableau d'alertes
   - rendu du journal d'exception avec filtres et etat vide
   - preservation du drill-down detail <-> liste
   - accessibilite clavier et `role="alert"` / tables lisibles pour les points critiques
   - non-regression des onglets existants de `Tresorerie`.

3. Qualite transversale
   - `pnpm --dir backend run lint`
   - `pnpm --dir backend run test`
   - `pnpm run lint`
   - tests cibles front/back sur les zones impactees
   - verification explicite de l'absence de nouvelle dependance runtime Supabase.

### Previous Story Intelligence

Lecons des stories precedentes utiles a `5.4`:

- `5.1` a centralise le moteur `cash-risk` et a impose un contrat de decision stable (`riskLevel`, `riskScore`, `decision`, `reasons`, `snapshot`, `correlationId`).
- `5.2` a deja identifie que la couche front perd aujourd'hui la structure complete des erreurs metier; `5.4` ne doit pas contourner ce probleme avec un second format UI.
- Le moteur `cash-risk` journalise deja les decisions et porte un `correlationId`; cette story doit reutiliser ce pivot pour relier supervision, audit et futures exceptions gouvernees.
- La permission `referentiels:audit:read` est deja en place et utilisee ailleurs; inutile d'inventer un scheme d'autorisation parallele.
- Risque principal a eviter:
  - creer une supervision "marketing dashboard" deconnectee des donnees d'audit
  - ou creer un audit d'exceptions decouple de la persistence qui sera introduite par `5.3`.

### Git Intelligence Summary

Observations basees sur les commits recents:

- Le repo continue a avancer par stories context-rich et par durcissement de workflows existants, pas par refonte globale.
- Les derniers travaux ont privilegie:
  - synchronisation stricte des artefacts BMAD
  - corrections post-review
  - renforcement des garde-fous sur les domaines critiques.
- Pour `5.4`, cela pousse vers un lot cible et lisible:
  - read models backend clairs
  - extension des pages existantes
  - reuse maximal des patterns de listes/stats
  - tests de permissions et de scoping avant embellissements.

### Latest Tech Information

- Les versions lockees du repo suffisent pour cette story.
- Aucun changement de version n'est requis pour produire la supervision et l'audit.
- La priorite n'est pas un upgrade framework mais:
  - remplacer les aggregats de tresorerie artificiels par des lectures metier fiables
  - s'appuyer sur les contrats de `cash-risk`
  - rendre l'audit exploitable sans dupliquer la logique de calcul.

### Project Structure Notes

- Aucun `architecture.md` autonome n'a ete trouve dans les planning artifacts charges; les contraintes d'architecture exploitables viennent surtout de:
  - `/_bmad-output/project-context.md`
  - `/_bmad-output/planning-artifacts/prd.md`
  - `/_bmad-output/planning-artifacts/epics.md`
  - l'etat reel du code.
- Le frontend reste une SPA Vite/React en transition, mais les nouvelles lectures doivent rester "Next.js-ready":
  - separation claire data/UI
  - services API types
  - composants read-only reutilisables.
- `Tresorerie` et `ControleInterne` sont aujourd'hui les meilleurs points d'entree produit pour ce besoin:
  - `Tresorerie` pour la position/projection/alertes quotidiennes
  - `ControleInterne` pour le journal d'exceptions et la lecture audit.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [5-1-evaluer-le-risque-cash-sur-transitions-critiques.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/5-1-evaluer-le-risque-cash-sur-transitions-critiques.md)
- [5-2-expliquer-blocages-et-proposer-remediations.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/5-2-expliquer-blocages-et-proposer-remediations.md)
- [package.json](/Volumes/mySD1.5/projects/agilys-spark-joy/package.json)
- [backend/package.json](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/package.json)
- [backend/src/cash-risk/cash-risk.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/cash-risk/cash-risk.types.ts)
- [backend/src/cash-risk/cash-risk.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/cash-risk/cash-risk.service.ts)
- [backend/src/tresorerie/tresorerie.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.controller.ts)
- [backend/src/tresorerie/tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.service.ts)
- [backend/src/tresorerie/dto/tresorerie.dto.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/dto/tresorerie.dto.ts)
- [backend/src/auth/authorization.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization.types.ts)
- [backend/src/budget-referentiels/budget-referentiels.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/budget-referentiels/budget-referentiels.controller.ts)
- [src/pages/app/Tresorerie.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Tresorerie.tsx)
- [src/pages/app/ControleInterne.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/ControleInterne.tsx)
- [src/hooks/useTresorerie.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useTresorerie.ts)
- [src/services/api/tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/tresorerie.service.ts)
- [src/types/tresorerie.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/types/tresorerie.types.ts)
- [src/components/tresorerie/TresorerieStats.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/tresorerie/TresorerieStats.tsx)
- [src/components/tresorerie/PrevisionsTresorerie.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/tresorerie/PrevisionsTresorerie.tsx)
- [src/docs/stats-card-pattern.md](/Volumes/mySD1.5/projects/agilys-spark-joy/src/docs/stats-card-pattern.md)
- [src/docs/table-pattern.md](/Volumes/mySD1.5/projects/agilys-spark-joy/src/docs/table-pattern.md)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Implementation Plan

- Etendre la lecture backend de tresorerie avec un read model de supervision fiable et des endpoints d'audit read-only.
- Reutiliser `cash-risk` et la future persistence d'exceptions de `5.3` comme source de verite unique pour les journaux.
- Brancher ces lectures sur `Tresorerie` et `ControleInterne` via `tresorerie.service.ts`, des hooks React Query dedies et les patterns UI listes/stats existants.
- Verrouiller le lot par tests RBAC, scoping, exactitude des agregats et non-regression UX.

### Completion Notes List

- Read model backend implemente pour la supervision avec position courante, projection court terme, exposition projetee, alertes deterministes et compteurs d'exceptions.
- Endpoints read-only ajoutes sous `/tresorerie` pour supervision, journal d'alertes, audit pagine filtre, detail par `exceptionId/correlationId` et preparation d'export audit.
- Integration frontend realisee dans `Tresorerie` (onglet Supervision) et `ControleInterne` (journal read-only + drill-down detail) avec reuse des patterns `ListLayout`, `ListToolbar`, `ListTable`.
- Articulation explicite avec la source de verite de `5.3` (`workflow_exceptions`) sans creation de stockage parallele.
- Qualite validee: `pnpm --dir backend run lint`, `pnpm --dir backend run test`, `pnpm run lint`, plus spec cible `backend/src/tresorerie/tresorerie.service.spec.ts`.
- Test RBAC explicite ajoute sur `TresorerieController` pour verifier les permissions `referentiels:read` et `referentiels:audit:read`.
- Tests frontend Playwright ajoutes pour supervision tresorerie et audit controle interne (filtres, drill-down, message d'acces restreint, navigation clavier).

### File List

- `_bmad-output/implementation-artifacts/5-4-offrir-supervision-tresorerie-et-audit-des-exceptions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/tresorerie/dto/tresorerie.dto.ts`
- `backend/src/tresorerie/tresorerie.controller.ts`
- `backend/src/tresorerie/tresorerie.service.ts`
- `backend/src/tresorerie/tresorerie.service.spec.ts`
- `backend/src/tresorerie/tresorerie.controller.spec.ts`
- `src/types/tresorerie.types.ts`
- `src/services/api/tresorerie.service.ts`
- `src/hooks/useTresorerie.ts`
- `src/pages/app/Tresorerie.tsx`
- `src/pages/app/ControleInterne.tsx`
- `src/components/tresorerie/TresorerieSupervisionPanel.tsx`
- `src/components/tresorerie/TresorerieRiskBadge.tsx`
- `src/components/controle-interne/ExceptionAuditTable.tsx`
- `src/components/controle-interne/ExceptionAuditDetail.tsx`
- `tests/tresorerie-supervision-ui.spec.ts`
- `playwright.tresorerie-supervision.config.ts`

## Senior Developer Review (AI)

### Date

2026-03-07

### Résultat

Approuvé après corrections. Les écarts HIGH/MEDIUM identifiés pendant la revue ont été corrigés dans le même lot.

### Findings traités

1. Endpoint `GET /tresorerie/supervision/alerts` réaligné sur `referentiels:audit:read` pour éviter toute exposition de données d'audit via `referentiels:read`.
2. Filtre `toDate` corrigé pour inclure toute la journée sélectionnée (`created_at < toDate + 1 day`).
3. Exposition des approbateurs complétée côté UI (compteur en table + détail des approbateurs dans le panneau de drill-down).
4. Drill-down rendu actionnable au clavier et au clic simple (accessibilité renforcée).
5. Validation DTO renforcée pour `sourceType` via une liste contrôlée (`engagement|paiement|depense`).

### Vérifications exécutées

- `pnpm --dir backend run test -- tresorerie` ✅
- `pnpm run lint` ✅

### Risques résiduels

- Aucun risque bloquant identifié sur ce lot après corrections.
