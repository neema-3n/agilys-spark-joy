# Story M3.1: Produire le runbook de cutover production

Status: done

## Story

As a responsable release,  
I want un runbook minute par minute,  
so that la bascule soit executable sans ambiguite.

## Acceptance Criteria

1. **Runbook structure complet**
   - **Given** la fenetre de bascule preparee
   - **When** le runbook est valide
   - **Then** les etapes pre-check, bascule, post-check et validation sont detaillees
   - **And** chaque etape reference un owner et une evidence attendue

2. **Go/No-Go explicite**
   - **Given** les prerequis techniques et metier
   - **When** le point Go/No-Go est execute
   - **Then** les criteres mesurables sont formalises et verificables
   - **And** les actions a prendre en No-Go sont explicites

3. **Responsabilites et gouvernance**
   - **Given** une equipe cutover pluridisciplinaire
   - **When** le runbook est utilise en condition operationnelle
   - **Then** les responsabilites par role (Release Manager, SRE/Ops, Backend, Frontend, Data, Support) sont sans ambiguite
   - **And** le circuit de communication/escalade est documente

## Tasks / Subtasks

- [x] Definir le perimetre du cutover et les preconditions de demarrage (AC: 1, 2)
  - [x] Consolider les prerequis Gate A et les dependances stories M1/M2 deja terminees
  - [x] Lister les environnements, fenetres temporelles et interlocuteurs requis
  - [x] Formaliser les hypotheses de bascule et les exclusions de perimetre

- [x] Produire le runbook minute par minute execution-ready (AC: 1, 3)
  - [x] Structurer un timeline T-60 a T+120 (ou equivalent) avec sequence numerotee
  - [x] Associer pour chaque etape: owner, commande/verification, preuve attendue, critere de succes
  - [x] Inclure les checkpoints obligatoires pre-check, switch, smoke tests, validation fonctionnelle, handover

- [x] Formaliser le gate Go/No-Go et la communication de crise (AC: 2, 3)
  - [x] Definir la matrice Go/No-Go (indicateurs, seuils, decisionnaires, duree max de decision)
  - [x] Documenter les canaux de communication, escalade, journal de decision et message templates
  - [x] Referencer explicitement le lien vers la story M3.2 pour procedure de rollback detaillee

- [x] Ajouter les sections de validation finale et sign-off (AC: 1, 2, 3)
  - [x] Ajouter checklist post-cutover (technique, metier, securite, monitoring, support)
  - [x] Definir les preuves minimales a archiver et le format de trace d'execution
  - [x] Ajouter section approbation/signature (metier + technique)

- [x] Verifier la qualite et la testabilite operationnelle du runbook (AC: 1, 2, 3)
  - [x] Executer une revue croisee du document (coherence et absence d'ambiguite)
  - [x] Simuler un walkthrough tabletop et corriger les zones floues
  - [x] Confirmer que le runbook est pret pour la story M3.2 (test rollback en staging)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic M3 / Story M3.1).
- Cette story ouvre la phase de cutover production et doit rester strictement documentaire/operationnelle.
- Gate A doit etre valide avant execution de M3.* (`M1.1`, `M2.1`, `M2.2`, `M2.3`, `M1.2`, `M1.3` en `done`).

### Technical Requirements

- Le runbook doit etre actionnable sans interpretation implicite:
  - etapes ordonnees,
  - responsables nommes par role,
  - preuves attendues,
  - criteres de decision binaire.
- Les commandes/exemples references doivent rester compatibles avec la stack cible de migration:
  - front Next.js (ou front actuel transitoire),
  - backend NestJS,
  - PostgreSQL,
  - package manager pnpm.
- Le runbook doit separer explicitement:
  - prerequis,
  - execution cutover,
  - verification post-cutover,
  - criteres d'arret/rollback.

### Architecture Compliance

- Respecter la gouvernance de migration decrite dans `project-context.md`:
  - pas de nouvelle dependance runtime Supabase,
  - continuite UX pendant la transition,
  - traçabilite de toute decision critique.
- Conserver l'alignement avec les contraintes NFR de fiabilite, securite et auditabilite.

### File Structure Requirements

- Livrable principal recommande:
  - `/_bmad-output/implementation-artifacts/production-cutover-runbook.md`
- Evidences/annexes autorisees:
  - `/_bmad-output/implementation-artifacts/cutover-logs/` (si necessaire)
- Le fichier story (`m3-1-...md`) reste la source de suivi d'execution, pas le runbook operationnel final.

### Testing Requirements

- Validation documentaire minimale:
  - couverture 100% des sections obligatoires (pre-check, cutover, post-check, validation, Go/No-Go, roles),
  - absence d'etape sans owner ni preuve attendue.
- Validation operationnelle:
  - 1 walkthrough/tabletop execute avec compte-rendu,
  - 0 ambiguite bloquante restante avant passage a M3.2.

### Previous Story Intelligence

- M2.3 a etabli une discipline forte de preuves et de formats de rapport (Markdown/JSON/CSV), a reutiliser pour les traces de cutover.
- Les revues recentes ont insiste sur:
  - seuils explicites,
  - validation stricte des entrees,
  - couverture de cas d'erreur.
- Appliquer la meme rigueur au runbook:
  - seuils Go/No-Go explicites,
  - points de controle mesurables,
  - traces auditables.

### Git Intelligence Summary

- Commits recents orientes migration/revue (`Review reconciliation migration`, `Review contract parity changes`, `Review migration e2e regression`).
- Pattern dominant: formalisation stricte + preuves reproductibles + correction rapide des zones ambiguës.
- Recommandation: documenter le runbook avec granularite equivalente aux livrables M1/M2.

### Project Structure Notes

- Projet en migration progressive (Vite/React -> Next.js + NestJS + PostgreSQL).
- Les livrables de migration sont centralises dans `/_bmad-output/implementation-artifacts/`.
- Cette story doit reutiliser cette convention pour garder la trace de transition et faciliter l'audit.

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic M3 / Story M3.1 + sequence normative M1..M4)
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/_bmad-output/project-context.md`
- `/_bmad-output/planning-artifacts/migration-batch-runbook.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- create-story workflow (targeted story selection: `m3-1`)
- context load: epics, prd, project-context, previous story M2.3, git history recent commits
- runbook authoring: `production-cutover-runbook.md`
- tabletop validation: `production-cutover-tabletop-report.md`
- structural validation command:
  - `rg` sur sections critiques + `awk` controle colonnes timeline + verification reference M3.2

### Completion Notes List

- Story M3.1 creee avec contexte implementation complet, sans ambiguite sur AC et responsabilites.
- Taches decomposees en livrables operationnels directement executables pour produire le runbook de cutover.
- Guardrails migration integres (gates, gouvernance, traces, preparation M3.2 rollback).
- Runbook de cutover production produit avec timeline minute par minute, RACI, matrice Go/No-Go, communication d'escalade, checklist post-cutover et sign-off.
- Rapport de walkthrough tabletop produit avec resultats de validation et corrections d'ambiguites.
- Validation documentaire automatisee executee: sections obligatoires presentes, colonnes timeline conformes, lien rollback M3.2 present (`VALIDATION_OK`).
- Story basculee en `review` et synchronisee dans `sprint-status.yaml` et `migration-parity-matrix.md`.

### File List

- `_bmad-output/implementation-artifacts/m3-1-produire-le-runbook-de-cutover-production.md`
- `_bmad-output/implementation-artifacts/m3-2-tester-le-plan-de-rollback-operationnel.md`
- `_bmad-output/implementation-artifacts/production-cutover-runbook.md`
- `_bmad-output/implementation-artifacts/production-cutover-tabletop-report.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/migration-parity-matrix.md`

### Change Log

- 2026-03-03: Creation initiale de la story M3.1 avec contexte implementation complet (ready-for-dev).
- 2026-03-03: Runbook de cutover production redige (timeline T-60 a T+120, RACI, Go/No-Go, escalade, checklist, sign-off).
- 2026-03-03: Walkthrough tabletop execute et consigne; ambiguite restante corrigee.
- 2026-03-03: Story M3.1 passee en `review` et synchronisee avec `sprint-status.yaml` et `migration-parity-matrix.md`.
- 2026-03-03: Revue adversariale appliquee (correctifs HIGH/MEDIUM), story repassee en `in-progress` en attente de resolution des points critiques restants.
- 2026-03-03: Resolution des points critiques review (fichier M3.2 cree avec procedure rollback detaillee, duree max Go/No-Go formalisee a 10 min).

## Senior Developer Review (AI)

Date: 2026-03-03  
Reviewer: Max (AI)

- Finding [HIGH] role Go/No-Go ambigu (`Security/Ops` non defini dans RACI): **RESOLU** (`production-cutover-runbook.md`, decisionnaire aligne sur `SRE/Ops`).
- Finding [MEDIUM] ecart git/story sur la traçabilite du lot: **RESOLU** (ecarts explicites documentes et file list M3.1 completee avec les artefacts relies).
- Finding [MEDIUM] melange de perimetres (story documentaire vs changements backend dans le workspace): **RESOLU** (champs M2.3 identifies comme hors perimetre M3.1 et traces dans la section review).
- Finding [CRITICAL] lien story M3.2 reference mais fichier cible absent: **RESOLU** (`m3-2-tester-le-plan-de-rollback-operationnel.md` cree avec procedure detaillee).
- Finding [CRITICAL] duree max de decision Go/No-Go non formalisee: **RESOLU** (`production-cutover-runbook.md`, matrice Go/No-Go + regle de delai explicite).

Actions de traçabilite review:
- Changement scope M3.1 confirme:
  - `_bmad-output/implementation-artifacts/m3-1-produire-le-runbook-de-cutover-production.md`
  - `_bmad-output/implementation-artifacts/production-cutover-runbook.md`
  - `_bmad-output/implementation-artifacts/production-cutover-tabletop-report.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
  - `_bmad-output/planning-artifacts/migration-parity-matrix.md`
- Changements hors scope M3.1 detectes dans le workspace (issus de M2.3):
  - `backend/src/migration/lot-b/reconciliation.ts`
  - `backend/src/migration/lot-b/reconciliation.cli.ts`
  - `backend/src/migration/lot-b/reconciliation.spec.ts`
  - `backend/src/migration/lot-b/reconciliation.cli.spec.ts`
  - `_bmad-output/implementation-artifacts/m2-3-reconciler-avant-apres-sur-donnees-critiques.md`

Decision review: **Approve**
