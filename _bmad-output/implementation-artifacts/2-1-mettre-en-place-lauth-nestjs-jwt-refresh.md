# Story 2.1 - Mettre en place l'auth NestJS JWT + refresh

Status: done
Epic: 2 - Gouvernance d'acces, roles et isolation multi-tenant
Story Key: 2-1-mettre-en-place-lauth-nestjs-jwt-refresh
Created: 2026-03-01

## Story

As a utilisateur authentifie,
I want me connecter et maintenir ma session de facon securisee,
So that j'accede aux fonctionnalites selon mes droits.

## Acceptance Criteria

1. **Given** des identifiants valides
   **When** l'utilisateur se connecte via `POST /auth/login`
   **Then** un `accessToken` et un `refreshToken` sont emis
   **And** les claims minimaux (`sub`, `tenantId`, `roles`) sont presents dans l'access token.

2. **Given** un refresh token valide non revoque
   **When** l'utilisateur appelle `POST /auth/refresh`
   **Then** un nouvel access token est emis
   **And** le refresh token est rotate (ancien invalide, nouveau valide).

3. **Given** un refresh token actif
   **When** l'utilisateur appelle `POST /auth/logout`
   **Then** le refresh token est invalide
   **And** un nouvel appel refresh avec l'ancien token est rejete.

4. **Given** des identifiants invalides ou un token invalide/revoque
   **When** l'utilisateur appelle login/refresh
   **Then** l'API retourne une erreur 401/403 selon le cas
   **And** aucun token exploitable n'est emis.

5. **Given** un evenement auth (login success/failure, refresh, logout)
   **When** l'operation est traitee
   **Then** un log minimal est emis avec `userId` (si connu), `tenantId` (si connu), type d'evenement et horodatage.

## Scope Technique (MVP Story 2.1)

- Backend NestJS:
  - endpoint `POST /auth/login`
  - endpoint `POST /auth/refresh`
  - endpoint `POST /auth/logout`
- Persistence:
  - stockage securise des refresh tokens (hash uniquement)
- Security:
  - expiration access token courte
  - rotation refresh token
  - journalisation minimale des evenements auth

## Out of Scope

- Interface frontend complete de migration auth (Story 2.4)
- RBAC fin sur tous les modules (Story 2.2)
- Isolation multi-tenant exhaustive des donnees (Story 2.3)

## Tasks / Subtasks

- [x] Initialiser la base Auth NestJS (AC: 1, 4)
  - [x] Creer/mettre a jour le module `AuthModule`, controller et service pour `/auth/login`, `/auth/refresh`, `/auth/logout`
  - [x] Ajouter la configuration JWT access/refresh (secrets via env, TTL distincts)
  - [x] Definir les DTO de requete/reponse et validations d'entree

- [x] Implementer login avec emission de tokens (AC: 1, 4)
  - [x] Verifier credentials via service de users
  - [x] Generer access token avec claims minimaux `sub`, `tenantId`, `roles`
  - [x] Generer refresh token, hasher avant persistance, retourner token clair uniquement dans la reponse login
  - [x] Gerer erreurs credentials invalides avec status HTTP conforme

- [x] Implementer refresh avec rotation (AC: 2, 4)
  - [x] Verifier signature/expiration du refresh token
  - [x] Verifier hash stocke et statut non revoque
  - [x] Invalider l'ancien token et enregistrer le nouveau hash
  - [x] Retourner nouveau couple access/refresh token

- [x] Implementer logout (AC: 3)
  - [x] Invalider le refresh token courant (soft revoke)
  - [x] Garantir qu'un refresh ulterieur avec token invalide est rejete

- [x] Ajouter journalisation auth minimale (AC: 5)
  - [x] Emettre logs structures pour login success/failure, refresh, logout
  - [x] Exclure donnees sensibles (mot de passe, token brut)

- [x] Couvrir par tests API (AC: 1, 2, 3, 4, 5)
  - [x] Tests unitaires service auth (login, refresh, logout, erreurs)
  - [x] Tests d'integration endpoints auth (cas nominaux + rejets)
  - [x] Verifier explicitement la rotation refresh et l'invalidation logout

- [x] Documenter routes et payloads (DoD)
  - [x] Ajouter exemples de payload request/response
  - [x] Documenter codes erreurs attendus

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Remplacer le store in-memory des refresh tokens par une persistence durable (fichier local atomique) pour eviter la perte de revocation au redemarrage. [backend/src/auth/refresh-token.store.ts:1]
- [x] [AI-Review][HIGH] Supprimer les secrets JWT de secours hardcodes et forcer la presence de `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` via validation de configuration au demarrage. [backend/src/auth/auth.service.ts:1]
- [x] [AI-Review][MEDIUM] Ajouter la configuration de test e2e equivalente au runtime (`ValidationPipe`) et couvrir les cas payload invalide pour verifier les DTO. [backend/test/auth.e2e.spec.ts:1]
- [x] [AI-Review][MEDIUM] Nettoyer les artefacts non source (`backend/node_modules`, `backend/dist`) et ajouter les ignores necessaires pour eviter un commit massif accidentel. [backend/.gitignore:1]
- [x] [AI-Review][MEDIUM] Mettre en coherence la File List de la story avec la realite git (inclure fichiers ajoutes pendant remediation). [_bmad-output/implementation-artifacts/2-1-mettre-en-place-lauth-nestjs-jwt-refresh.md:188]

## Dev Notes

### Contexte architecture et guardrails

- Le repository actuel est un front Vite/React avec auth Supabase active (`src/services/api/auth.service.ts`, `src/pages/auth/Login.tsx`).
- La story 2.1 introduit un backend NestJS JWT. Aucune structure Nest dediee n'est presente a ce stade: la mise en place doit etre additive et ne pas casser le front actuel.
- Respecter la contrainte PRD: migration progressive, pas de big-bang, coexistence temporaire controllee.

### Contraintes de mise en oeuvre

- Ne jamais stocker le refresh token en clair en base (hash obligatoire).
- Claims minimaux access token: `sub`, `tenantId`, `roles`.
- Access token TTL court, refresh token TTL plus long.
- Rotation refresh obligatoire a chaque `POST /auth/refresh`.
- Logout invalide le refresh token cote serveur.
- Aucune donnee sensible dans les logs.

### Impacts code attendus (guidage)

- Backend (a creer si absent):
  - `backend/` ou `apps/api/` selon convention retenue pour NestJS
  - module auth: controller/service/strategies/guards/dto
  - persistence refresh token hash + revoke flag/date
- Front existant (pas de migration complete ici):
  - pas de remplacement total de `src/services/api/auth.service.ts` dans cette story
  - eventuelle couche d'adaptation API possible sans casser le parcours existant

### Test strategy minimale pour cette story

- Unit tests:
  - generation claims token
  - hash + verification refresh token
  - invalidation refresh au logout
- Integration tests:
  - `POST /auth/login` succes/echec
  - `POST /auth/refresh` succes/echec + rotation
  - `POST /auth/logout` puis echec refresh

### Definition of Done

- Endpoints auth operationnels en local
- Cas nominal login/refresh/logout testes
- Rejets valides verifies (identifiants invalides / token invalide)
- Documentation courte des routes et payloads

### References

- Source story: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.1)
- Contexte produit: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md` (Additional Requirements: migration auth hors Supabase)
- Contexte code actuel auth front: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/auth.service.ts`, `/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/auth/Login.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Validation VS executee sur story 2-1 avec analyse epics/prd/repo courant.
- Gap majeur corrige: story initiale trop minimale pour `dev-story` (pas de Tasks/Subtasks ni Dev Notes).
- Creation d'un backend NestJS isole dans `backend/` pour conserver la coexistence avec le front Vite/Supabase.
- Campagne de verification executee: `backend` (test + lint + build) et repo racine (lint).

### Implementation Plan

- Scaffolding NestJS minimal (`AppModule`, `AuthModule`) avec endpoints `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.
- Service auth avec claims minimaux (`sub`, `tenantId`, `roles`), JWT access court, JWT refresh long, hash bcrypt des refresh tokens.
- Rotation refresh obligatoire: revoke ancien token (par `jti`) puis emission d'un nouveau couple access/refresh.
- Logout avec revocation serveur du refresh token.
- Logs auth structures sans donnees sensibles via `AuthLoggerService`.
- Couverture de tests unite + integration et documentation des payloads/erreurs.

### Completion Notes List

- Story convertie en format context-filled.
- Acceptance criteria detaillees pour login/refresh/logout + erreurs + logs.
- Tasks/subtasks ajoutees avec mapping explicite aux AC.
- Guardrails de migration progressive ajoutes pour eviter casse du front Supabase actuel.
- Backend NestJS ajoute dans `backend/` avec `AuthModule`, DTOs valides, service users, persistence en memoire des hash refresh + revocation.
- Access token contient les claims requis (`sub`, `tenantId`, `roles`) et refresh token est rotate a chaque `POST /auth/refresh`.
- `POST /auth/logout` invalide le refresh token et bloque sa reutilisation au refresh.
- Journalisation auth minimale implementee (`login_success`, `login_failure`, `refresh`, `logout`) sans mot de passe/token brut.
- Tests passes: unitaires (`src/auth/auth.service.spec.ts`) + integration (`test/auth.e2e.spec.ts`), puis lint/build backend et lint front.

### File List

- _bmad-output/implementation-artifacts/2-1-mettre-en-place-lauth-nestjs-jwt-refresh.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/package.json
- backend/package-lock.json
- backend/.gitignore
- backend/tsconfig.json
- backend/tsconfig.build.json
- backend/jest.config.ts
- backend/README.md
- backend/src/main.ts
- backend/src/app.module.ts
- backend/src/auth/auth.module.ts
- backend/src/auth/auth.controller.ts
- backend/src/auth/auth.service.ts
- backend/src/auth/auth.service.spec.ts
- backend/src/auth/auth-logger.service.ts
- backend/src/auth/auth.types.ts
- backend/src/auth/refresh-token.store.ts
- backend/src/auth/dto/login.dto.ts
- backend/src/auth/dto/refresh.dto.ts
- backend/src/auth/dto/logout.dto.ts
- backend/src/users/users.service.ts
- backend/test/auth.e2e.spec.ts
- backend/test/test-env.ts

## Change Log

- 2026-03-01: Story enrichie en mode validation (VS) avec sections manquantes, AC detaillees, tasks/subtasks, dev notes et references.
- 2026-03-01: Implementation completee (NestJS auth JWT + refresh rotation + logout revoke + logs + tests + doc), statut passe a `review`.
- 2026-03-02: Revue senior adversariale realisee. Statut repasse a `in-progress` avec action items AI review (HIGH/MEDIUM) a traiter.
- 2026-03-02: Remediation automatique des findings HIGH/MEDIUM (persistence durable des refresh tokens, validation stricte des secrets JWT, durcissement e2e DTO, hygiene git backend), statut passe a `done`.

## Senior Developer Review (AI)

Date: 2026-03-02
Reviewer: Max
Outcome: Changes Requested

### Resume

- AC 1, 2, 3 et 4 sont globalement implantees sur les endpoints et les tests nominaux.
- La quality gate n'est pas validee pour passage a `done` en raison de risques de securite/persistence et d'un ecart entre declaration story et realite git.

### Findings

1. **[HIGH] Persistence refresh token non conforme au scope**
   - Evidence: implementation exclusivement en memoire via `Map`, sans stockage durable.
   - Impact: revocations perdues au redemarrage, non compatible multi-instance, contrainte "Persistence" non respectee.
   - Reference: `backend/src/auth/refresh-token.store.ts:14`

2. **[HIGH] Secrets JWT fallback hardcodes**
   - Evidence: `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` tombent sur des valeurs par defaut statiques.
   - Impact: risque de compromission en environnement mal configure.
   - Reference: `backend/src/auth/auth.service.ts:12`

3. **[MEDIUM] Couverture e2e partiellement representative du runtime**
   - Evidence: app e2e initialisee sans `ValidationPipe` global.
   - Impact: les validations DTO ne sont pas verifiees dans les tests d'integration API.
   - Reference: `backend/test/auth.e2e.spec.ts:14`

4. **[MEDIUM] Ecart story vs realite git (traçabilite)**
   - Evidence: la story liste des fichiers backend comme modifies, mais git indique `?? backend/` globalement non versionne.
   - Impact: taches `[x]` difficilement auditables tant que les fichiers ne sont pas suivis proprement.

5. **[MEDIUM] Hygiene repository insuffisante pour la nouvelle app backend**
   - Evidence: presence de `backend/node_modules` et `backend/dist` dans l'arborescence de travail.
   - Impact: risque eleve de commit accidentel de milliers de fichiers et bruit de review.
