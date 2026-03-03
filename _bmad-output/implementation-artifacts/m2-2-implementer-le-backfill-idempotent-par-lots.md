# Story M2.2: Implementer le backfill idempotent par lots

Status: done

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

- [x] Definir le format de `migration_batch_id` et de watermark par domaine (AC: 1, 3)
- [x] Implementer scripts SQL/Node idempotents pour Lot B (budget referentiels/allocations/decisions) (AC: 1)
- [x] Ajouter strategie `upsert`/`on conflict` et hash metier anti-doublon (AC: 1)
- [x] Produire journal de lot standardise (volumes, erreurs, retries, duree) (AC: 2)
- [x] Ajouter mecanisme de reprise sur sous-lots en echec (AC: 3)
- [x] Documenter commande d'execution + reprise dans un runbook court (AC: 2, 3)

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

### Implementation Plan

- Ajouter une couche `runner` testable pour orchestrer le backfill par domaines et sous-lots (watermarks).
- Ajouter un repository PostgreSQL pour `ON CONFLICT`, hash metier, journal batch/sous-lot et reprise selective.
- Ajouter une migration SQL pour les tables de journalisation (`migration_batches`, `migration_batch_sub_lots`, `migration_business_hash_registry`) et les decisions versionnees (`budget_decision_versions`).
- Exposer une CLI operationnelle (`pnpm --dir backend run migrate:lot-b`) et documenter run/reprise.
- Prouver idempotence + reprise via tests unitaires et regression backend.

### Completion Notes List

- Backfill Lot B implemente en TypeScript avec orchestration par sous-lots (`domain:index/total`) et reprise selective sur sous-lots en echec.
- Strategie idempotente appliquee via `INSERT ... ON CONFLICT DO UPDATE` + registre de hash metier par cle metier (`migration_business_hash_registry`) pour eviter les updates inutiles et prevenir les doublons.
- Journalisation standardisee implementee au niveau lot et sous-lot (volumes, erreurs, retries, duree, anomalies rattachees au `migration_batch_id`).
- Commande d'execution/reprise documentee dans le runbook, avec exemple de rapport d'execution.
- Validation effectuee: `pnpm --dir backend run lint`, `pnpm --dir backend run test -- src/migration/lot-b/runner.spec.ts`, `pnpm --dir backend run test`.

### File List

- `_bmad-output/implementation-artifacts/m2-2-implementer-le-backfill-idempotent-par-lots.md`
- `backend/package.json`
- `backend/src/migration/lot-b/types.ts`
- `backend/src/migration/lot-b/runner.ts`
- `backend/src/migration/lot-b/postgres-repository.ts`
- `backend/src/migration/lot-b/cli.ts`
- `backend/src/migration/lot-b/runner.spec.ts`
- `supabase/migrations/20260303101500_migration_lot_b_batches.sql`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/migration-batch-runbook.md`
- `_bmad-output/planning-artifacts/migration-report-lot-b-example.md`

### Change Log

- 2026-03-02: Creation de la story d'implementation M2.2 (ready-for-dev).
- 2026-03-03: Implementation complete du backfill idempotent Lot B (runner + repository postgres + migration SQL + CLI + tests + runbook).
- 2026-03-03: Revue senior appliquee - rejet ligne traite comme echec de sous-lot, `started_at` sous-lot fiabilise, secret DB hardcode retire, tests de reprise renforces.

## Senior Developer Review (AI)

Date: 2026-03-03  
Reviewer: Max (AI)

Outcome: Changes requested -> fixed in this pass.

### Findings Traites

- Rejet ligne par ligne ne pouvait pas interrompre un sous-lot; corrige pour forcer echec/reprise afin d'eviter le masquage de donnees rejetees.
- `started_at` de sous-lot etait journalise avec un `now()` tardif; corrige pour persister l'horodatage reel de debut d'execution.
- Secret DB fallback hardcode dans la CLI; corrige avec exigence explicite `POSTGRES_PASSWORD`/`PGPASSWORD`.
- Couverture de test etendue avec un cas de non-regression "rejets -> sous-lot failed -> reprise selective".

### Verification

- `pnpm --dir backend run lint` ✅
- `pnpm --dir backend run test -- src/migration/lot-b/runner.spec.ts` ✅
- `pnpm --dir backend run test` ✅
