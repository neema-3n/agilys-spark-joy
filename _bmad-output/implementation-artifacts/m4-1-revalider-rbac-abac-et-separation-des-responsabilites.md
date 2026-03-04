# Story M4.1: Revalider RBAC/ABAC et separation des responsabilites

Status: ready-for-dev
Epic: M4 - Securite et conformite de migration
Story Key: m4-1-revalider-rbac-abac-et-separation-des-responsabilites
Created: 2026-03-03

## Story

As a security lead,
I want revalider les regles d'acces sur le nouveau stack,
so that aucune faille d'autorisation ne soit introduite.

## Acceptance Criteria

1. **Given** les operations sensibles du domaine
   **When** les tests d'autorisation sont executes
   **Then** RBAC/ABAC et separation ordonnateur/comptable sont appliques sans violation
   **And** toute tentative non autorisee est bloquee et journalisee.

2. **Given** les endpoints critiques exposes apres migration auth
   **When** les tests de non-regression securite sont lances
   **Then** les permissions attendues sont appliquees de facon deterministe par role
   **And** les refus incluent un motif explicite sans fuite de donnees sensibles.

3. **Given** un acteur admin client et un acteur super admin
   **When** une gestion de roles est tentee intra-tenant et inter-tenant
   **Then** le perimetre tenant est strictement enforce pour les non-super-admin
   **And** les operations compatibles super-admin restent possibles et tracees.

## Tasks / Subtasks

- [ ] Construire la matrice de revalidation des autorisations sensibles (AC: 1, 2)
  - [ ] Lister les endpoints critiques couverts par `JwtAuthGuard` + `AuthorizationPolicyGuard`
  - [ ] Associer pour chaque endpoint: role attendu, permissions requises, cas refuse
  - [ ] Prioriser les flux M3/M4 et les flux metier deja migres (auth, referentiels, tenant policies)

- [ ] Etendre la couverture de tests de securite backend (AC: 1, 2, 3)
  - [ ] Ajouter/mettre a jour tests e2e sur scenarios autorise/refuse par role
  - [ ] Ajouter cas explicites separation ordonnateur/comptable sur permissions sensibles
  - [ ] Ajouter cas inter-tenant (admin_client refuse, super_admin autorise selon politique)

- [ ] Verifier la qualite de la journalisation d'autorisation (AC: 1, 2)
  - [ ] Valider payload minimal (`userId`, `tenantId`, `action`, `decision`, `timestamp`, `reason`)
  - [ ] Confirmer l'absence de donnees sensibles dans les logs d'audit
  - [ ] Produire un extrait de preuve dans les artefacts implementation

- [ ] Produire un rapport de revalidation securite M4.1 (AC: 1, 2, 3)
  - [ ] Ajouter un artefact dedie dans `/_bmad-output/implementation-artifacts/`
  - [ ] Documenter couverture, resultats, ecarts et decisions GO/NO-GO
  - [ ] Lier explicitement les resultats a la preparation du dossier d'audit M4.2

## Dev Notes

### Story Requirements

- Source normative: `/_bmad-output/planning-artifacts/epics.md` (Epic M4 / Story M4.1).
- Gate migration: M4.1 depend de M3.3 (decommission Supabase) et doit servir de preuve securite avant M4.2.
- DoD backlog closeout (`sprint-backlog-migration-closeout-2026-03-02.md`):
  - tests autorisation sur operations sensibles,
  - `0` violation separation ordonnateur/comptable,
  - journalisation securite validee.

### Developer Context Section

- Etat actuel observe dans le code:
  - politique centralisee dans `backend/src/auth/authorization-policy.service.ts`,
  - permissions/roles dans `backend/src/auth/authorization.types.ts`,
  - enforcement via `AuthorizationPolicyGuard` et decorateur `RequirePermissions`,
  - gestion de roles via `PATCH /auth/users/:userId/roles/assign|revoke`,
  - audit minimal via `AuthorizationAuditService`.
- Les tests existants couvrent deja des cas critiques (assign/revoke, inter-tenant, audit). M4.1 doit completer et formaliser la revalidation post-migration.
- Ne pas remodeler l'architecture auth en M4.1: objectif = revalidation, durcissement de preuves, fermeture des gaps.

### Technical Requirements

- Conserver le modele RBAC/ABAC existant; eviter toute regression de permissions.
- Enforcer explicitement la separation des responsabilites sur actions sensibles (`referentiels:write`, `roles:manage`).
- Verifier que toute decision `deny` renvoie un motif exploitable et coherent cote API.
- Garantir l'isolement tenant sur la gestion des roles (hors super-admin).
- Produire des preuves testables et rejouables (tests + rapport) pour audit M4.2.

### Architecture Compliance

- Conforme a `/_bmad-output/project-context.md`:
  - nouvelles regles metier cote NestJS,
  - validations securite explicites avant merge,
  - couverture tests autorisation/non-regression obligatoire.
- Conformite NFR a maintenir:
  - NFR8 (RBAC/ABAC sur 100% operations sensibles),
  - NFR10 (`0` violation separation ordonnateur/comptable),
  - NFR9 (journalisation actions critiques).

### Library Framework Requirements

- Backend cible: NestJS `10.4.22` (stack locale actuelle).
- Frontend transitoire: React/Vite, sans impact direct sur la logique d'autorisation backend.
- Pas de nouvelle dependance runtime Supabase; M4.1 opere sur le stack post-M3.3.
- Ne pas introduire de nouvelle librairie d'autorisation si les abstractions existantes couvrent le besoin.

### File Structure Requirements

- Story file:
  - `/_bmad-output/implementation-artifacts/m4-1-revalider-rbac-abac-et-separation-des-responsabilites.md`
- Zones code cibles probables:
  - `backend/src/auth/authorization.types.ts`
  - `backend/src/auth/authorization-policy.service.ts`
  - `backend/src/auth/authorization-policy.guard.ts`
  - `backend/src/auth/auth.service.ts`
  - `backend/src/auth/auth.controller.ts`
  - `backend/test/auth.e2e.spec.ts`
  - `backend/test/tenant-policies.e2e.spec.ts`
- Artefact de preuve attendu:
  - `/_bmad-output/implementation-artifacts/m4-1-security-revalidation-report-YYYY-MM-DD.md`

### Testing Requirements

- Obligatoire:
  - tests e2e autorise/refuse par role sur endpoints sensibles,
  - test explicite incompatibilite `ordonnateur + comptable` sur actions sensibles,
  - test gestion role inter-tenant (`admin_client` refuse, `super_admin` selon regle),
  - test payload audit minimal sans champs sensibles.
- Verification complementaire:
  - executer `pnpm --dir backend run test -- auth.e2e.spec.ts tenant-policies.e2e.spec.ts`
  - executer `pnpm --dir backend run lint`
  - capturer resultats dans le rapport M4.1.

### Latest Tech Information

- Le projet dispose deja d'une base d'autorisation solide et recente; le risque principal n'est pas l'obsolescence technologique, mais la couverture de revalidation apres migration.
- Priorite M4.1: exhaustivite de scenarios de securite et tracabilite d'audit, plutot qu'introduction de nouvelles APIs.

### Project Structure Notes

- M4.1 est une story de verification/assurance qualite securite, pas une story de feature metier.
- Toute modification doit rester atomique, ciblee auth/policy/tests, et orientee preuves auditables.
- Les resultats M4.1 alimentent directement M4.2 (dossier d'audit de migration).

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic M4 / Story M4.1)
- `/_bmad-output/planning-artifacts/sprint-backlog-migration-closeout-2026-03-02.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/_bmad-output/implementation-artifacts/m3-3-decommissionner-supabase-de-facon-controlee.md`
- `/_bmad-output/project-context.md`
- `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization.types.ts`
- `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization-policy.service.ts`
- `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization-policy.guard.ts`
- `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/auth.controller.ts`
- `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/test/auth.e2e.spec.ts`
- `/Volumes/mySD1.5/projects/agilys-spark-joy/backend/test/tenant-policies.e2e.spec.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- create-story workflow execute pour story cible `m4-1-revalider-rbac-abac-et-separation-des-responsabilites`
- contexte charge: `epics.md`, `sprint-status.yaml`, `project-context.md`, M3.3, backlog closeout migration
- analyse code auth/policy/tests backend pour extraire exigences de revalidation concretes

### Completion Notes List

- Story M4.1 creee avec contexte implementation complet et guardrails backend explicites.
- Dependances, contraintes de securite, structure de fichiers et strategie de tests formalisees.
- Story preparee pour execution `dev-story` avec statut `ready-for-dev`.

### File List

- `/_bmad-output/implementation-artifacts/m4-1-revalider-rbac-abac-et-separation-des-responsabilites.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-03: creation du contexte story M4.1 (ready-for-dev) avec exigences de revalidation RBAC/ABAC, separation des responsabilites et preuves d'audit.
