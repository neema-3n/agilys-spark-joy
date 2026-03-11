---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
inputDocuments:
  - /Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md
  - /Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md
  - /Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/migration-batch-runbook.md
  - /Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/migration-data-mapping.md
  - /Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/migration-data-strategy.md
  - /Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/migration-parity-matrix.md
  - /Volumes/mySD1.5/projects/agilys-spark-joy/docs/supabase-auth-decommission-checklist.md
  - /Volumes/mySD1.5/projects/agilys-spark-joy/docs/runbooks/local-dev-command-and-ports.md
  - /Volumes/mySD1.5/projects/agilys-spark-joy/docs/runbooks/postgresql-local-docker.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-11'
project_name: 'agilys-spark-joy'
user_name: 'Max'
date: '2026-03-11'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Le produit couvre une plateforme de gestion budgetaire publique de bout en bout avec trois grandes surfaces: vitrine publique, operations budgetaires/depense, et pilotage/comptabilite/conformite. Architectuellement, cela implique plusieurs sous-domaines fortement relies: auth et gouvernance d'acces, budget/previsions, chaine de depense, controle cash, comptabilite, reporting, integration legacy, et migration/cutover. Le backlog confirme aussi une migration progressive hors Supabase vers une cible Next.js + NestJS + PostgreSQL, avec coexistence temporaire de composants transitoires.

**Non-Functional Requirements:**
Les NFR dominants sont la disponibilite, la securite, la tracabilite d'audit, la conformite reglementaire, l'idempotence des traitements, l'isolation multi-tenant, et la performance sur les parcours critiques. Ces exigences imposent une architecture de deploiement et d'exploitation fortement gouvernee, avec separation nette des environnements, gestion stricte des secrets, migrations versionnees, observabilite, et procedures de rollback testees.

**Scale & Complexity:**
Le projet est de niveau enterprise. Il combine un domaine metier complexe, des integrations legacy, des contraintes de souverainete et de conformite, une migration de stack en cours, ainsi qu'un nombre eleve de composants applicatifs et de flux critiques.

- Primary domain: full-stack web platform avec backend metier, migration de donnees et exploitation multi-environnements
- Complexity level: enterprise
- Estimated architectural components: 12 a 16 composants majeurs (frontend public, frontend app, auth, API metier, persistance PostgreSQL, moteur de migration, reporting, observabilite, CI/CD, gestion des secrets, integration legacy, audit/export, environnements non-production, production, rollback/hypercare)

### Technical Constraints & Dependencies

- Frontend principal en Next.js 15 actuellement, avec cible d'architecture en Next.js 16
- Backend separe en NestJS
- PostgreSQL comme cible de persistance
- Scripts de migration/seed/reset deja presents dans le repo
- Supabase encore present partiellement, avec decommission planifie
- Store JSON transitoire encore utilise sur certains modules budget
- Multi-tenant et RBAC/ABAC requis
- Contraintes de conformite, auditabilite et souverainete a respecter
- Necessite de strategie de promotion entre environnements sans contamination des donnees

### Cross-Cutting Concerns Identified

- Isolation des secrets, donnees et ressources par environnement
- Strategie de migration SQL et data replayable par environnement
- Parite fonctionnelle et technique entre dev, preview, staging et production
- Observabilite, audit trail et validation de release
- Rollback applicatif et rollback data gouvernes
- Gestion de la coexistence temporaire entre composants migres et non migres
- Gouvernance de cutover et hypercare post-bascule

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web platform based on project requirements analysis

### Starter Options Considered

Le projet n'est pas un greenfield vide. Il dispose deja d'une base applicative active avec:
- frontend Next.js existant
- backend NestJS separe
- PostgreSQL cible avec scripts de migration et seed
- runbooks d'exploitation locale
- backlog et matrice de migration deja formalises

Les options considerees sont donc:
- conserver et faire evoluer la base existante
- reinjecter un starter externe Next.js 16
- reconstruire a partir d'un boilerplate full-stack

Les deux dernieres options sont ecartees car elles apporteraient une derive de structure, des doublons de conventions, et un risque de casser les flux de migration deja en cours.

### Selected Starter: Existing Repository Baseline Upgraded to Next.js 16

**Rationale for Selection:**
Le depot actuel est deja la meilleure fondation architecturale car il contient les decisions structurelles reelles du projet, les scripts d'exploitation, les runbooks, et les contraintes metier. La bonne approche consiste a conserver cette base, puis a l'aligner vers la cible `Next.js 16` au lieu d'introduire un starter externe.

**Initialization Command:**

```bash
pnpm install
pnpm dev
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript sur frontend et backend
- Next.js pour la surface web
- NestJS pour l'API metier
- PostgreSQL comme base cible

**Styling Solution:**
- Tailwind CSS deja present
- composants UI deja organises autour des patterns existants du repo

**Build Tooling:**
- pnpm workspace
- build frontend/backend separes
- scripts de migration, reset, seed, verification deja en place

**Testing Framework:**
- Playwright cote frontend
- tests backend dedies
- gates de migration et de rollback deja presentes

**Code Organization:**
- separation frontend/backend explicite
- artefacts de planification et d'implementation BMAD deja integres
- runbooks et documentation operationnelle deja embarques

**Development Experience:**
- commandes locales unifiees
- ports parametrables
- PostgreSQL local via Docker
- workflow de migration deja documente

**Foundation Adjustment Required:**
La fondation doit etre modernisee vers `Next.js 16` et completee par une strategie multi-environnements non-production coherente avec:
- environnements isoles
- variables et secrets par environnement
- promotion controlee
- migrations SQL/data gouvernees
- rollback teste

**Note:** Pour ce projet, la premiere story d'implementation ne doit pas etre "creer un starter", mais "stabiliser la fondation existante vers la cible Next.js 16 et l'aligner sur la strategie de deploiement multi-environnements".

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Definir la topologie des environnements non-production
- Definir la strategie de deploiement Vercel par environnement
- Definir l'isolation des bases de donnees et secrets par environnement
- Definir la strategie de migrations SQL et data promotionnelles
- Definir le mecanisme d'identification fiable de l'environnement applicatif

**Important Decisions (Shape Architecture):**
- Definir la branche source de chaque environnement
- Definir les gates CI/CD avant promotion
- Definir l'observabilite par environnement
- Definir les regles de rollback applicatif et data

**Deferred Decisions (Post-MVP):**
- Ephemeral environments complets avec base dediee par PR
- Secure Compute / reseaux dedies par environnement
- Feature flags avances par environnement

### Data Architecture

- Base de donnees: PostgreSQL isolee par environnement, sans base partagee entre `dev`, `preview`, `staging`, `production`
- Strategie de donnees:
  - `dev`: base librement reinitialisable, seedee
  - `preview`: base de validation non critique, dataset masque ou seed controle
  - `staging`: base stable proche production, donnees anonymisees ou jeux de reference gouvernes
  - `production`: base autoritative
- Migrations:
  - migrations SQL versionnees executees automatiquement en `preview` et `staging` avec garde-fous
  - promotion en `production` seulement apres validation explicite
- Data migrations:
  - scripts idempotents, rejouables, traces par `migration_batch_id`
- Caching:
  - pas de cache cross-environment
  - cache local a l'environnement uniquement

### Authentication & Security

- Auth cible: backend NestJS comme source de verite
- Autorisation: RBAC strict + ABAC leger, conserve dans tous les environnements
- Secrets:
  - variables et secrets separes par environnement Vercel
  - aucun secret partage entre `preview`, `staging`, `production`
- Identification d'environnement:
  - ne pas dependre uniquement de `VERCEL_ENV`
  - definir une variable explicite applicative, par exemple `APP_ENV=development|preview|staging|production`
- Donnees sensibles:
  - interdiction d'utiliser des donnees production brutes en non-production
  - anonymisation obligatoire pour `staging` si copie de prod

### API & Communication Patterns

- Pattern API: REST entre frontend Next.js et backend NestJS
- Contrats:
  - endpoints versionnes et testes par environnement
- Erreurs:
  - format d'erreur uniforme entre environnements
- Communication:
  - frontend pointe vers une API dediee a son environnement
  - aucun frontend `staging` ou `preview` ne doit consommer l'API `production`

### Frontend Architecture

- Frontend principal: Next.js 16
- Strategie d'environnement Vercel:
  - `Preview` pour les branches/PR
  - `Custom Environment staging` pour la recette stabilisee
  - `Production` pour le live
- Configuration:
  - resolution explicite des URLs backend, analytics, et flags par `APP_ENV`
- Optimisation:
  - instrumentation et analytics distinctes par environnement
  - isolation des webhooks et providers externes non-prod vs prod

### Infrastructure & Deployment

- Hosting frontend: Vercel
- Hosting backend:
  - environnement separe mais aligne par niveau (`dev`, `preview`, `staging`, `production`)
  - meme principe d'isolation que le frontend
- Topologie recommandee:
  - `local`: developpement local
  - `preview`: deploy automatique par PR/branche non-main
  - `staging`: environnement integre de validation pre-prod
  - `production`: environnement live
- Strategie Vercel:
  - utiliser `Preview` pour les apercus automatiques
  - utiliser `Custom Environment staging` pour la prerecette stable
- CI/CD:
  - PR -> lint/tests/build -> deploy preview
  - merge branche integration -> deploy staging
  - promotion manuelle ou merge controle -> production
- Observabilite:
  - logs, erreurs, analytics, healthchecks separes par environnement
- Rollback:
  - rollback frontend par redeploiement precedent
  - rollback backend et data via procedure versionnee et testee

### Decision Impact Analysis

**Implementation Sequence:**
1. Introduire la convention `APP_ENV`
2. Definir la matrice d'environnements et des secrets
3. Mapper frontend/backend/database par environnement
4. Mettre en place les pipelines CI/CD par cible
5. Brancher les migrations SQL/data par environnement
6. Ajouter observabilite et runbooks de rollback

**Cross-Component Dependencies:**
- La topologie d'environnements impacte URLs frontend/backend, secrets, analytics, auth, migrations et datasets
- La decision `staging` sur Vercel impacte aussi la strategie backend et base de donnees
- L'isolation data conditionne la conformite, l'auditabilite et la securite globale

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
8 areas where AI agents could make different choices and break environment consistency

### Naming Patterns

**Environment Naming Conventions:**
- Environnements autorises: `local`, `preview`, `staging`, `production`
- Interdits sans decision explicite supplementaire: `qa`, `test`, `preprod`, `uat`
- Variable canonique d'application: `APP_ENV`
- Valeurs autorisees pour `APP_ENV`: `development`, `preview`, `staging`, `production`
- Mapping:
  - `local` runtime -> `APP_ENV=development`
  - `preview` runtime -> `APP_ENV=preview`
  - `staging` runtime -> `APP_ENV=staging`
  - `production` runtime -> `APP_ENV=production`

**Database Naming Conventions:**
- Une base par environnement stable
- Nommage recommande:
  - `agilys_dev`
  - `agilys_preview`
  - `agilys_staging`
  - `agilys_prod`
- Aucun nom ambigu de type `agilys_test` ou `agilys_temp`
- Les scripts doivent recevoir la cible explicitement, jamais l'inferer implicitement depuis une branche seule

**API Naming Conventions:**
- URLs backend par environnement via variable explicite:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `API_BASE_URL` cote serveur si necessaire
- Aucun fallback automatique vers production
- Toute configuration manquante doit echouer explicitement au demarrage

**Code Naming Conventions:**
- Variables d'environnement en uppercase snake_case
- Variables TypeScript en camelCase
- fichiers applicatifs en kebab-case sauf composants React deja normalises par le repo
- constantes d'environnement centralisees dans un module unique

### Structure Patterns

**Project Organization:**
- Toute logique de resolution d'environnement doit vivre dans un module unique
- Toute logique de construction des URLs frontend/backend doit vivre dans un module unique
- Toute logique de gating deployment/migration doit vivre dans `scripts/` ou dans la CI, pas dispersee dans les composants
- Les runbooks d'exploitation restent dans `docs/runbooks/`
- Les decisions d'architecture restent dans `_bmad-output/planning-artifacts/`

**File Structure Patterns:**
- Config environnement frontend: module dedie dans `src/`
- Config environnement backend: module dedie dans `backend/src/`
- Scripts de deploiement/migration: `scripts/`
- Aucune duplication de logique d'environnement dans plusieurs fichiers `.env.*` sans couche de validation centralisee

### Format Patterns

**Environment Configuration Format:**
- Format canonique: cle/valeur par environnement avec schema explicite
- Champs minimums:
  - `APP_ENV`
  - `NEXT_PUBLIC_APP_ENV`
  - `NEXT_PUBLIC_API_BASE_URL`
  - `DATABASE_URL`
  - `VERCEL_TARGET` si utilise par scripts
- Toute variable requise doit etre validee au bootstrap

**API Response Formats:**
- Le format de reponse API ne change jamais selon l'environnement
- Les erreurs doivent rester structurellement identiques entre `preview`, `staging`, `production`
- Les differenciations d'environnement passent par metadata/logging, pas par un contrat API divergent

**Data Exchange Formats:**
- Dates en ISO 8601 UTC
- JSON API en camelCase cote application
- Nommage SQL en snake_case
- Identifiants d'environnement en lowercase strict

### Communication Patterns

**Deployment Event Patterns:**
- Nommage d'evenements/logs:
  - `deploy.started`
  - `deploy.succeeded`
  - `deploy.failed`
  - `migration.started`
  - `migration.succeeded`
  - `migration.failed`
- Tous les evenements de release portent:
  - `environment`
  - `commitSha`
  - `service`
  - `timestamp`

**State Management Patterns:**
- Le frontend ne deduit jamais l'environnement depuis `window.location` seul
- L'environnement courant est resolu une fois, puis injecte de facon centralisee
- Aucune logique metier ne doit brancher vers prod/non-prod avec des `if` disperses

### Process Patterns

**Error Handling Patterns:**
- Si `APP_ENV` ou URL critique manque:
  - fail fast au bootstrap
  - message explicite
  - aucun fallback silencieux
- Si une migration cible le mauvais environnement:
  - blocage avant execution
  - verification explicite de la cible
- Les erreurs utilisateur et les erreurs d'exploitation sont separees

**Loading State Patterns:**
- Les ecrans de statut de deploiement/migration doivent utiliser un vocabulaire normalise:
  - `pending`
  - `running`
  - `succeeded`
  - `failed`
  - `rolledBack`
- Aucun statut alternatif implicite (`ok`, `done`, `partial`) sans contrat explicite

### Enforcement Guidelines

**All AI Agents MUST:**
- utiliser exclusivement les environnements `local`, `preview`, `staging`, `production`
- utiliser `APP_ENV` comme variable canonique de resolution d'environnement
- interdire tout fallback automatique vers une ressource production
- centraliser la lecture et la validation des variables d'environnement
- conserver un mapping 1:1 entre frontend, backend et base par environnement stable
- faire echouer les scripts de migration si la cible environnement n'est pas explicitement resolue

**Pattern Enforcement:**
- validation schema des env vars au demarrage frontend et backend
- revue obligatoire de toute PR touchant variables d'environnement, scripts de migration ou pipeline CI/CD
- runbooks mis a jour dans le meme lot que tout changement de topologie d'environnement
- aucun nouveau nom d'environnement sans mise a jour de l'architecture et des runbooks

### Pattern Examples

**Good Examples:**
- `APP_ENV=staging`
- `NEXT_PUBLIC_API_BASE_URL=https://api-staging.example.com`
- script de migration appele avec `--environment staging`
- module unique `src/config/runtime-env.ts`
- module unique `backend/src/config/runtime-env.ts`

**Anti-Patterns:**
- deduire `staging` depuis un nom de branche sans validation explicite
- utiliser `if (process.env.NODE_ENV === 'production')` pour choisir entre `staging` et `production`
- reutiliser la base production pour les tests de recette
- fallback silencieux vers une URL API de production
- multiplier les conventions `staging`, `preprod`, `qa` selon les fichiers

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
agilys-spark-joy/
├── README.md
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── eslint.config.js
├── tsconfig.json
├── .env
├── .env.example
├── .github/
│   └── workflows/
│       ├── ci-preview.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
├── docs/
│   ├── runbooks/
│   │   ├── local-dev-command-and-ports.md
│   │   ├── postgresql-local-docker.md
│   │   ├── staging-deploy.md
│   │   ├── preview-deploy.md
│   │   └── rollback.md
│   └── architecture/
│       └── environment-matrix.md
├── scripts/
│   ├── env/
│   │   ├── resolve-app-env.mjs
│   │   ├── verify-required-env.mjs
│   │   └── print-env-summary.mjs
│   ├── deploy/
│   │   ├── deploy-preview.mjs
│   │   ├── deploy-staging.mjs
│   │   └── deploy-production.mjs
│   ├── db/
│   │   ├── migrate-preview.mjs
│   │   ├── migrate-staging.mjs
│   │   ├── migrate-production.mjs
│   │   └── verify-target.mjs
│   ├── db-migrate.sh
│   ├── db-reset.sh
│   ├── db-seed.sh
│   └── verify-db-workflow.sh
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── config/
│   │   ├── runtime-env.ts
│   │   ├── public-env.ts
│   │   └── app-urls.ts
│   ├── types/
│   └── middleware.ts
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   ├── runtime-env.ts
│   │   │   ├── app-env.validation.ts
│   │   │   └── service-urls.ts
│   │   ├── modules/
│   │   ├── common/
│   │   └── infrastructure/
│   └── test/
├── supabase/
│   └── migrations/
├── tests/
│   ├── e2e/
│   ├── migration/
│   └── fixtures/
├── public/
├── _bmad-output/
│   └── planning-artifacts/
│       └── architecture.md
└── output/
```

### Architectural Boundaries

**API Boundaries:**
- `src/` ne parle au backend que via une couche `services/`
- `backend/src/modules/` expose les contrats REST
- aucune logique de selection d'environnement ne doit vivre dans les composants UI

**Component Boundaries:**
- `src/app/` pour routes et layouts
- `src/components/` pour presentation et composition UI
- `src/config/` pour lecture/validation des variables et resolution d'environnement
- `src/services/` pour acces API et orchestration frontend

**Service Boundaries:**
- `backend/src/config/` centralise la configuration runtime
- `backend/src/modules/` isole les domaines metier
- `backend/src/infrastructure/` porte acces DB, providers externes, observabilite
- les scripts de deploiement/migration restent hors `src/`, dans `scripts/`

**Data Boundaries:**
- une cible DB par environnement stable
- `supabase/migrations/` reste la source de verite SQL tant que la migration n'est pas totalement sortie de Supabase tooling
- les scripts `scripts/db/*` imposent la verification explicite de la cible avant execution

### Requirements to Structure Mapping

**Feature/Epic Mapping:**
- Epic 1 vitrine publique -> `src/app/(public)/` ou routes publiques equivalentes, `src/components/features/marketing/`
- Epic 2 gouvernance d'acces -> `backend/src/modules/auth/`, `backend/src/modules/roles/`, `src/services/auth/`
- Epic 3 budget -> `backend/src/modules/budget/`, `src/components/features/budget/`
- Epic 4 operations de depense -> `backend/src/modules/depenses/`, `backend/src/modules/paiements/`, `src/components/features/depenses/`
- Epic 5 controle cash -> `backend/src/modules/tresorerie/`, `backend/src/modules/risk/`
- Epic 6 comptabilite/rapprochement -> `backend/src/modules/comptabilite/`, `backend/src/modules/rapprochement/`
- Epics migration M1-M4 -> `scripts/`, `docs/runbooks/`, `tests/migration/`, `_bmad-output/planning-artifacts/`

**Cross-Cutting Concerns:**
- configuration environnement -> `src/config/`, `backend/src/config/`, `scripts/env/`
- observabilite -> `backend/src/infrastructure/observability/`, `src/lib/analytics/`
- runbooks -> `docs/runbooks/`
- architecture et gouvernance -> `_bmad-output/planning-artifacts/`

### Integration Points

**Internal Communication:**
- frontend -> backend via clients dans `src/services/`
- backend -> DB via couche infrastructure/repository
- scripts CI/CD -> Vercel + backend host + DB target explicites

**External Integrations:**
- Vercel pour frontend
- plateforme backend pour API
- PostgreSQL par environnement
- analytics et monitoring separes par environnement

**Data Flow:**
- `APP_ENV` determine la configuration runtime
- la config runtime determine URLs backend, secrets et cibles de migration
- les pipelines CI/CD deployent vers une seule cible environnementale a la fois
- les migrations et seeds sont toujours scopees par environnement

### File Organization Patterns

**Configuration Files:**
- config frontend centralisee sous `src/config/`
- config backend centralisee sous `backend/src/config/`
- scripts runtime et CI/CD centralises dans `scripts/env/` et `scripts/deploy/`

**Source Organization:**
- UI et pages dans `src/`
- logique metier backend dans `backend/src/modules/`
- aucune logique d'environnement en doublon entre services, composants et scripts

**Test Organization:**
- E2E frontend dans `tests/e2e/`
- verification migration/deploiement dans `tests/migration/`
- tests backend dans `backend/test/`

**Asset Organization:**
- assets publics dans `public/`
- aucun artefact de deploiement manuel disperse dans `src/` ou `backend/src/`

### Development Workflow Integration

**Development Server Structure:**
- `pnpm dev` reste le point d'entree local
- `APP_ENV=development` est la seule valeur autorisee localement

**Build Process Structure:**
- build frontend et backend separes
- validation env obligatoire avant build/deploy
- scripts de migration distincts par cible

**Deployment Structure:**
- preview: pipeline PR
- staging: pipeline branche integration / recette
- production: pipeline promotion controlee
- rollback documente dans `docs/runbooks/rollback.md`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Les choix technologiques et de deploiement sont coherents entre eux. La cible `Next.js 16` cote frontend, `NestJS` cote backend, `PostgreSQL` cote data, et `Vercel` cote frontend non-production s'assemblent sans conflit majeur. Les decisions de topologie d'environnements, de secrets, et de migrations sont compatibles avec cette stack.

**Pattern Consistency:**
Les patterns definis supportent bien les decisions d'architecture. En particulier, `APP_ENV`, l'interdiction des fallbacks silencieux, et la centralisation de la resolution runtime renforcent directement la strategie multi-environnements retenue.

**Structure Alignment:**
La structure projet proposee est alignee avec les decisions. Elle offre des emplacements explicites pour la configuration runtime, les scripts de deploiement, les migrations ciblees, et les runbooks d'exploitation.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
Le sujet traite ici la fondation de deploiement non-production multi-environnements. Cette fondation couvre transversalement les besoins des epics applicatifs et de migration, en particulier les besoins de promotion, de validation, de rollback, d'isolation et d'observabilite.

**Functional Requirements Coverage:**
Les exigences metier dependantes d'environnements stables sont correctement supportees sur le plan architectural: isolation, promotion, non-regression, pre-recette, et preparation au cutover.

**Non-Functional Requirements Coverage:**
Les NFR critiques lies a securite, conformite, auditabilite, performance et disponibilite sont pris en compte architecturalement par:
- l'isolation par environnement
- la gestion stricte des secrets
- la prohibition d'usage de donnees production brutes en non-production
- la validation explicite des cibles de migration et de deploiement
- la separation des logs, healthchecks et analytics

### Implementation Readiness Validation ✅

**Decision Completeness:**
Les decisions critiques necessaires pour demarrer sont documentees. Les points structurants du deploiement multi-environnements sont definis de maniere suffisamment explicite pour guider les agents.

**Structure Completeness:**
La structure proposee est suffisamment concrete pour localiser les futures implementations de configuration runtime, CI/CD, scripts de migration, et runbooks.

**Pattern Completeness:**
Les zones de conflit les plus probables entre agents sont couvertes: nommage des environnements, variables, cibles de migration, resolution runtime, et conventions de scripts.

### Gap Analysis Results

**Critical Gaps:**
- Aucun gap critique bloquant identifie a ce stade.

**Important Gaps:**
- Definir la branche source canonique de `staging`
- Choisir explicitement l'hebergement backend par environnement
- Formaliser la politique de donnees pour `preview` et `staging`
- Specifier les workflows GitHub Actions cibles

**Nice-to-Have Gaps:**
- Ajouter une matrice d'environnements detaillee dans `docs/architecture/environment-matrix.md`
- Ajouter un runbook de promotion `preview -> staging -> production`
- Ajouter un runbook de rollback par environnement

### Validation Issues Addressed

- La confusion potentielle entre `NODE_ENV`, `VERCEL_ENV` et l'environnement applicatif a ete resolue par l'introduction de `APP_ENV`
- Le risque de fallback vers production a ete explicitement interdit
- Le risque de contamination des donnees entre environnements a ete traite par le principe 1:1 frontend/backend/database par environnement stable

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** high

**Key Strengths:**
- Topologie d'environnements simple et robuste
- Regles strictes evitant les ambiguïtés runtime
- Structure projet exploitable directement
- Bonne adequation avec la migration en cours hors Supabase

**Areas for Future Enhancement:**
- Environnements ephemeres par PR avec base jetable
- Feature flags par environnement
- Renforcement de l'automatisation des promotions et rollbacks

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
Stabiliser la fondation existante vers `Next.js 16`, introduire `APP_ENV`, puis mettre en place la matrice d'environnements et les pipelines de deploiement `preview`, `staging`, `production`.
