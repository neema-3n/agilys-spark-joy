# Story 5.1: Evaluer le risque cash sur transitions critiques

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a systeme de controle,
I want calculer le risque avant transition,
so that les actions dangereuses soient prevenues.

## Acceptance Criteria

1. **Evaluation synchrone du risque sur transition critique**
   - **Given** une creation ou validation d'engagement, un ordonnancement de depense, ou une execution de paiement est demandee
   - **When** le moteur de risque cash s'execute dans le backend
   - **Then** un resultat de controle est calcule avec au minimum un `riskLevel`, un `riskScore`, une decision (`allow`/`block`) et les raisons principales
   - **And** le controle reste scope par `tenant + exercice + transition + entite source`.

2. **Blocage deterministe au-dessus du seuil**
   - **Given** un risque cash superieur au seuil metier configure pour la transition
   - **When** la requete tente de poursuivre la transition
   - **Then** la transition est bloquee avant persistance irreversible
   - **And** une erreur metier actionnable expose la cause principale du blocage
   - **And** aucun effet de bord comptable ou de workflow n'est cree.

3. **Reutilisation des donnees de tresorerie et des agregats existants**
   - **Given** les modules `comptes_tresorerie`, `operations_tresorerie`, `tresorerie`, `previsions`, `engagements` et `paiements` existent deja
   - **When** le moteur de risque calcule l'exposition
   - **Then** il reutilise ces sources existantes sans creer de source de verite parallele
   - **And** les montants sont normalises explicitement avant calcul
   - **And** l'algorithme reste deterministic et idempotent pour une meme entree.

4. **Auditabilite et preparation des stories suivantes**
   - **Given** une decision de risque a ete prise
   - **When** la decision est `allow` ou `block`
   - **Then** un journal exploitable est produit avec identite, horodatage, contexte, correlation et resultat
   - **And** le resultat contient assez d'information pour alimenter la story 5.2 (explication/remediation) et la story 5.3 (workflow d'exception) sans rework structurel.

5. **Performance, securite et non-regression**
   - **Given** que le controle cash devient une regle critique transverse
   - **When** il est integre dans les workflows existants
   - **Then** les guards JWT + policy guard + permissions restent appliques
   - **And** le controle vise `p95 <= 500 ms`
   - **And** la couverture de tests protege les cas nominaux, blocants, cross-tenant et les regressions sur les stories 4.1 a 4.4.

## Tasks / Subtasks

- [x] Revalider le contrat Story 5.1 contre `FR19`, `FR24`, `NFR1`, `NFR8`, `NFR9`, `NFR11`, `NFR24` et `NFR25`, puis expliciter les transitions critiques couvertes par ce premier lot (AC: 1, 2, 4, 5)
- [x] Definir un contrat backend type pour la decision de risque cash (`riskLevel`, `riskScore`, `decision`, `reasons`, `snapshot`) reutilisable par les stories 5.2 et 5.3 (AC: 1, 4)
- [x] Introduire un service NestJS dedie au calcul de risque cash en reutilisant les modules existants plutot qu'en ajoutant une logique dispersee dans chaque service metier (AC: 1, 3, 4)
- [x] Brancher ce service sur les premieres transitions critiques deja disponibles dans le repo:
  - [x] creation/validation d'engagement
  - [x] execution/rejet/reprise de paiement si pertinent
  - [x] point d'extension propre pour l'ordonnancement de depense (AC: 1, 2, 3)
- [x] Reutiliser les donnees existantes de tresorerie, operations et comptes pour calculer une exposition cash sans introduire une nouvelle source de verite ni dependance Supabase (AC: 3, 5)
- [x] Definir la strategie de seuils et de parametrage minimale de ce lot:
  - [x] seuil global par transition ou fallback deterministe
  - [x] conventions de score
  - [x] mapping entre score et decision `allow/block` (AC: 1, 2, 4)
- [x] Produire des erreurs metier actionnables cote backend pour les blocages, en gardant un format facilement exploitable par le front et par la story 5.2 (AC: 2, 4)
- [x] Journaliser chaque controle critique avec identite, transition, entite, seuil, score et resultat en respectant l'audit trail existant (AC: 4, 5)
- [x] Ajouter ou etendre les endpoints/API contracts necessaires sans casser les clients front existants:
  - [x] enforcement directement dans les endpoints existants avec reponse typee; aucun endpoint public de pre-check n'est expose dans ce lot (AC: 1, 2, 4)
- [x] Confirmer qu'aucun alignement frontend supplementaire n'est requis dans ce lot tant que la decision de risque reste backend-only et n'est pas exposee dans l'UI (AC: 1, 2, 4)
- [x] Conserver les hooks React Query existants inchanges, car aucune nouvelle donnee de risque n'est poussee vers le front dans ce lot (AC: 3, 5)
- [x] Ajouter les tests backend obligatoires:
  - [x] calcul nominal sous seuil
  - [x] blocage au-dessus du seuil
  - [x] isolation cross-tenant
  - [x] determinisme du score
  - [x] absence d'effet de bord si blocage
  - [x] protection des transitions existantes (AC: 1, 2, 3, 4, 5)
- [x] Confirmer qu'aucun test frontend additionnel n'est requis dans ce lot, faute d'affichage/pre-check de risque expose cote UI; la non-regression reste couverte backend-first (AC: 2, 4, 5)
- [x] Verifier explicitement qu'aucune nouvelle dependance runtime Supabase n'est introduite et que les patterns pnpm/NestJS/React Query existants sont respectes (AC: 3, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 5, Story 5.1).
- FR directes: `FR19` pour l'evaluation du risque cash sur transitions critiques, avec dependances de suite sur `FR22` a `FR25`.
- NFR prioritaires: `NFR1` (latence des controles critiques), `NFR8` (RBAC/ABAC), `NFR9` (journalisation), `NFR11` (historique non destructif), `NFR24` et `NFR25` (idempotence/determinisme).
- Cette story doit preparer les stories suivantes:
  - `5.2` pour expliquer les blocages et proposer des remediations.
  - `5.3` pour gerer les exceptions avec quorum.
  - `5.4` pour la supervision de tresorerie et l'audit.

### Developer Context Section

- Le repo possede deja les briques metier a reutiliser:
  - backend `backend/src/engagements/*`
  - backend `backend/src/paiements/*`
  - backend `backend/src/operations-tresorerie/*`
  - backend `backend/src/tresorerie/*`
  - backend `backend/src/comptes-tresorerie/*`
  - frontend `src/services/api/*`, `src/hooks/*`, `src/pages/app/*`
- Le bon niveau d'abstraction pour cette story est un service backend transversal, pas une duplication de calcul dans `EngagementsService`, `PaiementsService` et les composants React.
- Le module `tresorerie` existe mais reste simplifie:
  - `backend/src/tresorerie/tresorerie.service.ts` calcule deja des stats/flux/previsions.
  - `backend/src/operations-tresorerie/operations-tresorerie.service.ts` expose les mouvements relies aux comptes et paiements.
  - `backend/src/comptes-tresorerie/comptes-tresorerie.service.ts` expose les soldes actuels des comptes.
- Les workflows de depense sont deja implementes et testes:
  - `reservations` -> `engagements` -> `factures` -> `depenses` -> `paiements`.
- Le moteur de risque doit donc s'inscrire dans ce chainage existant et rester backend-first.

### Technical Requirements

- Backend
  - Centraliser le calcul du risque cash dans un service dedie, injectable par les services metier ou controllers concerns.
  - Definir un contrat explicite de decision:
    - `decision: 'allow' | 'block'`
    - `riskLevel`
    - `riskScore`
    - `reasons: string[]`
    - `snapshot` ou contexte utile pour audit/explanation.
  - Determiner un premier ensemble de transitions critiques couvertes par ce lot:
    - engagement creation/validation
    - execution paiement
    - point d'extension net pour ordonnancement depense.
  - Reutiliser les tables/services existants pour le calcul:
    - `comptes_tresorerie` pour soldes actuels
    - `operations_tresorerie` pour flux relies
    - `paiements` et `depenses` pour decaissements executes/restants
    - `previsions` / `tresorerie` pour contexte de projection si deja disponible.
  - Normaliser explicitement tous les montants avec `Number(...)` avant calcul et conserver un calcul deterministic.
  - Bloquer avant tout side effect irreversible: pas d'ecriture comptable, pas de transition de statut definitive si la decision est `block`.
  - Produire des erreurs metier actionnables cote API, sans details techniques inutiles mais avec signal suffisant pour la story 5.2.
- Frontend
  - Si un pre-check ou une reponse enrichie est exposee, passer exclusivement par `src/services/api/*`.
  - Ne pas recalculer le risque cote UI; le front presente la decision backend et adapte l'experience.
  - Conserver les invalidations React Query existantes, sans multiplication de query keys ad hoc.
- Data / Persistence
  - Eviter une migration schema si le resultat peut etre journalise via les mecanismes existants dans ce lot.
  - Si persistence supplementaire requise pour audit, passer par migration SQL versionnee et rejouable.
  - Aucune nouvelle dependance runtime Supabase n'est autorisee.

### Architecture Compliance

- Garder `JwtAuthGuard` + `AuthorizationPolicyGuard` + `@RequirePermissions` sur tous les endpoints impactes, comme dans:
  - `backend/src/engagements/engagements.controller.ts`
  - `backend/src/paiements/paiements.controller.ts`
  - `backend/src/reservations/reservations.controller.ts`
- Scope strict par `client_id = tenantId` sur toutes les lectures qui alimentent le moteur de risque.
- La logique metier critique doit rester cote NestJS; aucun composant React ne decide s'il faut autoriser la transition.
- Reutiliser `PostgresService` et les patterns SQL deja presents dans les services metier existants.
- Preferer une abstraction partagee du domaine cash risk plutot qu'une duplication dans chaque service existant.
- Le design doit laisser une extension propre pour les exceptions de la story 5.3 sans casser l'API publique.

### Library / Framework Requirements

Versions observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, React Hook Form `7.61.1`, Zod `3.25.76`, Vite `5.4.19`.
- Backend: NestJS `10.4.22`, `pg` `8.19.0`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`.
- Package manager: `pnpm@9.12.0`.

Decision pour cette story:

- Aucun upgrade de dependance n'est requis.
- Le service de risque cash doit utiliser uniquement la stack actuelle.
- Aucun appel direct `@supabase/supabase-js` ne doit etre introduit dans ce lot.

### File Structure Requirements

Points d'extension probables:

- Backend
  - `backend/src/app.module.ts` pour enregistrer un nouveau module si necessaire
  - nouveau domaine probable:
    - `backend/src/cash-risk/` ou `backend/src/controle-risque/`
    - `*.service.ts`
    - `*.controller.ts` si pre-check explicite
    - `dto/*.ts`
    - `*.spec.ts`
  - integrations a brancher potentiellement dans:
    - `backend/src/engagements/engagements.service.ts`
    - `backend/src/engagements/engagements.controller.ts`
    - `backend/src/paiements/paiements.service.ts`
    - `backend/src/tresorerie/tresorerie.service.ts`
    - `backend/src/operations-tresorerie/operations-tresorerie.service.ts`
    - `backend/src/comptes-tresorerie/comptes-tresorerie.service.ts`
    - `backend/src/common/postgres.service.ts`
- Frontend
  - `src/services/api/engagements.service.ts`
  - `src/services/api/paiements.service.ts`
  - `src/hooks/useEngagements.ts`
  - `src/hooks/usePaiements.ts`
  - `src/hooks/useReservations.ts`
  - eventuellement un composant de message/etat de blocage dans les flows app existants.

Regles de structure:

- Ne pas creer une nouvelle page ou un dashboard complet dans cette story; cela appartient plutot a `5.4`.
- Ne pas dupliquer la normalisation des montants dans plusieurs couches.
- Si plusieurs services ont besoin du meme pre-check, extraire une API backend partagee plutot qu'un copier-coller.

### Testing Requirements

1. Backend (obligatoire)
   - risque sous seuil -> transition autorisee
   - risque au-dessus du seuil -> transition bloquee
   - blocage sans side effect irreversible
   - calcul deterministic sur memes entrees
   - refus cross-tenant
   - respect des guards/permissions sur tout endpoint ajoute
   - non-regression des stories 4.1 a 4.4 sur engagements/paiements.

2. Frontend
   - si exposition UI: rendu du message de blocage actionnable
   - non-regression des hooks `useEngagements`, `usePaiements`, `useReservations`
   - invalidation/cache coherent apres mutation autorisee ou bloquee.

3. Qualite transversale
   - `pnpm --dir backend run lint`
   - `pnpm --dir backend run test`
   - `pnpm run lint`
   - tests cibles sur les zones impactees
   - verification explicite de l'absence de nouvelle dependance runtime Supabase.

### Previous Story Intelligence

Lecons des stories precedentes:

- Story `3.4` a confirme le pattern "backend source de verite + front en presentation", avec DTO stricts et agregrats calcules cote NestJS.
- Story `4.4` a confirme que:
  - les transitions critiques doivent etre bloquees avant side effects
  - les erreurs metier doivent rester actionnables
  - les invalidations React Query doivent couvrir les domaines relies
  - les tests cross-tenant et de workflow sont obligatoires.
- `EngagementsService` et `PaiementsService` montrent deja les patterns a reutiliser:
  - scoping `client_id`
  - normalisation numerique
  - guards/perms sur les controllers
  - tests unitaires orientes workflow.

### Git Intelligence Summary

Observations sur les commits recents:

- Le repo maintient une discipline de story context detaille + synchronisation `sprint-status.yaml`.
- Les evolutions recentes ont privilegie le durcissement des workflows metiers plutot que de grands refactors transverses.
- Cette story doit suivre la meme ligne:
  - ajouter un controle metier precis
  - brancher aux services existants
  - fermer par tests
  - ne pas lancer une refonte large de la tresorerie.

### Latest Tech Information

- Les versions lockees du repository couvrent les besoins de cette story.
- Aucun changement de version ou de framework n'est necessaire pour implementer le moteur de risque cash.
- La priorite est la coherence metier, le determinisme des calculs et l'integration propre dans les workflows existants.

### Project Structure Notes

- Le projet est en migration vers un backend NestJS centralisant la logique metier; cette story doit renforcer cette trajectoire.
- Le domaine risque cash n'existe pas encore comme module dedie, ce qui justifie la creation d'une abstraction backend partagee plutot qu'un ajout local dans un seul service.
- Le module `tresorerie` actuel est encore simplifie et ne doit pas etre pris comme source suffisante a lui seul; le moteur devra composer plusieurs sources deja presentes.
- Les hooks front suivent deja des query keys par domaine:
  - `['engagements', exerciceId, clientId]`
  - `['reservations', exerciceId, clientId]`
  - `['paiements', exerciceId, clientId]`
  - `['tresorerie-*', clientId, exerciceId]`
  Le nouveau flux doit s'y integrer proprement.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [4-4-executer-paiement-et-gestion-des-cas-partiels-rejets.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/4-4-executer-paiement-et-gestion-des-cas-partiels-rejets.md)
- [3-4-produire-previsions-et-ecarts-prevision-execution.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/3-4-produire-previsions-et-ecarts-prevision-execution.md)
- [backend/src/app.module.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/app.module.ts)
- [backend/src/common/postgres.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/common/postgres.service.ts)
- [backend/src/engagements/engagements.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.controller.ts)
- [backend/src/engagements/engagements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.service.ts)
- [backend/src/engagements/engagements.service.spec.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.service.spec.ts)
- [backend/src/paiements/paiements.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/paiements/paiements.controller.ts)
- [backend/src/paiements/paiements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/paiements/paiements.service.ts)
- [backend/src/paiements/paiements.service.spec.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/paiements/paiements.service.spec.ts)
- [backend/src/tresorerie/tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.service.ts)
- [backend/src/operations-tresorerie/operations-tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/operations-tresorerie/operations-tresorerie.service.ts)
- [backend/src/comptes-tresorerie/comptes-tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/comptes-tresorerie/comptes-tresorerie.service.ts)
- [src/services/api/engagements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/engagements.service.ts)
- [src/services/api/paiements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/paiements.service.ts)
- [src/hooks/useEngagements.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useEngagements.ts)
- [src/hooks/usePaiements.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/usePaiements.ts)
- [src/hooks/useReservations.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useReservations.ts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Implementation Plan

- Creer un module backend partage `cash-risk` pour centraliser le contrat de decision et la logique de calcul.
- Reutiliser `comptes_tresorerie`, `operations_tresorerie`, `depenses` et `engagements` via `PostgresService` pour produire un score deterministic scope par tenant/exercice/transition.
- Injecter ce service dans `EngagementsService` et `PaiementsService` pour bloquer avant persistance irreversible et journaliser chaque decision.
- Verrouiller le lot avec des tests unitaires cibles sur le moteur et sur les points d'integration critiques.

### Completion Notes List

- Story 5.1 cible le premier lot du moteur de risque cash transverse, branche sur les workflows critiques deja existants.
- Le document force la reutilisation des modules `engagements`, `paiements`, `tresorerie`, `operations_tresorerie` et `comptes_tresorerie` au lieu d'une nouvelle source de verite.
- Les garde-fous d'architecture imposent une evaluation backend-only, scopee tenant/exercice, deterministe et journalisee.
- Les stories 5.2 a 5.4 sont preparees via un contrat de decision de risque reutilisable, sans forcer encore le workflow d'exception ni le dashboard complet.
- Un nouveau module `backend/src/cash-risk/*` expose le contrat `riskLevel/riskScore/decision/reasons/snapshot`, une exception metier typee et un point d'extension pour l'ordonnancement de depense.
- Les transitions `engagement:create`, `engagement:validate`, `paiement:execute` et `paiement:reprendre` sont maintenant evaluees avant side effects irreversibles dans les services NestJS existants.
- Le calcul reutilise `comptes_tresorerie`, `depenses`, `engagements` et `operations_tresorerie` sans nouvelle source de verite ni dependance runtime Supabase, avec un scoping explicite par entite source.
- L'audit embarque maintenant le threshold et le snapshot complet pour preparer les stories 5.2 et 5.3 sans reconstituer le contexte a posteriori.
- Aucun flux frontend de pre-check n'est expose dans ce lot; les taches UI associees ont ete reformulees pour refleter ce perimetre backend-only.
- Un CLI local `pnpm --dir backend run benchmark:cash-risk -- --tenant-id <tenant> --exercice-id <exercice> [--entity-id ...]` permet maintenant de mesurer un `p95` reel contre PostgreSQL local pour fermer le reliquat perf hors test synthetique.
- Validation executee: `pnpm --dir backend run lint` OK, `jest` cible sur `cash-risk`, `engagements` et `paiements` OK, avec garde de performance synthetique `p95 <= 500 ms` sur le moteur, non-regression backend elargie sur `reservations`, `bons-commande`, `factures`, `depenses`, `engagements`, `paiements` OK, et benchmark PostgreSQL local execute le 2026-03-07 sur `client-1` / `2ff05a1f-df4c-4c0d-9689-63bd6a392063` (`p50=1.31 ms`, `p95=4.6 ms`, `max=56.43 ms`). La suite backend complete reste partiellement bloquee en sandbox sur les tests e2e qui ouvrent un port (`listen EPERM 0.0.0.0`).

### File List

- `_bmad-output/implementation-artifacts/5-1-evaluer-le-risque-cash-sur-transitions-critiques.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/app.module.ts`
- `backend/src/cash-risk/cash-risk-blocked.exception.ts`
- `backend/src/cash-risk/cash-risk.module.ts`
- `backend/src/cash-risk/cash-risk.service.spec.ts`
- `backend/src/cash-risk/cash-risk.service.ts`
- `backend/src/cash-risk/cash-risk.types.ts`
- `backend/src/engagements/engagements.module.ts`
- `backend/src/engagements/engagements.service.spec.ts`
- `backend/src/engagements/engagements.service.ts`
- `backend/src/paiements/paiements.module.ts`
- `backend/src/paiements/paiements.service.spec.ts`
- `backend/src/paiements/paiements.service.ts`

## Change Log

- 2026-03-06: Ajout du moteur transverse `cash-risk`, branchement sur les transitions critiques engagements/paiements, journalisation des decisions et tests unitaires de verrouillage.
- 2026-03-07: Correction post-review du scoping par entite source, enrichissement de l'audit et alignement des taches story avec le perimetre backend reel.
- 2026-03-07: Validation backend elargie des workflows 4.1 a 4.4 via les suites `reservations`, `bons-commande`, `factures`, `depenses`, `engagements`, `paiements`.
- 2026-03-07: Ajout d'une garde de performance synthetique `p95 <= 500 ms` sur `CashRiskService` avec queries mockees pour rendre la contrainte verifiable en test.
- 2026-03-07: Ajout d'un CLI `benchmark:cash-risk` pour mesurer un `p95` reel du moteur sur base locale PostgreSQL.
- 2026-03-07: Benchmark reel execute sur PostgreSQL local (`client-1` / `2ff05a1f-df4c-4c0d-9689-63bd6a392063`) avec `p95=4.6 ms`, seuil respecte.

## Senior Developer Review (AI)

- 2026-03-07: Revue adversariale executee sur le lot 5.1.
- Correctifs appliques:
  - scoping du moteur de risque par entite source (`ligne_budgetaire` pour les engagements, `depense` pour les paiements/ordonnancements),
  - correlation exploitable meme sans `sourceId` persistant,
  - audit enrichi avec `threshold`, `projectedExposure`, `projectedGap` et `snapshot`,
  - taches frontend/story reformulees pour correspondre au perimetre backend-only effectivement livre.
- Validation finale:
  - benchmark reel execute avec succes sous le seuil `p95 <= 500 ms`,
  - story promue a `done` et prete pour la suite Epic 5.
