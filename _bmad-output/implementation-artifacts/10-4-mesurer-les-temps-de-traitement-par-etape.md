# Story 10.4: Mesurer les temps de traitement par etape

Status: done

## Story

As a responsable performance process,
I want suivre p50/p95 des etapes budgetaires,
so that je reduis les goulots d'etranglement operatoires.

## Acceptance Criteria

1. **Given** les evenements de cycle budgetaire traces
   **When** les indicateurs de temps sont calcules
   **Then** les mesures par etape et tendance periodique sont disponibles
   **And** les ecarts significatifs declenchent des alertes d'analyse.

## Tasks / Subtasks

- [x] Definir le contrat de mesure cycle-time (AC: 1)
  - [x] DTO filtres: exercice, periode, entite, etape, axe analytique.
  - [x] DTO metriques: p50, p95, volume, tendance, variation.
  - [x] Seuils d'alerte configurables par etape.

- [x] Implementer calculs backend des delais (AC: 1)
  - [x] Reutiliser les timestamps des transitions reservation/engagement/BC/facture/depense/paiement.
  - [x] Calculer p50/p95 par etape et par periode.
  - [x] Produire tendances et deltas periodiques.

- [x] Integrer visualisation front des temps de traitement (AC: 1)
  - [x] Ajouter vue dédiée dans Reporting/Dashboard analytique.
  - [x] Afficher metriques, evolution, alertes de depassement seuil.
  - [x] Ajouter filtres et export des indicateurs.

- [x] Ajouter alerting et audit (AC: 1)
  - [x] Déclencher signal quand seuil p95 depassé.
  - [x] Journaliser calculs, seuils appliqués et exports.
  - [x] Assurer isolation tenant et permissions de lecture.

- [x] Couvrir tests critiques (AC: 1)
  - [x] Backend: exactitude percentile, jeux de donnees limites, isolation tenant.
  - [x] Front: rendu metriques/tendances/alertes + filtres.
  - [x] Non-regression sur reporting existant.

## Dev Notes

- FR couvert: **FR73**.
- Aucune nouvelle dependance runtime Supabase.
- Garder stack et patterns existants (NestJS service/controller/dto/tests, frontend services API typed + React Query).
- Prioriser exactitude du calcul percentile et determinisme des resultats.
- Reutiliser surfaces existantes `Reporting.tsx` et composants reporting avant creation de nouvelles abstractions.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [Reporting.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Reporting.tsx)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Contrat cycle-time ajouté côté backend et frontend (DTO, types, endpoint, export, filtres).
- Calculs backend implémentés pour 5 transitions avec percentiles p50/p95, tendances mensuelles, variation et alertes de seuil.
- Visualisation intégrée dans l'onglet Reporting Analytique (synthèse, métriques, tendances, alertes, export cycle-time).
- Journalisation des calculs cycle-time et maintien des audits export/tenant déjà en place.
- Validation exécutée: tests Jest ciblés backend + lint/typecheck frontend/backend.
- Revue adversariale appliquée: correction du calcul `depense->paiement` (dernier paiement retenu), résilience du hook frontend en cas d'échec `cycle-time`, et stabilisation test E2E du libellé filtre.
- Couverture backend renforcée sur cas limite cycle-time sans transitions et assertion SQL sur l'agrégat de paiement.

### File List

- _bmad-output/implementation-artifacts/10-4-mesurer-les-temps-de-traitement-par-etape.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/src/reporting-analytique/dto/reporting-analytique.dto.ts
- backend/src/reporting-analytique/dto/reporting-analytique.dto.spec.ts
- backend/src/reporting-analytique/reporting-analytique.controller.ts
- backend/src/reporting-analytique/reporting-analytique.controller.spec.ts
- backend/src/reporting-analytique/reporting-analytique.service.ts
- backend/src/reporting-analytique/reporting-analytique.service.spec.ts
- src/types/reporting-analytique.types.ts
- src/services/api/reporting-analytique.service.ts
- src/hooks/useReportingAnalytique.ts
- src/components/reporting-analytique/ReportingAnalytiqueReport.tsx
- tests/reporting-analytique-ui.spec.ts

## Change Log

- 2026-03-10: Implémentation complète story 10.4 (cycle-time backend+frontend, alerting, audit, exports, tests).
- 2026-03-10: Revue senior (AI) traitée, anomalies HIGH/MEDIUM corrigées, tests backend reporting-analytique passés.

## Senior Developer Review (AI)

- Date: 2026-03-10
- Reviewer: Max (AI)
- Outcome: ✅ Approved after fixes

### Findings traités

1. HIGH: calcul `depense->paiement` sous-estimé (agrégat premier paiement). Corrigé via agrégat du dernier paiement.
2. HIGH: régression de résilience frontend (`Promise.all`) pouvant casser les vues existantes sur panne `cycle-time`. Corrigé avec fallback `cycleTime=null`.
3. MEDIUM: sélecteur E2E obsolète sur le libellé des filtres. Corrigé avec le nouveau texte.
4. MEDIUM: couverture edge-case backend incomplète. Corrigée avec test dédié `aucune transition`.

### Validation exécutée

- `pnpm --dir backend run test -- reporting-analytique.service.spec.ts reporting-analytique.dto.spec.ts reporting-analytique.controller.spec.ts`
- Résultat: 3 suites, 15 tests, tous passés.
