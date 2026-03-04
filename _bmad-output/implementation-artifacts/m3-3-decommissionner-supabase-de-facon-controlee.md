# Story M3.3: Decommissionner Supabase de facon controlee

Status: ready-for-dev

## Story

As a equipe plateforme,  
I want retirer toutes dependances Supabase runtime,  
so that l'architecture cible soit effectivement NestJS/NextJS/PostgreSQL.

## Acceptance Criteria

1. **Retrait controle des dependances Supabase runtime**
   - **Given** l'inventaire des usages Supabase
   - **When** le plan de retrait est applique
   - **Then** Auth, RLS, Storage, Functions, webhooks et secrets sont migres/retirees selon priorite
   - **And** aucun appel runtime vers Supabase ne subsiste apres cutover

## Tasks / Subtasks

- [ ] Etablir l'inventaire executable des dependances Supabase (AC: 1)
  - [ ] Produire une matrice `surface -> usage -> remplacement cible -> owner -> statut` pour `auth`, `data/RLS`, `functions`, `storage`, `webhooks`, `secrets`, `CI/CD`
  - [ ] Capturer les preuves techniques d'usage runtime actuel (`src/services/api/*`, `src/integrations/supabase/*`, `supabase/functions/*`, variables `SUPABASE_*`)
  - [ ] Definir l'ordre d'extinction sans regression (d'abord remplacement runtime, puis suppression infrastructure)

- [ ] Migrer / neutraliser les usages runtime frontend et backend (AC: 1)
  - [ ] Remplacer les appels `supabase.*` restants cote frontend par le client API unifie vers NestJS
  - [ ] Valider qu'aucune route critique n'utilise encore `@supabase/supabase-js` a l'execution
  - [ ] Conserver un mode transitoire controle uniquement si necessaire (feature-flag explicite + date d'expiration)

- [ ] Decommissionner les Edge Functions et webhooks Supabase (AC: 1)
  - [ ] Migrer les logiques metier restantes en modules NestJS idempotents et testes
  - [ ] Supprimer les fonctions deployees non utilisees (`supabase functions delete` ou `--prune`) apres validation de remplacement
  - [ ] Documenter l'arret des webhooks Supabase et la bascule vers endpoints/handlers cibles

- [ ] Retirer dependances Auth/RLS/Storage/Security cote Supabase (AC: 1)
  - [ ] Auth: confirmer bascule complete JWT access/refresh cote NestJS + redirections front non regressives
  - [ ] RLS: confirmer qu'aucune decision d'autorisation metier n'est encore deleguee a des policies Supabase
  - [ ] Storage: migrer ou archiver les objets requis puis couper les acces runtime
  - [ ] Secrets: rotation/suppression des secrets Supabase non utilises et nettoyage des variables d'environnement

- [ ] Activer un gate de verification "zero runtime Supabase" avant cloture (AC: 1)
  - [ ] Ajouter un gate automatisable (script CI/local) qui echoue sur tout import/runtime call Supabase dans les surfaces actives
  - [ ] Executer smoke tests auth/API/parcours critiques apres retrait
  - [ ] Produire un rapport de cloture decommission avec preuves et decision finale GO vers M4.1

## Dev Notes

### Story Requirements

- Source normative: `/_bmad-output/planning-artifacts/epics.md` (Epic M3 / Story M3.3).
- La story M3.3 est le gate technique principal avant M4.*: elle doit prouver qu'il ne reste aucune dependance runtime Supabase.
- Gate B est deja validee (`M3.1` et `M3.2` en `done`), la story peut demarrer.

### Developer Context Section

- Etat courant observe dans le repo: dependances Supabase runtime encore presentes dans de nombreux services front (`src/services/api/*.service.ts`) et dans `supabase/functions/*`.
- Le plan de retrait doit separer clairement:
  - **remplacement fonctionnel** (NestJS/API unifie),
  - **verification de non-regression** (auth + parcours critiques),
  - **extinction infra Supabase** (functions/webhooks/secrets/storage).
- L'objectif n'est pas seulement "compiler sans erreur", mais **prouver** qu'aucun trafic runtime applicatif ne depend de Supabase apres cutover.

### Technical Requirements

- Contraintes d'execution:
  - Zero nouvel ajout de dependance Supabase.
  - Toute logique metier restante doit etre deplacee vers NestJS (services/use-cases testes).
  - Les acces frontend passent exclusivement par le client API unifie (pas d'acces direct SDK infra).
- Inventaire initial minimum a couvrir:
  - `package.json` (`@supabase/supabase-js`)
  - `src/integrations/supabase/client.ts`
  - `src/services/api/*.service.ts` avec imports `supabase`
  - `supabase/functions/*`
  - variables d'env et secrets `SUPABASE_*`
- Criteres de sortie techniques:
  - aucun import runtime `@supabase/supabase-js` dans les modules applicatifs actifs,
  - aucun `supabase.functions.invoke(...)` sur parcours cibles,
  - toute fonction Edge restante est soit migree, soit explicitement decommissionnee.

### Architecture Compliance

- Conforme a `/_bmad-output/project-context.md`:
  - "Aucune nouvelle story ne doit ajouter de dependance runtime Supabase."
  - "Toute nouvelle logique metier doit etre implementee cote NestJS."
  - "Les appels front doivent passer par un client API unifie type."
- Respect des invariants migration:
  - continuite UX (pas de rupture auth/navigation),
  - traçabilite complete des decisions critiques,
  - nettoyage legacy synchronise avec la story (pas reporte sans justification).

### Library Framework Requirements

- Stack de reference locale:
  - Frontend: React 18.3.1 + TypeScript 5.8.3 + Vite 5.4.19 (transitoire)
  - Backend: NestJS 10.4.22
  - Cible: Next.js + NestJS + PostgreSQL
- Intelligence web (a integrer dans la mise en oeuvre):
  - Supabase CLI supporte la suppression des Edge Functions (`supabase functions delete`) et le prune des fonctions deployees (`supabase functions deploy --prune`).
  - Supabase fournit des commandes de gestion des secrets (`supabase secrets list/set/unset`) utiles pour valider puis nettoyer les secrets residuels.
  - Les JWT tiers/custom doivent etre verifies explicitement cote applicatif; ne pas supposer une verification automatique equivalente a Supabase Auth pour tous les cas.

### File Structure Requirements

- Fichier story:
  - `/_bmad-output/implementation-artifacts/m3-3-decommissionner-supabase-de-facon-controlee.md`
- Artefacts recommandes pendant implementation:
  - `/_bmad-output/implementation-artifacts/supabase-decommission-inventory.md`
  - `/_bmad-output/implementation-artifacts/supabase-decommission-report-YYYY-MM-DD.md`
  - `/_bmad-output/implementation-artifacts/cutover-logs/supabase-decommission-YYYY-MM-DD/*`
- Zones code probablement touchees:
  - `src/services/api/`
  - `src/integrations/supabase/`
  - `backend/src/**` (services/remplacements NestJS)
  - `supabase/functions/`
  - `package.json` / scripts CI gates

### Testing Requirements

- Tests minimaux obligatoires:
  - test nominal auth/login-refresh-logout via NestJS,
  - test d'autorisation (RBAC/ABAC) sur endpoints critiques migrés,
  - test de non-regression parcours front proteges,
  - test "zero runtime Supabase" (gate automatisable).
- Verification operationnelle:
  - smoke API auth + flux critiques post-retrait,
  - preuves d'absence d'appel runtime Supabase (scan static + logs runtime),
  - rapport de decommission signe (tech + metier).

### Previous Story Intelligence

- M3.2 confirme un rollback operationnel conforme (RTO 27 min, RPO 3 min), ce qui permet un retrait agressif mais controle.
- Le runbook impose une discipline forte:
  - decision Go/No-Go explicite,
  - preuves horodatees,
  - communication de crise tracee.
- Pour M3.3: reutiliser la meme rigueur d'evidence (pas de validation declarative sans artefact verifiable).

### Git Intelligence Summary

- Commits recents:
  - `0c42bd4` Execute code review workflow
  - `5d5f2b0` Finalize M3.2 rollback review fixes and close story
  - `dd603a7` Update story M3.2 status
  - `d2b261f` Document migration reconciliation
  - `1879c42` Review reconciliation migration
- Pattern etabli: corrections de qualite rapides, preuves explicites, stories migration tracees.
- M3.3 doit conserver ce standard et eviter tout changement "silencieux" non justifie.

### Latest Tech Information

- Supabase JWT & Third-Party Auth (doc recente): clarifie les differences entre JWT Supabase natifs et JWT tiers/custom; verification explicite requise selon le mode d'emission.
- Supabase CLI (reference recente): confirme les commandes de suppression/prune des functions et la gestion des secrets, utiles pour un decommission propre.
- Storage docs recentes: verifier et traiter explicitement les buckets/objets avant coupure pour eviter perte de donnees ou references orphelines.

### Project Structure Notes

- Le projet est encore hybride (front Vite/React + backend NestJS + heritage Supabase).  
  M3.3 doit reduire cette hybridation en supprimant la dependance runtime Supabase sur le perimetre de migration.
- Ne pas confondre:
  - **decommission runtime** (obligatoire M3.3),
  - **suppression complete compte/projet Supabase** (peut etre post-M3.3 selon gouvernance).

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic M3 / Story M3.3 + sequence normative M1..M4)
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/_bmad-output/implementation-artifacts/m3-1-produire-le-runbook-de-cutover-production.md`
- `/_bmad-output/implementation-artifacts/m3-2-tester-le-plan-de-rollback-operationnel.md`
- `/_bmad-output/implementation-artifacts/rollback-staging-drill-2026-03-03.md`
- `/_bmad-output/project-context.md`
- `/Volumes/mySD1.5/projects/agilys-spark-joy/docs/supabase-auth-decommission-checklist.md`
- [Supabase JWT docs](https://supabase.com/docs/guides/auth/jwts)
- [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-orgs-list)
- [Supabase Storage docs](https://supabase.com/docs/guides/storage)
- [Supabase Management API reference](https://supabase.com/docs/reference/api/create-a-project)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- create-story workflow (targeted story selection: `m3-3`)
- context load: epics, sprint-status, project-context, M3.1/M3.2, migration parity matrix, git history
- inventory signal: scan des references Supabase dans `src/`, `backend/`, `supabase/`, `package.json`
- web verification: docs Supabase JWT/CLI/Storage/Management API

### Completion Notes List

- Story M3.3 creee avec contexte implementation complet et guardrails de decommission runtime.
- AC epics preserves et traduits en taches executables avec gate de verification "zero runtime Supabase".
- Intelligence M3.2 integree pour maitriser rollback/risque pendant retrait.
- Contexte technique local + references officielles Supabase consolides pour eviter implementation obsolete.
- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/m3-3-decommissionner-supabase-de-facon-controlee.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

