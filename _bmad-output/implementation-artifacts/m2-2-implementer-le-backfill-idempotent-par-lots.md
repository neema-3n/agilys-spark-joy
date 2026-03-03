# Story M2.2: Implementer le backfill idempotent par lots

Status: ready-for-dev

## Story

As a developpeur migration,
I want des scripts rejouables sans doublons,
so that la migration puisse etre reprise sans corruption.

## Acceptance Criteria

1. **Backfill rejouable**
   - **Given** un lot de migration execute
   - **When** le lot est relance avec les memes donnees source
   - **Then** aucun doublon n'est cree
   - **And** les enregistrements sont coherents apres reexecution

2. **Journal de lot complet**
   - **Given** un lot est traite
   - **When** l'execution se termine
   - **Then** le journal contient volumes, erreurs, retries et duree
   - **And** chaque anomalie est rattachee a un identifiant de lot

3. **Reprise apres incident**
   - **Given** un echec en milieu de lot
   - **When** la reprise est declenchee
   - **Then** seuls les sous-lots non valides sont retraités
   - **And** l'integrite des donnees deja valides est preservee

## Tasks / Subtasks

- [ ] Definir le format de `migration_batch_id` et de watermark par domaine (AC: 1, 3)
- [ ] Implementer scripts SQL/Node idempotents pour Lot B (budget referentiels/allocations/decisions) (AC: 1)
- [ ] Ajouter strategie `upsert`/`on conflict` et hash metier anti-doublon (AC: 1)
- [ ] Produire journal de lot standardise (volumes, erreurs, retries, duree) (AC: 2)
- [ ] Ajouter mecanisme de reprise sur sous-lots en echec (AC: 3)
- [ ] Documenter commande d'execution + reprise dans un runbook court (AC: 2, 3)

## Dev Notes

### Story Requirements

- Source: `/_bmad-output/planning-artifacts/epics.md` (Epic M2 / Story M2.2).
- Prerequis: `M2.1` validee (mapping + strategie).
- Perimetre prioritaire: Lot B avant extension aux lots C/D.

### Technical Requirements

- Idempotence obligatoire:
  - cle metier stable par domaine,
  - `ON CONFLICT DO UPDATE` ou equivalent,
  - absence de duplication sur rerun.
- Journalisation:
  - lot id, sous-lot, tenant, exercice, compte inserts/updates/rejets.
- Resilience:
  - reprise selective des sous-lots en erreur.

### File Structure Requirements

- Livrables attendus:
  - scripts migration sous `scripts/` ou `backend/scripts/` (selon conventions repo),
  - `/_bmad-output/planning-artifacts/migration-batch-runbook.md`,
  - rapport d'execution exemple.

### Testing Requirements

- Rejouer deux fois le meme lot et verifier:
  - cardinalite stable,
  - zero doublon,
  - coherence metier.
- Simuler echec milieu de lot puis reprise.

### References

- `/_bmad-output/planning-artifacts/migration-data-mapping.md`
- `/_bmad-output/planning-artifacts/migration-data-strategy.md`
- `/_bmad-output/planning-artifacts/migration-parity-matrix.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Story M2.2 preparee au format implementation avec AC et taches executables.
- Scope limite au backfill idempotent Lot B pour livrer rapidement une preuve de migration rejouable.

### File List

- `_bmad-output/implementation-artifacts/m2-2-implementer-le-backfill-idempotent-par-lots.md`

### Change Log

- 2026-03-02: Creation de la story d'implementation M2.2 (ready-for-dev).
