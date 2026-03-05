# Story 1.4: Garantir performances et SEO de la vitrine

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a responsable acquisition,
I want une vitrine performante et indexable,
so that le trafic organique et l'experience restent au niveau cible.

## Acceptance Criteria

1. **Given** les pages vitrine en production
   **When** les metriques web vitals et SEO sont mesurees
   **Then** les seuils LCP/CLS/INP et les metadonnees SEO critiques sont conformes
   **And** les ecarts de suivi analytics restent dans la tolerance definie.

## Story Requirements

### Exigences fonctionnelles scopees

- Assurer une couverture SEO complete sur les routes vitrine `/, /fonctionnalites, /cas-clients, /contact` avec metadonnees coherentes par page.
- Garantir les elements SEO critiques minimum: `title`, `meta description`, canonical, structure de titres Hn propre, indexabilite robots.
- Produire et maintenir des artefacts SEO publics versionnes pour la release (au minimum `robots.txt` coherent et `sitemap.xml` des routes vitrine).
- Mesurer les Web Vitals cibles sur les routes vitrine et exposer des donnees d'observabilite exploitables pour suivi mensuel.
- Relier le monitoring vitals/SEO avec le funnel analytics existant (Story 1.3) pour detecter ecarts et derives.

### Exigences non fonctionnelles a prendre en compte dans l'implementation

- Conformite NFR37: `LCP <= 2,5s` (p75) mobile et desktop.
- Conformite NFR38: `CLS <= 0,1` et `INP <= 200ms` (p75).
- Conformite NFR39: couverture indexabilite et metadonnees critiques a `100%` a chaque release vitrine.
- Conformite NFR40 + NFR44: couverture analytics maintenue a `100%` avec tolerance d'ecart de reconciliation `<= 1%`.
- Aucune regression UX/navigation/auth existante sur Epic 1 (stories 1.1-1.3).

## Dev Notes

### Developer Context Section

Contexte repo observe:
- SPA React/Vite avec routage public dans `src/App.tsx`.
- Routes vitrine deja stabilisees: `/, /fonctionnalites, /cas-clients, /contact`.
- Tracking funnel deja en place via `src/services/analytics/events.ts`, `src/services/analytics/tracker.ts`, `src/hooks/useTrackPublicPageView.ts`.
- CTA publics centralises dans `src/components/public/PublicCtaGroup.tsx` avec surfaces typees.
- SEO global actuellement limite a `index.html`; pas de gestion per-page explicite detectee.
- `public/robots.txt` existe, mais aucun `public/sitemap.xml` detecte.

Implication implementation:
- Ne pas recreer un systeme analytics parallelle: etendre la couche existante Story 1.3.
- Introduire une abstraction SEO reusable (hook/composant) appelee par toutes les pages vitrine.
- Eviter toute logique SEO ad hoc dans chaque page sans couche partagee.
- Instrumenter les Web Vitals avec emission non bloquante (meme principe de resilience que tracker analytics existant).

### Technical Requirements

- TypeScript strict-compatible, aucun `any` non justifie.
- Reuse-first obligatoire:
  - reutiliser `trackEvent` / conventions existantes pour nouveaux evenements perf/seo,
  - factoriser SEO per-page via une abstraction unique (ex: `usePublicSeo`).
- Aucun couplage nouveau avec Supabase (`@supabase/supabase-js`) pour cette story.
- Instrumentation Web Vitals non bloquante et defensive (erreurs silencieuses, pas d'impact parcours user).
- Centraliser les constantes de seuils NFR et les noms d'evenements pour eviter divergence inter-pages.
- Preserver compatibilite React 18 / Router 6 / Vite 5 du repo.

### Architecture Compliance

- Aligne avec `project-context.md`:
  - pas de nouvelle dependance runtime Supabase,
  - changement atomique limite au scope vitrine,
  - maintien flux auth deterministe (`anon -> /auth/login -> app`).
- Respect de l'architecture actuelle (SPA Vite) tout en preparant une migration Next.js-ready (separation claire UI/SEO/analytics).
- Aucun breaking change attendu sur exports publics, routes protegees, ou contrats API backend.
- Story strictement orientee qualite/performance/indexabilite de la vitrine publique.

### Library / Framework Requirements

Versions detectees localement (`package.json`):
- `react` `^18.3.1`
- `react-router-dom` `^6.30.1`
- `vite` `^5.4.19`
- `typescript` `^5.8.3`
- `@playwright/test` `^1.45.0`

Contraintes d'implementation:
- Utiliser des APIs supportees par ces versions.
- Ne pas lancer d'upgrade framework/dependance dans cette story sans demande explicite.
- Appuyer les recommandations techniques sur le contexte repo (pas de web-research technique externe, conforme aux regles projet).

### File Structure Requirements

Fichiers cibles probables:
- `src/hooks/usePublicSeo.ts` (new, centralisation title/description/canonical/robots)
- `src/services/analytics/events.ts` (extend, evenements perf/seo si retenus)
- `src/services/analytics/tracker.ts` (extend, emission non bloquante vitals/seo audit)
- `src/services/analytics/web-vitals.ts` (new, collecteurs LCP/CLS/INP)
- `src/pages/Index.tsx`
- `src/pages/public/Fonctionnalites.tsx`
- `src/pages/public/CasClients.tsx`
- `src/pages/public/Contact.tsx`
- `public/sitemap.xml` (new)
- `public/robots.txt` (update si necessaire, coherence sitemap)
- `tests/auth-migration.spec.ts` (extension scenarios story 1.4)

Regles structure:
- Garder la logique SEO dans hooks/services (`src/hooks`, `src/services`) et pas dans `PublicLayout` sous forme de duplication.
- Conserver les pages vitrine simples: declaration de metadata via API commune uniquement.
- Toute nouvelle telemetrie doit transiter par la couche `services/analytics` deja en place.

### Testing Requirements

Tests minimaux recommandes:

1. Couverture SEO routes vitrine
- Verifier sur `/, /fonctionnalites, /cas-clients, /contact` la presence/valeur de `title`, `meta description`, canonical et indexabilite.

2. Presence artefacts SEO publics
- Verifier que `public/sitemap.xml` reference les routes vitrine attendues.
- Verifier coherence `robots.txt` (allow + pointeur sitemap si adopte).

3. Instrumentation Web Vitals
- Verifier emission non bloquante des mesures (LCP, CLS, INP) avec fallback sans crash.
- Verifier format de payload compatible avec couche analytics existante.

4. Non-regression funnel/auth
- Rejouer les scenarios Epic 1 Story 1.3 pour garantir absence de regression sur events funnel et navigation auth.

5. Qualite technique
- `pnpm run lint`
- `pnpm run test:frontend` (au minimum tags stories Epic 1)

### Previous Story Intelligence

Learnings utiles depuis `1-3-instrumenter-le-funnel-vitrine-app`:
- La couche analytics locale est deja standardisee et resiliente; il faut l'etendre plutot que creer un nouveau canal.
- Les surfaces CTA et les routes vitrine sont deja mappees et testees dans `tests/auth-migration.spec.ts`.
- Les regressions principales observees en Epic 1 viennent des emissions mal placees; garder des points d'emission strictement centralises.
- Les tests Playwright story-tagges Epic 1 servent de garde-fou principal: les etendre est preferable a creer un fichier E2E parallele.

### Git Intelligence Summary

Commits recents analyses:
- `77fa740` Update sprint code review status
- `27bb31a` Add routes pour pages publiques
- `3c55eb3` Review migration audit artifacts
- `b673e08` Review RBAC ABAC status update
- `52f5566` continue

Insights actionnables:
- Les routes publiques viennent d'etre stabilisees; Story 1.4 doit eviter toute refonte de routing.
- La base tests/auth est activee et entretenue: ajouter les checks SEO/perf dans ce flux limite les regressions.
- Conserver un scope strict front vitrine pour eviter collisions avec chantiers migration M3/M4.

### Latest Tech Information

Informations retenues pour la story:
- Le repo est en stack React 18 + Router 6 + Vite 5, compatible avec une instrumentation vitals cote navigateur et SEO per-page cote SPA.
- Aucun prerequis d'upgrade dependance n'est necessaire pour traiter cette story.
- L'approche recommandee est une couche SEO+Vitals interne, typee, non bloquante, branchee sur la telemetrie existante.

### Project Context Reference

Regles projet appliquees:
- `/_bmad-output/project-context.md`: reuse avant creation, pas de nouvelle dependance runtime Supabase, maintien flux auth deterministe, lint/tests clean.
- `/_bmad-output/planning-artifacts/epics.md`: Epic 1 Story 1.4 (performance + SEO vitrine).
- `/_bmad-output/planning-artifacts/prd.md`: NFR37, NFR38, NFR39, NFR40, NFR43, NFR44.

## Tasks / Subtasks

- [x] Centraliser la gestion SEO per-page sur les routes vitrine (AC: 1)
  - [x] Creer une abstraction reutilisable (hook/service) pour title, description, canonical, robots
  - [x] Appliquer cette abstraction sur `/, /fonctionnalites, /cas-clients, /contact`

- [x] Mettre en conformite les artefacts SEO publics (AC: 1)
  - [x] Ajouter/mettre a jour `public/sitemap.xml` avec routes vitrine
  - [x] Verifier et ajuster `public/robots.txt` pour coherence indexation

- [x] Instrumenter les Web Vitals critiques (AC: 1)
  - [x] Collecter LCP/CLS/INP de maniere non bloquante
  - [x] Emettre les mesures via la couche analytics existante avec schemas types

- [x] Verrouiller la non-regression funnel et auth (AC: 1)
  - [x] Etendre `tests/auth-migration.spec.ts` avec assertions SEO/perf vitrine
  - [x] Revalider scenarios Story 1.3 (funnel events + redirections auth)

- [x] Qualifier la story en quality gate (AC: 1)
  - [x] Executer `pnpm run lint`
  - [x] Executer `pnpm run test:frontend`
  - [x] Documenter ecarts restants et plan d'action si seuils NFR non atteints

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Codex Desktop)

### Debug Log References

- Story cible fournie par l'utilisateur: `1-4-garantir-performances-et-seo-de-la-vitrine`
- Sprint status charge et valide: statut initial story `ready-for-dev`
- Sources principales analysees: `epics.md`, `prd.md`, `project-context.md`, stories `1-2` et `1-3`, structure `src/` et tests E2E existants
- Architecture dediee absente dans `planning-artifacts`; contraintes derivees de `project-context.md` + codebase reelle
- Validation execution:
  - `pnpm run lint` ✅
  - `pnpm exec playwright test tests/auth-migration.spec.ts --grep "@story-1-4"` ✅
  - `pnpm run test:frontend` ✅ (`31 passed`)

### Implementation Plan

- Etendre les abstractions existantes (analytics + hooks) pour couvrir SEO et vitals sur routes vitrine.
- Ajouter les artefacts SEO manquants (`sitemap.xml`) et verifier coherence `robots.txt`.
- Verrouiller par tests Playwright Epic 1 sans duplication de suite.
- Maintenir un scope strictement non-regressif sur navigation/auth.

### Completion Notes List

- Hook SEO mutualise implemente et applique sur `/, /fonctionnalites, /cas-clients, /contact`.
- Instrumentation Web Vitals LCP/CLS/INP non bloquante ajoutee dans la couche analytics existante, avec correction de l'aggregation INP par interaction.
- Evenements analytics et tests E2E etendus pour couverture SEO + performance vitrine.
- Canonical SEO resolu dynamiquement depuis l'origine courante (plus de domaine hardcode).
- Artefacts SEO publics alignes: `robots.txt` + `sitemap.xml` sans domaine hardcode.
- Quality gate global valide: lint + suite frontend complete passent.
- NFR37/NFR38: instrumentation et telemetry valides; confirmation p75 de conformite a suivre via monitoring RUM mensuel (pas derivable d'un run E2E ponctuel).

### File List

- .env.example
- src/hooks/usePublicSeo.ts
- src/hooks/useTrackPublicPageView.ts
- src/services/analytics/events.ts
- src/services/analytics/tracker.ts
- src/services/analytics/web-vitals.ts
- src/components/ProtectedRoute.tsx
- src/components/public/PublicCtaGroup.tsx
- src/pages/Index.tsx
- src/pages/app/AppLayout.tsx
- src/pages/auth/Login.tsx
- src/pages/public/Fonctionnalites.tsx
- src/pages/public/CasClients.tsx
- src/pages/public/Contact.tsx
- public/robots.txt
- public/sitemap.xml
- tests/auth-migration.spec.ts
- _bmad-output/implementation-artifacts/1-4-garantir-performances-et-seo-de-la-vitrine.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-03-04: Implementation Story 1.4 (SEO per-page, telemetry Web Vitals, artefacts SEO publics, extension tests E2E vitrine).
- 2026-03-04: Quality gate valide; lint global + suite frontend complete passes (`31/31`).
- 2026-03-04: Review remediations appliquees (suppression domaine SEO hardcode, correction INP, tests SEO rendus portables, ecarts NFR documentes).

## Senior Developer Review (AI)

- 2026-03-04: Revue adversariale executee.
- HIGH resolus: canonical/robots/sitemap avec domaine hardcode remplaces par approche portable.
- HIGH resolus: claims de conformite NFR clarifies avec distinction instrumentation vs preuve p75 RUM.
- MEDIUM resolu: mesure INP amelioree par aggregation des interactions.
- MEDIUM resolu: File List synchronisee avec les fichiers effectivement modifies.

## Story Completion Status

- Story status set to `done`.
- Completion note: implementation Story 1.4 complete, review findings HIGH/MEDIUM resolus, quality gate valide (lint + tests frontend complets).
