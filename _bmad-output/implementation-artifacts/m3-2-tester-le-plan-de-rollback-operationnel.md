# Story M3.2: Tester le plan de rollback operationnel

Status: ready-for-dev

## Story

As a SRE/ops,
I want un rollback teste en conditions proches prod,
so that un echec cutover reste recuperable rapidement.

## Acceptance Criteria

1. **Rollback executable en staging**
   - **Given** un scenario d'echec de bascule simule
   - **When** le rollback est execute en staging
   - **Then** le retour a l'etat precedent est possible avec procedure verifiee
   - **And** les objectifs RTO/RPO cibles sont mesures et traces

2. **Objectifs RTO/RPO mesures et traces**
   - **Given** une execution complete de rollback en staging
   - **When** la consolidation post-execution est produite
   - **Then** les valeurs RTO/RPO observees sont documentees
   - **And** tout ecart par rapport aux objectifs cibles est explicite et justifie

## Tasks / Subtasks

- [ ] Preparer et cadrer le test rollback en staging (AC: 1, 2)
  - [ ] Valider preconditions de declenchement No-Go et disponibilite des roles critiques
  - [ ] Verifier l'accessibilite du snapshot pre-cutover et des scripts/procedures de restauration
  - [ ] Ouvrir le canal incident et initialiser le journal horodate

- [ ] Executer le scenario de rollback de bout en bout (AC: 1)
  - [ ] Simuler un echec cutover et declarer officiellement le rollback
  - [ ] Isoler le trafic de la stack cible et reactiver la stack precedente
  - [ ] Restaurer la data et executer les verifications API/auth et parcours metier critiques
  - [ ] Clore l'execution avec statut explicite (reussi, partiel, echec)

- [ ] Mesurer et documenter RTO/RPO + preuves (AC: 2)
  - [ ] Capturer timestamps de debut/fin et evenements pivot pour calcul RTO
  - [ ] Verifier la fenetre de perte acceptable et documenter le RPO observe
  - [ ] Produire un rapport synthetique des ecarts, causes et actions correctives

- [ ] Produire les artefacts d'audit et recommandations pre-M3.3 (AC: 1, 2)
  - [ ] Archiver les preuves minimales attendues (logs, rapports smoke, validation metier, decision finale)
  - [ ] Ajouter les enseignements operationnels dans la story et pointer les updates requises du runbook
  - [ ] Confirmer readiness pour M3.3 (decommission Supabase) ou lister les blocages restants

## Dev Notes

### Story Requirements

- Source normative story/AC: `/_bmad-output/planning-artifacts/epics.md` (Epic M3 / Story M3.2).
- Cette story est documentaire + operationnelle: elle valide la reversibilite reelle de la bascule.
- Dependance amont: M3.1 (`done`) et runbook cutover disponible avant execution rollback.

### Developer Context Section

- Le plan de rollback est deja reference dans:
  - `/_bmad-output/implementation-artifacts/production-cutover-runbook.md`
  - `/_bmad-output/implementation-artifacts/production-cutover-tabletop-report.md`
- Le test attendu ici doit transformer la procedure en evidence operationnelle verifiee, pas en simple specification theorique.
- Toute execution doit rester compatible avec la sequence normative M1->M4 et les gates definis dans `epics.md`.

### Technical Requirements

- Environnement cible: staging representatif production (routing, API NestJS, DB PostgreSQL, monitoring actifs).
- Preconditions minimales:
  - decision No-Go explicite,
  - canal incident actif,
  - snapshot/restore point valide,
  - roles critiques disponibles (Release Manager, SRE/Ops, Lead Backend, Lead Data, Support/Business).
- Objectifs operatoires cibles:
  - RTO <= 30 minutes,
  - RPO <= 5 minutes.
- La timeline rollback doit rester mesurable et horodatee de T+0 a T+45 avec proprietaire et critere de succes par etape.

### Architecture Compliance

- Conformite avec `/_bmad-output/project-context.md`:
  - aucune nouvelle dependance runtime Supabase introduite,
  - traçabilite complete des decisions critiques,
  - preservation de la continuite UX et stabilite des parcours critiques.
- Le test rollback doit verifier que le retour nominal ne casse pas auth, API critiques et coherence data.

### Library Framework Requirements

- Stack de reference migration (information la plus recente disponible localement):
  - React 18.3.1 + TypeScript 5.8.3 + Vite 5.4.19 (etat transitoire),
  - NestJS 10.4.22 (backend cible migration),
  - Supabase JS 2.75.1 (heritage a decommissionner, pas de nouveau runtime),
  - package manager cible: pnpm.
- Commits recents observes:
  - `d2b261f Document migration reconciliation`
  - `1879c42 Review reconciliation migration`
  - `cafc434 Review contract parity changes`
  - `33d8c0f Review migration e2e regression`
  - `58a3147 Adjust migration parity timestamps`
- Pattern impose: preuves reproductibles, criteres explicites, correction rapide des ambiguites.

### File Structure Requirements

- Fichier story principal:
  - `/_bmad-output/implementation-artifacts/m3-2-tester-le-plan-de-rollback-operationnel.md`
- Artefacts operationnels lies:
  - `/_bmad-output/implementation-artifacts/production-cutover-runbook.md`
  - `/_bmad-output/implementation-artifacts/production-cutover-tabletop-report.md`
- Traces supplementaires recommandees pendant execution:
  - `/_bmad-output/implementation-artifacts/cutover-logs/` (si besoin),
  - rapport rollback date (markdown + annexes logs/exports).

### Testing Requirements

- Verification minimale rollback:
  - 100% etapes critiques executees avec owner + preuve associee,
  - 0 etape critique sans statut explicite,
  - smoke API/auth critiques pass apres retour etat precedent,
  - parcours metier prioritaire sans blocage critique.
- Verification SLO ops:
  - RTO mesure et compare au seuil cible,
  - RPO mesure et compare au seuil cible,
  - ecarts formalises avec actions correctives.
- Verification documentaire:
  - journal horodate complet,
  - messages de communication debut/progression/cloture traces,
  - decision finale signee et archivable.

### Previous Story Intelligence

- M3.1 a deja formalise:
  - matrice Go/No-Go avec delai max de decision (10 min),
  - clarifications des preuves a archiver,
  - roles RACI stabilises.
- Le test M3.2 doit reutiliser ces conventions sans les reinventer:
  - meme vocabulaire de decision,
  - meme niveau de granularite des preuves,
  - meme discipline de traçabilite.

### Git Intelligence Summary

- Le flux recent est fortement oriente revue/qualite migration.
- Implication pour M3.2:
  - expliciter les limites et ecarts au lieu de les masquer,
  - produire des artefacts objectivement verifiables,
  - garder la story dans un perimetre documentaire/ops net sans derivation hors scope.

### Project Structure Notes

- Les artefacts de migration et de gouvernance sont centralises dans `/_bmad-output`.
- Cette story ne doit pas introduire de changement applicatif runtime; elle prepare l'execution et la decision go/no-go technique vers M3.3.

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic M3 / Story M3.2)
- `/_bmad-output/implementation-artifacts/m3-1-produire-le-runbook-de-cutover-production.md`
- `/_bmad-output/implementation-artifacts/production-cutover-runbook.md`
- `/_bmad-output/implementation-artifacts/production-cutover-tabletop-report.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- create-story workflow (targeted story selection: `m3-2`)
- context load: epics, project-context, previous story M3.1, runbook cutover, tabletop report, git history
- structural validation: sections obligatoires + coherence AC + references sources

### Completion Notes List

- Story M3.2 regeneree avec contexte implementation complet et guardrails de rollback.
- AC alignes sur `epics.md` et traduits en taches/subtasks executables.
- Intelligence M3.1 et artefacts cutover integres pour limiter ambiguite d'execution.
- Story statut cible prepare pour execution `dev-story`.
- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/m3-2-tester-le-plan-de-rollback-operationnel.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
