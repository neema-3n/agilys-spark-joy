# Story 9.3: Produire execution budgetaire et tresorerie

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a directeur financier,
I want suivre execution budgetaire et position de tresorerie,
so that je pilote les arbitrages quotidiens.

## Acceptance Criteria

1. **Given** des donnees budgetaires et flux de tresorerie
   **When** les rapports sont consultes
   **Then** les comparaisons prevision/execution et alertes de seuil sont affichees
   **And** les journaux de flux et etats de paiement/rapprochement sont inclus.

## Tasks / Subtasks

- [ ] Definir le contrat API reporting execution+tresorerie (AC: 1)
  - [ ] DTO filtres communs: `exerciceId`, `periode`, `entite`, `axeAnalytique`, `seuil`.
  - [ ] Vue execution budgetaire par ligne/composante/axe.
  - [ ] Vue tresorerie: journal flux, situation comptes, previsions, alertes, etat paiements, etat rapprochement.

- [ ] Implementer backend avec reutilisation des modules existants (AC: 1)
  - [ ] Reutiliser `tresorerie`, `paiements`, `rapprochements-bancaires`, `depenses`, `engagements` et agregations budgetaires existantes.
  - [ ] Calculer comparaison prevision/execution et ecarts de seuil.
  - [ ] Exposer indicateurs prioritaires sans duplication de logique metier.

- [ ] Integrer la surface front dans Reporting (AC: 1)
  - [ ] Ajouter service API type `reporting-execution-tresorerie.service.ts`.
  - [ ] Ajouter composants de tableaux/indicateurs dans `Reporting.tsx`.
  - [ ] Integrer filtres + etats chargement/erreur/empty + rafraichissement React Query.

- [ ] Ajouter export et observabilite (AC: 1)
  - [ ] Export CSV/XLSX/PDF sur les vues execution+tresorerie.
  - [ ] Journaliser generation/telechargement exports et correlationId si disponible.
  - [ ] Verifier droits d'acces avant consultation et export.

- [ ] Couvrir tests critiques (AC: 1)
  - [ ] Backend: nominal, erreurs filtres, isolation tenant, permissions.
  - [ ] Backend: exactitude comparaison prevision/execution et qualif alertes seuil.
  - [ ] Frontend: consultation, filtres, alertes visibles, journaux/etats paiements-rapprochement, export.

## Dev Notes

### Story Requirements

- Story cible: **9.3** dans l'**Epic 9**.
- FR couverts: **FR65**, **FR66**, **FR67**.
- Cette story consolide execution budgetaire + tresorerie operationnelle dans une vue de pilotage quotidienne.

### Developer Context Section

- Le livrable attendu combine trois dimensions dans un meme flux de consultation:
  - comparaison prevision/execution budgetaire par axes,
  - lecture de la tresorerie (flux, situation, previsions, alertes),
  - inclusion des etats de paiements et de rapprochements.
- Le scope est un reporting de pilotage exploitable, pas une refonte des workflows metiers depense/paiement/rapprochement.

### Technical Requirements

- Aucune nouvelle dependance runtime Supabase.
- Isolation tenant stricte sur 100% des requetes (`client_id = tenantId`).
- Normalisation explicite des montants avant calcul d'ecarts/previsions.
- Agrégations deterministes et tri stable sur journaux/etats.
- Les alertes de seuil doivent etre explicites, actionnables et testables.

### Architecture Compliance

- Backend: respecter le pattern NestJS (`controller + service + dto + spec`) et composer les services existants.
- Frontend: passer par `services/api` + hooks React Query; pas d'appel direct infra depuis les composants.
- Reutilisation prioritaire de la surface existante `Reporting.tsx` et des composants de reporting deja en place.
- Maintenir compatibilite avec les regles RBAC/ABAC deja definies.

### Library & Framework Requirements

- Stack declaree repo: React 18.3.1, React Query 5.83.0, NestJS 10.4.22, pg 8.19.0, class-validator 0.14.4, pnpm 9.12.0.
- Versions npm plus recentes existent (verification 2026-03-09), mais hors scope story.
- Decision: livrer sans upgrade de stack pour minimiser le risque de regression.

### File Structure Requirements

- Backend recommande:
  - `backend/src/reporting-execution-tresorerie/`
  - `backend/src/reporting-execution-tresorerie/dto/`
- Frontend recommande:
  - `src/services/api/reporting-execution-tresorerie.service.ts`
  - `src/components/reporting-execution-tresorerie/`
  - integration dans `src/pages/app/Reporting.tsx`
- Nommage explicite orienté metier, pas de duplication des types.

### Testing Requirements

- Backend:
  - tests multi-tenant + permissions,
  - exactitude des indicateurs prevision/execution,
  - exactitude des flux/paiements/rapprochements exposes.
- Frontend:
  - parcours filtrage et consultation,
  - affichage alertes de seuil,
  - parite consultation/export.
- Definition of Done:
  - AC1 valide,
  - lint/typecheck propres,
  - couverture tests critiques,
  - aucun couplage Supabase ajoute.

### Previous Story Intelligence

Apprentissages depuis Story 9.2:

- Conserver une extension progressive de `Reporting.tsx` (pas de rupture UX).
- Garder les garde-fous d'aggregation: isolation tenant, montants normalises, jointures sans double comptage.
- Reutiliser un contrat API typed par domaine et des composants ciblés au lieu d'un gros bloc monolithique.

### Git Intelligence Summary

- Les derniers commits montrent un flux continu de delivery story par increments.
- Implication pour 9.3: changements atomiques backend+frontend+tests, alignes sur le pattern des stories precedentes reporting.

### Latest Tech Information

- Verification npm du 2026-03-09 (registre npm) confirme des versions plus recentes disponibles.
- Cette story reste sur versions repo actuelles pour stabilite d'implementation.

### Project Structure Notes

- Le projet est encore en transition Vite/React + NestJS vers cible Next.js/NestJS.
- Les modules `tresorerie`, `paiements`, `rapprochements-bancaires` sont deja presents et doivent etre reutilises comme base de calcul.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md) - Epic 9, Story 9.3, AC story
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md) - FR65, FR66, FR67
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md) - guardrails migration
- [9-2-produire-etat-dettes-fournisseurs-et-avances.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/9-2-produire-etat-dettes-fournisseurs-et-avances.md) - story precedente
- [tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.service.ts) - logique tresorerie existante
- [tresorerie.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.controller.ts) - endpoints tresorerie existants
- [paiements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/paiements.service.ts) - client API paiements
- [Reporting.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Reporting.tsx) - surface reporting front

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story key detectee: `9-3-produire-execution-budgetaire-et-tresorerie`
- Contexte utilise: sprint-status, epics, story 9.2, services reporting/tresorerie/paiements

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- _bmad-output/implementation-artifacts/9-3-produire-execution-budgetaire-et-tresorerie.md
