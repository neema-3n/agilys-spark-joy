# Story 10.4: Mesurer les temps de traitement par etape

Status: ready-for-dev

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

- [ ] Definir le contrat de mesure cycle-time (AC: 1)
  - [ ] DTO filtres: exercice, periode, entite, etape, axe analytique.
  - [ ] DTO metriques: p50, p95, volume, tendance, variation.
  - [ ] Seuils d'alerte configurables par etape.

- [ ] Implementer calculs backend des delais (AC: 1)
  - [ ] Reutiliser les timestamps des transitions reservation/engagement/BC/facture/depense/paiement.
  - [ ] Calculer p50/p95 par etape et par periode.
  - [ ] Produire tendances et deltas periodiques.

- [ ] Integrer visualisation front des temps de traitement (AC: 1)
  - [ ] Ajouter vue dédiée dans Reporting/Dashboard analytique.
  - [ ] Afficher metriques, evolution, alertes de depassement seuil.
  - [ ] Ajouter filtres et export des indicateurs.

- [ ] Ajouter alerting et audit (AC: 1)
  - [ ] Déclencher signal quand seuil p95 depassé.
  - [ ] Journaliser calculs, seuils appliqués et exports.
  - [ ] Assurer isolation tenant et permissions de lecture.

- [ ] Couvrir tests critiques (AC: 1)
  - [ ] Backend: exactitude percentile, jeux de donnees limites, isolation tenant.
  - [ ] Front: rendu metriques/tendances/alertes + filtres.
  - [ ] Non-regression sur reporting existant.

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

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- _bmad-output/implementation-artifacts/10-4-mesurer-les-temps-de-traitement-par-etape.md
