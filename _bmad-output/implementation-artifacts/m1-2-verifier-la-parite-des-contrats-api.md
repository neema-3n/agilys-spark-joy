# Story M1.2: Verifier la parite des contrats API

Status: ready-for-dev

## Story

As a equipe plateforme,
I want comparer les contrats API ancien/nouveau,
so that les integrations ne cassent pas lors de la migration.

## Acceptance Criteria

1. **Comparaison contrats critique**
   - **Given** la liste des endpoints critiques
   - **When** les tests de contrat sont executes sur ancien et nouveau backend
   - **Then** payloads, codes et erreurs sont compares automatiquement
   - **And** les differences sont journalisees par endpoint

2. **Couverture minimale par domaine**
   - **Given** les domaines critiques de migration
   - **When** la suite est executee
   - **Then** chaque domaine critique a au moins un test contrat representatif
   - **And** les endpoints non couverts sont listes explicitement

3. **Gate de blocage**
   - **Given** un ecart bloqueur detecte
   - **When** le rapport de run est genere
   - **Then** la story est en echec
   - **And** les ecarts sont classes par severite (bloquant/majeur/mineur)

## Tasks / Subtasks

- [ ] Extraire la liste endpoints critiques depuis la matrice de parite (AC: 1, 2)
- [ ] Definir contrats attendus (request/response/status/error) par endpoint (AC: 1)
- [ ] Implementer tests de contrat compares ancien vs nouveau (AC: 1)
- [ ] Ajouter rapport d'ecarts par severite (AC: 3)
- [ ] Integrer execution dans pipeline CI migration (AC: 3)

## Dev Notes

### References

- `/_bmad-output/planning-artifacts/migration-parity-matrix.md`
- `/_bmad-output/planning-artifacts/migration-data-strategy.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Story M1.2 preparee au format implementation avec AC et taches executables.

### File List

- `_bmad-output/implementation-artifacts/m1-2-verifier-la-parite-des-contrats-api.md`

### Change Log

- 2026-03-02: Creation de la story d'implementation M1.2 (ready-for-dev).
