# Story 1.2: Optimiser la conversion vers l'auth et le lead

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visiteur public,
I want des CTA clairs vers authentification ou contact,
so that je peux convertir mon intention sans ambiguite.

## Acceptance Criteria

1. **Given** un visiteur parcourt une page vitrine  
   **When** il clique le CTA principal ou secondaire  
   **Then** le CTA principal redirige vers la page d'authentification  
   **And** le CTA secondaire declenche un parcours de decouverte/contact sans conflit visuel.

## Story Requirements

### Exigences fonctionnelles scopees

- Garantir une hierarchie CTA explicite sur toutes les pages vitrine: un CTA principal orientant vers `/auth/login`, un CTA secondaire orientant vers un parcours lead (`/contact` ou equivalent de decouverte produit).
- Uniformiser le libelle et le comportement des CTA principaux sur Header, Hero, sections CTA et pages publiques dediees.
- Eviter toute ambiguite entre conversion `auth` et conversion `lead`: chaque action doit avoir une destination claire, visible et stable.
- Maintenir le contrat de redirection existant des routes protegees (`/app/*` -> `/auth/login` pour anonyme, puis retour vers app apres login).

### Exigences non fonctionnelles a prendre en compte dans l'implementation

- Preserver les objectifs NFR37/NFR38 (Web Vitals) en evitant d'alourdir la vitrine avec une logique CTA inutilement complexe.
- Aligner la mise en forme CTA avec les exigences UX (pas de conflit visuel principal/secondaire).
- Preparer la story 1.3 (instrumentation funnel) en centralisant les points d'emission potentiels des clics CTA (structure reusable, selectors stables, conventions de nommage).

## Dev Notes

### Developer Context Section

Contexte repo observe:
- Routing public deja en place via `src/App.tsx` (`/`, `/fonctionnalites`, `/cas-clients`, `/contact`) et auth via `/auth/login`.
- CTA existants deja partiellement connectes:
  - `src/components/Hero.tsx`: principal -> `/auth/login`, secondaire -> `/fonctionnalites`
  - `src/components/CTA.tsx`: principal -> `/auth/login`, secondaire -> `/contact`
  - `src/components/Header.tsx`: actions `Connexion` / `Essai Gratuit` -> `/auth/login`
  - `src/pages/public/Contact.tsx`: CTA vers `/auth/login`
- Les parcours de securite sont portes par `ProtectedRoute` + `auth-routing` (`buildRequestedPath`, `resolveLoginRedirect`) avec redirection post-login vers `/app/dashboard` (ou `from` securise).

Implication implementation:
- Ne pas reintroduire de divergence page par page sur les CTA: extraire une source de verite reutilisable (ex: config CTA public ou composant partage) plutot que dupliquer les libelles/targets.
- Conserver le comportement deterministe auth deja operationnel; la story 1.2 cible l'optimisation conversion UI, pas un refactor auth profond.
- Isoler le scope au front public pour eviter toute regression sur les modules applicatifs `/app/*`.

### Technical Requirements

- TypeScript strict sans `any` ajoute.
- Reuse-first obligatoire: si plusieurs composants utilisent le meme schema principal/secondaire, creer ou etendre une abstraction partagee (ex: `PublicCtaGroup` ou constantes CTA dediees) au lieu de copier-coller.
- Respecter React Router v6 deja en place (`Link`/`to`) et eviter les redirections imperatives non necessaires.
- Conserver des libelles CTA explicites (intention actionnable) et stables pour instrumentation future.
- Ne pas ajouter de dependance runtime Supabase ni de logique metier backend dans cette story.

### Architecture Compliance

- Conforme a la contrainte migration: aucun nouveau couplage metier vers Supabase.
- Respect du pattern front actuel (pages publiques + layout partage) et du flux auth centralise (`ProtectedRoute` + `resolveLoginRedirect`).
- Pas de breaking change attendu sur exports publics, routing prive ou contrats API.
- Story strictement preparatoire pour Epic 1 Story 1.3 (funnel analytics) avec structure CTA claire.

### Library / Framework Requirements

Versions repo actuelles:
- `react` `^18.3.1`
- `react-router-dom` `^6.30.1`
- `vite` `^5.4.19`
- `@tanstack/react-query` `^5.83.0`
- `zod` `^3.25.76`

Veille npm (2026-03-04) pour eviter les orientations obsoletes:
- React `19.2.4`
- React Router DOM `7.13.1`
- Vite `7.3.1`
- React Query `5.90.21`
- Zod `4.3.6`

Decision story 1.2:
- Aucun upgrade de dependance dans cette story (scope conversion UX).
- Implementer en API compatibles stack actuelle pour limiter risque et faciliter migration laterale.

### File Structure Requirements

Fichiers cibles probables:
- `src/components/Header.tsx`
- `src/components/Hero.tsx`
- `src/components/CTA.tsx`
- `src/pages/public/Contact.tsx`
- `src/pages/public/Fonctionnalites.tsx`
- `src/pages/public/CasClients.tsx`

Abstraction recommandee (si duplication confirmee):
- `src/components/public/PublicCtaGroup.tsx` (new) pour standardiser CTA principal/secondaire
- `src/config/public-cta.ts` (new) pour centraliser libelles, destinations et identifiants analytics-ready

Regles structure:
- Toute nouvelle abstraction CTA reste dans `src/components/public` ou `src/config` (pas dans `src/pages`).
- Conserver `PublicLayout` comme point de composition; eviter d'y injecter de logique CTA metier.

### Testing Requirements

Tests minimaux recommandes:

1. Conversion CTA principale
- Sur `/`, `/fonctionnalites`, `/cas-clients`, `/contact`, verifier qu'un CTA principal visible mene a `/auth/login`.

2. Conversion CTA secondaire (lead)
- Verifier qu'un CTA secondaire visible mene a un parcours lead (`/contact` ou equivalent) sans cannibaliser visuellement le principal.

3. Non-regression auth flow
- Visiteur anonyme sur route `/app/*` redirige vers `/auth/login`.
- Apres login, redirection vers `from` (si path app safe) ou fallback `/app/dashboard`.

4. Accessibilite et UX
- Verifier labels explicites des CTA (lecteur ecran + clavier) et ordre de focus coherent.

5. Qualite technique
- `pnpm run lint`
- `pnpm run test:frontend` (au minimum les scenarios story-tagges Epic 1)

### Previous Story Intelligence

Learnings utiles depuis `1-1-structurer-la-vitrine-multi-pages`:
- La navigation publique est maintenant stabilisee via pages dediees et `PublicLayout`; il faut s'appuyer dessus, pas contourner.
- Les risques principaux identifies en revue 1.1 etaient la couverture mobile et la non-regression route protegee; garder ces checks dans 1.2.
- Les tests Playwright story-tagges se sont averes efficaces pour verrouiller regressions vitrine/auth.
- Pattern a conserver: changements atomiques, cibles front explicites, lint green avant passage done.

### Git Intelligence Summary

Commits recents (top 5):
- `27bb31a` Add routes pour pages publiques
- `3c55eb3` Review migration audit artifacts
- `b673e08` Review RBAC ABAC status update
- `52f5566` continue
- `917a277` Review hypercare dashboard changes

Insights actionnables:
- Le repo vient de stabiliser la couche routes publiques; 1.2 doit rester coherent avec cette base sans refonte de routing.
- Eviter couplage avec chantiers migration M3/M4 (hors scope) pour limiter conflits et regressions croisees.

### Latest Tech Information

Synthese utile au dev agent:
- Les versions majeures React/Router/Vite ont evolue, mais le projet reste sur stack React 18 + Router 6.
- Pour cette story, priorite a la coherence UX et a la fiabilite conversion; pas de migration framework.
- Si un refactor CTA est fait, le concevoir "upgrade-friendly" (API composant simple, props explicites, pas d'API liee a une version future).

### Project Context Reference

Regles projet appliquees:
- `/_bmad-output/project-context.md`: reuse avant creation, pas de nouveau flux Supabase, maintien redirection auth deterministe, lint/typecheck clean.
- `/_bmad-output/planning-artifacts/epics.md`: Epic 1 Story 1.2 (AC conversion CTA), dependance naturelle vers Story 1.3 instrumentation funnel.
- `/_bmad-output/planning-artifacts/prd.md`: FR76, FR77, FR78, FR79, FR80, FR88, FR90 + NFR37, NFR38, NFR40, NFR41, NFR42, NFR44.

## Tasks / Subtasks

- [x] Cartographier tous les CTA publics existants et leurs destinations (AC: 1)
  - [x] Identifier les CTA principaux vs secondaires par page/composant
  - [x] Documenter les divergences de libelle/target
- [x] Standardiser la conversion principale vers `/auth/login` (AC: 1)
  - [x] Harmoniser labels et targets du principal
  - [x] Verifier la visibilite du principal sur toutes pages vitrine
- [x] Structurer le parcours CTA secondaire lead (AC: 1)
  - [x] Garantir orientation vers decouverte/contact
  - [x] Ajuster hierarchy visuelle pour eviter conflit avec principal
- [x] Factoriser la logique CTA reusable si duplication confirmee (AC: 1)
  - [x] Creer/etendre composant ou config partagee
  - [x] Migrer les call sites sans regression visuelle
- [x] Valider conversion et non-regression (AC: 1)
  - [x] E2E CTA principal/secondaire sur routes publiques
  - [x] E2E redirection routes privees et post-login
  - [x] Lint + tests frontend story scope

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Codex Desktop)

### Debug Log References

- Story cible forcee par input utilisateur: `1-2-optimiser-la-conversion-vers-lauth-et-le-lead`
- Sprint status charge et valide: statut courant `backlog`
- Sources chargees: epics, prd, project-context, story precedente 1-1, code routing/auth actuel
- Architecture doc dediee non detectee dans `planning-artifacts`; contraintes architecture derivees de `project-context.md`
- Veille versions effectuee via npm registry (2026-03-04)

### Implementation Plan

- Reuse-first: standardiser CTA via abstraction/config partagee si duplication detectee.
- Prioriser le CTA principal vers `/auth/login` sur toutes surfaces vitrine.
- Encadrer CTA secondaire vers parcours lead clair sans competition visuelle.
- Verrouiller non-regression auth-flow avec tests E2E ciblas Epic 1.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.2 contextualisee avec garde-fous techniques, architecture et UX conversion.
- Intelligence story precedente et patterns git recents integres pour reduire les regressions.
- Story prete pour execution par `dev-story`.

### File List

- src/config/public-cta.ts
- src/components/public/PublicCtaGroup.tsx
- src/components/Header.tsx
- src/components/Hero.tsx
- src/components/CTA.tsx
- src/pages/public/Fonctionnalites.tsx
- src/pages/public/CasClients.tsx
- src/pages/public/Contact.tsx
- tests/auth-migration.spec.ts
- test-results/.last-run.json
- test-results/tests-auth-migration-auth--11aab-enforces-minimal-validation/
- test-results/tests-auth-migration-auth--831ce-allocation-entrypoint-in-UI/
- _bmad-output/implementation-artifacts/1-2-optimiser-la-conversion-vers-lauth-et-le-lead.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Story Completion Status

- Story status set to `done`.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.
