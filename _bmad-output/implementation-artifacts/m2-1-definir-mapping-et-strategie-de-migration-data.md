# Story M2.1: Definir mapping et strategie de migration data

Status: review

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

### File List

- `_bmad-output/implementation-artifacts/m2-1-definir-mapping-et-strategie-de-migration-data.md`
- `_bmad-output/planning-artifacts/migration-data-mapping.md`
- `_bmad-output/planning-artifacts/migration-data-strategy.md`

### Change Log

- 2026-03-02: Story M2.1 preparee (ready-for-dev).
- 2026-03-02: Story M2.1 executee, livrables mapping/strategie produits, statut passe a `review`.
