# Story M2.3: Reconciler avant/apres sur donnees critiques

Status: ready-for-dev

## Story

As a controleur migration,
I want prouver la coherence des donnees migrees,
so that la bascule soit validee en confiance.

## Acceptance Criteria

1. **Reconciliation cardinalite**
   - **Given** un lot de migration termine
   - **When** la reconciliation est executee
   - **Then** les comptes source/cible sont compares pour chaque entite critique
   - **And** tout ecart est journalise avec severite

2. **Reconciliation coherence metier**
   - **Given** des echantillons metiers critiques
   - **When** les controles avant/apres sont appliques
   - **Then** statuts et montants restent coherents
   - **And** les anomalies bloquantes sont detectees automatiquement

3. **Rapport de validation**
   - **Given** la reconciliation terminee
   - **When** le rapport est produit
   - **Then** il contient ecarts, causes, resolutions et decision Go/No-Go
   - **And** il est signable metier/technique

## Tasks / Subtasks

- [ ] Definir la liste des entites critiques et metriques de controle (AC: 1, 2)
- [ ] Implementer scripts de reconciliation cardinalite source/cible par lot (AC: 1)
- [ ] Implementer controles de coherence metier (montants/statuts/FK) sur echantillons critiques (AC: 2)
- [ ] Definir seuils d'acceptation et regles de blocage (AC: 2, 3)
- [ ] Generer rapport standard de reconciliation avec decision Go/No-Go (AC: 3)
- [ ] Archiver les rapports dans `/_bmad-output/implementation-artifacts/` (AC: 3)

## Dev Notes

### Story Requirements

- Source: `/_bmad-output/planning-artifacts/epics.md` (Epic M2 / Story M2.3).
- Prerequis: `M2.2` (backfill idempotent) execute au moins sur Lot B.
- Cette story conditionne la progression vers cutover data.

### Technical Requirements

- Controles minimaux:
  - cardinalite par table critique,
  - somme montants de controle,
  - coherence statuts workflow.
- Sortie machine-readable (CSV/JSON) + rapport markdown de synthese.
- Bloquer automatiquement si ecart critique > seuil.

### File Structure Requirements

- Livrables attendus:
  - scripts reconciliation sous `scripts/` ou `backend/scripts/`,
  - rapports `migration-reconciliation-*.md` dans `/_bmad-output/implementation-artifacts/`.

### Testing Requirements

- Cas nominal:
  - lot sans ecart critique => Go.
- Cas anomalie:
  - ecart monte => No-Go + erreur explicite.
- Rejouabilite:
  - meme lot donne meme resultat.

### References

- `/_bmad-output/planning-artifacts/migration-data-mapping.md`
- `/_bmad-output/planning-artifacts/migration-data-strategy.md`
- `/_bmad-output/planning-artifacts/migration-parity-matrix.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Story M2.3 preparee au format implementation avec AC et taches executables.
- Criteres Go/No-Go data relies explicitement au pipeline de migration.

### File List

- `_bmad-output/implementation-artifacts/m2-3-reconciler-avant-apres-sur-donnees-critiques.md`

### Change Log

- 2026-03-02: Creation de la story d'implementation M2.3 (ready-for-dev).
