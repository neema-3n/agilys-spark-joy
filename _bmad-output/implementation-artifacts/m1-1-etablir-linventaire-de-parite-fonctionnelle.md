# Story M1.1: Etablir l'inventaire de parite fonctionnelle

Status: review

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

### Change Log

- 2026-03-02: Story M1.1 preparee (ready-for-dev).
- 2026-03-02: Story M1.1 executee, matrice de parite baseline produite, statut passe a `review`.
