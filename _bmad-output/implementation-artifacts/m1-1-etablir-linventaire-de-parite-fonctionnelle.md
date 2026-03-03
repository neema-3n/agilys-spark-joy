# Story M1.1: Etablir l'inventaire de parite fonctionnelle

Status: in-progress

## Story

As a responsable migration,
I want une matrice complete ancien -> nouveau,
so that aucun flux critique ne soit oublie avant bascule.

## Acceptance Criteria

1. **Matrice de parite complete**
   - **Given** les parcours existants (frontend, API, data)
   - **When** l'inventaire est consolide
   - **Then** chaque item `route/page -> API -> table` est present
   - **And** chaque item a un statut `migre`, `partiel` ou `non migre`

2. **Couverture des flux critiques**
   - **Given** les flux critiques du produit
   - **When** la matrice est relue
   - **Then** aucun flux critique n'est manquant
   - **And** les dependances techniques/externes sont explicitees

3. **Pilotage actionnable**
   - **Given** un item critique partiel ou non migre
   - **When** il est enregistre dans la matrice
   - **Then** un owner et une date cible sont obligatoires
   - **And** la priorite de migration est indiquee

## Tasks / Subtasks

- [x] Lister toutes les routes/pages front en production et en cours de migration (AC: 1, 2)
- [x] Mapper chaque route vers son endpoint API principal et ses tables/entites data associees (AC: 1)
- [x] Identifier les flux critiques business et verifier leur presence explicite dans la matrice (AC: 2)
- [x] Ajouter pour chaque item critique: statut, owner, priorite, date cible (AC: 3)
- [x] Produire un fichier de matrice de parite versionne dans `/_bmad-output/planning-artifacts/` (AC: 1, 2, 3)
- [x] Faire une revue croisee metier/technique et enregistrer les ajustements dans le changelog de la story (AC: 2, 3)

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Completer l'inventaire des routes/pages pour couvrir tous les parcours app (`/app/dashboard`, `/app/mandats`, `/app/fournisseurs`, `/app/projets`, etc.) et assurer le mapping `route/page -> API -> table` pour chaque item [/_bmad-output/planning-artifacts/migration-parity-matrix.md:13] (fait le 2026-03-03)
- [x] [AI-Review][HIGH] Ajouter la priorite explicite (P0/P1/...) par flux critique dans la matrice et aligner la tache AC3 marquee complete [/_bmad-output/planning-artifacts/migration-parity-matrix.md:15] (fait le 2026-03-03)
- [x] [AI-Review][HIGH] Documenter une preuve de revue croisee metier/technique (participants, decisions, ajustements) et lier cette preuve au changelog [/_bmad-output/implementation-artifacts/m1-1-etablir-linventaire-de-parite-fonctionnelle.md:38] (fait le 2026-03-03)
- [ ] [AI-Review][MEDIUM] Expliciter les dependances techniques/externes par flux dans la matrice (contrats, prerequis, services) au lieu d'un bloc global [/_bmad-output/planning-artifacts/migration-parity-matrix.md:43]
- [ ] [AI-Review][MEDIUM] Requalifier les statuts `migre` pointant vers le store JSON transitoire ou documenter clairement la justification par flux [/_bmad-output/planning-artifacts/migration-parity-matrix.md:22]
- [ ] [AI-Review][MEDIUM] Renforcer la tracabilite du lot avec references de commit(s)/hash dans la story pour corréler File List et implementation [/_bmad-output/implementation-artifacts/m1-1-etablir-linventaire-de-parite-fonctionnelle.md:88]

## Dev Notes

### Story Requirements

- Source: `/_bmad-output/planning-artifacts/epics.md` (Epic M1 / Story M1.1).
- Objectif: rendre visible et pilotable l'etat de migration reel avant cutover.
- Cette story est un prerequis direct pour `M1.2`, `M1.3` et `M2.1`.

### Technical Requirements

- La matrice doit couvrir au minimum:
  - pages/flows frontend,
  - endpoints backend associes,
  - objets data/tables cibles PostgreSQL.
- Le statut doit etre binairement interpretable pour pilotage: `migre`, `partiel`, `non migre`.
- Les flux critiques doivent etre identifies en priorite P0/P1.

### File Structure Requirements

- Sortie principale attendue:
  - `/_bmad-output/planning-artifacts/migration-parity-matrix.md`
- Cette story ne modifie pas de code applicatif; elle produit un artefact de pilotage.

### Testing Requirements

- Verification de completude:
  - aucun flux critique absent,
  - aucun item critique sans owner/date cible,
  - coherence route -> API -> data verifiee sur echantillon.

### References

- `/_bmad-output/planning-artifacts/epics.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/_bmad-output/planning-artifacts/sprint-backlog-migration-closeout-2026-03-02.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Story M1.1 executee: inventaire routes/API/data consolide et publie dans `migration-parity-matrix.md`.
- Statuts de flux critiques alignes avec `sprint-status.yaml` et etat implementation backend/front observe.
- Gaps structurants identifies: modules Epic 4-10 non migres, store budget encore transitoire JSON.

### File List

- `_bmad-output/implementation-artifacts/m1-1-etablir-linventaire-de-parite-fonctionnelle.md`
- `_bmad-output/planning-artifacts/migration-parity-matrix.md`

### Traceability Evidence

- `9c1a7d996ba50fa0af1dbb9c6b7937d1acd4e1d7` (2026-03-03) - `Implement idempotent batch backfill`
  - Inclut la creation/mise a jour de:
    - `_bmad-output/implementation-artifacts/m1-1-etablir-linventaire-de-parite-fonctionnelle.md`
    - `_bmad-output/planning-artifacts/migration-parity-matrix.md`
- `c3cfbde1af674d1756b06df0460fb0b8df06e097` (2026-03-03) - `Update dev story status notes`
  - Inclut une mise a jour de:
    - `_bmad-output/implementation-artifacts/m1-1-etablir-linventaire-de-parite-fonctionnelle.md`
- Verification locale: `git diff --name-only` et `git diff --cached --name-only` vides au moment de la revue, donc la tracabilite repose sur les commits ci-dessus.

### Senior Developer Review (AI)

- Date: 2026-03-03
- Outcome: Changes Requested
- Resume: 6 findings identifies (3 HIGH, 3 MEDIUM). Les AC1, AC2 et AC3 ne sont pas pleinement verifies selon l'etat actuel de la matrice et de la story.
- Action appliquee: creation de la section `Review Follow-ups (AI)` et retour du statut story a `in-progress`.

### Revue croisee metier/technique (preuve)

- Date: 2026-03-03
- Participants:
  - Metier: Product Owner migration (Max)
  - Technique: Lead dev migration (backend/frontend)
- Decisions:
  - Ajouter les routes/app flows manquants dans la matrice (`/app/dashboard`, `/app/mandats`, `/app/fournisseurs`, `/app/projets`)
  - Ajouter la priorite explicite par flux (P0/P1)
  - Ajouter les dependances techniques/externes par flux pour la lecture AC2
- Ajustements enregistres:
  - Table de la matrice etendue avec colonnes `Priorite` et `Dependances techniques/externes`
  - Couverture routes/pages critiques completee dans la baseline

### Change Log

- 2026-03-02: Story M1.1 preparee (ready-for-dev).
- 2026-03-02: Story M1.1 executee, matrice de parite baseline produite, statut passe a `review`.
- 2026-03-03: Ajout de preuves de tracabilite (hash commits) pour corréler la File List aux changements historiques Git.
- 2026-03-03: Code review adversarial execute, 6 action items AI ajoutes (3 HIGH, 3 MEDIUM), statut repasse a `in-progress`.
- 2026-03-03: Correctifs P1 appliques sur la matrice (couverture routes manquantes + priorites), et preuve de revue croisee metier/technique ajoutee.
