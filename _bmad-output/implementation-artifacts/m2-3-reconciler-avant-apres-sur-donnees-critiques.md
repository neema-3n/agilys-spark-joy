# Story M2.3: Reconciler avant/apres sur donnees critiques

Status: done

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

- [x] Definir la liste des entites critiques et metriques de controle (AC: 1, 2)
- [x] Implementer scripts de reconciliation cardinalite source/cible par lot (AC: 1)
- [x] Implementer controles de coherence metier (montants/statuts/FK) sur echantillons critiques (AC: 2)
- [x] Definir seuils d'acceptation et regles de blocage (AC: 2, 3)
- [x] Generer rapport standard de reconciliation avec decision Go/No-Go (AC: 3)
- [x] Archiver les rapports dans `/_bmad-output/implementation-artifacts/` (AC: 3)

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
- Reconciliation Lot B implementee via un moteur TypeScript dedie (cardinalite + coherence metier montants/statuts/FK) avec anomalies severisees.
- Seuils de blocage formalises et appliques automatiquement (`maxCriticalCardinalityDiff`, `maxAmountDelta`, `maxCriticalAnomalies`, `maxHighAnomalies`) pour produire une decision Go/No-Go deterministe.
- Rapport standard genere en triple format (Markdown + JSON + CSV) avec causes, resolutions, sections de signature metier/technique et hash de rejouabilite.
- CLI operationnelle ajoutee pour produire/archiver les rapports de reconciliation dans `/_bmad-output/implementation-artifacts/`.
- Validation effectuee: `pnpm --dir backend run lint`, `pnpm --dir backend run test -- src/migration/lot-b/reconciliation.spec.ts src/migration/lot-b/runner.spec.ts`, `pnpm --dir backend run test`.
- Correctifs de revue appliques sur 5 findings: controle de somme des montants, validation stricte du payload CLI, durcissement des seuils, severite INFO pour cardinalite sans ecart, extension de la couverture tests.
- Validation post-correctifs: `pnpm --dir backend run lint`, `pnpm --dir backend run test -- src/migration/lot-b/reconciliation.spec.ts src/migration/lot-b/reconciliation.cli.spec.ts`.

### File List

- `_bmad-output/implementation-artifacts/m2-3-reconciler-avant-apres-sur-donnees-critiques.md`
- `backend/package.json`
- `backend/src/migration/lot-b/reconciliation.ts`
- `backend/src/migration/lot-b/reconciliation.cli.ts`
- `backend/src/migration/lot-b/reconciliation.spec.ts`
- `backend/src/migration/lot-b/reconciliation.cli.spec.ts`
- `backend/src/migration/lot-b/reconciliation-input.example.json`
- `_bmad-output/implementation-artifacts/migration-reconciliation-lot-b-client-demo-20260303150000-m23rcl01-20260303T185650Z.json`
- `_bmad-output/implementation-artifacts/migration-reconciliation-lot-b-client-demo-20260303150000-m23rcl01-20260303T185650Z.csv`
- `_bmad-output/implementation-artifacts/migration-reconciliation-lot-b-client-demo-20260303150000-m23rcl01-20260303T185650Z.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-02: Creation de la story d'implementation M2.3 (ready-for-dev).
- 2026-03-03: Implementation complete de la reconciliation avant/apres Lot B (cardinalite + coherence metier + seuils Go/No-Go + exports JSON/CSV/Markdown + CLI + tests).
- 2026-03-03: Correctifs de revue appliques (validation stricte input CLI, detection montant manquant asymetrique, detection doublons d'echantillons, synchronisation matrice de parite M2.3).
- 2026-03-03: Correctifs complementaires de revue appliques (controle de somme des montants, validation stricte des types payload, garde-fous seuils, severite INFO sans ecart, couverture tests elargie).

## Senior Developer Review (AI)

Date: 2026-03-03  
Reviewer: Max (AI)

- Finding [P1] controle de somme des montants: **RESOLU** (`backend/src/migration/lot-b/reconciliation.ts`)
- Finding [P1] validation schema input insuffisante: **RESOLU** (`backend/src/migration/lot-b/reconciliation.cli.ts`)
- Finding [P1] seuils non bornes/non numeriques: **RESOLU** (`backend/src/migration/lot-b/reconciliation.ts`)
- Finding [P2] severite medium sur cardinalite sans ecart: **RESOLU** (`backend/src/migration/lot-b/reconciliation.ts`)
- Finding [P2] couverture tests insuffisante: **RESOLU** (`backend/src/migration/lot-b/reconciliation.spec.ts`, `backend/src/migration/lot-b/reconciliation.cli.spec.ts`)

Decision review: **Approve**  
Preuves:
- `pnpm --dir backend run lint` ✅
- `pnpm --dir backend run test -- src/migration/lot-b/reconciliation.spec.ts src/migration/lot-b/reconciliation.cli.spec.ts` ✅
