# Story M1.2: Verifier la parite des contrats API

Status: review

## Story

As a equipe plateforme,
I want comparer les contrats API ancien/nouveau,
so that les integrations ne cassent pas lors de la migration.

## Acceptance Criteria

1. **Comparaison automatique des contrats critiques**
   - **Given** la liste des endpoints critiques migration
   - **When** la suite de tests de contrat est executee contre le backend de reference et le backend cible
   - **Then** les payloads, codes HTTP et erreurs metier sont compares automatiquement
   - **And** chaque ecart est journalise par endpoint et par severite

2. **Couverture minimale des domaines critiques**
   - **Given** les flux critiques identifies dans la matrice de parite
   - **When** le rapport de couverture est genere
   - **Then** chaque domaine critique expose au moins un test representatif
   - **And** les endpoints non couverts sont listes explicitement

3. **Gate de blocage migration**
   - **Given** un ecart bloqueur detecte
   - **When** le job de verification se termine
   - **Then** le resultat est en echec
   - **And** le rapport contient une action corrective explicite

## Tasks / Subtasks

- [x] Construire l'inventaire des endpoints critiques a partir de la matrice de parite (`AUTH-*`, `TENANT-*`, `BUD-*`) (AC: 1, 2)
- [x] Definir un spec de contrat canonique par endpoint (request, response, status, erreurs metier) (AC: 1)
- [x] Implementer un harness de comparaison de contrats (ancien vs nouveau) reutilisable (AC: 1)
- [x] Ajouter une classification des ecarts (`bloquant`, `majeur`, `mineur`) et un format de rapport stable (AC: 1, 3)
- [x] Integrer l'execution dans le pipeline de verification migration avec code retour non-zero en cas de `bloquant` (AC: 3)
- [x] Documenter la liste des endpoints hors couverture et ouvrir les actions de rattrapage (AC: 2)

## Dev Notes

### Story Requirements

- Source principal: `/_bmad-output/planning-artifacts/epics.md` (Epic M1 / Story M1.2).
- Dependances de sequence imposee: `M1.1`, `M2.1`, `M2.2`, `M2.3` avant `M1.2`.
- Objectif metier: prouver que les integrations ne regressent pas pendant la migration API.

### Developer Context Section

- Cette story est un gate technique avant `M1.3` (non-regression E2E) et avant les gates de cutover `M3.*`.
- Utiliser en priorite les endpoints deja exposes dans:
  - `backend/src/auth/auth.controller.ts`
  - `backend/src/tenant-policies/tenant-policies.controller.ts`
  - `backend/src/budget-referentiels/budget-referentiels.controller.ts`
- La matrice de parite indique les flux deja `migre/partiel/non migre`; la couverture de tests doit refleter cet etat reel.

### Technical Requirements

- Contrat compare pour chaque endpoint critique:
  - schema request (champs requis/optionnels, types)
  - schema response (types, valeurs enum, champs obligatoires)
  - semantics HTTP (2xx, 4xx, 5xx attendus)
  - structure d'erreur metier (code, message, contexte)
- Le diff doit etre deterministe (meme sortie pour meme entree) et versionnable en artefact.
- Les ecarts `bloquant` incluent au minimum:
  - suppression d'un champ obligatoire
  - changement de type non backward compatible
  - code HTTP incompatible avec le contrat
  - disparition d'un code erreur metier attendu

### Architecture Compliance

- Respecter les regles de migration:
  - aucune nouvelle dependance runtime a Supabase
  - logique metier cote NestJS
  - appels front via client API unifie
- Ne pas dupliquer les DTO/contracts si un type existe deja dans `backend/src/**/dto`.
- Conserver les guards d'auth/autorisation dans les scenarios de tests contrats (JWT + policies).

### Library / Framework Requirements

- Backend cible: NestJS `10.4.22` (voir `backend/package.json`).
- Front SPA courant: React `18.3.1`, TypeScript `5.8.3`, Vite `5.4.19` (voir `package.json`).
- Runner de tests backend: Jest (`backend/package.json`).
- Package manager projet: `pnpm@9.12.0`.
- Note de veille: aucune recherche web technique externe appliquee ici; versions derivees des manifests du repo conformement aux regles projet.

### File Structure Requirements

- Ajouter/etendre en priorite:
  - `backend/src/**/dto/*.ts` pour normaliser les contrats source
  - `backend/src/**/**.spec.ts` pour la verification contractuelle
  - `tests/` (si orchestration inter-services necessaire)
- Artefacts de reporting attendus:
  - `/_bmad-output/implementation-artifacts/migration-contract-parity-report.md`
  - `/_bmad-output/implementation-artifacts/migration-contract-parity-diff.json`
- Eviter de creer une seconde source de verite pour les schemas de payload.

### Testing Requirements

- Minimum obligatoire pour cette story:
  - test nominal par endpoint critique
  - test autorisation (role/permission insuffisante)
  - test erreur metier structuree
  - test de non-regression des champs critiques
- Scenarios prioritaires de depart:
  - Auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
  - Tenant policies: `GET/PATCH /tenant-policies/retention`
  - Budget referentiels: endpoints `exercices`, `enveloppes`, `sections`, `programmes`, `actions`, `allocations`, `reallocations`, `decisions`

### Previous Story Intelligence (M1.1)

- `M1.1` a formalise la matrice de parite: l'inventaire des flux critiques existe deja dans `migration-parity-matrix.md`.
- Le statut `partiel` y est explicite pour les zones encore sur store JSON transitoire; ne pas sur-promettre la couverture complete.
- Les preuves de tracabilite doivent etre explicites dans la story (fichiers modifies + references de run).

### Git Intelligence Summary

- Commits recents observes:
  - `8d4518b` Summarize sprint status
  - `a51e5d0` Execute code review workflow
  - `e8c1006` Update M1.1 story status to review
  - `9400b8c` Review code-review workflow files
  - `9ed1daf` Apply code-review fixes
- Pattern de travail recent: documentation implementation-artifacts et synchronisation stricte des statuts.
- Consequence pour M1.2: maintenir la meme discipline de preuves et de mise a jour `sprint-status.yaml`.

### Latest Tech Information

- Versions de reference detectees localement:
  - NestJS `10.4.22`
  - TypeScript backend `5.9.3`, frontend `5.8.3`
  - Jest `29.7.0`
  - Playwright `1.45.0`
- Risque courant a surveiller: derive entre contrats DTO backend et consommation front (`src/services/api/*`).
- Garde-fou: valider les diffs de contrats avant toute extension API pour les epics `M3/M4`.

### Project Context Reference

- Contexte source: `/_bmad-output/project-context.md`
- Regles a appliquer strictement:
  - pas de nouveau couplage UI -> Supabase
  - typer strictement les nouveaux contrats
  - centraliser la logique metier sensible cote backend
  - inclure tests de regression auth et autorisation

### References

- `/_bmad-output/planning-artifacts/epics.md`
- `/_bmad-output/planning-artifacts/migration-parity-matrix.md`
- `/_bmad-output/planning-artifacts/migration-data-strategy.md`
- `/_bmad-output/project-context.md`
- `/backend/src/auth/auth.controller.ts`
- `/backend/src/tenant-policies/tenant-policies.controller.ts`
- `/backend/src/budget-referentiels/budget-referentiels.controller.ts`
- `/_bmad-output/implementation-artifacts/m1-1-etablir-linventaire-de-parite-fonctionnelle.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow loaded: `/_bmad/bmm/workflows/4-implementation/dev-story/*`
- `pnpm --dir backend run test:contracts`
- `pnpm --dir backend run lint`
- `pnpm --dir backend run test`

### Implementation Plan

- Formaliser les contrats critiques legacy/cible sous forme de registre type-safe par endpoint.
- Comparer automatiquement les contrats par route/methode et classifier les ecarts (`bloquant`, `majeur`, `mineur`).
- Generer deux artefacts de preuve (`.md` et `.json`) dans `/_bmad-output/implementation-artifacts`.
- Integrer l'execution dans la pipeline backend via script `test:contracts`.

### Completion Notes List

- Harness de parite de contrats implemente (`backend/src/contracts/*`) avec comparaison legacy vs cible sur endpoints critiques AUTH/TENANT/BUD.
- Classification des ecarts activee (`bloquant`, `majeur`, `mineur`) et gate de blocage applique via test Jest (`0 bloquant` requis).
- Artefacts generes automatiquement:
  - `/_bmad-output/implementation-artifacts/migration-contract-parity-report.md`
  - `/_bmad-output/implementation-artifacts/migration-contract-parity-diff.json`
- Endpoint non couvert documente explicitement: `BUD-04-PREVISIONS` (ecart majeur non bloquant).
- Validation executee: lint backend + suite complete backend tests verte.

### File List

- `_bmad-output/implementation-artifacts/m1-2-verifier-la-parite-des-contrats-api.md`
- `backend/src/contracts/api-contract.types.ts`
- `backend/src/contracts/legacy-critical-contracts.ts`
- `backend/src/contracts/current-critical-contracts.ts`
- `backend/src/contracts/contract-parity.ts`
- `backend/src/contracts/contract-parity.spec.ts`
- `backend/package.json`
- `_bmad-output/implementation-artifacts/migration-contract-parity-report.md`
- `_bmad-output/implementation-artifacts/migration-contract-parity-diff.json`

### Change Log

- 2026-03-03: Regeneration complete de M1.2 avec contexte implementation exhaustif, intelligence story precedente et contraintes architecture/tests.
- 2026-03-03: Implementation M1.2 terminee - moteur de comparaison de contrats ajoute, rapport d'ecarts automatise, script pipeline `test:contracts` ajoute, story passee en `review`.
