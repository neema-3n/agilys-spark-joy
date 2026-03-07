# Story 6.1: Versionner plan comptable et mapping ecritures

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a responsable comptable,
I want parametrer comptes et mappings metier->ecriture,
so that la generation comptable soit gouvernee.

## Acceptance Criteria

1. **Versionning explicite du plan comptable**
   - **Given** un plan comptable actif existe pour un tenant et un exercice
   - **When** un utilisateur habilite cree, met a jour, active/desactive ou reordonne des comptes et referentiels comptables
   - **Then** le systeme conserve un historique non destructif de la configuration (version/date d'effet/auteur)
   - **And** chaque version expose un statut clair (`draft`, `published`, `archived` ou equivalent) sans ambigute fonctionnelle.

2. **Mapping metier -> schema d'ecriture gouverne et auditable**
   - **Given** des regles comptables existent pour les operations critiques (`reservation`, `engagement`, `bon_commande`, `facture`, `depense`, `paiement`)
   - **When** les regles sont configurees ou modifiees
   - **Then** chaque regle mappe explicitement debit, credit, journal/type operation, conditions, periode d'effet et priorite
   - **And** aucune operation critique ne peut etre generee sans mapping valide.

3. **Selection deterministe de la bonne version de regle**
   - **Given** plusieurs versions de regles peuvent coexister dans le temps
   - **When** une ecriture est generee pour une date et un contexte donnes
   - **Then** la regle appliquee est unique, deterministe et tracable (preuve de la version choisie)
   - **And** les conflits de regles (chevauchement de dates, priorites incoherentes) sont bloques avec erreur metier actionnable.

4. **Conformite comptable et preparation des stories 6.2+**
   - **Given** une operation metier eligible declenche `generate_ecritures_comptables`
   - **When** le moteur prepare les lignes comptables
   - **Then** le cadre de mapping/versionning permet de garantir la compatibilite avec les contraintes `debit=credit`, idempotence et traçabilite des stories `6.2` et `6.3`
   - **And** aucune source de verite parallele n'est introduite en dehors des modules comptables backend existants.

5. **Securite, multi-tenant et non-regression**
   - **Given** des utilisateurs de tenants differents manipulent les referentiels comptables
   - **When** des appels API sont executes
   - **Then** tous les acces sont strictement scopes par `client_id` (et `exercice_id` quand applicable), avec guards JWT/policies existants
   - **And** les tests couvrent autorisations, conflits de version, cas limites de date d'effet et non-regression des ecrans `PlanComptable` et `JournalComptable`.

## Tasks / Subtasks

- [ ] Revalider le contrat story 6.1 contre `FR43`, `FR44`, `FR29`, `FR32`, `NFR8`, `NFR9`, `NFR11`, `NFR25`, `NFR26`, `NFR27` puis formaliser les regles de versionning minimales (AC: 1, 2, 3, 4, 5)
- [ ] Cartographier et reutiliser les modules existants avant ajout de nouvelle couche:
  - [ ] `backend/src/referentiels/*`
  - [ ] `backend/src/regles-comptables/*`
  - [ ] `backend/src/ecritures-comptables/*`
  - [ ] `src/components/parametres/PlanComptableManager.tsx`
  - [ ] `src/pages/app/PlanComptable.tsx`
  - [ ] `src/pages/app/JournalComptable.tsx` (AC: 1, 2, 4, 5)
- [ ] Introduire une strategie de versionning de plan comptable sans duplication:
  - [ ] option preferee: extension des tables/regles existantes avec metadonnees de version/date d'effet
  - [ ] interdire les suppressions destructives sur versions publiees
  - [ ] conserver auteur, horodatage, motif de changement (AC: 1, 5)
- [ ] Renforcer les validations backend sur `regles_comptables`:
  - [ ] non-chevauchement de periodes pour un meme perimetre logique
  - [ ] unicite fonctionnelle des regles actives applicables
  - [ ] debit/credit requis et comptes valides pour le tenant
  - [ ] ordre/priorite explicite et deterministic tie-break (AC: 2, 3, 4, 5)
- [ ] Faire porter la selection de version uniquement cote backend NestJS (pas de logique de resolution cote frontend) dans le chemin de generation d'ecritures (AC: 3, 4, 5)
- [ ] Etendre les DTO/API existants pour exposer:
  - [ ] metadonnees de version
  - [ ] date d'effet debut/fin
  - [ ] statut de version
  - [ ] message d'erreur metier explicite en cas de conflit (AC: 1, 2, 3, 5)
- [ ] Maintenir les patterns de structure:
  - [ ] pas de nouveau module comptable parallele si `regles-comptables` et `ecritures-comptables` couvrent le besoin
  - [ ] extraire utilitaires partages de validation/versionning si logique repetee (AC: 2, 3, 4)
- [ ] Frontend:
  - [ ] etendre `PlanComptableManager`/dialogs existants pour edition de metadonnees de version (sans recréer un ecran ad hoc)
  - [ ] afficher indicateurs de version active/dates d'effet dans les vues de parametrage
  - [ ] garder `JournalComptable` en lecture des ecritures et evidence de regle appliquee (AC: 1, 2, 3, 5)
- [ ] Ajouter tests backend obligatoires:
  - [ ] creation d'une version valide
  - [ ] rejet sur chevauchement de periode
  - [ ] rejet si debit/credit incomplets
  - [ ] selection deterministe de regle active
  - [ ] refus cross-tenant
  - [ ] non-regression `generate_ecritures_comptables` (AC: 2, 3, 4, 5)
- [ ] Ajouter tests frontend cibles:
  - [ ] rendu des informations de version
  - [ ] validations formulaire de configuration
  - [ ] affichage erreurs metier actionnables
  - [ ] non-regression des ecrans `PlanComptable` et `JournalComptable` (AC: 1, 5)
- [ ] Confirmer explicitement qu'aucune nouvelle dependance runtime Supabase n'est introduite et que les scripts `pnpm` restent la voie standard (AC: 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.1).
- FR directes:
  - `FR43`: plan comptable versionne (classes/comptes/sous-comptes/axes/date d'effet)
  - `FR44`: mapping `evenement metier -> schema d'ecriture`
- FR connexes utiles:
  - `FR29`: coherence plan comptable / journal comptable
  - `FR45` a `FR49`: generation d'ecritures, idempotence, contre-passation (stories suivantes)
- NFR prioritaires:
  - `NFR8`, `NFR9`, `NFR11` pour securite/audit/non-destructif
  - `NFR25`, `NFR26`, `NFR27` pour idempotence, equilibre et performance du moteur d'ecritures.

### Developer Context Section

- Le backend contient deja les briques natives a reutiliser:
  - `backend/src/regles-comptables/regles-comptables.service.ts`
  - `backend/src/ecritures-comptables/ecritures-comptables.service.ts`
  - `backend/src/referentiels/referentiels.service.ts`
- Le front contient deja les surfaces metier:
  - `src/pages/app/PlanComptable.tsx`
  - `src/components/parametres/PlanComptableManager.tsx`
  - `src/pages/app/JournalComptable.tsx`
  - `src/services/api/regles-comptables.service.ts`
  - `src/services/api/ecritures-comptables.service.ts`
- Constats actuels:
  - la base existe deja pour les regles (`dateDebut`, `dateFin`, `ordre`, `conditions`) mais le contrat de "version publiee" n'est pas encore explicite.
  - la generation d'ecritures existe deja via `generate_ecritures_comptables`; la story doit fiabiliser le cadre de parametrage/versionning en amont.
  - `PlanComptableManager` contient encore des `any` et des comportements destructifs (`vider`) qui exigent un cadrage strict avant etat "publie".

### Technical Requirements

- Backend
  - Garder `regles-comptables` comme point d'entree principal du mapping comptable.
  - Introduire une notion explicite de version applicable (metadonnees + validateur de conflits de date/perimetre).
  - Eviter toute logique SQL dynamique non securisee hors mappings deja controles.
  - Conserver la selection de regle au serveur, jamais dans l'UI.
- Frontend
  - Ne pas dupliquer la logique de resolution de version.
  - Reutiliser les composants/forms existants, etendre les types strictement.
  - Afficher des messages actionnables en cas de conflit de configuration.
- Data / Persistence
  - Passer par migration SQL versionnee et rejouable.
  - Preserver historique non destructif des configurations publiees.
  - Assurer compatibilite multi-tenant stricte et traçabilite auteur/date.

### Architecture Compliance

- Respecter `JwtAuthGuard` + policy guards/permissions existants sur endpoints comptables.
- Scope obligatoire:
  - `client_id` pour tous les referentiels/regles/ecritures
  - `exercice_id` pour les ecritures et contextes de generation.
- Eviter la creation d'un nouveau domaine "compta versions" si l'extension de `regles-comptables` et `referentiels` suffit.
- Les decisions de versionning doivent preparer `6.2` (generation idempotente) sans casser `JournalComptable`.

### Library / Framework Requirements

Versions observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, React Hook Form `7.61.1`, Zod `3.25.76`.
- Backend: NestJS `10.4.22`, `pg` `8.19.0`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`.
- Package manager: `pnpm@9.12.0`.

Decision pour cette story:

- Pas d'upgrade de dependances dans ce lot.
- Le risque principal est fonctionnel (versionning/mapping), pas lie aux versions de framework.

### File Structure Requirements

Points d'extension prioritaires:

- Backend
  - `backend/src/regles-comptables/*`
  - `backend/src/ecritures-comptables/*`
  - `backend/src/referentiels/*`
  - `backend/src/auth/*` (si permission fine supplementaire necessaire)
  - migrations SQL associees dans `supabase/migrations/*.sql`
- Frontend
  - `src/components/parametres/PlanComptableManager.tsx`
  - `src/pages/app/PlanComptable.tsx`
  - `src/pages/app/JournalComptable.tsx`
  - `src/services/api/regles-comptables.service.ts`
  - `src/services/api/ecritures-comptables.service.ts`
  - hooks/types associes

Regles de structure:

- pas de duplication de logique de mapping entre services;
- extraire un utilitaire partage si plusieurs endpoints appliquent les memes checks de version;
- garder le front centré sur edition/lecture, et le backend source de verite.

### Testing Requirements

1. Backend (obligatoire)
   - validation des conflits de versions,
   - tests de selection deterministe de regle,
   - tests cross-tenant,
   - tests de non-regression sur generation d'ecritures.

2. Frontend (obligatoire)
   - validation des formulaires de parametrage,
   - affichage des metadonnees de version,
   - affichage des erreurs metier serveur,
   - non-regression `PlanComptable` / `JournalComptable`.

3. Qualite transversale
   - `pnpm --dir backend run lint`
   - `pnpm --dir backend run test`
   - `pnpm run lint`
   - tests cibles sur zones impactees.

### Latest Tech Information

- Aucune recherche web technique additionnelle n'est necessaire pour ce lot: les versions verrouillees du repo sont suffisantes.
- Priorite: robustesse de la gouvernance comptable (version/date d'effet/mapping), pas upgrade de stack.

### Project Structure Notes

- Le projet reste en migration progressive vers stack cible NestJS + PostgreSQL + front API unifie.
- Cette story doit renforcer les modules comptables existants sans introduire de nouveau flux runtime Supabase.
- Le lot doit preparer directement les stories `6.2` et `6.3` en imposant des contrats stricts des maintenant.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [regles-comptables.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/regles-comptables/regles-comptables.service.ts)
- [ecritures-comptables.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/ecritures-comptables/ecritures-comptables.service.ts)
- [referentiels.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/referentiels/referentiels.service.ts)
- [PlanComptableManager.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/parametres/PlanComptableManager.tsx)
- [PlanComptable.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/PlanComptable.tsx)
- [JournalComptable.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/JournalComptable.tsx)
- [regles-comptables.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/regles-comptables.service.ts)
- [ecritures-comptables.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/ecritures-comptables.service.ts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Story context 6.1 cree avec focus sur versionning non destructif du plan comptable et mapping des ecritures.
- Le document privilegie la reutilisation des modules comptables existants (`regles-comptables`, `ecritures-comptables`, `referentiels`) plutot qu'une nouvelle couche parallele.
- Les guardrails couvrent multi-tenant, gouvernance de versions, selection deterministe de regle et preparation des stories 6.2/6.3.
- Aucun upgrade de dependances recommande pour ce lot.

### File List

- `_bmad-output/implementation-artifacts/6-1-versionner-plan-comptable-et-mapping-ecritures.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-03-07: Creation de la story context 6.1 avec cadrage complet backend/frontend, exigences de versionning, mapping comptable et exigences de test.
