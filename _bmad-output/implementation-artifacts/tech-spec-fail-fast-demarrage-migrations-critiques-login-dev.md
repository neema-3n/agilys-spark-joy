---
title: 'Fail fast au demarrage sur migrations critiques et pre-remplissage login dev'
slug: 'fail-fast-demarrage-migrations-critiques-login-dev'
created: '2026-03-11T11:45:00-04:00'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'NestJS 10'
  - 'React 18'
  - 'TypeScript 5'
  - 'PostgreSQL'
  - 'Next.js App Router'
  - 'Jest'
  - 'Playwright'
files_to_modify:
  - 'backend/src/integration-legacy/integration-legacy.service.ts'
  - 'backend/src/integration-legacy/integration-legacy.service.spec.ts'
  - 'backend/src/common/postgres.service.ts'
  - 'backend/src/integration-legacy/integration-legacy.bootstrap.spec.ts'
  - 'src/route-components/auth/Login.tsx'
  - 'src/services/auth/dev-login-defaults.ts'
  - 'tests/auth-migration.spec.ts'
  - 'src/services/auth/dev-login-defaults.spec.ts'
  - '.env.example'
code_patterns:
  - 'NestJS service lifecycle via OnModuleInit/OnModuleDestroy'
  - 'Direct SQL via PostgresService.query with explicit runtime mapping'
  - 'Frontend auth orchestration via AuthContext + route-components'
  - 'Environment configuration via process.env in both backend and frontend client code'
  - 'Fail-fast preferred over silent fallback for critical infrastructure prerequisites'
test_patterns:
  - 'Backend unit tests with Jest and mocked PostgresService/transport'
  - 'Backend integration-style bootstrap tests with Jest and fake timers'
  - 'Frontend/auth integration flows covered with Playwright against Next dev server'
---

# Tech-Spec: Fail fast au demarrage sur migrations critiques et pre-remplissage login dev

**Created:** 2026-03-11T11:45:00-04:00

## Overview

### Problem Statement

Le backend demarre alors qu'une dependance de schema critique du module d'integration asynchrone peut manquer, en particulier la table `public.integration_async_events`. Cette absence provoque un echec tardif dans le worker runtime au lieu d'un echec explicite au boot, et rend l'API indisponible du point de vue du frontend, notamment pendant le login avec le message indiquant que l'API d'authentification est injoignable. En parallele, le parcours de connexion en developpement reste trop manuel alors qu'un pre-remplissage securise via variables d'environnement est souhaite pour accelerer les tests locaux avec un compte super admin.

### Solution

Ajouter une verification de prerequis de schema au demarrage NestJS pour les dependances critiques du flux d'integration asynchrone, faire echouer le boot avec un message actionnable si les migrations requises ne sont pas appliquees, et empecher l'initialisation des workers dans un etat incoherent. Cote frontend, pre-remplir le formulaire de login uniquement en developpement a partir de variables d'environnement dediees pour un compte super admin local, sans exposer de credentials en dur.

### Scope

**In Scope:**
- Validation de presence du schema critique au demarrage backend avant lancement du worker d'integration asynchrone.
- Echec explicite du demarrage avec message operable quand les migrations requises sont absentes.
- Prise en compte de l'impact observable sur l'API d'auth et le parcours `/auth/login`.
- Pre-remplissage du formulaire de login en environnement de developpement uniquement.
- Lecture des identifiants de developpement depuis des variables d'environnement dediees.
- Ajustements de tests backend et frontend lies au bootstrap et au comportement du login dev.

**Out of Scope:**
- Mode degrade tolerant a l'absence des migrations.
- Refonte du flux metier des integrations asynchrones.
- Refonte UX complete de la page de login.
- Introduction de credentials de demonstration en dur dans le code.
- Changement des contrats d'authentification backend.

## Context for Development

### Codebase Patterns

- Le module concerne par l'erreur se trouve dans `backend/src/integration-legacy/` et le worker est lance automatiquement depuis `IntegrationLegacyService.onModuleInit()` via un `setInterval`, sans verification prealable de l'existence des tables requises.
- Le service utilise `PostgresService.query()` comme couche d'acces SQL minimale; il n'existe pas aujourd'hui de helper commun de verification de schema ou de readiness DB.
- La table manquante `public.integration_async_events` est definie dans `supabase/migrations/20260309170000_story_8_1_integration_async_flows.sql`, et la story 8.3 ajoute des colonnes/contraintes supplementaires. La verification de prerequis doit donc couvrir les deux tables du flux et les colonnes 8.3 lues par le service.
- Le frontend auth suit le pattern `route-components` + `AuthContext` + `auth.service.ts`, avec etat local dans `Login.tsx` pour `loginEmail` et `loginPassword`; le pre-remplissage peut donc rester local au composant sans dupliquer de logique de session.
- Le frontend lit deja ses variables d'environnement via `process.env` dans le code client (`http-client.ts`) avec conventions mixtes `NEXT_PUBLIC_*` et `VITE_*`, ce qui implique que les nouveaux credentials dev doivent suivre ce modele de compatibilite.
- La page de login affiche deja un encart “Comptes de test” aligne sur les variables backend `AUTH_TEST_USER_EMAIL` / `AUTH_TEST_USER_PASSWORD`; il existe donc un precedent UX et semantique pour connecter les variables frontend de pre-remplissage a ces comptes de test.
- Le projet privilegie des erreurs utilisateur actionnables et une separation nette entre logique d'infrastructure backend, orchestration auth, et UI.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `backend/src/integration-legacy/integration-legacy.service.ts` | Worker et acces SQL a `integration_async_events`, point principal du fail fast a introduire. |
| `backend/src/integration-legacy/integration-legacy.service.spec.ts` | Couverture unitaire existante du service d'integration. |
| `backend/src/integration-legacy/integration-legacy.bootstrap.spec.ts` | Nouveau test d'integration cible sur `onModuleInit()` et le comportement de bootstrap du worker. |
| `backend/src/common/postgres.service.ts` | Couche unique d'acces PostgreSQL, candidate pour factoriser ou supporter un check de prerequis schema. |
| `supabase/migrations/20260309170000_story_8_1_integration_async_flows.sql` | Creation de la table critique `public.integration_async_events`. |
| `supabase/migrations/20260309200000_story_8_3_integration_supervision_sla.sql` | Evolution ulterieure du schema de supervision sur la meme table. |
| `src/route-components/auth/Login.tsx` | Formulaire de login a pre-remplir en developpement. |
| `src/services/auth/dev-login-defaults.ts` | Nouveau helper cible pour resoudre les credentials dev frontend sans surcharger le client HTTP. |
| `src/services/auth/dev-login-defaults.spec.ts` | Nouveau test unitaire cible pour les regles de priorite et d'activation des variables frontend. |
| `tests/auth-migration.spec.ts` | Pattern Playwright existant pour les parcours `/auth/login` et les variations de flux auth. |
| `_bmad-output/implementation-artifacts/2-4-migrer-le-frontend-auth-sans-rupture-ux.md` | Reference des contraintes existantes sur le parcours auth. |
| `_bmad-output/implementation-artifacts/8-1-mettre-en-place-flux-dintegration-asynchrones.md` | Reference fonctionnelle et technique du domaine integration asynchrone. |

### Technical Decisions

- Le backend doit adopter une strategie fail-fast: si le schema critique n'est pas present, le service ne doit pas continuer jusqu'au lancement partiel de l'application.
- Comme `IntegrationLegacyService` depend de `integration_async_events`, `integration_async_event_attempts` et de colonnes ajoutees en 8.3, le prerequis doit verifier a minima:
  - table `public.integration_async_events`
  - colonnes `priority`, `treatment_status`, `owner`, `detected_at`, `resolved_at` sur `public.integration_async_events`
  - table `public.integration_async_event_attempts`
- Les colonnes de base de la migration 8.1 ne sont pas re-verifiees individuellement: leur presence est traitee comme implicite si la table 8.1 attendue existe. Le durcissement explicite porte uniquement sur les colonnes 8.3, car ce sont celles qui peuvent manquer dans un schema partiellement migre tout en laissant la table presente.
- La verification doit produire un message d'erreur stable et testable au format: `Integration schema prerequisites missing: <items>. Apply integration schema migrations before starting the backend.`
- L'ordre de `<items>` doit etre deterministe pour fiabiliser les tests: relations d'abord en ordre alphabetique, puis colonnes en ordre `table.column` alphabetique.
- Le point de controle le plus coherent est avant le lancement du timer worker dans `onModuleInit`; la spec n'impose plus de modification de `main.ts` tant que l'exception de bootstrap remonte deja correctement.
- Le correctif doit rester cible sur l'initialisation et la disponibilite systeme, sans modifier la logique metier nominale quand les tables existent.
- Le pre-remplissage login doit etre strictement limite au mode developpement et conditionne a des variables d'environnement explicites.
- Les nouvelles variables frontend doivent suivre la convention publique du repo, avec priorite explicite `NEXT_PUBLIC_*` puis fallback `VITE_*` si la premiere est absente.
- Le pre-remplissage ne doit s'activer que si email et mot de passe sont tous les deux definis et non vides; sinon, aucun champ n'est pre-rempli.
- Le scope d'activation est `process.env.NODE_ENV === 'development'`; les autres environnements, y compris les previews non-prod buildes autrement, restent sans pre-remplissage.
- En cas de conflit entre `NEXT_PUBLIC_*` et `VITE_*`, la valeur `NEXT_PUBLIC_*` est la source de verite.
- L'encart “Comptes de test” de la page login doit rester statique et generique; il ne doit pas afficher dynamiquement les credentials pre-remplis pour eviter d'exposer visuellement des secrets de confort dev.

## Implementation Plan

### Tasks

- [x] Task 1: Introduire un check de prerequis schema reutilisable pour les tables critiques d'integration
  - File: `backend/src/common/postgres.service.ts`
  - Action: Ajouter une methode de verification lisible et testable permettant de verifier l'existence des relations `public.*` requises ainsi que des colonnes critiques attendues avant initialisation du worker.
  - Notes: La methode doit rester minimale, s'appuyer sur `to_regclass` et `information_schema.columns`, et retourner un resultat structure du type `{ missingRelations: string[]; missingColumns: Array<{ table: string; column: string }> }`.

- [x] Task 2: Faire echouer explicitement le demarrage du worker si le schema d'integration est incomplet
  - File: `backend/src/integration-legacy/integration-legacy.service.ts`
  - Action: Modifier `onModuleInit()` pour verifier avant `setInterval` la presence des deux tables critiques et des colonnes 8.3 effectivement lues par le service, puis lever une erreur explicite si un prerequis manque.
  - Notes: Le message doit suivre un format stable: `Integration schema prerequisites missing: public.integration_async_events, public.integration_async_event_attempts, public.integration_async_events.priority, ... Apply integration schema migrations before starting the backend.` Le comportement nominal ne doit pas changer si le schema est complet.

- [x] Task 3: Etendre la couverture backend pour les prerequis de schema et le comportement de boot
  - File: `backend/src/integration-legacy/integration-legacy.service.spec.ts`
  - Action: Ajouter des tests unitaires couvrant au minimum les cas “table `integration_async_events` manquante”, “table `integration_async_event_attempts` manquante” et “colonnes 8.3 manquantes -> exception explicite”.
  - Notes: Reutiliser le pattern actuel de mocks `PostgresService`/transport. Les assertions doivent viser les noms de prerequis manquants et le format stable du message.

- [x] Task 4: Ajouter un test de bootstrap cible pour `onModuleInit()` et les timers
  - File: `backend/src/integration-legacy/integration-legacy.bootstrap.spec.ts`
  - Action: Creer une suite dediee qui verifie `onModuleInit()` avec fake timers, l'absence de timer quand le schema est incomplet, et l'initialisation du timer quand le schema est complet.
  - Notes: Utiliser `jest.useFakeTimers()` et nettoyer explicitement les timers en teardown pour eviter toute fuite ou flakiness. Le critere observable est le nombre de timers actifs ou l'appel a `setInterval`, pas une introspection fragile d'etat interne non expose.

- [x] Task 5: Introduire un helper frontend dedie pour resoudre les defaults de login dev
  - File: `src/services/auth/dev-login-defaults.ts`
  - Action: Creer un helper pur qui centralise la resolution des variables publiques de pre-remplissage login.
  - Notes: Regle requise: priorite `NEXT_PUBLIC_DEV_LOGIN_EMAIL` puis `VITE_DEV_LOGIN_EMAIL`, idem pour le mot de passe; n'activer le retour que si `NODE_ENV === 'development'` et si les deux valeurs sont presentes et non vides.

- [x] Task 6: Tester le helper de resolution des credentials dev
  - File: `src/services/auth/dev-login-defaults.spec.ts`
  - Action: Ajouter des tests unitaires couvrant la priorite des variables, le conflit `NEXT_PUBLIC_*` vs `VITE_*`, le fallback Vite, l'absence d'une des deux valeurs, et la desactivation hors mode developpement.
  - Notes: Cette suite remplace la partie difficilement actionnable d'injection compile-time dans Playwright. Le helper doit accepter une injection explicite d'environnement en parametre de test, ou les tests doivent isoler/restore `process.env` apres chaque cas.

- [x] Task 7: Implementer le pre-remplissage du formulaire de login en developpement uniquement
  - File: `src/route-components/auth/Login.tsx`
  - Action: Initialiser `loginEmail` et `loginPassword` a partir du helper dedie de defaults dev.
  - Notes: Le pre-remplissage doit rester editable par l'utilisateur, ne pas impacter l'onglet d'inscription, et conserver l'encart “Comptes de test” sous forme statique et non-dynamique.

- [x] Task 8: Couvrir le pre-remplissage login dans le parcours frontend
  - File: `tests/auth-migration.spec.ts`
  - Action: Ajouter au minimum un smoke test confirmant que le login reste editable et fonctionnel lorsque des defaults dev sont presents.
  - Notes: Le setup doit lancer Next dev avec `NEXT_PUBLIC_DEV_LOGIN_EMAIL` et `NEXT_PUBLIC_DEV_LOGIN_PASSWORD` explicitement injectes au process de test. Ce smoke test doit preferer un serveur dedie ou un bloc de setup isole pour ne pas perturber le `beforeAll` existant de `tests/auth-migration.spec.ts`; si ce fichier devient trop charge, la creation d'un fichier Playwright dedie est acceptable.

- [x] Task 9: Documenter les nouvelles variables d'environnement de developpement
  - File: `.env.example`
  - Action: Ajouter les variables frontend publiques de pre-remplissage login dev, avec commentaires indiquant qu'elles sont reservees au developpement local.
  - Notes: La doc doit expliciter qu'il s'agit de valeurs de confort dev, distinctes des variables backend `AUTH_TEST_USER_EMAIL` / `AUTH_TEST_USER_PASSWORD`, et rappeler la priorite `NEXT_PUBLIC_*` sur `VITE_*`.

### Acceptance Criteria

- [ ] AC 1: Given `IntegrationLegacyService.onModuleInit()` est execute avec `public.integration_async_events` absente, when le service initialise son worker, then il leve une erreur explicite, and aucun timer n'est lance.

- [ ] AC 2: Given `IntegrationLegacyService.onModuleInit()` est execute avec `public.integration_async_event_attempts` absente, when le service initialise son worker, then il leve une erreur explicite, and aucun timer n'est lance.

- [ ] AC 3: Given `IntegrationLegacyService.onModuleInit()` est execute avec une ou plusieurs colonnes manquantes parmi `priority`, `treatment_status`, `owner`, `detected_at`, `resolved_at`, when le service initialise son worker, then il leve une erreur explicite, and l'erreur identifie les prerequis de schema incomplets.

- [ ] AC 4: Given le schema critique d'integration est complet, when `IntegrationLegacyService.onModuleInit()` est execute, then un unique timer de worker est programme via `setInterval`, and les parcours metier existants du module ne changent pas.

- [ ] AC 5: Given un prerequis de schema manque, when l'erreur est emise, then elle suit le format `Integration schema prerequisites missing: <items>. Apply integration schema migrations before starting the backend.`, and `<items>` liste les relations ou colonnes manquantes.

- [ ] AC 6: Given `/auth/login` est ouvert en environnement de developpement, when `NEXT_PUBLIC_DEV_LOGIN_EMAIL` et `NEXT_PUBLIC_DEV_LOGIN_PASSWORD` sont definies, then les champs email et mot de passe sont pre-remplis avec ces valeurs, and ces valeurs restent modifiables avant soumission.

- [ ] AC 7: Given `/auth/login` est ouvert en environnement de developpement, when les variables `NEXT_PUBLIC_*` et `VITE_*` sont toutes deux definies avec des valeurs differentes, then les valeurs `NEXT_PUBLIC_*` sont retenues, and les valeurs `VITE_*` sont ignorees.

- [ ] AC 8: Given `/auth/login` est ouvert hors environnement de developpement, when la page charge, then aucun credential n'est pre-rempli, and le comportement actuel du formulaire reste inchange.

- [ ] AC 9: Given l'environnement est de developpement mais une seule variable de credential dev est definie ou les variables sont vides, when la page login charge, then aucun champ n'est pre-rempli, and le composant ne plante pas.

- [ ] AC 10: Given l'encart “Comptes de test” est visible sur la page login, when des defaults dev sont configures, then l'encart reste generique et statique, and il n'affiche pas dynamiquement les credentials pre-remplis.

- [ ] AC 11: Given les nouvelles variables frontend sont documentees, when un developpeur configure son environnement local, then il sait quelles variables renseigner pour le pre-remplissage dev, and il comprend la priorite `NEXT_PUBLIC_*` sur `VITE_*` ainsi que la separation avec les variables backend de comptes de test.

## Additional Context

### Dependencies

- Les migrations SQL `20260309170000_story_8_1_integration_async_flows.sql` et `20260309200000_story_8_3_integration_supervision_sla.sql` doivent etre considerees comme prerequis techniques de la verification de demarrage.
- Le `PostgresService` existant est la seule abstraction DB disponible dans ce module; la spec ne requiert pas d'ORM ni de nouvelle dependance.
- Le repo possede deja un `.env.example`; les nouvelles variables frontend doivent etre documentees a cet endroit.
- Le frontend auth depend deja de `process.env` pour ses URLs API; les nouveaux credentials dev doivent reutiliser ce mecanisme mais dans un helper dedie au login, pas dans le client HTTP.
- Le pre-remplissage frontend depend operationnellement de l'existence d'un compte test valide cote backend, aujourd'hui aligne sur `AUTH_TEST_USER_EMAIL` / `AUTH_TEST_USER_PASSWORD`.

### Testing Strategy

- Unit backend:
  - verifier le check de prerequis schema avec toutes les tables presentes
  - verifier le cas table `integration_async_events` manquante
  - verifier le cas table `integration_async_event_attempts` manquante
  - verifier le cas colonnes 8.3 manquantes sur `integration_async_events`
  - verifier que le timer worker n'est pas initialise si la verification echoue
  - verifier le format stable du message d'erreur
  - verifier l'ordre stable des items dans le message d'erreur
- Integration backend ciblee:
  - verifier `onModuleInit()` avec fake timers plutot qu'un e2e `AppModule` complet
  - verifier le cleanup explicite des timers en teardown
- Frontend:
  - verifier unitairement que le helper de defaults respecte la priorite `NEXT_PUBLIC_*` puis `VITE_*`
  - verifier unitairement le cas de conflit `NEXT_PUBLIC_*` vs `VITE_*`
  - verifier unitairement qu'aucun pre-remplissage n'est retourne hors `development`
  - verifier unitairement qu'un environnement incomplet n'entraine aucun default partiel
  - verifier via smoke Playwright que le login reste editable et fonctionnel avec defaults dev injectes au process Next
- Verification manuelle recommandee:
  - demarrer le backend sans appliquer les migrations 8.1/8.3 et confirmer l'echec immediat
  - appliquer les migrations, redemarrer, puis verifier que le login est pre-rempli en local avec les variables frontend configurees

### Notes

- Le besoin frontend sur le pre-remplissage login est un accelerateur de developpement local, pas une fonctionnalite produit.
- Le nom `integration-legacy` est traite comme un nommage de module historique et ne remet pas en cause la migration globale vers NestJS.
- Risque principal: choisir un point de verification trop tardif ou trop large pourrait soit laisser subsister un crash runtime, soit faire echouer le backend pour des prerequis non lies. La spec recommande donc un scope de prerequis strictement borne aux tables directement utilisees par `IntegrationLegacyService`.
- Risque secondaire: exposer des variables frontend mal prefixees rendrait le pre-remplissage inoperant en client-side. La convention publique doit etre explicite et testee.
- Risque secondaire: essayer de tester la priorite des variables compile-time exclusivement via Playwright rendrait la suite fragile; la spec privilegie donc un helper pur + tests unitaires pour cette partie.
- Consideration future hors scope: si d'autres modules backend critiques emergent avec dependances schema similaires, factoriser un mecanisme commun de readiness DB au niveau bootstrap pourrait devenir pertinent, mais ce n'est pas requis pour cette intervention ciblee.
- Residuel assume non bloquant: le smoke Playwright peut etre place dans `tests/auth-migration.spec.ts` ou deplace dans un fichier dedie si cela reduit le blast radius; la spec autorise explicitement cette adaptation tant que le comportement couvert reste le meme.
- Residuel assume non bloquant: l'encart “Comptes de test” doit rester non dynamique, mais sa formulation textuelle exacte peut etre ajustee tant qu'il reste generique et ne revele pas les valeurs pre-remplies.
