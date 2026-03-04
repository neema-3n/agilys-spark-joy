# Rapport de revalidation securite M4.1 (RBAC/ABAC & SoD)

Date: 2026-03-04  
Story: `m4-1-revalider-rbac-abac-et-separation-des-responsabilites`

## 1) Perimetre et methode

Objectif: revalider post-migration que les endpoints sensibles appliquent correctement RBAC/ABAC, la separation ordonnateur/comptable (SoD), l'isolement tenant, et la journalisation des refus.

Methode executee:
- Revue des endpoints proteges par `JwtAuthGuard` + `AuthorizationPolicyGuard`.
- Extension de la couverture e2e backend sur les cas denies/allow critiques.
- Verification du payload d'audit (minimal, sans donnees sensibles).
- Execution des validations techniques demandees par la story.

## 2) Matrice de revalidation des autorisations sensibles

| Endpoint sensible | Permission attendue | Cas autorise valide | Cas refuse valide |
|---|---|---|---|
| `PATCH /auth/users/:userId/roles/assign` | `roles:manage` | `super_admin` et `admin_client` intra-tenant | `operateur_saisie` (permission insuffisante), `admin_client` inter-tenant |
| `PATCH /auth/users/:userId/roles/revoke` | `roles:manage` | `super_admin` et `admin_client` intra-tenant | `admin_client` inter-tenant |
| `POST /budget-referentiels/exercices` | `referentiels:write` | `directeur_financier` apres assign role | role sans permission write (403) |
| `GET /tenant-policies/retention` | `tenant_policies:read` | admin tenant proprietaire | lecture inter-tenant refusee |
| `PATCH /tenant-policies/retention` | `tenant_policies:write` | admin tenant proprietaire; `super_admin` explicite cible tenant | mutation inter-tenant refusee pour non super-admin |

Priorisation M3/M4 appliquee:
- Flux role management (`roles:manage`) et tenant policies (isolation ABAC).
- Flux referentiel metier migre (`budget-referentiels`) pour verifier non-regression des permissions.

## 3) Resultats des tests de securite

Commandes executees:

```bash
pnpm --dir backend run test -- auth.e2e.spec.ts tenant-policies.e2e.spec.ts
pnpm --dir backend run test
pnpm --dir backend run lint
```

Synthese resultats:
- `PASS test/tenant-policies.e2e.spec.ts`
- `PASS test/auth.e2e.spec.ts`
- Tests: `22 passed`, `1 skipped`, `23 total`
- Regression backend complete: `14 suites pass`, `90 passed`, `1 skipped`, `91 total`
- Lint/typecheck backend: OK (`tsc --noEmit`)

Scenarios ajoutes/renforces (M4.1):
- `super_admin` autorise en gestion de roles inter-tenant (assign/revoke) et operation tracee.
- Refus explicite avec motif deterministic pour tentative role management sans `roles:manage`.
- Verification explicite de la journalisation deny sur endpoint sensible auth.
- Verification absence champs sensibles (`password`, `passwordHash`, `refreshToken`) dans les logs d'autorisation auth.

## 4) Verification journalisation d'autorisation

Payload minimal attendu et constate:
- `userId`
- `tenantId`
- `action`
- `decision`
- `timestamp`
- `reason`

Constat:
- Les decisions deny sont journalisees sur endpoints auth/tenant-policies.
- Les motifs de refus sont explicites (`Permission insuffisante: roles:manage`, `Access hors tenant refuse`, `Separation des responsabilites...`).
- Aucune fuite de donnees sensibles detectee dans les payloads d'audit verifies.

## 5) Ecarts et risques residuels

Ecarts bloquants: aucun.

Risques residuels:
- La matrice couvre les flux critiques M3/M4 et les endpoints sensibles majeurs; l'extension a 100% de tous les endpoints metier `referentiels:write` peut etre poursuivie de facon incrementale dans les stories de hardening futures.

## 6) Decision GO/NO-GO

Decision: **GO** pour passage en revue M4.1.

Justification:
- RBAC/ABAC confirme sur flux critiques testes.
- SoD ordonnateur/comptable revalide (0 violation observee dans les scenarios cibles).
- Isolation tenant maintenue (non-super-admin refuses hors tenant, super-admin conforme aux regles explicites).
- Journalisation deny/allow exploitable pour audit et sans fuite sensible.

## 7) Lien explicite vers M4.2 (dossier d'audit)

Ce rapport constitue une preuve d'entree pour `m4-2-produire-le-dossier-daudit-de-migration`:
- matrice de controle d'acces,
- resultats de non-regression securite,
- preuves de journalisation,
- decision GO/NO-GO et risques residuels traces.
