# Story 1.1: Structurer la vitrine multi-pages

Status: done

## Story

As a visiteur public,
I want naviguer facilement entre les pages vitrine,
so that je comprends rapidement la proposition de valeur AGILYS.

## Acceptance Criteria

1. **Given** un utilisateur non authentifie arrive sur le site  
   **When** il parcourt `/`, `/fonctionnalites`, `/cas-clients`, `/contact`  
   **Then** la navigation principale et le footer exposent ces routes en un clic  
   **And** les pages legales sont accessibles depuis le footer.

## Story Requirements

### Exigences fonctionnelles scopees

- Implementer une vitrine publique multi-pages avec routes React Router dediees pour `/`, `/fonctionnalites`, `/cas-clients`, `/contact`.
- Maintenir une navigation principale coherente entre ces pages, en desktop et mobile.
- Exposer les liens legaux publics dans le footer: `/mentions-legales`, `/politique-confidentialite`, `/conditions-utilisation`.
- Conserver un parcours direct vers l'authentification depuis la vitrine (`/auth/login`) sans etape intermediaire.

### Exigences non fonctionnelles a prendre en compte dans l'implementation

- Structure prete pour tenir les cibles Web Vitals de vitrine (LCP/CLS/INP) sans degrader la page existante.
- Architecture de pages evolutive: permettre l'ajout de contenu sur les pages vitrine sans casser le parcours app protege.

## Dev Notes

### Developer Context Section

Contexte repo observe:
- Frontend SPA React + Vite avec routing centralise dans `src/App.tsx`.
- Les routes vitrine existent deja mais pointent toutes vers `Index` (`/`, `/fonctionnalites`, `/cas-clients`, `/contact` => meme composant).
- Le header actuel utilise des ancres (`#features`, `#modules`, etc.) et non des routes de pages.
- Le footer actuel n'expose pas encore les routes legales requises.

Implication implementation:
- Ne pas creer un second systeme de routing: etendre le routing existant dans `src/App.tsx`.
- Eviter duplication de layout vitrine: introduire un layout/shared wrapper reutilisable pour les pages vitrine.
- Conserver la redirection auth existante (`/auth/login`) et les garanties de routes protegees via `ProtectedRoute`.

### Technical Requirements

- Utiliser TypeScript strictement (pas de `any` ajoute).
- Reutiliser les composants UI existants (`Header`, `Footer`, composants `ui/*`) avant d'en creer de nouveaux.
- Remplacer progressivement les ancres de navigation vitrine par des `Link` React Router vers routes publiques.
- Respecter le pattern de separation: pages (`src/pages/*`) + composants (`src/components/*`) sans logique metier cote UI.
- Ne pas introduire de nouvelle dependance runtime Supabase dans ce scope vitrine.

### Architecture Compliance

- Conforme a la contrainte de migration: aucun nouveau couplage metier vers Supabase pour la vitrine.
- Conserve le comportement de securite existant: routes privees toujours derriere `ProtectedRoute`.
- Respecte l'architecture actuelle (Vite + React Router) tout en restant "Next.js-ready" via separation claire des pages publiques.
- Evite breaking change de routing: toutes les routes existantes de l'app `/app/*` restent inchangees.

### Library / Framework Requirements

Versions actuellement en place dans le repo:
- `react` `^18.3.1`
- `react-router-dom` `^6.30.1`
- `vite` `^5.4.19`
- `@tanstack/react-query` `^5.83.0`

Veille rapide (2026-03-04) pour eviter un design obsolete dans la story:
- Dernieres versions npm detectees: React `19.2.4`, React Router DOM `7.13.1`, Vite `7.3.1`, React Query `5.90.21`.
- **Decision story 1.1**: ne pas upgrader dans cette story (scope fonctionnel routing/UI), mais coder sans API deprecated locale pour faciliter une migration future.

### File Structure Requirements

Fichiers cibles probables:
- `src/App.tsx` (routes publiques vitrine)
- `src/components/Header.tsx` (navigation vers routes publiques)
- `src/components/Footer.tsx` (liens legaux + navigation)
- `src/pages/Index.tsx` (page `/`)
- Nouveaux fichiers recommandes:
  - `src/pages/public/Fonctionnalites.tsx`
  - `src/pages/public/CasClients.tsx`
  - `src/pages/public/Contact.tsx`
  - `src/pages/public/MentionsLegales.tsx`
  - `src/pages/public/PolitiqueConfidentialite.tsx`
  - `src/pages/public/ConditionsUtilisation.tsx`
  - `src/components/public/PublicLayout.tsx` (layout partage Header/Main/Footer pour eviter duplication)

Regle de structure:
- Centraliser les pages vitrine dans un dossier `src/pages/public/` pour clarte et evolutivite.
- Mutualiser la structure de page via `PublicLayout` pour eviter copier-coller.

### Testing Requirements

Tests minimaux recommandes avant passage en `in-progress` puis done:

1. Route smoke tests (manuel ou E2E):
- `/`, `/fonctionnalites`, `/cas-clients`, `/contact` affichent bien une page publique (200 cote SPA).
- Les liens header/footer permettent la navigation en un clic entre les pages vitrine.

2. Non-regression auth:
- Le CTA principal vitrine redirige vers `/auth/login`.
- Les routes `/app/*` restent protegees et redirigent les anonymes vers `/auth/login`.

3. Liens legaux:
- Les liens `/mentions-legales`, `/politique-confidentialite`, `/conditions-utilisation` sont accessibles depuis le footer public.

4. Controle qualitatif:
- Verifier absence de duplication evidente de sections vitrine entre pages.
- Verifier que lint/typecheck restent propres.

### Project Structure Notes

- Le projet est en transition architecture; cette story doit rester dans le cadre frontend public sans toucher la logique metier backend.
- Respecter les regles projet sur reuse prioritaire des composants et stabilite des parcours critiques.
- Le mode de navigation doit etre deterministe et preparer la story 1.2 (conversion CTA) puis 1.3 (instrumentation funnel).

### References

- Epics story source: `_bmad-output/planning-artifacts/epics.md` (Epic 1, Story 1.1, AC)
- FR/NFR vitrine: `_bmad-output/planning-artifacts/prd.md` (FR74-FR90, NFR37-NFR44)
- Règles techniques projet: `_bmad-output/project-context.md`
- Routing actuel: `src/App.tsx`
- Pages/Composants actuels: `src/pages/Index.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/Hero.tsx`, `src/components/CTA.tsx`
- Protection auth/redirect: `src/components/ProtectedRoute.tsx`, `src/services/auth/auth-routing.ts`, `src/pages/auth/Login.tsx`

## Tasks / Subtasks

- [x] Introduire un layout public partage (AC: 1)
  - [x] Creer `PublicLayout` reutilisable (Header + Footer + slot contenu)
  - [x] Brancher `Index` sur ce layout sans regression visuelle majeure
- [x] Implementer les pages publiques dediees (AC: 1)
  - [x] Ajouter pages `/fonctionnalites`, `/cas-clients`, `/contact`
  - [x] Definir contenu minimum coherent avec proposition de valeur
- [x] Mettre a jour navigation vitrine (AC: 1)
  - [x] Header: passer des ancres vers routes publiques
  - [x] Footer: exposer routes publiques + pages legales
- [x] Ajouter pages legales publiques (AC: 1)
  - [x] `/mentions-legales`
  - [x] `/politique-confidentialite`
  - [x] `/conditions-utilisation`
- [x] Validation fonctionnelle et non-regression (AC: 1)
  - [x] Verifier navigation en un clic depuis header/footer
  - [x] Verifier redirection vers `/auth/login` intacte
  - [x] Verifier protection des routes `/app/*`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Codex Desktop)

### Debug Log References

- Sprint status parsing: first backlog story found `1-1-structurer-la-vitrine-multi-pages`
- No previous story in same epic (`story_num = 1`) for learnings extraction
- No dedicated architecture.md found in planning artifacts; architecture constraints sourced from `project-context.md`
- RED test story 1.1 added and executed: failing expected on anchor navigation + missing legal links
- GREEN implementation completed on routes/pages/layout/header/footer and CTA auth entrypoints
- Validation run:
  - `pnpm exec playwright test --config playwright.migration.config.ts --grep @story-1-1` ✅ (2 passed)
  - `pnpm run lint` ✅
  - `pnpm run test` ⚠️ pre-existing failing scenarios outside story scope (`@flux-OPS-05`, `@flux-BUD-02`)
- Review hardening run:
  - `pnpm exec playwright test --config playwright.migration.config.ts --grep @story-1-1` ✅ (4 passed)
  - `pnpm run lint` ✅

### Implementation Plan

- Reuse-first strategy: create one shared `PublicLayout` instead of duplicating `Header/Footer` composition on each public page.
- Keep routing centralized in `src/App.tsx` and map each public/legal route to a dedicated page component.
- Replace anchor-based vitrine navigation by React Router links in `Header` and `Footer`.
- Preserve direct auth conversion path by linking primary CTAs to `/auth/login`.
- Validate AC with dedicated E2E tests tagged `@story-1-1`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story prepared with implementation guardrails, reuse strategy, and file-level pointers.
- Story 1.1 implemented with dedicated public pages and legal pages routed via React Router.
- Shared `PublicLayout` introduced and integrated into `Index` and all new public pages to avoid duplication.
- Header and Footer now expose one-click navigation across `/`, `/fonctionnalites`, `/cas-clients`, `/contact` and legal pages.
- Vitrine CTAs now preserve direct access to `/auth/login` (Header, Hero, CTA section, Contact page).
- Story-specific E2E tests added and passing (`@story-1-1`), plus lint green.
- Review fixes applied: route `/` exposed explicitly in main navigation, story-tag tests added for anonymous `/app/*` redirect and mobile menu route navigation.

### Senior Developer Review (AI)

- HIGH resolved: navigation principale expose explicitement `/`, `/fonctionnalites`, `/cas-clients`, `/contact` (desktop/mobile).
- HIGH resolved: preuve de non-regression `/app/*` pour anonyme ajoutee dans tests `@story-1-1`.
- MEDIUM resolved: couverture mobile ajoutee via test viewport + ouverture `Sheet` mobile.
- MEDIUM resolved: File List alignee avec les changements reels du lot.

### File List

- src/App.tsx
- src/components/Header.tsx
- src/components/Footer.tsx
- src/pages/Index.tsx
- src/components/Hero.tsx
- src/components/CTA.tsx
- src/components/public/PublicLayout.tsx (new)
- src/pages/public/Fonctionnalites.tsx (new)
- src/pages/public/CasClients.tsx (new)
- src/pages/public/Contact.tsx (new)
- src/pages/public/MentionsLegales.tsx (new)
- src/pages/public/PolitiqueConfidentialite.tsx (new)
- src/pages/public/ConditionsUtilisation.tsx (new)
- tests/auth-migration.spec.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/1-1-structurer-la-vitrine-multi-pages.md (new)

## Change Log

- 2026-03-04: Story 1.1 implementee (layout public partage, pages publiques/légales dediees, navigation header/footer sur routes, tests E2E story 1.1, lint valide).
- 2026-03-04: Revue adversariale traitee (corrections HIGH/MEDIUM), tests `@story-1-1` renforces (redirect `/app/*` + mobile) et lint valide.
