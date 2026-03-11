---
title: 'Strategie de deploiement non-production multi-environnements'
slug: 'strategie-de-deploiement-non-production-multi-environnements'
created: '2026-03-11T00:00:00-04:00'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Frontend Vite React TypeScript en transition vers Next.js', 'Backend NestJS TypeScript', 'PostgreSQL', 'Vercel', 'Render cible non encore configure', 'pnpm workspace', 'Playwright', 'Jest']
files_to_modify: ['/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/tech-spec-strategie-de-deploiement-non-production-multi-environnements.md', '/Volumes/mySD1.5/projects/agilys-spark-joy/docs/runbooks/non-production-deployment-strategy.md', '/Volumes/mySD1.5/projects/agilys-spark-joy/README.md', '/Volumes/mySD1.5/projects/agilys-spark-joy/.env.example', '/Volumes/mySD1.5/projects/agilys-spark-joy/backend/README.md', '/Volumes/mySD1.5/projects/agilys-spark-joy/vercel.json', '/Volumes/mySD1.5/projects/agilys-spark-joy/render.yaml']
code_patterns: ['Frontend et backend separes', 'Variables d environnement via .env et plateformes de deploiement', 'Scripts racine pnpm pour dev/build', 'Backend deployable comme service Node autonome', 'Conventions locales deja explicites pour ports et PostgreSQL Docker', 'Architecture cible documentee distincte de l etat courant']
test_patterns: ['Playwright cote frontend', 'Jest cote backend', 'Validation documentaire pour cette quick spec sans tests automatiques']
---

# Tech-Spec: Strategie de deploiement non-production multi-environnements

**Created:** 2026-03-11T00:00:00-04:00

## Overview

### Problem Statement

Le projet doit supporter plusieurs environnements non-production sans melanger les variables d'environnement, les URLs frontend/backend, les donnees de test et les usages des equipes techniques et metier. Sans convention claire, les validations QA et UAT deviennent peu fiables et l'evolution vers une isolation plus forte est difficile.

### Solution

Definir une strategie cible pragmatique pour `local`, `dev`, `qa` et `uat`, avec un frontend cible `Next.js` heberge sur un projet unique `Vercel`, un backend `NestJS` heberge sur `Render`, et une isolation des donnees PostgreSQL par schemas dans une meme instance pour limiter les couts tout en gardant une separation claire.

### Scope

**In Scope:**
- definition des environnements `local`, `dev`, `qa`, `uat`
- role et niveau de stabilite attendu pour chaque environnement
- mapping plateforme par composant (`Vercel`, `Render`, `PostgreSQL`)
- conventions de nommage des services, URLs et variables d'environnement
- strategie d'isolation des donnees PostgreSQL par schemas
- orientation de branches et de flux de deploiement non-production
- preconditions et dependances vis-a-vis de la migration frontend vers `Next.js`

**Out of Scope:**
- migration detaillee du frontend de `Vite` vers `Next.js`
- mise en production
- automatisation CI/CD complete
- observabilite avancee
- strategie de sauvegarde/restauration
- hardening securite production

## Context for Development

### Codebase Patterns

- Le repo est en transition avec un frontend encore base sur `Vite/React`, mais la cible d'architecture de reference est `Next.js + NestJS + PostgreSQL`.
- Le backend `NestJS` est deja separe dans le dossier `backend/`.
- Les fondations locales existent deja pour PostgreSQL Docker et une commande `pnpm dev` avec ports parametrables.
- Le projet evite d'ajouter de nouvelles dependances runtime Supabase et converge vers une architecture front/backend separee.
- La spec doit rester autoportante et distinguer clairement la strategie d'environnement du chantier de migration frontend.
- Le frontend racine est actuellement deploye via une configuration `Vercel` tres simple orientee SPA (`vercel.json` avec rewrite global vers `index.html`), ce qui confirme que la cible `Next.js` necessite une migration separee avant alignement complet de la plateforme.
- Le backend expose deja un service NestJS autonome avec variables d'environnement explicites (`PORT`, secrets JWT, configuration PostgreSQL), ce qui facilite une duplication par environnement sur `Render`.
- Aucune blueprint `Render` versionnee n'est presente dans le repo a ce stade; la spec devra donc proposer une convention de mapping et de nommage exploitable meme sans IaC initiale.
- La convention actuelle du repo privilegie des artefacts d'implementation et runbooks versionnes dans `_bmad-output/implementation-artifacts`, ce qui est un bon emplacement pour une spec de reference de deploiement.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md` | Regles d'architecture cibles et contraintes de migration |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/package.json` | Scripts racine, stack frontend actuelle et commandes de build/dev |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/vercel.json` | Etat actuel du deploiement frontend cote Vercel |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/package.json` | Service backend NestJS deployable separement |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/README.md` | Variables d'environnement backend et prerequis PostgreSQL |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/cc-01-02-postgresql-local-docker.md` | Fondations PostgreSQL locales deja definies |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/cc-01-05-commande-dev-unique-et-ports.md` | Conventions locales de ports et execution multi-service |

### Technical Decisions

- La migration `Vite -> Next.js` est un chantier distinct et un prerequis d'alignement avec la cible frontend de cette spec.
- La strategie non-production doit supposer un frontend cible `Next.js`, mais ne pas decrire la migration applicative elle-meme.
- L'isolation PostgreSQL recommandee doit privilegier une instance unique avec plusieurs schemas pour limiter les couts en non-production.
- Le frontend non-production doit s'appuyer sur un seul projet `Vercel`, avec differenciation des environnements par domaine, branche et variables d'environnement.
- La spec doit expliciter que `dev` et `qa` existent des le depart, tandis que `uat` reste un environnement optionnel a activer lorsque le besoin metier recurrent le justifie.
- La spec doit proposer des conventions de branches compatibles avec un projet `Vercel` unique et des services `Render` distincts, sans presupposer une CI/CD complete.
- Convention cible frontend phase 1: un projet `Vercel` unique avec environnement `Development` pour `dev` et environnement `Preview` pour `qa`. `uat` n'est pas cree au depart.
- Convention cible frontend phase 2: `uat` peut temporairement reutiliser l'environnement `Production` de `Vercel` uniquement tant que `prod` est hors perimetre. Avant l'ouverture de `prod`, il faudra sortir `uat` de `Production` vers soit un second projet `Vercel`, soit un usage de `Preview` avec domaine stable dedie.
- Convention cible backend: un service `Render` distinct par environnement stable (`api-dev`, `api-qa`, `api-uat`) pour simplifier l'isolation des variables et des endpoints, tous declares depuis le meme repo avec des conventions de branche identiques et une checklist anti-drift.
- Convention cible base de donnees: une instance PostgreSQL non-production unique avec schemas dedies (`app_dev`, `app_qa`, `app_uat`) et utilisateurs applicatifs distincts obligatoires par schema.
- Convention de flux phase 1: `main` deploie automatiquement `dev`; `release/qa` est une branche de stabilisation courte creee depuis `main` et deploie `qa`; `uat` n'est pas active.
- Convention de flux phase 2: `uat` est declenche manuellement a partir d'un tag ou commit valide sur `release/qa`, avec promotion explicite et gel des changements pendant la demonstration.
- Convention d'URL phase 1: URLs stables obligatoires pour `dev` et `qa`; `uat` n'a pas d'URL tant que l'environnement n'existe pas.
- Convention d'URL phase 2: `dev.<domaine>`, `qa.<domaine>`, `uat.<domaine>` pour le frontend; `api-dev.<domaine>`, `api-qa.<domaine>`, `api-uat.<domaine>` pour le backend.
- Compatibilite de variables frontend: tant que le repo reste sur `Vite`, la documentation doit conserver `VITE_API_BASE_URL`; la variable cible `NEXT_PUBLIC_API_BASE_URL` ne doit apparaitre que comme equivalent futur apres migration vers `Next.js`.
- Controle du drift plateforme: tant que `render.yaml` n'existe pas, toute creation ou modification de service `Render` doit etre reporte dans un inventaire versionne listant branche source, commande build/start, variables obligatoires, domaine et date de mise a jour.

## Implementation Plan

### Tasks

- [ ] Task 1: Formaliser la cible d'environnements non-production et leurs usages
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/strategie-de-deploiement-non-production-multi-environnements.md`
  - Action: Documenter `local`, `dev`, `qa`, `uat` avec pour chacun le role, les utilisateurs cibles, le niveau de stabilite attendu, la frequence de refresh des donnees, et la politique d'acces.
  - Notes: Indiquer explicitement que `uat` est optionnel au demarrage et s'active lorsque les validations metier deviennent recurrentes.
- [ ] Task 2: Documenter le mapping plateforme cible par environnement
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/strategie-de-deploiement-non-production-multi-environnements.md`
  - Action: Definir le mapping `frontend/backend/database` pour la phase 1 (`dev`, `qa`) puis la phase 2 (`uat`), avec `1` projet `Vercel`, `1` service `Render` par environnement stable, et `1` instance PostgreSQL avec plusieurs schemas.
  - Notes: La spec doit expliciter que le frontend actuel n'est pas encore `Next.js`, que `uat` est differe au depart, et que ce mapping s'applique a la cible apres migration.
- [ ] Task 3: Fixer les conventions de nommage, d'URLs et d'endpoints
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/strategie-de-deploiement-non-production-multi-environnements.md`
  - Action: Ajouter une table de conventions pour noms de services, URLs frontend, URLs backend, noms de schemas PostgreSQL et prefixes de variables d'environnement.
  - Notes: Inclure des exemples concrets tels que `api-dev`, `api-qa`, `api-uat`, `app_dev`, `app_qa`, `app_uat`.
- [ ] Task 4: Definir la strategie de variables d'environnement et de secrets
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/strategie-de-deploiement-non-production-multi-environnements.md`
  - Action: Decrire quelles variables doivent etre isolees par environnement cote frontend et backend, comment les stocker dans `Vercel` et `Render`, et quelles variables locales doivent rester compatibles avec `.env` et `.env.example`.
  - Notes: Couvrir au minimum `VITE_API_BASE_URL` pour l'etat actuel, `NEXT_PUBLIC_API_BASE_URL` comme cible future, les secrets JWT backend, `POSTGRES_*`, CORS, et les integrations tierces futures.
- [ ] Task 5: Definir la strategie PostgreSQL multi-schemas non-production
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/strategie-de-deploiement-non-production-multi-environnements.md`
  - Action: Decrire le choix `1 instance + plusieurs schemas`, les avantages cout/operations, les garde-fous de separation, les limites, la selection du schema au runtime, et le chemin d'evolution vers `1 base/instance par environnement` si necessaire.
  - Notes: Preciser la gestion des migrations, seeds et jeux de donnees de test par schema, l'obligation d'utilisateurs DB distincts par schema, et les mecanismes anti-collision entre `dev`, `qa` et `uat`.
- [ ] Task 6: Definir l'orientation de branches et de flux de deploiement
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/strategie-de-deploiement-non-production-multi-environnements.md`
  - Action: Proposer une convention explicite de branches et promotions entre `dev`, `qa` et `uat`, compatible avec `1` projet `Vercel` et plusieurs services `Render`.
  - Notes: Le flux doit rester manuel ou semi-manuel, sans supposer une CI/CD complete; documenter les noms exacts de branches, ce qui declenche chaque environnement, et les regles de promotion.
- [ ] Task 7: Identifier les prerequis et risques de mise en oeuvre
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/strategie-de-deploiement-non-production-multi-environnements.md`
  - Action: Ajouter une section `Prerequis`, `Risques`, `Decisions ouvertes` et `Plan d'adoption progressif`.
  - Notes: Mentionner en premier le chantier distinct `Vite -> Next.js` comme prerequis de convergence plateforme, puis separer clairement les livrables phase 1 (`dev`, `qa`) et phase 2 (`uat`).
- [ ] Task 8: Publier un runbook d'usage simplifie pour l'equipe
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/docs/runbooks/non-production-deployment-strategy.md`
  - Action: Produire une version operationnelle courte de la strategie avec inventaire des environnements, ownership, checklist de creation d'environnement, checklist de configuration `Vercel/Render/PostgreSQL`, checklist de verification avant ouverture a la QA ou au metier, et conduite a tenir en cas de rollback ou de drift.
  - Notes: Ce runbook doit referencer la spec complete sans la dupliquer integralement.
- [ ] Task 9: Mettre a jour la documentation racine pour rendre la convention visible
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/README.md`
  - Action: Ajouter une section synthese sur la strategie d'environnements non-production et les documents de reference.
  - Notes: Garder la section courte pour ne pas surcharger le README.
- [ ] Task 10: Aligner les exemples de configuration locale et backend avec la cible
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/.env.example`
  - Action: Ajouter ou ajuster les exemples de variables pour clarifier la difference entre local et non-production cible.
  - Notes: Ne pas convertir le repo en `Next.js` ici; seulement preparer la documentation et les exemples.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/README.md`
  - Action: Ajouter une section sur la correspondance entre variables backend locales et variables backend non-production sur `Render`.
  - Notes: Conserver la documentation actuelle des routes et prerequis auth.
- [ ] Task 11: Tracer les points de configuration plateforme a versionner
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/vercel.json`
  - Action: Documenter si ce fichier reste legacy Vite pendant la transition ou doit evoluer apres migration `Next.js`.
  - Notes: La spec ne doit pas demander de migration immediate, mais elle doit rendre explicite le statut de ce fichier.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/render.yaml`
  - Action: Definir si un blueprint Render doit etre cree dans un lot suivant pour supprimer le drift manuel entre services.
  - Notes: Si le fichier n'existe pas encore, la spec doit l'identifier comme artefact cible et non comme prerequis immediat.

### Acceptance Criteria

- [ ] AC 1: Given un lecteur technique ou plateforme, when il consulte la spec, then il peut distinguer sans ambiguite le role, les utilisateurs et le niveau de stabilite de `local`, `dev`, `qa` et `uat`.
- [ ] AC 2: Given un responsable de deploiement, when il configure la phase 1 frontend non-production, then la spec lui indique clairement comment utiliser un seul projet `Vercel` pour `dev` et `qa`, quelles URLs stables sont obligatoires, et pourquoi `uat` est differee.
- [ ] AC 3: Given un responsable de deploiement, when il active la phase 2, then la spec lui indique clairement dans quelles conditions `uat` peut reutiliser temporairement `Vercel Production` et quel plan de sortie doit etre applique avant l'ouverture de `prod`.
- [ ] AC 4: Given un responsable de deploiement, when il configure le backend non-production, then la spec lui indique clairement qu'un service `Render` distinct doit exister pour chaque environnement stable, depuis quelles branches ces services deploient, et comment les changements de configuration sont inventories pour eviter le drift.
- [ ] AC 5: Given une equipe data ou plateforme, when elle met en place PostgreSQL non-production, then la spec explique la strategie `1 instance + plusieurs schemas`, la selection du schema au runtime, les migrations associees, les utilisateurs DB distincts obligatoires et les limites de cette approche.
- [ ] AC 6: Given une equipe de developpement, when elle lit la section flux de deploiement, then elle comprend quelles branches exactes (`main`, `release/qa`) alimentent `dev`, `qa` et `uat`, ainsi que les promotions manuelles attendues.
- [ ] AC 7: Given une equipe projet, when elle utilise la spec pour planifier la suite, then il est explicite que la migration `Vite -> Next.js` est un chantier distinct, prerequis a l'alignement complet du frontend sur la cible de deploiement.
- [ ] AC 8: Given une equipe qui initialise les variables d'environnement, when elle consulte la spec et le runbook associe, then elle sait quelles variables doivent etre separees par environnement et ou elles doivent etre gerees (`.env` local, `Vercel`, `Render`).
- [ ] AC 9: Given un lecteur non technique, when il consulte le runbook simplifie, then il peut comprendre quelle URL utiliser selon le type de validation (`dev`, `qa`, `uat`) et a qui remonter un probleme de configuration.
- [ ] AC 10: Given un lecteur technique, when il compare l'etat courant du repo et la cible, then il voit clairement la compatibilite temporaire entre `VITE_API_BASE_URL` et `NEXT_PUBLIC_API_BASE_URL` sans ambiguite documentaire.
- [ ] AC 11: Given un responsable plateforme, when il consulte le runbook, then il trouve les sections minimales d'ownership, inventaire des environnements, verification, rollback et gestion du drift.

## Additional Context

### Dependencies

- Disponibilite d'un frontend cible `Next.js` deployable sur `Vercel`.
- Services `NestJS` deployables independamment sur `Render`.
- PostgreSQL configurable avec plusieurs schemas et variables d'environnement par environnement.
- Capacite de definir des domaines ou sous-domaines distincts pour chaque environnement non-production.
- Capacite applicative a parametrer un schema PostgreSQL cible par environnement via configuration ou credentials dedies, par exemple via `search_path` ou configuration equivalente cote backend.
- Decision produit/plateforme sur l'usage transitoire de l'environnement `Production` de `Vercel` pour `uat` tant que `prod` reste hors perimetre.
- Discipline d'equipe pour maintenir un inventaire versionne des services Render tant qu'aucun `render.yaml` n'est en place.

### Testing Strategy

Cette quick spec ne demande pas d'implementation applicative immediate. La validation attendue est la suivante:

- revue documentaire croisee entre developpement et plateforme pour verifier que le mapping `Vercel/Render/PostgreSQL` est exploitable
- verification manuelle que chaque variable referencee dans la strategie existe deja ou peut etre introduite sans contradiction avec `README.md`, `.env.example` et `backend/README.md`
- verification manuelle que les conventions de branches et de promotion sont compatibles avec le mode de travail reel de l'equipe
- verification manuelle que la selection du schema PostgreSQL est reproductible entre local, dev, qa et uat sans changement implicite de code
- au moment de la mise en oeuvre, prevoir un smoke test par environnement: acces frontend, ping backend, verification de connexion au schema PostgreSQL cible, et absence de fuite de donnees entre environnements
- au moment de la mise en oeuvre, prevoir une revue de drift mensuelle entre services `Render` jusqu'a l'introduction d'un blueprint versionne

### Notes

Le besoin principal est de stabiliser les validations non-production a cout limite. La spec doit donc privilegier une separation suffisante, evolutive et simple a exploiter plutot qu'une isolation maximale immediate.

Points de vigilance:

- Le choix `1 projet Vercel` est economique et simple, mais il impose de documenter tres clairement la correspondance entre branches, environnements Vercel et URLs visibles des utilisateurs.
- Le choix `1 instance PostgreSQL + plusieurs schemas` reduit les couts, mais il ne doit pas conduire a partager des credentials applicatifs, seeds ou jobs entre `dev`, `qa` et `uat`.
- Reutiliser l'environnement `Production` de `Vercel` pour `uat` est acceptable uniquement comme compromis transitoire tant que `prod` n'existe pas; ce choix devra etre reevalue avant l'ouverture d'un vrai environnement de production.
- Si `uat` est cree, la spec doit imposer une date ou un jalon de sortie de l'usage `Vercel Production` avant tout chantier `prod`.
- Si la migration `Vite -> Next.js` prend du retard, il faudra traiter la partie frontend de la strategie comme cible future et limiter les travaux immediats aux conventions backend/base de donnees/documentation.
- Tant que `render.yaml` n'est pas versionne, la creation de `api-dev`, `api-qa` et `api-uat` reste vulnerable au drift manuel; l'inventaire versionne des services devient donc une exigence transitoire, pas une option.
