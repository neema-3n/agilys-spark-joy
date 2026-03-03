# Story M2.1: Definir mapping et strategie de migration data

Status: done

## Story

As a architecte data,
I want un mapping source -> cible explicite,
so that la migration soit deterministe et audit-able.

## Acceptance Criteria

1. **Mapping complet source -> cible**
   - **Given** les schemas legacy et cible
   - **When** le mapping est formalise
   - **Then** chaque entite/attribut source est mappe vers la cible
   - **And** la regle de transformation est documentee

2. **Traitement des cas anormaux**
   - **Given** des donnees invalides, orphelines ou incoherentes
   - **When** la strategie est definie
   - **Then** les regles de rejet, correction ou quarantaine sont explicites
   - **And** les impacts de qualite data sont traces

3. **Strategie de migration executable**
   - **Given** le mapping valide
   - **When** le plan de migration est etabli
   - **Then** l'ordre des lots, dependances et controles pre/post sont definis
   - **And** les criteres d'acceptation de lot sont explicites

## Tasks / Subtasks

- [x] Inventorier les sources de donnees legacy et les modeles cibles PostgreSQL (AC: 1)
- [x] Produire la table de correspondance attribut par attribut (source -> cible -> transformation) (AC: 1)
- [x] Definir les regles de normalisation, conversion et arrondi pour chaque domaine critique (AC: 1, 2)
- [x] Definir le traitement des anomalies (rejet, correction manuelle, quarantaine) avec journalisation (AC: 2)
- [x] Structurer un plan de migration par lots ordonnes avec pre-check/post-check (AC: 3)
- [x] Definir les criteres d'acceptation de lot et les points de controle de reconciliation (AC: 3)

### Review Follow-ups (AI)

- [x] [AI-Review][High] Completer un mapping attribut-par-attribut (source.colonne -> cible.colonne -> regle) pour les domaines critiques; le livrable actuel reste au niveau domaine. [/_bmad-output/planning-artifacts/migration-data-mapping.md:36]
- [x] [AI-Review][High] Corriger la tache marquee comme faite "table de correspondance attribut par attribut" ou livrer la table attendue avec granularite colonne. [/_bmad-output/implementation-artifacts/m2-1-definir-mapping-et-strategie-de-migration-data.md:34]
- [x] [AI-Review][High] Definir des regles explicites de normalisation/conversion/arrondi par domaine critique (pas seulement des regles globales). [/_bmad-output/planning-artifacts/migration-data-mapping.md:181]
- [x] [AI-Review][Medium] Tracer explicitement les impacts qualite data (metriques, seuils, severite, owner) pour les cas anormaux afin de satisfaire AC2. [/_bmad-output/planning-artifacts/migration-data-mapping.md:194]
- [x] [AI-Review][Medium] Ajouter la specification de la structure de quarantaine (`migration_quarantine`: colonnes, retention, workflow de resolution) pour rendre la strategie executable. [/_bmad-output/planning-artifacts/migration-data-mapping.md:205]
- [x] [AI-Review][Medium] Aligner la trace Story/Git: un fichier applicatif est modifie hors File List (`src/App.tsx`) et n'est pas explique dans la story. [/src/App.tsx:1]

## Dev Notes

### Story Requirements

- Source: `/_bmad-output/planning-artifacts/epics.md` (Epic M2 / Story M2.1).
- Objectif: etablir la base methodologique de `M2.2` (backfill) et `M2.3` (reconciliation).
- Cette story doit rester agnostique implementation detaillee des scripts.

### Technical Requirements

- Le mapping doit etre exploitable par script de migration (format tabulaire stable).
- Les regles de transformation doivent etre deterministes et rejouables.
- Les controles de qualite data doivent etre relies a des seuils clairs.

### File Structure Requirements

- Sorties principales attendues:
  - `/_bmad-output/planning-artifacts/migration-data-mapping.md`
  - `/_bmad-output/planning-artifacts/migration-data-strategy.md`
- Cette story ne modifie pas de code runtime; elle prepare l'execution de migration.

### Testing Requirements

- Verification de qualite du mapping:
  - couverture des entites critiques a 100%,
  - aucune colonne critique sans regle de transformation,
  - cas anormaux documentes avec action explicite.

### References

- `/_bmad-output/planning-artifacts/epics.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/_bmad-output/planning-artifacts/sprint-backlog-migration-closeout-2026-03-02.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Story M2.1 executee: mapping source->cible formalise sur domaines auth, budget, depense, comptabilite, tresorerie.
- Strategie de migration par lots (A->D) documentee avec pre-check/post-check, anomalies et rollback lot.
- Sources legacy detectees via services API Supabase consolidees pour priorisation migration.
- Revue senior corrigee: mapping attribut-par-attribut ajoute, regles par domaine explicitees, impacts qualite et specification quarantaine completes.

### File List

- `_bmad-output/implementation-artifacts/m2-1-definir-mapping-et-strategie-de-migration-data.md`
- `_bmad-output/planning-artifacts/migration-data-mapping.md`
- `_bmad-output/planning-artifacts/migration-data-strategy.md`
- `src/App.tsx` (modification locale hors perimetre story, documentee pour transparence Git)

## Senior Developer Review (AI)

Date: 2026-03-03
Reviewer: Max
Outcome: Approved

### Scope Reviewed

- Story file: `m2-1-definir-mapping-et-strategie-de-migration-data.md`
- Claimed artifacts: `migration-data-mapping.md`, `migration-data-strategy.md`
- Git working tree cross-check for discrepancy detection

### AC Validation

1. AC1 Mapping complet source -> cible: **IMPLEMENTED**
2. AC2 Traitement cas anormaux + impact qualite trace: **IMPLEMENTED**
3. AC3 Strategie de migration executable: **IMPLEMENTED**

### Findings Summary

- High: 0
- Medium: 0
- Low: 0

### Git vs Story Notes

- Les fichiers listes dans la story existent et ont un historique Git (commit `9c1a7d9`).
- Le changement local sur `src/App.tsx` est documente comme hors perimetre M2.1.

### Change Log

- 2026-03-02: Story M2.1 preparee (ready-for-dev).
- 2026-03-02: Story M2.1 executee, livrables mapping/strategie produits, statut passe a `review`.
- 2026-03-03: Revue senior IA effectuee, 6 issues ouvertes (3 High, 3 Medium), statut passe a `in-progress`.
- 2026-03-03: Issues High/Medium corrigees automatiquement, revue approuvee, statut passe a `done`.
