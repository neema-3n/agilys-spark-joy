---
project_name: 'agilys-spark-joy'
user_name: 'Max'
date: '2026-03-02T05:17:07Z'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 82
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Current Transitional Stack (AS-IS, a reduire)

- Frontend SPA: React 18.3.1, TypeScript 5.8.3, Vite 5.4.19
- Data/Auth legacy: Supabase JS 2.75.1 + Edge Functions (heritage en cours de retrait)
- Backend partiel: NestJS 10.4.22 (migration en cours)

### Target Migration Stack (TO-BE, reference)

- Frontend: Next.js (App Router)
- API: NestJS (JWT access/refresh, guards RBAC/ABAC)
- Database: PostgreSQL local/dev avec migrations versionnees
- Package manager cible: pnpm (remplacement progressif de npm)
- Shared contracts: types/DTO partages front-back

### Migration Constraints (must-follow)

- Aucune nouvelle story ne doit ajouter de dependance runtime Supabase.
- Toute nouvelle logique metier doit etre implementee cote NestJS (pas en Edge Function).
- Les appels front doivent passer par un client API unifie type (pas d'acces direct Supabase).
- Les scripts projet doivent etre normalises pour pnpm (`pnpm install`, `pnpm dev`, `pnpm -r build`), avec retrait progressif de `package-lock.json`.
- Migration progressive par lots (fondations -> auth -> modules prioritaires -> decommission).
- Continuite UX obligatoire pendant la transition (pas de rupture visible).

## Critical Implementation Rules

### Language-Specific Rules

- TypeScript est obligatoire sur tout nouveau code front et back; pas de nouveau fichier JS applicatif.
- Meme si le frontend actuel est permissif (`strict: false`), les nouvelles stories doivent viser un typage strict (pas de `any` sauf justification explicite, locale et commentee).
- Backend NestJS reste source de verite type-safe (`strict: true`), et les DTO backend doivent piloter les contrats API.
- Les types partages (contrats front/back) doivent etre centralises (package shared), pas dupliques entre apps.
- Les mappings `snake_case` (DB) -> `camelCase` (front) doivent etre explicites et testes sur les champs sensibles (montants, statuts, dates).
- Toutes les valeurs numeriques issues de la persistence doivent etre normalisees explicitement avant calcul (pas de confiance implicite sur le type runtime).
- Les imports doivent utiliser les alias projet existants et chemins stables (pas de chemins relatifs profonds fragiles).
- Les nouvelles integrations ne doivent pas importer `@supabase/supabase-js` dans le code metier; passer par le client API unifie.
- Les enums/status metier doivent provenir des contrats de domaine partages, pas de litteraux disperses dans les composants.
- Les erreurs doivent etre typees (erreur metier vs technique) et traduites en messages utilisateur actionnables.

### Framework-Specific Rules

- Toute nouvelle fonctionnalite front doit etre pensee "Next.js-ready" (separation claire UI/data/auth), meme si elle est temporairement livree dans le front Vite.
- Ne pas introduire de nouveau couplage React component -> Supabase SDK; toutes les lectures/ecritures passent par la couche service API.
- React Query reste la couche de fetching/cache cote front; standardiser les cles de query par domaine metier.
- Les formulaires suivent le pattern projet: React Hook Form + Zod, validation partageable avec les contrats backend quand possible.
- Les composants UI doivent reutiliser en priorite les briques existantes (`shadcn/ui` + composants maison), avec amelioration avant creation.
- Les routes protegees doivent conserver le comportement actuel sans regression UX pendant la migration auth (redirection deterministe vers auth puis app landing).
- Cote NestJS, toute regle metier critique doit vivre dans services/use-cases backend, jamais dans le client.
- Les endpoints NestJS sensibles doivent etre proteges par guards (JWT + RBAC/ABAC) et journaliser les actions critiques.
- Les logiques auparavant en Edge Functions doivent etre migrees en modules NestJS idempotents et testables.
- Eviter toute logique de session/token dans les composants UI; centraliser dans provider auth + client HTTP.

### Testing Rules

- Toute story de migration doit inclure au minimum: test du cas nominal, test d'autorisation, test d'erreur metier, test de non-regression du parcours utilisateur.
- Les tests backend NestJS (Jest) sont obligatoires pour: auth, guards RBAC/ABAC, transitions metier critiques, et idempotence des operations sensibles.
- Les tests frontend doivent couvrir les parcours critiques utilisateur (auth, navigation protegee, actions metier prioritaires) avec focus sur la continuite UX.
- Les regressions sur redirection auth (`non-auth -> auth`, `auth success -> app landing`) doivent etre testees explicitement a chaque lot de migration.
- Toute migration d'Edge Function vers NestJS doit inclure un test prouvant l'absence de doublon fonctionnel et la conservation des regles metier.
- Les tests de mapping de donnees (DB/API -> UI) doivent verifier statuts, montants, dates, et identifiants de correlation.
- Les scenarios de paiement/numero/transactions critiques doivent inclure des tests de concurrence ou idempotence.
- Les bugs corriges pendant migration doivent etre verrouilles par un test de prevention de recurrence.
- La Definition of Done d'une story de migration inclut: lint/typecheck clean + tests pertinents passes + absence d'appel Supabase ajoute.
- Prioriser les tests bas niveau (unit/integration) avant E2E lourds; reserver E2E aux parcours transverses a fort risque.

### Code Quality & Style Rules

- Reutiliser avant de creer: etendre composants/hooks/services existants avant toute nouvelle abstraction.
- Interdiction de dupliquer une logique metier entre front et back; la source de verite metier est backend.
- Toute nouvelle couche d'acces donnees front doit passer par le client API unifie (pas d'appel direct SDK infra dans les composants).
- Les PR de migration doivent etre atomiques par domaine (auth, parametres, tresorerie, etc.) pour simplifier revue et rollback.
- Nommage coherent et stable: domaines metier explicites, pas d'abreviations opaques dans les nouveaux modules.
- Les types de payload API (request/response) doivent etre explicites et versionnables; eviter les objets implicites "fourre-tout".
- Toute regle metier critique doit etre accompagnee d'un commentaire court si la contrainte n'est pas evidente dans le code.
- Les erreurs utilisateur doivent etre actionnables (cause + action attendue), pas de message technique brut expose UI.
- Supprimer progressivement le code mort legacy au fil des lots (feature retiree => nettoyage dans le meme lot quand possible).
- Tout changement doit maintenir lint/typecheck propres et respecter les conventions existantes du repo.

### Development Workflow Rules

- La migration se fait exclusivement par lots sprintifies (fondations -> auth -> modules prioritaires -> decommission Supabase).
- Chaque lot doit laisser l'application deployable et utilisable (pas de branche longue non integrable).
- Interdiction de melanger dans une meme PR: changement d'architecture majeur + refactor transverse non lie.
- Toute story doit tracer explicitement: objectif migration, perimetre impacte, risques de regression, plan de verification.
- Toute evolution d'API backend doit etre accompagnee d'un contrat clair pour le front (types/DTO/mapping d'erreurs).
- Les migrations de base de donnees doivent etre versionnees, rejouables en local, et documentees avec procedure de reset/seed.
- Le passage npm -> pnpm doit etre gere comme chantier dedie: scripts CI/local alignes, lockfile unique pnpm, suppression progressive des usages npm.
- Les departs de Supabase doivent etre traces (service/hook/page migres) avec checklist de nettoyage associee.
- Les changements de securite (auth, roles, guards) exigent une validation explicite avant merge.
- Definition of Done migration: fonctionnalite stable, tests passes, UX non-regressive, documentation technique mise a jour.

### Critical Don't-Miss Rules

- Ne jamais introduire un nouveau flux metier dependant de Supabase (SDK/Auth/Edge Functions) pendant la migration.
- Ne jamais migrer auth et droits "a moitie" sur un meme parcours: un endpoint protege doit avoir guards + verification role complete.
- Ne jamais casser la redirection deterministe des routes protegees (`anon -> auth`, `auth -> app`) entre deux lots.
- Ne jamais generer de numeros metier cote client; la generation doit rester atomique cote backend.
- Ne jamais fusionner plusieurs migrations de schema non reliees dans un seul lot sans plan de rollback local.
- Ne jamais laisser coexister deux sources de verite pour un meme statut metier (UI vs backend); backend decide.
- Ne jamais bypasser la couche client API unifiee depuis un composant UI.
- Ne jamais merger une story de migration sans checklist de nettoyage legacy (imports/services/deps inutiles).
- Ne jamais faire de refactor esthetique massif dans une PR de migration critique; separer stabilisation et cosmetique.
- Ne jamais considerer "termine" un module migre sans preuve: tests, parcours manuel cle, et absence de regression visible.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow ALL rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when technology stack changes.
- Review quarterly for outdated rules.
- Remove rules that become obvious over time.

Last Updated: 2026-03-02T05:17:07Z
