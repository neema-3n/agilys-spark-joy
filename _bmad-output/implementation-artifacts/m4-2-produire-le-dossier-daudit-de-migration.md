# Story M4.2: Produire le dossier d'audit de migration

Status: done
Epic: M4 - Securite et conformite de migration
Story Key: m4-2-produire-le-dossier-daudit-de-migration
Created: 2026-03-04

## Story

As a auditeur interne,
I want un dossier d'audit complet de migration,
so that la conformite de la bascule soit verifiable.

## Acceptance Criteria

1. **Given** les preuves techniques et metier de migration
   **When** le dossier d'audit est genere
   **Then** il contient decisions, evidences, reconciliations, incidents et resolutions
   **And** la cloture migration est signee par les responsables metier et technique.

2. **Given** les artefacts de migration M1 a M4
   **When** la construction du dossier est executee
   **Then** chaque preuve est reliee a son AC/story d'origine avec date, auteur et statut
   **And** toute preuve manquante declenche un statut No-Go explicite.

3. **Given** un besoin d'inspection externe
   **When** le package d'audit est exporte
   **Then** un livrable structure (Markdown + ZIP) est genere en moins de 60 secondes sur perimetre standard
   **And** l'integrite du dossier est verifiable (hash manifeste + index des pieces).

## Tasks / Subtasks

- [x] Definir la structure canonique du dossier d'audit M4.2 (AC: 1, 2, 3)
  - [x] Etablir un index principal (`scope`, `decision log`, `evidences`, `gaps`, `signatures`, `annexes`)
  - [x] Definir un schema de metadata obligatoire par preuve (`story`, `ac`, `owner`, `timestamp`, `source`, `checksum`)
  - [x] Definir la convention de nommage et de version des livrables d'audit

- [x] Implementer la collecte automatisee des preuves migration (AC: 1, 2)
  - [x] Agreger les preuves issues de `M1.2`, `M1.3`, `M2.3`, `M3.1`, `M3.2`, `M3.3`, `M4.1`
  - [x] Mapper chaque preuve sur la story source et son acceptance criteria
  - [x] Produire une table de couverture avec statut (`covered`, `partial`, `missing`)

- [x] Produire le registre decisions / incidents / resolutions (AC: 1, 2)
  - [x] Consolider les decisions Go/No-Go, ecarts ouverts et resolutions appliquees
  - [x] Inclure les liens vers rapports gate (`contract parity`, `rollback drill`, `security revalidation`, `decommission`)
  - [x] Ajouter une section "risques residuels" avec impact et plan de mitigation

- [x] Implementer l'export et la verification d'integrite (AC: 3)
  - [x] Generer un package ZIP structure contenant dossier + annexes + manifeste
  - [x] Calculer des hash SHA-256 pour les preuves references
  - [x] Verifier que le temps de generation respecte la cible NFR (`<= 60 s` perimetre standard)

- [x] Formaliser la cloture et les signatures metier/technique (AC: 1)
  - [x] Ajouter section sign-off metier + technique avec date/nom/role/decision
  - [x] Definir la regle de blocage: aucune cloture si preuves critiques manquantes
  - [x] Publier un rapport final M4.2 reutilisable pour retrospective Epic M4

## Dev Notes

### Story Requirements

- Source normative: `/_bmad-output/planning-artifacts/epics.md` (Epic M4 / Story M4.2).
- AC M4.2 impose un dossier complet incluant decisions, evidences, reconciliations, incidents et resolutions.
- Sequence closeout normative:
  - `M4.2` vient apres `M3.3` et `M4.1`.
  - Gate C exige `M3.3`, `M4.1`, `M4.2`, `M3.4` en `done` pour cloture migration.
- Exigences PRD/NFR a respecter pour l'audit:
  - FR30, FR42, FR52, FR53, FR70.
  - NFR3, NFR11, NFR13, NFR14, NFR15.

### Developer Context Section

- Cette story est une story de **consolidation probatoire** et non de nouvelle logique metier transactionnelle.
- Les preuves principales sont deja produites par stories precedentes, notamment:
  - `m1-2-verifier-la-parite-des-contrats-api`
  - `m1-3-executer-la-non-regression-e2e-de-migration`
  - `m2-3-reconciler-avant-apres-sur-donnees-critiques`
  - `m3-1-produire-le-runbook-de-cutover-production`
  - `m3-2-tester-le-plan-de-rollback-operationnel`
  - `m3-3-decommissionner-supabase-de-facon-controlee`
  - `m4-1-revalider-rbac-abac-et-separation-des-responsabilites`
- Le risque principal n'est pas "code complexe", mais:
  - omission de preuves critiques,
  - traçabilite incomplete preuve -> AC,
  - absence de decision explicite pour ecarts ouverts.

### Technical Requirements

- Construire un dossier compose de:
  - `audit-index.md` (narratif + decision log),
  - `evidence-matrix.csv|md` (couverture AC/story),
  - `incident-resolution-log.md`,
  - `sign-off.md`,
  - `manifest.json` (hash + metadata des pieces).
- Rendre la production **deterministe et rejouable**:
  - script unique d'assemblage (ex: `scripts/build-migration-audit-dossier.mjs`),
  - pas de contenu manuel non trace dans le package final,
  - timestamp de generation ISO-8601 inclus dans metadata.
- Ajouter controle "preuves minimales requises" avant generation finale.
- Conserver une politique non destructive: aucune suppression d'artefacts source.

### Architecture Compliance

- Respecter `/_bmad-output/project-context.md`:
  - reutiliser l'existant avant de creer de nouveaux flux,
  - ne pas reintroduire de dependance runtime Supabase,
  - conserver des changements atomiques et auditables.
- Respecter le pattern migration du repo:
  - artefacts dans `/_bmad-output/implementation-artifacts/`,
  - scripts dans `scripts/` ou `backend/scripts/`,
  - statut story synchronise dans `sprint-status.yaml`.
- Eviter tout changement qui brouille la sequence normative M1 -> M4.

### Library Framework Requirements

- Priorite aux outils deja presents dans le repo (Node.js + scripts existants).
- Formats de sortie interop:
  - Markdown pour lecture humaine,
  - JSON/CSV pour verification machine.
- Si compression ZIP ajoutee:
  - utiliser librairie deja autorisee dans le projet ou utilitaire natif systeme/script.
- Aucun ajout de dependance lourde sans justification explicite.

### File Structure Requirements

- Story file:
  - `/_bmad-output/implementation-artifacts/m4-2-produire-le-dossier-daudit-de-migration.md`
- Artefacts M4.2 attendus:
  - `/_bmad-output/implementation-artifacts/m4-2-audit-dossier-index-YYYY-MM-DD.md`
  - `/_bmad-output/implementation-artifacts/m4-2-audit-evidence-matrix-YYYY-MM-DD.md`
  - `/_bmad-output/implementation-artifacts/m4-2-audit-signoff-YYYY-MM-DD.md`
  - `/_bmad-output/implementation-artifacts/m4-2-audit-manifest-YYYY-MM-DD.json`
  - `/_bmad-output/implementation-artifacts/m4-2-audit-package-YYYY-MM-DD.zip`
- Sources a consolider explicitement:
  - `/_bmad-output/implementation-artifacts/migration-contract-parity-report.md`
  - `/_bmad-output/implementation-artifacts/migration-e2e-critical-scenarios.md`
  - `/_bmad-output/implementation-artifacts/migration-reconciliation-*.md|json|csv`
  - `/_bmad-output/implementation-artifacts/production-cutover-runbook.md`
  - `/_bmad-output/implementation-artifacts/rollback-drill-gate-report.md`
  - `/_bmad-output/implementation-artifacts/supabase-decommission-report-2026-03-03.md`
  - `/_bmad-output/implementation-artifacts/m4-1-security-revalidation-report-2026-03-04.md`

### Testing Requirements

- Verification fonctionnelle obligatoire:
  - test generation dossier complet (happy path),
  - test echec si preuve critique absente,
  - test integrite manifeste/hash,
  - test contrainte temps de generation (`<= 60 s` sur jeu standard).
- Verification de tracabilite:
  - chaque section du dossier doit pointer vers une source concrete (path + date + story).
  - controle automatise du mapping AC -> preuve (pas de trou silencieux).
- Verification de gouvernance:
  - section sign-off presente et non vide,
  - decision finale explicite (`GO` ou `NO-GO`) avec justification.

### Previous Story Intelligence

- `M4.1` a confirme:
  - couverture securite renforcee et validee (tests e2e + lint pass),
  - journalisation deny auditable avec payload minimal correct,
  - rapport de revalidation securite deja disponible pour inclusion M4.2.
- Le dossier M4.2 doit **reutiliser tel quel** le rapport M4.1 comme evidence securite primaire, sans re-ecrire les conclusions.
- Les corrections de robustesse apportees en M4.1 (assertions d'audit, reset spies, timestamp) doivent etre references dans le chapitre "resolutions" du dossier M4.2.

### Git Intelligence Summary

- Commits recents observes:
  - `b673e08` Review RBAC ABAC status update
  - `52f5566` continue
  - `917a277` Review hypercare dashboard changes
  - `eb67f79` Update hypercare story status
  - `e969fc3` Update Supabase decommission status
- Tendance:
  - finalisation migration closeout par artefacts de preuve et statut.
  - M4.2 doit privilegier la consolidation documentaire et la coherence de statuts plutot qu'un refactor applicatif.

### Latest Tech Information

- Le besoin M4.2 est principalement de conformite/audit. Les points actualises utiles:
  - [NIST SP 800-92](https://csrc.nist.gov/pubs/sp/800/92/final): bonnes pratiques de gestion et revue des logs de securite pour constituer des preuves auditables fiables.
  - [NIST SP 800-53 Rev. 5 (AU family)](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final): controles d'audit trail (generation, protection, retention, revue) pertinents pour le dossier.
  - [CISA Logging Made Easy](https://www.cisa.gov/resources-tools/resources/logging-made-easy): recommandations pratiques de structuration/normalisation des logs et conservation.
- Application au contexte projet:
  - privilegier un manifeste de preuves verifiable,
  - assurer la chaine `source -> evidence -> decision`,
  - expliciter la retention et l'integrite des artefacts.

### Project Context Reference

- Document de reference: `/_bmad-output/project-context.md`.
- Regles critiques appliquees a M4.2:
  - pas de nouvelle dependance Supabase,
  - typage strict et scripts rejouables,
  - changements atomiques et auditables,
  - Definition of Done inclut preuves et non-regression.

### Story Completion Status

- Story context generee pour execution `dev-story`.
- Statut story cible: `ready-for-dev`.
- Note de completion: `Ultimate context engine analysis completed - comprehensive developer guide created`.

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic M4 / Story M4.2, sequence/gates migration closeout)
- `/_bmad-output/planning-artifacts/prd.md` (FR30/42/52/53/70, NFR3/11/13/14/15)
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/_bmad-output/project-context.md`
- `/_bmad-output/implementation-artifacts/m4-1-revalider-rbac-abac-et-separation-des-responsabilites.md`
- `/_bmad-output/implementation-artifacts/m4-1-security-revalidation-report-2026-03-04.md`
- `/_bmad-output/implementation-artifacts/m3-3-decommissionner-supabase-de-facon-controlee.md`
- `/_bmad-output/implementation-artifacts/supabase-decommission-report-2026-03-03.md`
- `/_bmad-output/implementation-artifacts/rollback-drill-gate-report.md`
- `/_bmad-output/implementation-artifacts/production-cutover-runbook.md`
- `/_bmad-output/implementation-artifacts/production-cutover-tabletop-report.md`
- `/_bmad-output/implementation-artifacts/m1-2-verifier-la-parite-des-contrats-api.md`
- `/_bmad-output/implementation-artifacts/m1-3-executer-la-non-regression-e2e-de-migration.md`
- `/_bmad-output/implementation-artifacts/m2-3-reconciler-avant-apres-sur-donnees-critiques.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- create-story workflow execute pour `m4-2-produire-le-dossier-daudit-de-migration`
- contexte charge: `epics.md`, `prd.md`, `project-context.md`, `sprint-status.yaml`, story `m4-1`
- analyse des artefacts M1/M2/M3/M4 existants pour definir la matrice de preuves M4.2
- veille ciblage audit/logging via sources institutionnelles (NIST/CISA)

### Completion Notes List

- Story M4.2 creee avec contexte implementation complet et guardrails de conformite.
- Dependances de sequence closeout et gates normatifs formalises.
- Strategie d'assemblage du dossier, integrite, signatures et criteres No-Go precises.
- Story prete pour execution `dev-story` avec statut `ready-for-dev`.
- Script d'assemblage implemente: `scripts/build-migration-audit-dossier.mjs`.
- Dossier M4.2 genere avec decision `GO`, manifest SHA-256, package ZIP et tracabilite AC/story.
- Tests automatises ajoutes pour happy path, NO-GO explicite, integrite hash et cible NFR (`<= 60 s`).

### File List

- `/_bmad-output/implementation-artifacts/m4-2-produire-le-dossier-daudit-de-migration.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/scripts/build-migration-audit-dossier.mjs`
- `/tests/migration-audit-dossier.test.mjs`
- `/_bmad-output/implementation-artifacts/m4-2-audit-dossier-index-2026-03-04.md`
- `/_bmad-output/implementation-artifacts/m4-2-audit-evidence-matrix-2026-03-04.md`
- `/_bmad-output/implementation-artifacts/m4-2-audit-incident-resolution-log-2026-03-04.md`
- `/_bmad-output/implementation-artifacts/m4-2-audit-signoff-2026-03-04.md`
- `/_bmad-output/implementation-artifacts/m4-2-audit-manifest-2026-03-04.json`
- `/_bmad-output/implementation-artifacts/m4-2-audit-package-2026-03-04.zip`
- `/_bmad-output/planning-artifacts/migration-parity-matrix.md`

### Change Log

- 2026-03-04: creation du contexte story M4.2 (ready-for-dev) avec exigences de consolidation probatoire migration, mapping preuves->AC et export auditable.
- 2026-03-04: implementation M4.2 complete (script build audit dossier + tests + generation des artefacts + synchro statuts sprint/matrice).
