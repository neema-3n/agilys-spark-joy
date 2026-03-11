---
title: 'Migration frontend Vite vers Next.js'
slug: 'migration-frontend-vite-vers-nextjs'
created: '2026-03-11T00:00:00-04:00'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['React 18', 'TypeScript', 'Vite 5', 'Next.js App Router cible', 'react-router-dom', '@tanstack/react-query', 'next-themes', 'shadcn/ui', 'Playwright', 'pnpm']
files_to_modify: ['/Volumes/mySD1.5/projects/agilys-spark-joy/src/main.tsx', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/App.tsx', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/contexts/AuthContext.tsx', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/contexts/ClientContext.tsx', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/contexts/ExerciceContext.tsx', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/ProtectedRoute.tsx', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/AppLayout.tsx', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/Index.tsx', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/auth/Login.tsx', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/auth.service.ts', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/clients.service.ts', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/http-client.ts', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/auth/auth-routing.ts', '/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/use-mobile.tsx', '/Volumes/mySD1.5/projects/agilys-spark-joy/tests/auth-migration.spec.ts', '/Volumes/mySD1.5/projects/agilys-spark-joy/package.json', '/Volumes/mySD1.5/projects/agilys-spark-joy/vercel.json', '/Volumes/mySD1.5/projects/agilys-spark-joy/next.config.js', '/Volumes/mySD1.5/projects/agilys-spark-joy/app']
code_patterns: ['SPA avec bootstrap client unique', 'Routeur central react-router-dom avec routes imbriquees', 'Providers globaux dependants du routeur', 'Pages lazy chargees via Suspense', 'Auth redirect base sur location state et localStorage', 'Services API centralises et reutilisables', 'Navigation applicative concentree dans AppLayout', 'Tests Playwright de non-regression sur les flux auth']
test_patterns: ['Playwright E2E frontend', 'Tests de parcours auth et redirection', 'Smoke tests de parite UI apres migration', 'Validation manuelle des routes publiques et protegees']
---

# Tech-Spec: Migration frontend Vite vers Next.js

**Created:** 2026-03-11T00:00:00-04:00

## Overview

### Problem Statement

Le frontend actuel repose sur une SPA `Vite/React` avec `react-router-dom`, bootstrap client unique et conventions d'environnement propres a Vite. Cet etat ne correspond pas a l'architecture cible `Next.js`, complique l'alignement avec `Vercel`, et maintient une divergence structurelle avec la cible de deploiement et de migration du projet. La migration ne doit cependant pas degrader l'experience utilisateur en donnant visuellement l'impression d'un site web avec rechargements complets ou perte du comportement applicatif.

### Solution

Definir une migration directe de l'application frontend existante vers `Next.js` App Router, avec parite fonctionnelle complete avant bascule, reutilisation maximale des composants, providers et services existants, et refactors limites aux changements necessaires pour obtenir une architecture frontend saine et compatible avec la cible plateforme, tout en preservant une UX d'application metier avec layout persistant, navigation fluide et absence de rechargements complets perceptibles lors des changements d'ecran.

### Scope

**In Scope:**
- structure cible du frontend `Next.js` App Router
- strategie de transformation directe de l'application existante
- migration du routing `react-router-dom` vers le systeme de routes `Next.js`
- migration du bootstrap global, des providers et des layouts
- compatibilite des variables d'environnement `Vite` vers `Next.js`
- ordre de migration des pages, modules et parcours critiques jusqu'a parite complete
- criteres de verification, de non-regression et de bascule finale
- preservation explicite d'une UX d'application metier sans effet visuel de \"site web\"

**Out of Scope:**
- refonte UX ou redesign majeur
- changement de perimetre fonctionnel metier
- reimplementation backend NestJS hors adaptations necessaires de contrat frontend
- strategie complete de deploiement multi-environnements
- mise en production

## Context for Development

### Codebase Patterns

- Le frontend actuel est une SPA React monolithique sous `src/` avec un point d'entree `main.tsx` et un routeur central dans `App.tsx`.
- Le projet utilise `react-router-dom`, `React Query`, `next-themes`, plusieurs providers globaux, et des composants partages deja en place.
- Les pages publiques et applicatives sont chargees via `lazy()` et `Suspense`, avec une route protegee imbriquee sous `/app`.
- La migration doit maintenir la continuite UX, l'auth et les appels API vers le backend NestJS.
- Les regles projet imposent une approche `Next.js-ready`, sans ajouter de nouvelles dependances runtime Supabase, et avec priorite a la reutilisation des composants existants.
- L'exigence utilisateur explicite est de conserver une sensation visuelle d'application metier: sidebar persistante, navigation interne fluide, absence de flash de page complet et conservation du contexte d'ecran.
- `AuthContext` depend de `useNavigate` et `useLocation` pour hydrater la session, gerer les redirections vers `/auth/login` et restaurer la destination demandee; cette logique devra etre remappee vers `next/navigation` sans casser les flux actuels.
- `ProtectedRoute` encapsule aujourd'hui la protection des routes applicatives et le tracking d'atterrissage. Dans `Next.js`, cette responsabilite devra etre repartie entre layout protege, composants client et mecanisme de redirection compatible App Router.
- `AppLayout` concentre une grande partie de la navigation applicative, du state de sidebar, du scroll restore et des liens `/app/*`; c'est un point d'ancrage majeur pour la migration vers un layout segment-based `Next.js`.
- `AppLayout` devra rester le coeur de l'experience applicative; la migration doit privilegier un layout `Next.js` persistant pour eviter tout effet de recharge complete a chaque clic menu.
- Les contexts `ClientContext` et `ExerciceContext` reposent sur l'enchainement `Auth -> Client -> Exercice`, ce qui impose de reconstruire proprement l'ordre des providers dans `app/layout.tsx` et les layouts proteges.
- Les services API (`auth.service`, `clients.service`, `http-client`) sont deja separes de la couche routeur, ce qui permet leur reutilisation dans `Next.js` avec adaptation limitee des points de redirection et des variables d'environnement.
- Le fichier `vercel.json` confirme un deploiement SPA Vite par rewrite vers `index.html`; il deviendra obsolescent ou devra etre simplifie apres la migration vers `Next.js`.
- Le test [`tests/auth-migration.spec.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/tests/auth-migration.spec.ts) couvre deja des flux critiques de redirection et de session; il doit etre preserve et adapte au nouveau mode de lancement frontend.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md` | Contraintes de migration et architecture cible |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/src/main.tsx` | Bootstrap frontend actuel |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/src/App.tsx` | Routeur central actuel et composition des providers |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/package.json` | Stack, scripts et dependances frontend |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/src/contexts/AuthContext.tsx` | Hydratation de session et redirections auth dependantes du routeur |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/ProtectedRoute.tsx` | Protection des routes applicatives et redirections |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/AppLayout.tsx` | Layout applicatif et navigation `/app/*` |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/auth/Login.tsx` | Flux de login, redirection post-auth et UX d'acces |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/auth.service.ts` | Service auth reutilisable pendant la migration |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/auth/auth-routing.ts` | Helpers de redirection a adapter pour `Next.js` |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/tests/auth-migration.spec.ts` | Tests de non-regression des flux auth et de redirection |
| `/Volumes/mySD1.5/projects/agilys-spark-joy/vercel.json` | Configuration de deploiement Vite actuelle a retirer ou revoir |

### Technical Decisions

- La migration doit transformer l'application existante, pas creer un second frontend parallele.
- L'objectif est une parite fonctionnelle complete avant retrait du frontend Vite.
- Les choix d'architecture pendant la migration doivent favoriser une solution saine dans `Next.js`, sans refactor gratuit non lie au besoin.
- Les providers, composants UI et services existants doivent etre conserves ou adaptes avant toute recreation.
- La migration doit viser `Next.js` App Router avec layouts imbriques, en remplaçant `react-router-dom` plutot que de tenter une cohabitation durable des deux systemes.
- Les routes publiques, auth et applicatives devront etre remappees vers l'arborescence `app/` avec conservation des URLs existantes pour garantir la parite et eviter toute regression de liens.
- Les redirections auth devront abandonner `location.state` au profit de parametres d'URL, mecanismes `next/navigation`, ou une abstraction equivalente compatible App Router.
- Les scripts de build/dev/test devront etre convertis de `vite` vers `next dev` et `next build` seulement quand la parite fonctionnelle critique sera atteinte ou encadree par une etape de bascule explicite.
- La compatibilite des variables d'environnement doit prevoir une transition de `VITE_API_BASE_URL` vers `NEXT_PUBLIC_API_BASE_URL` sans contradiction temporaire dans la documentation et les services front.
- La migration doit favoriser les layouts persistants, les composants client pour les surfaces interactives de l'application, et des transitions internes sans full reload perceptible afin de conserver une UX d'application et non une sensation de site vitrine.

## Implementation Plan

### Tasks

- [ ] Task 1: Installer et preparer l'infrastructure `Next.js` dans l'application existante
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/package.json`
  - Action: Remplacer les dependances et scripts `Vite` par les scripts et packages `Next.js` necessaires, en conservant `pnpm`, `React`, `TypeScript`, `next-themes`, `React Query` et les librairies UI existantes.
  - Notes: Cette tache doit aussi identifier les packages `Vite`/`react-router-dom` a retirer ou rendre temporaires jusqu'a la bascule finale.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/next.config.js`
  - Action: Creer la configuration `Next.js` minimale compatible avec l'application actuelle.
  - Notes: Definir ici les besoins de transpilation, alias et options utiles au repo.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/tsconfig.json`
  - Action: Ajuster la configuration TypeScript pour `Next.js` sans casser les alias existants.
  - Notes: La compatibilite avec les imports `@/` doit etre preservee.
- [ ] Task 2: Recomposer le bootstrap global dans `Next.js`
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/app/layout.tsx`
  - Action: Creer le layout racine `Next.js` et y replacer les providers globaux actuellement branches dans `main.tsx` et `App.tsx`.
  - Notes: L'ordre de composition `ThemeProvider -> QueryClientProvider -> AuthProvider -> ClientProvider -> ExerciceProvider` doit etre revalide pour conserver le comportement actuel.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/main.tsx`
  - Action: Retirer le bootstrap Vite une fois la bascule `Next.js` prete.
  - Notes: Le retrait de ce fichier doit intervenir a la fin de la migration technique, pas avant.
- [ ] Task 3: Introduire une couche de providers compatible App Router
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/app/providers.tsx`
  - Action: Creer un composant client centralisant les providers reactifs necessaires au shell applicatif.
  - Notes: Cette couche doit isoler les composants client requis par `next-themes`, `React Query` et les contexts maison.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/contexts/AuthContext.tsx`
  - Action: Adapter la logique auth pour supprimer la dependance directe a `useNavigate` et `useLocation`.
  - Notes: Les redirections devront passer par une abstraction compatible `next/navigation`.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/contexts/ClientContext.tsx`
  - Action: Verifier la compatibilite des chargements client avec le nouveau bootstrap providers.
  - Notes: L'enchainement `Auth -> Client -> Exercice` doit rester intact.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/contexts/ExerciceContext.tsx`
  - Action: Adapter le provider si necessaire pour fonctionner dans un environnement App Router client.
  - Notes: Aucun changement metier ne doit etre introduit ici.
- [ ] Task 4: Migrer les primitives de routing et de redirection
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/auth/auth-routing.ts`
  - Action: Remplacer les helpers de redirection fondes sur `react-router-dom` et `location.state` par des helpers compatibles `Next.js`.
  - Notes: La preservation de la destination initiale doit rester fonctionnelle pour les routes protegees.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/ProtectedRoute.tsx`
  - Action: Remplacer ou refactorer le pattern `ProtectedRoute` vers un mecanisme `Next.js` compatible layouts et pages clientes.
  - Notes: L'objectif est d'eviter les full reloads tout en conservant les redirections auth actuelles.
- [ ] Task 5: Remapper les routes existantes vers l'arborescence `app/`
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/app/page.tsx`
  - Action: Migrer la route `/` existante en entree `Next.js`.
  - Notes: Reutiliser la page `Index` existante autant que possible.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/app/auth/login/page.tsx`
  - Action: Migrer l'ecran de login sans regression UX ni perte de redirect post-auth.
  - Notes: La page doit rester fluide et applicative, pas devenir une page web distincte avec experience degradee.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/app/app/layout.tsx`
  - Action: Creer le layout protege persistant pour tout le shell applicatif `/app/*`.
  - Notes: La sidebar, le header et le shell principal doivent rester persistants lors des clics menu.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/app/app/dashboard/page.tsx`
  - Action: Migrer un premier ecran applicatif representatif pour valider la structure cible.
  - Notes: Ce lot sert de preuve de parite pour le shell applicatif.
- [ ] Task 6: Migrer progressivement toutes les routes metier jusqu'a parite complete
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/app/app/**/page.tsx`
  - Action: Creer l'ensemble des routes `Next.js` equivalentes aux routes actuellement definies dans `App.tsx`.
  - Notes: L'ordre conseille est `dashboard`, `budgets`, `reservations`, `engagements`, `bons-commande`, `depenses`, `factures`, `paiements`, `tresorerie`, `plan-comptable`, `journal-comptable`, `controle-interne`, `projets`, `analyses`, `reporting`, `fournisseurs`, `parametres`, `structure`, `enveloppes`, `previsions`, `mandats`.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/App.tsx`
  - Action: Retirer progressivement le routeur `react-router-dom` au fur et a mesure que la parite est atteinte.
  - Notes: La suppression complete ne doit intervenir qu'une fois toutes les routes remappees.
- [ ] Task 7: Preserver le shell applicatif et la sensation de SPA
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/AppLayout.tsx`
  - Action: Extraire ou adapter le shell applicatif actuel pour qu'il devienne un layout client `Next.js` persistant.
  - Notes: Le state de sidebar, la navigation par menu, la restauration de scroll et le contexte principal ne doivent pas etre perdus a chaque clic.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/use-mobile.tsx`
  - Action: Verifier la compatibilite avec le rendu `Next.js` et l'usage en composants client.
  - Notes: Eviter tout acces navigateur non protege pendant le rendu initial.
- [ ] Task 8: Adapter les services et variables d'environnement a `Next.js`
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/http-client.ts`
  - Action: Remplacer les usages strictement lies a `import.meta.env` ou conventions Vite par une abstraction compatible `process.env.NEXT_PUBLIC_*`.
  - Notes: La transition doit documenter explicitement la correspondance `VITE_API_BASE_URL` -> `NEXT_PUBLIC_API_BASE_URL`.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/auth.service.ts`
  - Action: Verifier que le service reste reutilisable sans dependre du routeur Vite.
  - Notes: Les redirections doivent sortir de ce service.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/vercel.json`
  - Action: Supprimer ou adapter la configuration SPA Vite devenue obsolete.
  - Notes: La cible `Next.js` ne doit plus s'appuyer sur le rewrite global vers `index.html`.
- [ ] Task 9: Adapter les tests de non-regression a la nouvelle pile
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/tests/auth-migration.spec.ts`
  - Action: Mettre a jour le demarrage du frontend de test pour utiliser `Next.js` au lieu de `vite`, puis conserver les assertions de redirection, de login et de logout.
  - Notes: Ce test devient un garde-fou de parite majeur.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/tests/next-migration-smoke.spec.ts`
  - Action: Ajouter un test smoke couvrant la navigation de menu sans full reload perceptible, la persistance du shell `/app`, et la conservation des routes critiques.
  - Notes: Le test doit valider explicitement que la migration ne donne pas visuellement une impression de site vitrine.
- [ ] Task 10: Finaliser la bascule et nettoyer le legacy Vite
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/package.json`
  - Action: Retirer definitivement les scripts et dependances Vite/`react-router-dom` obsoletes apres validation de la parite complete.
  - Notes: Cette tache inclut la mise a jour des commandes `dev`, `build`, `preview` et des scripts de test frontend.
  - File: `/Volumes/mySD1.5/projects/agilys-spark-joy/src/App.tsx`
  - Action: Supprimer le routeur SPA legacy une fois la migration validee.
  - Notes: Aucun code mort Vite ne doit rester une fois la bascule prononcee.

### Acceptance Criteria

- [ ] AC 1: Given l'application migree, when un utilisateur ouvre `/`, then il retrouve la page d'accueil existante sous `Next.js` sans regression visuelle majeure.
- [ ] AC 2: Given un utilisateur non authentifie, when il tente d'acceder a une route protegee comme `/app/dashboard`, then il est redirige vers `/auth/login` et la destination initiale est preservee.
- [ ] AC 3: Given un utilisateur authentifie, when il se connecte depuis `/auth/login`, then il revient vers la route demandee ou la landing applicative attendue sans regression par rapport au comportement actuel.
- [ ] AC 4: Given un utilisateur authentifie dans l'espace applicatif, when il clique sur les menus principaux de la sidebar, then le shell applicatif reste visuellement persistant et aucun full reload perceptible ne survient.
- [ ] AC 5: Given le shell `/app` migre, when l'utilisateur navigue entre plusieurs pages metier, then la sidebar, le header et le contexte principal restent coherents et la sensation visuelle d'application est preservee.
- [ ] AC 6: Given les services API frontend, when l'application tourne sous `Next.js`, then les appels backend continuent de fonctionner avec une configuration d'environnement compatible `NEXT_PUBLIC_API_BASE_URL`.
- [ ] AC 7: Given la migration complete, when les tests critiques frontend sont executes, then les flux de login, logout, redirection protegee et navigation applicative passent sans regression.
- [ ] AC 8: Given la bascule finale, when le frontend est lance en local et en build, then les scripts `pnpm` n'utilisent plus `vite` ni `react-router-dom`.
- [ ] AC 9: Given la migration finalisee, when un developpeur lit la documentation et la structure du repo, then il comprend clairement que `Next.js` est devenu le frontend principal et que le legacy Vite a ete retire.

## Additional Context

### Dependencies

- Frontend React actuel dans `src/`
- Backend NestJS deja separe
- Cible `Next.js` App Router
- Maintien de `React Query`, `next-themes`, des contexts existants et des composants UI reutilisables
- Disponibilite d'une configuration `Next.js` compatible avec les alias TypeScript et le mode de build actuel
- Capacite a adapter les tests Playwright pour demarrer le frontend `Next.js`

### Testing Strategy

La migration devra etre verifiee avec un niveau de non-regression suffisant pour garantir la parite complete avant bascule:

- conserver et adapter `tests/auth-migration.spec.ts` comme garde-fou principal sur les flux auth et redirections
- ajouter un smoke test cible sur la navigation du shell applicatif et l'absence de full reload perceptible sur les clics menu
- verifier manuellement les routes publiques, la page login, et plusieurs routes critiques `/app/*` pendant la migration
- verifier manuellement que la sidebar, le header et le contexte applicatif restent persistants lors de la navigation
- verifier la compatibilite des variables d'environnement et du build local avant suppression des scripts Vite
- ne prononcer la bascule finale qu'apres lint, typecheck et tests frontend/backend passes

### Notes

Le chantier doit rester distinct de la spec de deploiement multi-environnements, meme s'il en constitue un prerequis cote frontend.

Contrainte UX non negociable:

- l'utilisateur final ne doit pas percevoir la migration comme une regression vers un site web classique
- les clics de menu doivent conserver une navigation interne fluide
- la sidebar, le shell applicatif et le contexte principal doivent rester persistants autant que possible
- les composants client interactifs doivent etre conserves la ou ils sont necessaires pour proteger cette experience applicative
