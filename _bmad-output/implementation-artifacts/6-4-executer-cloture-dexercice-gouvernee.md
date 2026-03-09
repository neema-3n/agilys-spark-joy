# Story 6.4: Executer cloture d'exercice gouvernee

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a responsable cloture,
I want cloturer une periode avec checklist,
so that la bascule N vers N+1 soit securisee.

## Acceptance Criteria

1. **Workflow de cloture gouverne avec etats explicites de periode**
   - **Given** un exercice est actuellement exploitable
   - **When** un utilisateur habilite lance le workflow de cloture
   - **Then** le systeme gere explicitement les etats de periode `ouverte`, `en_revue`, `fermee`
   - **And** aucune transition directe `ouverte -> fermee` ou reouverture hors workflow gouverne n'est autorisee.

2. **Checklist pre-cloture bloquante et auditable**
   - **Given** un exercice passe en pre-cloture
   - **When** le moteur calcule les prerequis de cloture
   - **Then** il bloque la validation finale tant que des ecarts de rapprochement, des exceptions ouvertes, des ecritures comptables incoherentes ou des controles requis restent en anomalie
   - **And** chaque item de checklist expose un statut, un detail actionnable et une preuve consultable.

3. **Verrouillage effectif des ecritures et mutations sur periode fermee**
   - **Given** un exercice est marque `fermee`
   - **When** un endpoint metier tente de creer, modifier, annuler ou generer une operation budgetaire, comptable ou tresorerie sur cette periode
   - **Then** le backend refuse la mutation avec une erreur metier explicite
   - **And** seuls les chemins de reouverture gouvernee ou de consultation restent autorises et traces.

4. **Ouverture N+1 et reprise controlee des soldes et referentiels**
   - **Given** la cloture finale d'un exercice est validee
   - **When** le workflow de bascule N -> N+1 est execute
   - **Then** le systeme prepare l'exercice suivant avec reprise controlee des soldes et referentiels necessaires
   - **And** la creation ou la liaison de N+1 reste deterministe, idempotente et strictement scopee par tenant.

5. **Journal de cloture, securite et preparation du dossier de cloture**
   - **Given** une cloture ou une reouverture gouvernee est executee
   - **When** un auditeur ou un responsable consulte l'historique
   - **Then** le systeme conserve auteur, horodatage, decision, etat precedent/suivant, checklist validee et references de preuves
   - **And** les artefacts produits preparent sans duplication la story `6.6` sur le dossier de cloture et reconciliation de migration.

## Tasks / Subtasks

- [ ] Revalider le contrat story 6.4 contre `FR50`, `FR54`, `FR55`, `FR56`, `FR57`, `FR58`, `FR59`, `NFR8`, `NFR9`, `NFR29`, `NFR32`, `NFR33`, `NFR34`, `NFR35`, `NFR36` puis formaliser les invariants de cloture non negociables (AC: 1, 2, 3, 4, 5)
- [ ] Cartographier et reutiliser les briques existantes avant toute nouvelle couche:
  - [ ] `backend/src/budget-referentiels/*`
  - [ ] `backend/src/ecritures-comptables/*`
  - [ ] `backend/src/regles-comptables/*`
  - [ ] `backend/src/rapprochements-bancaires/*`
  - [ ] `backend/src/operations-tresorerie/*`
  - [ ] `backend/src/workflow-exceptions/*`
  - [ ] `src/contexts/ExerciceContext.tsx`
  - [ ] `src/components/parametres/ExercicesManager.tsx`
  - [ ] `src/services/api/exercices.service.ts`
  - [ ] `src/services/api/rapprochements-bancaires.service.ts` (AC: 1, 2, 3, 4, 5)
- [ ] Introduire une orchestration backend dediee de cloture d'exercice plutot que disperser la logique dans le CRUD des exercices:
  - [ ] facade/service de workflow pour `ouverte -> en_revue -> fermee`
  - [ ] sous-composants ou helpers pour checklist, verrouillage et bascule N+1
  - [ ] reutilisation des services comptables/tresorerie existants pour les controles sources (AC: 1, 2, 3, 4, 5)
- [ ] Etendre le modele de periode/exercice pour supporter les etats requis par le PRD:
  - [ ] schema SQL versionne pour remplacer ou etendre `ouvert | cloture` vers `ouverte | en_revue | fermee`
  - [ ] DTO/types backend et frontend alignes sans litteraux dupliques
  - [ ] compatibilite de lecture avec l'etat actuel du repo et migration des donnees existantes (AC: 1, 3, 4, 5)
- [ ] Implementer une checklist pre-cloture bloquante, calculee cote backend:
  - [ ] verifier les rapprochements bancaires non valides (`rapprochements_bancaires.statut != 'valide'`)
  - [ ] verifier les exceptions de workflow encore ouvertes ou expirant sans resolution
  - [ ] verifier les incoherences sur ecritures/comptabilisation et les mutations critiques encore pendantes
  - [ ] produire une structure d'evidence consommable par UI et audit trail (AC: 2, 5)
- [ ] Verrouiller les mutations sur periode `en_revue` et `fermee` au bon niveau:
  - [ ] guards/checks backend centralises plutot que validations eparses dans chaque composant front
  - [ ] protection des modules budgetaires, comptables, tresorerie et rapprochement bancaire
  - [ ] messages utilisateur actionnables expliquant pourquoi la mutation est refusee et quel workflow utiliser (AC: 1, 3, 5)
- [ ] Concevoir la reouverture gouvernee et les exceptions tardives sans contourner la piste d'audit:
  - [ ] definir le contrat minimal de reouverture approuvee
  - [ ] tracer motif, approbateur, impact et regularisation attendue
  - [ ] ne pas exposer de simple toggle de statut modifiable librement dans l'UI (AC: 1, 3, 5)
- [ ] Implementer la preparation N+1 sans reintroduire une seconde source de verite:
  - [ ] reprendre de maniere controlee les soldes et referentiels pertinents
  - [ ] garder la generation idempotente si le workflow est rejoue
  - [ ] preparer les interfaces necessaires aux stories `6.5` et `6.6` sans les imploser dans ce lot (AC: 4, 5)
- [ ] Aligner les surfaces frontend existantes:
  - [ ] `ExerciceContext` pour selection/exercice courant et gestion des nouveaux statuts
  - [ ] `ExercicesManager` pour lancer pre-cloture, cloture et consulter la checklist
  - [ ] vues d'etat lisibles pour lecture seule, blocages et preuves de cloture (AC: 1, 2, 3, 4, 5)
- [ ] Ajouter les tests backend obligatoires:
  - [ ] refus d'une cloture avec checklist incomplète
  - [ ] transition `ouverte -> en_revue -> fermee` seulement via le workflow autorise
  - [ ] refus de mutation sur periode `fermee`
  - [ ] reouverture gouvernee tracee
  - [ ] creation ou liaison idempotente de N+1
  - [ ] refus cross-tenant / exercice incoherent (AC: 1, 2, 3, 4, 5)
- [ ] Ajouter les tests frontend / contrat cibles:
  - [ ] affichage des nouveaux statuts d'exercice
  - [ ] restitution lisible de la checklist et des blocages
  - [ ] messages de verrouillage sur tentative d'action en periode non modifiable
  - [ ] non-regression du choix d'exercice courant et des vues de parametres existantes (AC: 1, 2, 3, 5)
- [ ] Confirmer explicitement qu'aucune nouvelle dependance runtime Supabase n'est introduite et que le lot reste conforme au workflow `pnpm` + NestJS/PostgreSQL + client API unifie (AC: 3, 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.4).
- FR directes:
  - `FR50`: controles pre-cloture, regularisations, verrouillage periode, reouverture gouvernee
  - `FR54`: etats de periode `ouverte`, `en revue`, `fermee`
  - `FR55`: checklist obligatoire de pre-cloture
  - `FR56`: verrouillage d'une periode cloturee
  - `FR57`: gestion des exceptions tardives par workflow dedie
  - `FR58`: dossier de cloture d'exercice avec preuves et decisions
  - `FR59`: ouverture N+1 avec reprise controlee
- NFR prioritaires:
  - `NFR29`: journal de cloture verifiable et inalterable
  - `NFR32`: execution du workflow complet dans la fenetre operationnelle cible
  - `NFR33`: zero ecriture hors workflow sur periode fermee
  - `NFR34`, `NFR35`, `NFR36`: dossier genere rapidement, exceptions tardives tracees et cohérence N -> N+1 verifiable.

### Developer Context Section

- Le repo ne dispose pas encore d'un vrai workflow de cloture d'exercice:
  - le modele d'exercice actuel est limite a `ouvert | cloture` dans `backend/src/budget-referentiels/budget-referentiels.types.ts`, `src/types/index.ts`, `src/services/api/exercices.service.ts` et `src/components/parametres/ExercicesManager.tsx`;
  - aucune trace exploitable de statut `en_revue`, de reouverture gouvernee ou de checklist pre-cloture n'existe dans le code courant;
  - la cloture actuelle cote front est un simple `PATCH` du statut via `exercicesService.cloturer(id)`, insuffisant pour les exigences Epic 6.
- Les briques a reutiliser pour la checklist existent deja:
  - `backend/src/ecritures-comptables/ecritures-comptables.service.ts` pour les ecritures et le journal;
  - `backend/src/rapprochements-bancaires/rapprochements-bancaires.service.ts` pour les rapprochements et leur statut `en_cours | valide | annule`;
  - `backend/src/workflow-exceptions/workflow-exceptions.service.ts` pour les exceptions encore soumises/consommees/expirees;
  - `backend/src/operations-tresorerie/*` et `backend/src/regles-comptables/*` pour les flux et preconditions comptables connexes.
- Les stories precedentes d'Epic 6 imposent deja des guardrails importants:
  - `6.1` a versionne les regles comptables et impose le backend comme source de verite;
  - `6.2` a centralise la generation nominale des ecritures et l'idempotence;
  - `6.3` a cadre les contre-passations auditables sans suppression destructive.
- Consequence directe pour `6.4`:
  - la cloture doit s'appuyer sur ces modules, pas inventer un second systeme d'etat;
  - le verrouillage de periode doit etre backend-first et transversal;
  - les preuves/journaux prepares ici devront etre reutilisables par `6.6` plutot que regeneres ailleurs.

### Technical Requirements

- Backend
  - Introduire une orchestration dediee de cloture d'exercice, idealement dans un module/service focalise, plutot qu'etendre le simple CRUD des exercices avec des `if` supplementaires.
  - Centraliser le check "periode modifiable ou non" dans une abstraction reutilisable par les services budgetaires/comptables/tresorerie, afin d'eviter dix validations divergentes.
  - Produire une checklist structuree et typée, avec statuts, raisons de blocage, metadonnees de preuve et liens vers les entites source.
  - Garantir que la bascule N+1 soit idempotente si le workflow est rejoue apres incident.
- Data / SQL
  - Une migration SQL versionnee sera necessaire pour faire evoluer `public.exercices` au-dela de `ouvert | cloture`.
  - Evaluer si un journal de cloture dedie ou des colonnes d'audit supplementaires sont necessaires; si oui, passer par migration rejouable plutot que stockage implicite.
  - Les controles de checklist doivent s'appuyer sur les tables existantes (`ecritures_comptables`, `rapprochements_bancaires`, `operations_tresorerie`, `workflow_exceptions`) avant toute nouvelle table.
- Frontend
  - Le front reste consommateur du workflow backend; aucune logique locale de validation de cloture ne doit devenir source de verite.
  - Les nouveaux statuts d'exercice doivent etre propages dans `ExerciceContext`, types et composants de gestion sans multiplier les litteraux.
  - Les messages de blocage doivent rester clairs, actionnables et compatibles avec les exigences UX/NFR.

### Architecture Compliance

- Respecter `JwtAuthGuard`, `AuthorizationPolicyGuard` et `TenantExerciceScopeGuard` deja utilises sur `budget-referentiels`.
- Permissions actuelles disponibles:
  - `referentiels:read`
  - `referentiels:write`
  - `referentiels:audit:read`
- Si une permission plus fine est necessaire pour la cloture/reouverture gouvernee, l'introduire explicitement dans le systeme d'autorisation existant plutot que la coder en dur dans un composant.
- Ne pas faire porter la cloture d'exercice au frontend ni a un runtime Supabase/Edge Function additionnel.
- Preserver la trajectoire du repo: NestJS + PostgreSQL + client API unifie, aucune nouvelle dependance metier a `@supabase/supabase-js`.

### Library / Framework Requirements

Versions observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, React Hook Form `7.61.1`, Zod `3.25.76`.
- Backend: NestJS `10.4.22`, `pg` `8.19.0`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`.
- Package manager: `pnpm@9.12.0`.

Decision pour cette story:

- Aucun upgrade de dependances n'est requis.
- Le risque ici est structurel et fonctionnel: etat de periode incomplet, absence de workflow de cloture et verrouillage transversal insuffisant.

### File Structure Requirements

Points d'extension prioritaires:

- Backend
  - `backend/src/budget-referentiels/*`
  - nouveau service/module de cloture d'exercice si necessaire, branche sur les patterns NestJS existants
  - `backend/src/ecritures-comptables/*`
  - `backend/src/rapprochements-bancaires/*`
  - `backend/src/operations-tresorerie/*`
  - `backend/src/workflow-exceptions/*`
  - `backend/src/auth/*` si le systeme de permissions doit etre etendu
- Database / migrations
  - `supabase/migrations/20251018194919_e09d2a96-4f3d-40e5-b4ff-09e739e69475.sql`
  - `supabase/migrations/20251123151034_35fe2c6e-9a5b-4823-8eae-62ac5439f359.sql`
  - `supabase/migrations/20251124174551_cb40a0cd-475e-41a0-87a7-fc7787818303.sql`
  - nouvelle migration versionnee pour les etats de periode, journaux et contraintes de verrouillage si requis
- Frontend
  - `src/contexts/ExerciceContext.tsx`
  - `src/services/api/exercices.service.ts`
  - `src/components/parametres/ExercicesManager.tsx`
  - `src/types/index.ts`
  - toute vue lisant `currentExercice` ou affichant le statut de periode

Regles de structure:

- preferer une seule orchestration de cloture d'exercice plutot que des patches disperses dans les services de domaine;
- factoriser le garde-fou "periode verrouillee" pour eviter les regressions futures sur `6.5`, `6.6`, `9.*` et `10.*`;
- garder le frontend centré sur la consultation et le declenchement du workflow, jamais sur l'evaluation des controles comptables.

### Testing Requirements

1. Backend (obligatoire)
   - workflow nominal `ouverte -> en_revue -> fermee`;
   - refus de cloture si checklist incomplete;
   - refus de mutation sur periode fermee;
   - reouverture gouvernee avec piste d'audit;
   - creation ou rattachement idempotent de N+1;
   - refus cross-tenant / exercice incoherent.

2. Frontend / contrat (obligatoire)
   - restitution des nouveaux statuts d'exercice;
   - affichage de la checklist et des blocages;
   - erreurs metier actionnables lors des refus de mutation;
   - non-regression de la selection d'exercice courant dans `ExerciceContext`.

3. Qualite transversale
   - `pnpm --dir backend run lint`
   - `pnpm --dir backend run test`
   - `pnpm run lint`
   - tests cibles sur les modules impactes de cloture, ecritures et rapprochements.

### Previous Story Intelligence

- `6.1` a etabli que les regles comptables et leur gouvernance vivent cote backend, avec historique non destructif et versionning explicite.
- `6.2` a impose une generation d'ecritures centralisee, idempotente et testee, base indispensable pour verifier la cloture comptable.
- `6.3` a cadre les corrections et contre-passations auditables; la cloture ne doit donc pas supposer de suppression ou reparation destructive.
- Consigne pour `6.4`:
  - verrouiller les periodes sans casser les mecanismes de correction gouvernee;
  - preparer `6.5` (rapprochement bancaire auto + manuel) et `6.6` (dossier de cloture) au lieu de les contourner;
  - utiliser les services existants comme sources de signal pour la checklist de cloture.

### Git Intelligence Summary

- Commits recents observes:
  - `81c0705 Document disabled self-service sign`
  - `8f7130b Follow dev-story workflow steps`
  - `4d56bb3 Summarize code review request`
  - `5f7a90b Generate code review title`
  - `5ee1c9e Execute dev story workflow`
- Aucun commit recent n'indique qu'un workflow de cloture d'exercice est deja en cours d'introduction.
- Le document doit donc guider une implementation complete et prudente a partir des seams actuels du repo.

### Latest Tech Information

- Aucune recherche web technique additionnelle n'est necessaire pour cette story.
- Les versions verrouillees du repo sont suffisantes; le probleme critique est l'absence de workflow et de contrat de periode, pas l'obsolescence du framework.

### Project Structure Notes

- Aucun `architecture.md` exploitable n'a ete trouve dans `/_bmad-output/planning-artifacts`; l'architecture de reference provient donc de `project-context.md`, du code reel et des stories `6.1` a `6.3`.
- Le projet est encore hybride:
  - frontend Vite/React
  - backend NestJS partiel
  - migrations SQL et heritage Supabase en cours de retrait
- Le principal ecart fonctionnel pour cette story est net:
  - le domaine exercice ne connait aujourd'hui que `ouvert | cloture`;
  - aucune checklist pre-cloture ou reouverture gouvernee n'existe;
  - plusieurs modules (budget, journal, tresorerie) peuvent encore muter un exercice sans garde-fou global de periode.
- Cette story doit donc poser le cadre transversal de periode avant les futures stories de rapprochement, reporting et dossier de cloture.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [6-1-versionner-plan-comptable-et-mapping-ecritures.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-1-versionner-plan-comptable-et-mapping-ecritures.md)
- [6-2-generer-ecritures-en-double-entree-idempotentes.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-2-generer-ecritures-en-double-entree-idempotentes.md)
- [6-3-gerer-corrections-et-contre-passations-auditables.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-3-gerer-corrections-et-contre-passations-auditables.md)
- [budget-referentiels.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/budget-referentiels/budget-referentiels.service.ts)
- [budget-referentiels.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/budget-referentiels/budget-referentiels.controller.ts)
- [budget-referentiels.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/budget-referentiels/budget-referentiels.types.ts)
- [ecritures-comptables.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/ecritures-comptables/ecritures-comptables.service.ts)
- [rapprochements-bancaires.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/rapprochements-bancaires/rapprochements-bancaires.service.ts)
- [workflow-exceptions.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/workflow-exceptions/workflow-exceptions.service.ts)
- [authorization.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization.types.ts)
- [ExerciceContext.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/contexts/ExerciceContext.tsx)
- [exercices.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/exercices.service.ts)
- [ExercicesManager.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/parametres/ExercicesManager.tsx)
- [AGENTS-BUSINESS.md](/Volumes/mySD1.5/projects/agilys-spark-joy/src/AGENTS-BUSINESS.md)
- [20251018194919_e09d2a96-4f3d-40e5-b4ff-09e739e69475.sql](/Volumes/mySD1.5/projects/agilys-spark-joy/supabase/migrations/20251018194919_e09d2a96-4f3d-40e5-b4ff-09e739e69475.sql)
- [20251123151034_35fe2c6e-9a5b-4823-8eae-62ac5439f359.sql](/Volumes/mySD1.5/projects/agilys-spark-joy/supabase/migrations/20251123151034_35fe2c6e-9a5b-4823-8eae-62ac5439f359.sql)
- [20251124174551_cb40a0cd-475e-41a0-87a7-fc7787818303.sql](/Volumes/mySD1.5/projects/agilys-spark-joy/supabase/migrations/20251124174551_cb40a0cd-475e-41a0-87a7-fc7787818303.sql)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Implementation plan executee:
  - ajout d'un module NestJS `exercice-cloture` pour piloter `ouverte -> en_revue -> fermee`, calculer une checklist bloquante, journaliser les transitions et preparer N+1 de facon idempotente;
  - synchronisation des exercices du store `budget-referentiels` vers `public.exercices` au meme `id` pour rendre le verrouillage PostgreSQL effectif sur les modules transactionnels;
  - branchement du verrou de periode sur `bons-commande`, `factures`, `depenses`, `operations-tresorerie`, `rapprochements-bancaires` et la generation d'ecritures.
- Surface frontend alignee:
  - types d'exercice canoniques `ouverte | en_revue | fermee`;
  - suppression du changement libre de statut dans `ExerciceDialog`;
  - ajout dans `ExercicesManager` des actions voir checklist, pre-cloturer, cloturer et reouvrir.
- Validations executees:
  - `pnpm --dir backend run lint`
  - `pnpm --dir backend exec jest --runInBand src/exercice-cloture/exercice-cloture.service.spec.ts src/factures/factures.service.spec.ts`
  - `pnpm exec eslint src/components/parametres/ExerciceDialog.tsx src/components/parametres/ExercicesManager.tsx src/contexts/ExerciceContext.tsx src/services/api/exercices.service.ts src/types/index.ts`
- Hardening post-review execute apres revue adversariale:
  - suppression du contournement par changement libre de `statut` dans le CRUD des exercices et reservation des transitions d'etat au workflow gouverne;
  - extension du verrou de periode aux mutations `budget-referentiels`, `bons-commande`, `factures`, `depenses`, `reservations`, `engagements` et `paiements`;
  - suppression du fail-open quand la ligne `public.exercices` est absente, avec resynchronisation defensive puis blocage si l'exercice n'est pas `ouverte`;
  - retrait du chemin de suppression d'exercice cote UI et alignement du contrat frontend associe.
- Validation finale du lot:
  - `pnpm --dir backend exec jest --runInBand src/reservations/reservations.service.spec.ts src/engagements/engagements.service.spec.ts src/paiements/paiements.service.spec.ts src/exercice-cloture/exercice-cloture.service.spec.ts src/budget-referentiels/budget-referentiels.service.spec.ts`
  - `pnpm --dir backend run test`
  - aucune nouvelle dependance runtime ajoutee; lot conserve sur le socle `pnpm` + NestJS/PostgreSQL + client API unifie.

### File List

- `_bmad-output/implementation-artifacts/6-4-executer-cloture-dexercice-gouvernee.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/app.module.ts`
- `backend/src/bons-commande/bons-commande.module.ts`
- `backend/src/bons-commande/bons-commande.service.ts`
- `backend/src/budget-referentiels/budget-referentiels.module.ts`
- `backend/src/budget-referentiels/budget-referentiels.types.ts`
- `backend/src/budget-referentiels/dto/referentiels.dto.ts`
- `backend/src/depenses/depenses.module.ts`
- `backend/src/depenses/depenses.service.ts`
- `backend/src/ecritures-comptables/ecritures-comptables.module.ts`
- `backend/src/ecritures-comptables/ecritures-comptables.service.ts`
- `backend/src/exercice-cloture/dto/exercice-cloture.dto.ts`
- `backend/src/exercice-cloture/exercice-cloture.controller.ts`
- `backend/src/exercice-cloture/exercice-cloture.module.ts`
- `backend/src/exercice-cloture/exercice-cloture.service.spec.ts`
- `backend/src/exercice-cloture/exercice-cloture.service.ts`
- `backend/src/exercice-cloture/exercice-cloture.types.ts`
- `backend/src/factures/factures.module.ts`
- `backend/src/factures/factures.service.ts`
- `backend/src/operations-tresorerie/operations-tresorerie.module.ts`
- `backend/src/operations-tresorerie/operations-tresorerie.service.ts`
- `backend/src/rapprochements-bancaires/rapprochements-bancaires.module.ts`
- `backend/src/rapprochements-bancaires/rapprochements-bancaires.service.ts`
- `src/components/parametres/ExerciceDialog.tsx`
- `src/components/parametres/ExercicesManager.tsx`
- `src/contexts/ExerciceContext.tsx`
- `src/services/api/exercices.service.ts`
- `src/types/index.ts`
- `supabase/migrations/20260308120000_story_6_4_exercice_cloture.sql`

## Change Log

- 2026-03-08: Creation de la story context 6.4 avec cadrage complet du workflow de cloture, de la checklist pre-cloture, du verrouillage des periodes et de la preparation N+1.
- 2026-03-08: Implementation initiale du workflow de cloture gouvernee, du verrouillage transversal des mutations et de l'alignement frontend associe. Statut conserve en `in-progress` en attendant la validation finale du lot.
- 2026-03-08: Hardening post-review du verrou de cloture, suppression des chemins de contournement, extension des garde-fous a l'ensemble des services transactionnels cibles et validation backend complete. Story passee en `done`.
