# Story 8.3: Superviser divergences et SLA de rattrapage

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a responsable exploitation,
I want suivre les divergences d'integration,
so that les anomalies soient corrigees dans les delais cibles.

## Acceptance Criteria

1. **Qualification priorisee des divergences inter-systemes**
   - **Given** des ecarts detectes entre AGILYS et les systemes legacy
   - **When** la supervision d'integration est consultee
   - **Then** chaque divergence est qualifiee avec une priorite explicite (`P1`, `P2`, `P3`) et un statut de traitement
   - **And** les metadonnees minimales sont disponibles (`correlationId`, `tenantId`, `exerciceId`, `eventType`, `detectedAt`, `owner`, `reasonCode`).

2. **Mesure des delais de detection et de reprise (SLA)**
   - **Given** une divergence ouverte
   - **When** son cycle de resolution evolue
   - **Then** le systeme calcule et expose le delai de detection (`eventOccurredAt -> detectedAt`) et le delai de reprise (`detectedAt -> resolvedAt`)
   - **And** les seuils NFR sont evaluables sur la supervision (`NFR23` pour detection, `NFR22` pour reprise).

3. **Tableau de bord de supervision exploitable**
   - **Given** des divergences de statuts heterogenes
   - **When** l'utilisateur applique des filtres (`status`, `priority`, `correlationId`, `tenantId`, periode)
   - **Then** la vue retourne une liste paginee deterministe avec compteurs par statut/priorite
   - **And** la vue met en evidence les items en risque de depassement SLA.

4. **Actions de remediation tracees et securisees**
   - **Given** une divergence eligible a reprise
   - **When** un utilisateur habilite declenche une action (`retry`, `reconcile-manual`, `escalate`)
   - **Then** l'action est protegee par guards/permissions existants
   - **And** chaque action est journalisee (acteur, motif, horodatage, resultat, tentative).

5. **Idempotence et non-regression de la filiere asynchrone**
   - **Given** des reprises multiples sur une meme divergence
   - **When** les traitements sont rejoues
   - **Then** aucun doublon metier n'est introduit sur les flux critiques
   - **And** la filiere introduite en story 8.1 (outbox/ingestion/supervision) reste la source unique de verite.

6. **Conformite multi-tenant et auditabilite**
   - **Given** un environnement multi-tenant et multi-exercice
   - **When** la supervision et les actions de reprise sont executees
   - **Then** aucun acces cross-tenant/hors exercice n'est possible
   - **And** les journaux d'exploitation sont exportables et alignes avec les exigences de tracabilite (`FR35`, `NFR9`, `NFR12`).

## Tasks / Subtasks

- [ ] Etendre le modele de divergence integration (ou reutiliser l'existant 8.1) pour inclure priorite, owner, SLA timestamps et statut de remediation (AC: 1, 2, 5)
- [ ] Ajouter/adapter les endpoints backend de supervision pour filtres, pagination, compteurs et indicateurs SLA derives (AC: 2, 3)
- [ ] Implementer la logique backend de calcul des deltas SLA (`detectionDelayMs`, `recoveryDelayMs`) sans recalcul fragile cote UI (AC: 2)
- [ ] Exposer des actions de remediation securisees (`retry`, `escalate`, `reconcile-manual`) avec audit trail complet (AC: 4, 6)
- [ ] Reutiliser les hooks/services React Query existants (`integration-legacy`, `controle-interne`, `tresorerie`) au lieu de creer une filiere parallele (AC: 3, 5)
- [ ] Ajouter les badges/alertes de risque SLA dans l'UI de supervision avec tri stable et etats loading/empty/error explicites (AC: 3)
- [ ] Garantir idempotence des actions de reprise et absence de doublons sur traitements critiques (AC: 5)
- [ ] Verifier l'isolation tenant/exercice sur toutes les routes de supervision/remediation (AC: 6)
- [ ] Ajouter tests backend + front + E2E ciblant qualification, SLA, remediation securisee et non-regression 8.1 (AC: 1..6)
- [ ] Confirmer qu'aucune nouvelle dependance runtime Supabase n'est introduite (AC: 5, 6)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 8 / Story 8.3).
- FR directes:
  - `FR35`: suivi des rejets et divergences d'integration jusqu'a resolution
  - `FR33`, `FR34` en support (filiere asynchrone et correlation ID obligatoires)
- NFR prioritaires:
  - `NFR23`: detection des divergences `<= 5 min` (p95)
  - `NFR22`: reprise auto `>= 99%` en `<= 15 min`
  - `NFR24`: idempotence / faible taux de doublon
  - `NFR9`, `NFR12`: journalisation et correlation des actions critiques.

### Developer Context Section

- La story 8.1 a deja mis en place le socle cible: outbox persistante, ingestion idempotente, supervision et retry traces.
- La story 8.2 fournit les guardrails de resilience offline/reprise et de qualification de conflits; 8.3 doit converger dessus pour eviter la duplication de statuts.
- Patterns de code a reutiliser:
  - Backend: `backend/src/integration-legacy/*` pour la filiere d'integration asynchrone.
  - Backend supervision/securite: `backend/src/controle-interne/*`, `backend/src/auth/tenant-exercice-scope.guard.ts`.
  - Front API/hooks: `src/services/api/integration-legacy.service.ts`, `src/hooks/useIntegrationLegacy.ts`, plus patterns `tresorerie`/`controle-interne`.
- Anti-patterns a eviter:
  - nouvelle source de verite des divergences cote UI,
  - recalcul de SLA uniquement front,
  - contournement des guards/policies,
  - duplication des types de statuts entre domaines proches.

### Technical Requirements

- Le backend NestJS doit calculer et exposer des KPI SLA exploitables par item et par agregat (p95, en-risque, hors-SLA).
- Les deltas temporels doivent utiliser des timestamps metier explicites (`eventOccurredAt`, `detectedAt`, `resolvedAt`) et pas des approximations d'affichage.
- Le statut de divergence doit suivre une machine d'etats claire (exemple: `open`, `triaged`, `in_progress`, `resolved`, `closed`) avec transitions journalisees.
- Les actions de remediation doivent etre idempotentes et rejouables sans effet de bord non controle.
- Les erreurs operationnelles doivent etre actionnables (`reasonCode`, recommendation) et non generiques.

### Architecture Compliance

- Respect strict de `/_bmad-output/project-context.md`:
  - pas de nouvelle dependance runtime Supabase,
  - logique metier critique cote NestJS,
  - front via client API unifie + React Query,
  - reutiliser avant de creer.
- La filiere integration-legacy introduite en 8.1 reste canonique; 8.3 doit l'etendre plutot que la contourner.
- Toute route sensible doit conserver `JwtAuthGuard` + policy guard + scope tenant/exercice.
- Maintenir mapping explicite `snake_case` DB -> `camelCase` API sur champs SLA/correlation sensibles.

### Library / Framework Requirements

Versions constatees dans le repo (aucun upgrade requis pour cette story):

- Frontend: React `18.3.1`, TypeScript `5.8.3`, `@tanstack/react-query` `5.83.0`
- Backend: NestJS `10.4.22`, `pg` `8.19.0`

Informations techniques a appliquer:

- Pattern guards/authorization NestJS pour proteger supervision/remediation.
- Query keys React Query stables pour filtres de supervision et invalidation ciblee.
- Outbox/retry idempotent deja etabli: conserver cette mecanique au lieu d'un circuit alternatif.

### File Structure Requirements

Touchpoints probables a privilegier:

- Backend
  - `backend/src/integration-legacy/integration-legacy.service.ts`
  - `backend/src/integration-legacy/integration-legacy.controller.ts`
  - `backend/src/integration-legacy/dto/integration-legacy.dto.ts`
  - `backend/src/controle-interne/*` uniquement si mutualisation explicite et necessaire
- Frontend
  - `src/services/api/integration-legacy.service.ts`
  - `src/hooks/useIntegrationLegacy.ts`
  - `src/pages/app/ControleInterne.tsx` ou composant de supervision associe
  - `src/types/integration-legacy.types.ts`
- Data
  - migration SQL versionnee si ajout de colonnes/index SLA/priorite dans tables integration existantes.

### Testing Requirements

Tests backend obligatoires:

- qualification/priorisation correcte des divergences,
- calcul SLA exact (detection/reprise) et agregats,
- idempotence des actions de reprise,
- enforcement permissions + scope tenant/exercice,
- journalisation complete des actions d'exploitation.

Tests frontend obligatoires:

- filtres supervision + pagination + compteurs,
- indicateurs visuels en-risque/hors-SLA,
- parcours action de remediation (success/error/retry),
- non-regression de l'UX de supervision deja livree.

Tests E2E cibles:

- divergence detectee -> triage -> remediation -> resolution,
- cas depassement SLA visible et mesurable,
- tentative action non autorisee bloquee et tracee.

### Previous Story Intelligence

- Story precedente (`8-2`) insiste sur persistance fiable, reprise idempotente, qualification explicite et isolation scope.
- Story 8.1 a deja centralise la trace `correlationId` et le cycle retry/dead-letter.
- Decision pour 8.3: consolider la supervision SLA sur cette base commune, sans nouvelle filiere de statut.

### Git Intelligence Summary

- Les derniers commits montrent un pattern stable: livraison atomique backend+frontend+tests+migration.
- Les domaines `tresorerie`, `controle-interne`, `integration-legacy` evoluent ensemble: la story 8.3 doit rester coherente avec ce couplage fonctionnel.
- Les artefacts de story et `sprint-status.yaml` sont maintenus dans le meme lot: conserver cette discipline.

### Latest Tech Information

- Verification locale des versions du repo effectuee via `package.json` et `backend/package.json`.
- Aucun changement de version necessaire pour implementer la supervision SLA de la story 8.3.
- Priorite: appliquer les patterns techniques deja presents dans le codebase pour reduire le risque de regression.

### Project Context Reference

- `/_bmad-output/project-context.md`
- `/_bmad-output/planning-artifacts/epics.md`
- `/_bmad-output/planning-artifacts/prd.md`
- `/_bmad-output/implementation-artifacts/8-1-mettre-en-place-flux-dintegration-asynchrones.md`
- `/_bmad-output/implementation-artifacts/8-2-gerer-mode-degrade-et-reprise-apres-reconnexion.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/integration-legacy/`
- `src/services/api/integration-legacy.service.ts`
- `src/hooks/useIntegrationLegacy.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Checklist: `_bmad/bmm/workflows/4-implementation/create-story/checklist.md`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story alignee FR35/FR33/FR34 et NFR22/NFR23/NFR24/NFR9/NFR12 avec exigences implementables.
- Reuse-first confirme sur les modules `integration-legacy`, `controle-interne`, `tresorerie`.
- Aucune dependance runtime Supabase additionnelle requise.

### File List

- _bmad-output/implementation-artifacts/8-3-superviser-divergences-et-sla-de-rattrapage.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
