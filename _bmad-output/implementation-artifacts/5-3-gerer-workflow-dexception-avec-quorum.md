# Story 5.3: Gerer workflow d'exception avec quorum

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a responsable habilite,
I want demander et approuver des exceptions encadrees,
so that les cas urgents restent gouvernes.

## Acceptance Criteria

1. **Creation d'une demande d'exception depuis un blocage critique**
   - **Given** une transition critique est bloquee par le moteur de risque cash ou par une regle metier equivalente
   - **When** un utilisateur habilite soumet une demande d'exception
   - **Then** la demande reference la transition source, la decision de blocage, le `correlationId`, le tenant, l'exercice et l'entite metier concernee
   - **And** une justification obligatoire, un motif structure, une duree de validite et le niveau d'urgence sont captures
   - **And** aucune transition source n'est executee tant que l'exception n'est pas approuvee et valide.

2. **Workflow de quorum explicite et auditable**
   - **Given** une demande d'exception existe en statut `soumise`
   - **When** des approbateurs eligibles se prononcent
   - **Then** le systeme impose un quorum minimal configurable avant passage a `approuvee`
   - **And** chaque vote conserve auteur, role, decision, commentaire et horodatage
   - **And** un meme utilisateur ne peut ni voter deux fois ni auto-approuver seul une exception s'il est a l'origine de la demande.

3. **Limite temporelle et consommation controlee de l'exception**
   - **Given** une exception a atteint son quorum et est active
   - **When** la transition bloquee est rejouee dans la fenetre autorisee
   - **Then** l'exception ne peut etre consommee que pour la transition et l'entite source prevues
   - **And** elle expire automatiquement a la date limite si elle n'a pas ete utilisee
   - **And** une exception expiree, rejetee ou deja consommee ne permet plus aucun override.

4. **Integration stricte avec les workflows existants**
   - **Given** les modules `engagements`, `depenses`, `paiements` et `cash-risk` existent deja
   - **When** une exception approuvee est verifiee pendant une transition critique
   - **Then** le backend NestJS decide seul si l'override est autorise
   - **And** les guards JWT + policy guard + permissions continuent de s'appliquer
   - **And** aucun contournement manuel ou calcul cote frontend n'est autorise.

5. **Traçabilite, securite et preparation de la supervision**
   - **Given** une demande d'exception est creee, approuvee, rejetee, expiree ou consommee
   - **When** le systeme journalise l'evenement
   - **Then** l'historique reste non destructif et exportable pour audit
   - **And** les donnees produites sont directement exploitables par la story 5.4 pour la supervision de tresorerie et l'audit des exceptions
   - **And** la couverture de tests protege les cas nominaux, refus d'autorisation, quorum incomplet, expiration, consommation unique et isolation cross-tenant.

## Tasks / Subtasks

- [ ] Revalider le contrat story 5.3 contre `FR22`, `FR23`, `FR25`, `NFR8`, `NFR9`, `NFR10`, `NFR11` et `NFR35`, puis expliciter les statuts du workflow d'exception (`brouillon` optionnel ou `soumise`, `approuvee`, `rejetee`, `expiree`, `consommee`) (AC: 1, 2, 3, 5)
- [ ] Definir un agregat backend `exception-demande` partage qui reference la transition bloquee, la decision `cash-risk`, le `correlationId`, la justification, la date limite et le quorum requis sans dupliquer la logique du moteur de risque (AC: 1, 2, 3, 4, 5)
- [ ] Introduire un module NestJS dedie au workflow d'exception plutot qu'une logique dispersee dans `engagements.service.ts`, `paiements.service.ts` et `depenses.service.ts` (AC: 1, 2, 4, 5)
- [ ] Definir les DTO et contrats d'API pour:
  - [ ] creation d'une demande d'exception
  - [ ] vote d'approbation ou de rejet motive
  - [ ] consultation detaillee et liste filtrable
  - [ ] consommation ou invalidation de l'exception lors du rejeu de la transition cible (AC: 1, 2, 3, 4, 5)
- [ ] Concevoir la persistence SQL versionnee pour stocker la demande, les votes, la fenetre de validite, le statut de consommation et les champs d'audit sans casser l'existant multi-tenant/multi-exercice (AC: 1, 2, 3, 5)
- [ ] Reutiliser le contrat `CashRiskDecision` de la story 5.1 comme source de verite de blocage au lieu de recalculer ou reserialiser partiellement le risque dans le nouveau module (AC: 1, 4, 5)
- [ ] Integrer la verification d'exception approuvee dans les transitions critiques deja instrumentees:
  - [ ] validation d'engagement si blocage cash pertinent
  - [ ] ordonnancement de depense via le point d'extension existant
  - [ ] execution ou reprise de paiement si un blocage est leve de facon gouvernee (AC: 3, 4)
- [ ] Formaliser les regles de quorum minimales de ce lot:
  - [ ] approbateurs eligibles selon roles/policies existants
  - [ ] interdiction d'auto-approbation integrale
  - [ ] prevention des votes multiples
  - [ ] seuil configurables par tenant ou fallback deterministe si aucun parametre n'existe encore (AC: 2, 5)
- [ ] Produire des erreurs metier actionnables cote backend pour les cas `quorum incomplet`, `exception expiree`, `exception deja consommee`, `utilisateur non eligible`, `transition cible incoherente` (AC: 2, 3, 4, 5)
- [ ] Journaliser chaque etape du workflow d'exception avec identite, role, decision, cible, resultat, horodatage et correlation pour audit trail et future supervision 5.4 (AC: 2, 3, 5)
- [ ] Prevoir une surface frontend minimale compatible avec les patterns existants:
  - [ ] dialogue de creation de demande depuis un blocage
  - [ ] vue detaillee/snapshot ou panneau de suivi des demandes
  - [ ] actions de vote visibles uniquement pour les approbateurs eligibles (AC: 1, 2, 3, 4)
- [ ] Reutiliser `React Hook Form + Zod`, `ListLayout/ListTable`, `SnapshotBase` et les hooks React Query existants plutot que creer un flux UI parallele ad hoc (AC: 1, 2, 4, 5)
- [ ] Ajouter les tests backend obligatoires:
  - [ ] creation valide avec justification
  - [ ] refus sans justification
  - [ ] quorum atteint puis approbation
  - [ ] prevention du double vote
  - [ ] refus d'auto-approbation
  - [ ] expiration automatique ou logique d'expiration
  - [ ] consommation unique
  - [ ] refus cross-tenant et permissions insuffisantes (AC: 1, 2, 3, 4, 5)
- [ ] Ajouter les tests frontend cibles sur affichage du blocage, creation de demande, statut de quorum, expiration et visibilite conditionnelle des actions de vote (AC: 1, 2, 3, 5)
- [ ] Verifier explicitement qu'aucune nouvelle dependance runtime Supabase n'est introduite et que les conventions `pnpm`, NestJS, React Query et audit existantes restent respectees (AC: 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 5, Story 5.3).
- FR directes: `FR22` (demande d'exception avec justification obligatoire), `FR23` (quorum d'approbation et limite temporelle), `FR25` (audit des transitions en exception).
- Dependances fonctionnelles fortes:
  - `FR19`, `FR20`, `FR21` deja amorcees par la story `5.1` et la story `5.2` a produire.
  - `FR24` et la story `5.4` consommeront les journaux et statuts de ce workflow.
- NFR prioritaires: `NFR8` (RBAC/ABAC), `NFR9` (journalisation), `NFR10` (separation ordonnateur/comptable), `NFR11` (historique non destructif), `NFR35` (resolution tracee des exceptions tardives).

### Developer Context Section

- Le repo dispose deja d'un premier moteur de blocage transverse:
  - `backend/src/cash-risk/cash-risk.service.ts`
  - `backend/src/cash-risk/cash-risk.types.ts`
  - `backend/src/cash-risk/cash-risk-blocked.exception.ts`
- Les transitions critiques backend deja candidates a un override gouverne sont visibles dans:
  - `backend/src/engagements/engagements.service.ts`
  - `backend/src/paiements/paiements.service.ts`
  - `backend/src/depenses/depenses.service.ts` via le point d'extension d'ordonnancement mentionne dans `5.1`
- L'autorisation actuelle repose sur:
  - `JwtAuthGuard`
  - `AuthorizationPolicyGuard`
  - `@RequirePermissions`
  - `AuthorizationPolicyService` avec blocage de separation des responsabilites sur certaines permissions
- Les roles et permissions disponibles aujourd'hui sont limites mais exploitables:
  - roles: `super_admin`, `admin_client`, `directeur_financier`, `ordonnateur`, `comptable`, `operateur_saisie`, `auditeur`
  - permissions: `referentiels:read`, `referentiels:write`, `referentiels:audit:read`, `roles:manage`, `tenant_policies:read`, `tenant_policies:write`
- Aucune implementation de quorum ou de demandes d'exception n'existe encore dans le backend.
- Cote frontend, les patterns etablis reutilisables sont:
  - dialog forms avec `React Hook Form + Zod`
  - listes `ListLayout/ListTable`
  - snapshots `SnapshotBase` / `useSnapshotState`
  - hooks React Query par domaine metier.
- Un precedent UI existe conceptuellement dans `src/components/depenses/CreateDepenseUrgenceFromReservationDialog.tsx`, mais ce composant reste un raccourci legacy et ne doit pas devenir la source de verite du nouveau workflow gouverne.

### Technical Requirements

- Backend
  - Creer un module dedie du type `backend/src/exceptions-metier/` ou `backend/src/workflow-exceptions/` pour centraliser:
    - contrat de demande d'exception
    - gestion du quorum
    - controle d'expiration
    - consommation unique de l'override
    - audit trail
  - Reutiliser le `CashRiskDecision` existant comme payload de blocage de reference:
    - `riskLevel`
    - `riskScore`
    - `decision`
    - `reasons`
    - `snapshot`
  - Stocker explicitement le lien avec:
    - `transition`
    - `sourceType`
    - `sourceId`
    - `entityId`
    - `correlationId`
    - `tenantId`
    - `exerciceId`
  - Imposer un quorum minimal configurable sans introduire de moteur de regles generique trop large dans ce lot.
  - Verifier l'override au moment du rejeu serveur de la transition critique, jamais cote UI.
  - Garantir qu'une exception n'est valable que pour une seule transition cible et une seule fenetre temporelle.
  - Produire des erreurs metier explicites et reutilisables par le frontend:
    - exception introuvable
    - vote non autorise
    - quorum non atteint
    - exception expiree
    - exception deja consommee
    - cible incoherente avec la transition demandee
- Frontend
  - Ne pas recalculer eligibilite, quorum ou expiration hors du backend; afficher l'etat fourni par l'API.
  - Si une UI de demande est exposee, passer uniquement par `src/services/api/*` et des hooks React Query dedies.
  - Reutiliser les composants de dialogue/snapshot/liste existants avant toute nouvelle abstraction visuelle.
- Data / Persistence
  - Passer par migration SQL versionnee et rejouable.
  - Conserver un historique non destructif:
    - demandes
    - votes
    - transitions de statut
    - consommation
  - Ne pas reintroduire une logique RLS Supabase ou un stockage runtime Supabase pour ce flux.

### Architecture Compliance

- Garder `JwtAuthGuard` + `AuthorizationPolicyGuard` + `@RequirePermissions` sur tous les endpoints du workflow d'exception.
- Scope strict par `client_id = tenantId` et `exercice_id` sur toutes les demandes, votes et verifications d'override.
- La logique de quorum et de consommation doit vivre cote NestJS, pas dans les composants React ni dans un helper front.
- Reutiliser `PostgresService` et les patterns SQL deja visibles dans les services metier existants.
- Eviter de modifier `CashRiskService` pour lui faire porter le workflow d'exception complet: il doit rester responsable du calcul de risque, tandis que le nouveau module orchestre la gouvernance d'override.
- Le design doit preparer la story `5.4` en exposant des statuts, journaux et compteurs d'exception faciles a agregger.
- La separation ordonnateur/comptable existante ne doit pas etre court-circuitee par le workflow d'exception; elle doit au contraire etre tracee et appliquee pendant les votes/approbations.

### Library / Framework Requirements

Versions observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, React Hook Form `7.61.1`, Zod `3.25.76`, Vite `5.4.19`.
- Backend: NestJS `10.4.22`, `pg` `8.19.0`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`.
- Package manager: `pnpm@9.12.0`.

Versions stables observees via registry au 2026-03-07:

- `@nestjs/core`: `11.1.16`
- `@tanstack/react-query`: `5.90.21`
- `react`: `19.2.4`
- `zod`: `4.3.6`

Decision pour cette story:

- Aucun upgrade n'est recommande dans ce lot.
- Le repo est encore aligne sur React 18 / Nest 10 / Zod 3; migrer ces briques en meme temps qu'un workflow d'exception critique augmenterait fortement le risque.
- L'implementation doit rester sur la stack actuelle et suivre les patterns deja installes.

### File Structure Requirements

Points d'extension probables:

- Backend
  - `backend/src/app.module.ts`
  - nouveau domaine probable:
    - `backend/src/workflow-exceptions/` ou `backend/src/exceptions-metier/`
    - `*.module.ts`
    - `*.controller.ts`
    - `*.service.ts`
    - `dto/*.ts`
    - `*.spec.ts`
  - integrations a brancher potentiellement dans:
    - `backend/src/cash-risk/cash-risk.service.ts`
    - `backend/src/engagements/engagements.service.ts`
    - `backend/src/paiements/paiements.service.ts`
    - `backend/src/depenses/depenses.service.ts`
    - `backend/src/auth/authorization-policy.service.ts`
    - `backend/src/auth/authorization-audit.service.ts`
    - `backend/src/common/postgres.service.ts`
- Frontend
  - `src/services/api/*` pour le client API d'exception
  - `src/hooks/*` pour les hooks React Query du nouveau domaine
  - `src/pages/app/ControleInterne.tsx` si une premiere surface de suivi est etendue
  - `src/pages/app/Paiements.tsx`, `src/pages/app/Depenses.tsx`, `src/pages/app/Engagements.tsx` pour declencher une demande depuis un blocage
  - `src/components/*` pour:
    - dialogue de creation de demande
    - table/liste des demandes
    - snapshot/detail d'une exception
- Database
  - `supabase/migrations/*.sql` pour les tables/contraintes/index du workflow d'exception.

Regles de structure:

- Ne pas disperser les regles de quorum dans plusieurs services metier.
- Ne pas dupliquer le payload de `riskDecision` dans des types frontend et backend incoherents.
- Si plusieurs pages doivent presenter les memes informations d'exception, extraire un composant partage plutot que copier du JSX.

### Testing Requirements

1. Backend (obligatoire)
   - creation d'une demande avec justification valide,
   - refus sans justification,
   - refus si la transition cible ne correspond pas a un blocage connu,
   - approbation avec quorum atteint,
   - refus tant que le quorum n'est pas atteint,
   - prevention du double vote,
   - refus d'auto-approbation integrale si interdit par la regle retenue,
   - expiration et refus d'utilisation apres date limite,
   - consommation unique lors du rejeu d'une transition,
   - refus cross-tenant,
   - respect des guards/perms sur les endpoints ajoutes.

2. Frontend
   - affichage d'un message de blocage avec action de demande d'exception,
   - dialogue de creation avec validation Zod,
   - affichage du statut de quorum et de la date limite,
   - actions de vote visibles seulement pour les utilisateurs eligibles,
   - non-regression des flux `engagements`, `depenses`, `paiements` quand aucune exception n'est active.

3. Qualite transversale
   - `pnpm --dir backend run lint`
   - `pnpm --dir backend run test`
   - `pnpm run lint`
   - tests cibles sur les zones impactees
   - verification explicite de l'absence de nouvelle dependance runtime Supabase.

### Previous Story Intelligence

Lecons de la story precedente disponible dans l'epic 5 (`5.1`):

- Le moteur de risque a deja defini un contrat backend reutilisable (`riskLevel`, `riskScore`, `decision`, `reasons`, `snapshot`) qu'il faut consommer tel quel.
- Les blocages doivent intervenir avant tout side effect irreversible.
- Le scoping `tenant + exercice + sourceType/sourceId/entityId` est deja un garde-fou central et doit etre conserve dans le workflow d'exception.
- L'audit doit embarquer `threshold`, `projectedExposure`, `projectedGap` et `correlationId`; ces champs sont utiles pour le justificatif d'exception et la supervision future.
- Le lot precedent a explicitement prepare `5.2` et `5.3`; cette story doit donc reutiliser le travail deja livre, pas recreer un moteur parallele.

Lecons des stories operationnelles recentes (`4.4` notamment):

- Les erreurs metier actionnables sont preferables aux statuts implicites.
- Les invalidations et transitions doivent rester backend-first.
- Les tests cross-tenant et de workflow sont obligatoires sur toute regle sensible.

### Git Intelligence Summary

Observations sur les commits recents:

- `856e87f` Document sprint 4 4 updates
- `3eb7155` Clarify sprint review status
- `a517779` Run adversarial code review
- `9fbf1ab` Document reservation story
- `181de7c` Review previsions code changes

Lecture utile pour cette story:

- Le repo maintient une discipline de documentation sprint/story synchronisee avec `sprint-status.yaml`.
- Les evolutions recentes privilegient le durcissement progressif des workflows metier et la revue adversariale avant expansion de surface.
- Pour `5.3`, il faut suivre la meme ligne: nouveau module focalise, integration limitee aux transitions critiques, tests serres, pas de refonte transversale de l'autorisation.

### Latest Tech Information

- Les versions lockees du repository sont suffisantes pour cette story.
- Les versions les plus recentes existent, mais un upgrade React/Nest/Zod n'apporterait pas de valeur immediate pour le workflow d'exception et augmenterait le risque de regression.
- Le point de vigilance n'est pas la nouveaute framework, mais la coherence:
  - un seul contrat de blocage (`CashRiskDecision`)
  - un seul workflow d'override gouverne
  - une seule source de verite backend pour quorum, expiration et consommation.

### Project Structure Notes

- Le projet reste dans une architecture de transition: frontend React/Vite, backend NestJS, migrations SQL versionnees, retrait progressif de Supabase runtime.
- L'endroit naturel pour 5.3 est un module backend centralise relie a `cash-risk`, pas une extension opportuniste d'un composant legacy.
- La presence de `ControleInterne.tsx`, `Tresorerie.tsx`, `Paiements.tsx`, `Depenses.tsx` et `Engagements.tsx` offre plusieurs surfaces UI possibles; le lot doit choisir la surface la plus minimale permettant de soumettre et suivre une exception sans disperser l'information.
- La story `5.2` n'est pas encore contexted dans `implementation-artifacts`; 5.3 doit donc rester implementable en se basant directement sur la decision de blocage issue de `5.1`, tout en preparant les messages/remediations plus riches a venir.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [5-1-evaluer-le-risque-cash-sur-transitions-critiques.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/5-1-evaluer-le-risque-cash-sur-transitions-critiques.md)
- [4-4-executer-paiement-et-gestion-des-cas-partiels-rejets.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/4-4-executer-paiement-et-gestion-des-cas-partiels-rejets.md)
- [AGENTS-BUSINESS.md](/Volumes/mySD1.5/projects/agilys-spark-joy/src/AGENTS-BUSINESS.md)
- [AGENTS-PATTERNS.md](/Volumes/mySD1.5/projects/agilys-spark-joy/src/AGENTS-PATTERNS.md)
- [backend/src/cash-risk/cash-risk.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/cash-risk/cash-risk.service.ts)
- [backend/src/cash-risk/cash-risk.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/cash-risk/cash-risk.types.ts)
- [backend/src/engagements/engagements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.service.ts)
- [backend/src/engagements/engagements.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.controller.ts)
- [backend/src/paiements/paiements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/paiements/paiements.service.ts)
- [backend/src/paiements/paiements.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/paiements/paiements.controller.ts)
- [backend/src/tresorerie/tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.service.ts)
- [backend/src/operations-tresorerie/operations-tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/operations-tresorerie/operations-tresorerie.service.ts)
- [backend/src/comptes-tresorerie/comptes-tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/comptes-tresorerie/comptes-tresorerie.service.ts)
- [backend/src/auth/authorization-policy.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization-policy.service.ts)
- [backend/src/auth/authorization.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization.types.ts)
- [src/components/depenses/CreateDepenseUrgenceFromReservationDialog.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/depenses/CreateDepenseUrgenceFromReservationDialog.tsx)
- [src/pages/app/ControleInterne.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/ControleInterne.tsx)
- [src/pages/app/Depenses.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Depenses.tsx)
- [src/pages/app/Engagements.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Engagements.tsx)
- [src/pages/app/Paiements.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Paiements.tsx)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Story context 5.3 cree pour un workflow d'exception gouverne par quorum, fenetre temporelle et consommation unique.
- Le document impose la reutilisation du contrat `CashRiskDecision` et interdit toute duplication de moteur de risque.
- Les garde-fous d'architecture imposent une orchestration backend-only avec guards, permissions, audit trail et scoping tenant/exercice.
- Le lot recommande un nouveau module backend dedie, plutot qu'une extension opportuniste des services `engagements` ou `paiements`.
- Les surfaces frontend suggerees restent minimales et doivent reemployer `Dialog Form`, `ListLayout/ListTable` et `SnapshotBase`.
- Les versions plus recentes de NestJS, React Query, React et Zod ont ete verifiees, mais aucun upgrade n'est recommande pour ce lot critique.
- La story est preparee pour la supervision 5.4 en imposant des statuts, votes et journaux exploitables par agrégation.

### File List

- `_bmad-output/implementation-artifacts/5-3-gerer-workflow-dexception-avec-quorum.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-03-07: Creation de la story context 5.3 avec cadrage backend/frontend, quorum, expiration, consommation unique, garde-fous d'autorisation et references de code.
