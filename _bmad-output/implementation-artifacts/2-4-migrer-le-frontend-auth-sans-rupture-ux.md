# Story 2.4 - Migrer le frontend auth sans rupture UX

Status: done
Epic: 2 - Gouvernance d'acces, roles et isolation multi-tenant
Story Key: 2-4-migrer-le-frontend-auth-sans-rupture-ux
Created: 2026-03-02

## Story

As a utilisateur existant,
I want conserver un parcours de connexion fluide,
So that la migration backend reste transparente.

## Acceptance Criteria

1. **Given** le backend NestJS expose `POST /auth/login`
   **When** un utilisateur soumet le formulaire de connexion frontend
   **Then** l'application authentifie via l'API NestJS (plus via `supabase.auth.signInWithPassword`)
   **And** la redirection post-login conserve la logique actuelle (`from` ou fallback `/app/dashboard`).

2. **Given** une session active avec access token expire
   **When** un appel API protege recoit une reponse d'auth invalide (401)
   **Then** le frontend tente un refresh via `POST /auth/refresh`
   **And** rejoue la requete initiale une seule fois en cas de refresh reussi.

3. **Given** un refresh token invalide/revoque/expire
   **When** le refresh echoue (401/403)
   **Then** la session locale est nettoyee
   **And** l'utilisateur est redirige vers `/auth/login` avec preservation de la route demandee.

4. **Given** un utilisateur clique "Deconnexion"
   **When** l'action est declenchee
   **Then** le frontend appelle `POST /auth/logout` (best effort)
   **And** supprime les tokens locaux et l'etat auth avant redirection vers `/auth/login`.

5. **Given** un utilisateur deja authentifie visite `/auth/login`
   **When** la page charge
   **Then** il est redirige vers la route de destination (`from`) ou `/app/dashboard`
   **And** aucun flash de page login n'apparait apres hydratation session.

6. **Given** un utilisateur non authentifie tente `/app/*`
   **When** `ProtectedRoute` est evalue
   **Then** il est redirige vers `/auth/login` avec `state.from`
   **And** le comportement reste deterministic et sans boucle de redirection.

7. **Given** la migration frontend auth est active
   **When** les parcours critiques sont testes
   **Then** les parcours `login success`, `logout`, `token expire + refresh success`, `token expire + refresh fail` sont couverts
   **And** aucune regression UX bloquante n'est observee sur la navigation protegee.

8. **Given** la migration respecte le contexte projet
   **When** le code est revu
   **Then** aucune nouvelle dependance runtime Supabase auth n'est ajoutee
   **And** la logique de session/token est centralisee dans la couche auth (pas dispersee dans les composants).

## Scope Technique

- Migrer la logique frontend d'authentification vers l'API NestJS (`/auth/login`, `/auth/refresh`, `/auth/logout`).
- Introduire une couche client HTTP auth (service dedie + gestion centralisee des tokens + strategie refresh).
- Adapter `AuthContext` et `ProtectedRoute` pour conserver la meme UX de redirection et etat de chargement.
- Maintenir coexistence transitoire: ne pas casser les ecrans applicatifs existants pendant la migration.

## Out of Scope

- Refonte complete UI/UX de la page login.
- Refactor global des modules metier (budget, depenses, etc.).
- Migration RBAC/ABAC complete (Story 2.2).
- Isolation tenant exhaustive (Story 2.3).

## Tasks / Subtasks

- [x] Mettre en place un client auth API unifie (AC: 1, 2, 3, 4, 8)
  - [x] Creer un service frontend dedie aux appels NestJS auth (`login`, `refresh`, `logout`) avec types explicites request/response.
  - [x] Definir un stockage token frontend (access/refresh) encapsule (module unique) et API clear/read/write.
  - [x] Supprimer l'appel direct `supabase.auth.signInWithPassword` du flux login principal.

- [x] Centraliser la gestion de session dans `AuthContext` (AC: 1, 3, 5, 8)
  - [x] Remplacer la source de verite session Supabase par la session locale API (etat memoire + persistence minimale).
  - [x] Conserver les signatures publiques du contexte (`login`, `logout`, `isAuthenticated`) pour limiter les regressions.
  - [x] Standardiser le mapping utilisateur (`sub`, `tenantId`, `roles`) vers le type `User` front.

- [x] Implementer la strategie de refresh sans boucle (AC: 2, 3)
  - [x] Mettre en place un mecanisme single-flight pour eviter des refresh concurrents.
  - [x] Rejouer une requete echouee au plus une fois apres refresh reussi.
  - [x] Sur echec refresh: nettoyer session et rediriger vers login avec `from`.

- [x] Preserver les redirections UX existantes (AC: 5, 6, 7)
  - [x] Verifier `ProtectedRoute` pour conserver `state.from` sur toute route `/app/*` non authentifiee.
  - [x] Garantir la redirection d'un utilisateur deja authentifie hors `/auth/login` sans flash.
  - [x] Conserver fallback `/app/dashboard` en l'absence de `from`.

- [x] Ajuster la page Login sans rupture fonctionnelle (AC: 1, 5, 7)
  - [x] Conserver validation Zod et messages utilisateur existants.
  - [x] Garder la meme experience de loading/feedback toast pendant login/logout.
  - [x] Verifier compatibilite des comptes de test avec le backend cible (ou masquer temporairement les hints non valides).

- [x] Verifier et documenter (AC: 7, 8)
  - [x] Ajouter tests unitaires/integration front sur les parcours auth critiques.
  - [x] Documenter les variables d'environnement frontend (base URL API, mode migration).
  - [x] Mettre a jour la checklist de decommission Supabase auth pour ce lot.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Couvrir les parcours UX critiques au niveau composant/router (pas seulement utilitaires): login success -> redirection `from`, route protegee anon -> `/auth/login` avec `state.from`, refresh fail -> redirection login. [tests/auth-migration.spec.ts]
- [x] [AI-Review][MEDIUM] Gerer les erreurs reseau sur `signup` avec `try/catch` pour retourner une erreur utilisateur actionnable au lieu d'une rejection non geree. [src/services/api/auth.service.ts]
- [x] [AI-Review][MEDIUM] Durcir `decodeAccessTokenClaims` pour payload JWT UTF-8 (noms avec accents) afin d'eviter un echec de parsing session. [src/services/auth/auth-session.ts]
- [x] [AI-Review][MEDIUM] Aligner la File List story avec la realite Git de la revue (working tree propre: aucune preuve locale des fichiers listes). [git log --oneline]

## Dev Notes

### Contexte architecture et guardrails

- Le frontend actuel (Vite + React Router) depend encore de `supabase.auth` via:
  - `src/services/api/auth.service.ts`
  - `src/contexts/AuthContext.tsx`
- Le backend NestJS auth est deja operationnel avec contrats:
  - `POST /auth/login` -> `201` + `{ accessToken, refreshToken }`
  - `POST /auth/refresh` -> `201` + rotation refresh
  - `POST /auth/logout` -> `204`
- Contraintes projet (project-context):
  - pas de nouvelle dependance runtime Supabase pour l'auth,
  - logique token/session centralisee,
  - migration progressive sans rupture UX.

### Exigences techniques obligatoires

- Ne jamais stocker de token en clair dans des logs.
- Le refresh doit etre centralise, idempotent cote client, et sans boucle infinie.
- Les redirections auth doivent rester deterministes: `anon -> /auth/login`, `auth success -> from|/app/dashboard`.
- Toute erreur auth front doit produire un message actionnable (pas d'erreur technique brute).
- Pas de duplication de logique auth entre composants; utiliser `AuthContext` + service dedie.

### Architecture compliance (a respecter pendant implementation)

- Reuse avant creation: etendre `AuthContext` et `auth.service.ts` existants au lieu de dupliquer.
- Isoler le stockage des tokens dans un module utilitaire unique (pas d'acces direct depuis les pages).
- Garder `ProtectedRoute` comme point de controle principal d'acces route privee.
- Limiter l'impact aux chemins auth pour garder PR atomique.

### Library / framework requirements

- Front: React 18 + React Router 6 (`react-router-dom` `^6.30.1` present).
- Data fetching: React Query deja present; ne pas contourner conventions de cache si appels auth y sont relies.
- Backend auth: NestJS 10 + DTO validation (`class-validator`).

### File structure requirements (cibles probables)

- `src/services/api/auth.service.ts` (migration appels auth)
- `src/contexts/AuthContext.tsx` (source de verite session)
- `src/components/ProtectedRoute.tsx` (guard + redirection)
- `src/pages/auth/Login.tsx` (orchestration UI login)
- `src/types/index.ts` (types auth/session si evolution necessaire)
- Nouveau module recommande:
  - `src/services/auth/token-storage.ts` (ou dossier equivalent service auth)
  - `src/services/api/http-client.ts` si intercept refresh mutualise

### Testing requirements

- Couvrir au minimum:
  - login success -> redirection vers `from`
  - route protegee anon -> `/auth/login` + `state.from`
  - refresh success apres 401 -> requete rejouee
  - refresh fail (401/403) -> logout force + redirection login
  - logout utilisateur -> tokens supprimes + retour login
- Verifier absence de boucle de navigation sur expiration session.
- Verifier absence de nouvel import runtime `@supabase/supabase-js` dans la nouvelle logique auth.

### Previous Story Intelligence (Story 2.1)

- Story 2.1 a etabli les contrats backend NestJS auth et la rotation refresh.
- Le durcissement review a impose:
  - secrets JWT obligatoires via env,
  - validation DTO stricte,
  - persistance de revocation (evolution traitee en Story 2.5).
- Impact pour 2.4: le frontend doit traiter proprement `401/403` et ne jamais supposer qu'un refresh est toujours possible.

### Git Intelligence Summary

Commits recents pertinents:
- `9ba59fe` review des changements backend auth refresh
- `593cbba` execution workflow code review
- `ee0034b` generation du `project-context.md`

Interpretation actionnable:
- Le chantier auth backend est actif et relu; story frontend doit se brancher sur les endpoints existants, sans re-ouvrir le scope backend.
- Respecter les guardrails documentes dans `project-context.md` pour eviter regression de migration.

### Latest Tech Information (sources officielles)

- React Router doc (branche `latest`) expose v7.13.1 avec maintiens de v6.30.x; le projet etant en v6.30.1, rester en v6 pour cette story minimise le risque de regression UX pendant migration auth.
- React Router recommande `Link/NavLink` pour navigation utilisateur et reserve `useNavigate` aux navigations programmatiques (post-login, timeout, logout), ce qui correspond au besoin de redirection auth.
- NestJS ValidationPipe recommande usage global et options `whitelist` / `forbidNonWhitelisted` / `transform` pour durcir les payloads; verifier que les e2e front attendent bien les erreurs DTO backend.
- JWT RFC 7519: claims `sub` et `exp` restent references standards; la validation expiration et rejet token expire doivent etre strictement respectes cote front (via gestion 401/403 et refresh).

### Project Structure Notes

- La story cible un front Vite/React existant mais doit rester "Next.js-ready" selon `project-context` (separation claire UI/auth/data).
- Aucun changement de routing global hors auth n'est attendu.
- Le couplage temporaire Supabase doit reculer sur le flux auth uniquement dans ce lot.

### Definition of Done

- Flux login frontend passe exclusivement par l'API NestJS auth.
- Gestion refresh implementee et testee sans boucle.
- Redirections `ProtectedRoute` et post-login conformes aux AC.
- Aucun ajout de dependance runtime Supabase auth dans le nouveau code.
- Lint/typecheck et tests auth front pertinents passes.

### References

- Source story: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.4)
- Contexte produit: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md`
- Contexte migration: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md`
- Story precedente backend: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/2-1-mettre-en-place-lauth-nestjs-jwt-refresh.md`
- Story dependance persistence: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/2-5-persister-refresh-tokens-en-postgresql.md`
- Code front actuel: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/auth.service.ts`, `/Volumes/mySD1.5/projects/agilys-spark-joy/src/contexts/AuthContext.tsx`, `/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/ProtectedRoute.tsx`, `/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/auth/Login.tsx`
- Code API auth: `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/auth.controller.ts`, `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/auth.service.ts`, `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/README.md`
- React Router docs: https://reactrouter.com/start/declarative/navigating
- NestJS Auth docs: https://docs.nestjs.com/security/authentication
- NestJS Validation docs: https://docs.nestjs.com/techniques/validation
- JWT spec: https://www.rfc-editor.org/rfc/rfc7519

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Analyse exhaustive: sprint-status, epics, PRD, project-context, stories 2.1 et 2.5, code front auth actuel, contrats backend auth.
- Selection story explicite utilisateur: `2-4-migrer-le-frontend-auth-sans-rupture-ux`.
- Migration implementee: token storage centralise, client HTTP auth avec refresh single-flight, AuthContext sans Supabase auth.
- Validations executees: `npm run lint`, `npx tsc -b --pretty false`, `npx playwright test tests/auth-migration.spec.ts --reporter=line`.

### Implementation Plan

- Introduire une couche auth front centralisee (`token-storage`, decode JWT, `http-client`) pour piloter login/refresh/logout via NestJS.
- Migrer `auth.service.ts` pour utiliser exclusivement les endpoints NestJS sur les flux de session.
- Remplacer `AuthContext` pour hydrater la session locale, gerer l'expiration/refresh et exposer la meme API publique.
- Preserver les redirections UX via `ProtectedRoute` et Login (`from` + fallback dashboard, sans flash).
- Ajouter des tests front ciblant token storage, retry apres refresh et nettoyage session en echec refresh.
- Documenter la variable frontend API base URL et la checklist de decommission Supabase auth.

### Completion Notes List

- Flux login frontend migre de Supabase vers `POST /auth/login`, avec stockage local access/refresh.
- Strategie refresh centralisee implementee: single-flight, retry unique apres 401, nettoyage session + notification echec.
- `AuthContext` migre en source de verite session locale API, en conservant API publique (`login`, `logout`, `isAuthenticated`, `hasRole`).
- Redirections UX preservees (`state.from` complet dans `ProtectedRoute`, fallback `/app/dashboard`, `navigate(..., { replace: true })`).
- Hints comptes de test login alignes backend NestJS (`AUTH_TEST_USER_EMAIL` / `AUTH_TEST_USER_PASSWORD`).
- Tests auth ajoutes et passes (4 scenarii): storage, refresh success retry, refresh fail cleanup, parsing claims/expiration.
- Documentation mise a jour: variable `VITE_API_BASE_URL` et checklist de decommission Supabase auth (lot 2.4).
- Correctifs review appliques: suppression navigation login redondante, redirection explicite vers login sur auth failure/logout avec preservation `from`, suppression du couplage Supabase auth dans `auth.service`, alignement README endpoints, extension couverture tests auth.
- Correctifs de rereview appliques: inscription frontend alignee sur le contrat backend courant (libre-service desactive tant que `/auth/register` n'existe pas), preservation de la route courante sur logout apres navigation interne, refresh reseau non destructif (tokens conserves, reponse `503` normalisee).

### File List

- _bmad-output/implementation-artifacts/2-4-migrer-le-frontend-auth-sans-rupture-ux.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/services/auth/token-storage.ts
- src/services/auth/auth-session.ts
- src/services/auth/auth-routing.ts
- src/services/api/http-client.ts
- src/services/api/auth.service.ts
- src/contexts/AuthContext.tsx
- src/components/ProtectedRoute.tsx
- src/pages/auth/Login.tsx
- src/types/index.ts
- tests/auth-migration.spec.ts
- README.md
- docs/supabase-auth-decommission-checklist.md

### Git Evidence (tracabilite implementation)

- HEAD local pendant cette revue: `b2a3d27` (`Fix login for local auth`).
- Commits portant les changements de la story 2.4 et revues associees:
  - `f39a38c` (advance migration auth frontend),
  - `42bf24b` (review auth migration diff),
  - `0e47d5e` (verification docs/tests migration auth),
  - `b2a3d27` (correctif login local auth).
- Conclusion: l'absence de diff locale au moment de la revue precedente venait d'un lot deja committe, pas d'une absence d'implementation.

## Change Log

- 2026-03-02: Creation de la story 2.4 en format context-filled, avec contraintes d'implementation, intelligence stories precedentes et references techniques officielles.
- 2026-03-02: Implementation complete de la migration auth frontend vers API NestJS (login/refresh/logout), tests front ajoutes, documentation et checklist de decommission mises a jour.
- 2026-03-02: Correctifs post-review HIGH/MEDIUM appliques (redirections auth explicites, suppression supabase auth runtime dans `auth.service`, couverture tests et documentation endpoint harmonisee).
- 2026-03-02: Revue senior adversariale: 1 HIGH + 3 MEDIUM ouverts, statut repasse a `in-progress`, action items ajoutes.
- 2026-03-02: Correctifs findings review appliques (coverage AC7 etendue, gestion erreur reseau signup, decode JWT UTF-8, tracabilite Git explicitee), retour statut `review`.
- 2026-03-02: Correctifs complementaires de re-review appliques (refresh reseau robuste, anti faux-succes login, couverture UX route protegee->login->retour), statut passe a `done`.
- 2026-03-02: Re-review corrective appliquee (durcissement redirect post-login vers `/app/*`, normalisation des erreurs reseau HTTP client en `503`, parsing `message[]` signup, suppression `clientId` implicite), tests auth front passes.
- 2026-03-02: Re-review corrective appliquee (logout frontend non bloquant cote UX, assouplissement redirect `/app` avec query/hash, message login reseau 503 actionnable, ajout test UI logout -> login + purge tokens), lint + tests auth front passes.
- 2026-03-08: Correctifs post-review appliques sur la branche courante: desactivation explicite de l'inscription libre-service non supportee, mise a jour du `logout` pour conserver la route active, et distinction refresh token invalide vs panne reseau transitoire avec couverture de test.

## Senior Developer Review (AI)

Date: 2026-03-02
Reviewer: Max
Outcome: Approved

### Findings

1. [RESOLU] Robustesse refresh: erreur reseau capturee et traitee (clear session + notification auth failure, sans rejection non geree).
   - References: `src/services/api/http-client.ts`, `tests/auth-migration.spec.ts`.
2. [RESOLU] Faux succes login elimine: `AuthContext.login` retourne echec si la session valide ne peut pas etre etablie.
   - References: `src/contexts/AuthContext.tsx`.
3. [RESOLU] Couverture AC7 etendue: ajout test navigateur Playwright validant route protegee anon -> login -> retour route demandee apres login.
   - References: `tests/auth-migration.spec.ts`.
4. [RESOLU] Redirection post-login durcie: rejet des destinations hors espace applicatif (`/app/*`) pour eviter boucle/retour login.
   - References: `src/services/auth/auth-routing.ts`, `tests/auth-migration.spec.ts`.
5. [RESOLU] Erreurs reseau client HTTP normalisees: `request` et retry retournent une `Response 503` stable au lieu d'une exception brute.
   - References: `src/services/api/http-client.ts`, `tests/auth-migration.spec.ts`.
6. [RESOLU] Qualite erreur signup amelioree: support `message[]` backend et suppression du `clientId` implicite hardcode.
   - References: `src/services/api/auth.service.ts`, `tests/auth-migration.spec.ts`.

## Senior Developer Review (AI) - Re-review 2

Date: 2026-03-02
Reviewer: Max
Outcome: Approved

### Findings

1. [RESOLU] Logout "best effort" aligne UX: nettoyage session + redirection login immediats, appel backend logout declenche en arriere-plan.
   - References: `src/contexts/AuthContext.tsx`, `src/services/api/auth.service.ts`.
2. [RESOLU] Normalisation redirect assouplie pour accepter `/app?*` et `/app#*` (en plus de `/app` et `/app/*`).
   - References: `src/services/auth/auth-routing.ts`.
3. [RESOLU] Couverture AC7 completee avec scenario UI de deconnexion: login -> dashboard -> deconnexion -> retour login + purge tokens locaux.
   - References: `tests/auth-migration.spec.ts`.
4. [RESOLU] Erreur login reseau rendue actionnable sur `503` normalise.
   - References: `src/services/api/auth.service.ts`.

## Senior Developer Review (AI) - Correctifs 2026-03-08

Date: 2026-03-08
Reviewer: Max
Outcome: Fixed Pending Validation

### Correctifs appliques

1. [RESOLU] Le frontend ne tente plus un `POST /auth/register` absent du backend; l'inscription libre-service est maintenant annoncee comme indisponible.
   - References: `src/services/api/auth.service.ts`, `src/pages/auth/Login.tsx`, `README.md`.
2. [RESOLU] La valeur memoisée du `AuthContext` est resynchronisee avec la route courante, ce qui conserve correctement `state.from` apres navigation interne suivie d'un logout.
   - References: `src/contexts/AuthContext.tsx`, `tests/auth-migration.spec.ts`.
3. [RESOLU] Une panne reseau pendant `POST /auth/refresh` ne purge plus la session locale; le client retourne une `503` normalisee sans declencher de logout force.
   - References: `src/services/api/http-client.ts`, `tests/auth-migration.spec.ts`.
