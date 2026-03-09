# Story 6.3: Gerer corrections et contre-passations auditables

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a comptable,
I want corriger sans suppression destructive,
so that l'historique reste conforme en audit.

## Acceptance Criteria

1. **Contre-passation non destructive et liee a l'ecriture source**
   - **Given** une ecriture validee existe pour une operation metier (`reservation`, `engagement`, `facture`, `depense`, `paiement`)
   - **When** un utilisateur habilite demande une correction ou une annulation comptable
   - **Then** le systeme cree une ou plusieurs ecritures de `contrepassation` sans supprimer ni modifier destructivement les ecritures d'origine
   - **And** chaque contre-passation reference explicitement `ecriture_origine_id` et reste rattachee a la meme piece source, au meme tenant et au meme exercice.

2. **Traçabilite d'audit complete du motif et de l'auteur**
   - **Given** une correction comptable est executee
   - **When** l'utilisateur ou un auditeur consulte le journal comptable ou le detail de la source
   - **Then** le motif de correction, l'auteur, l'horodatage, le type d'operation et la relation origine/contre-passation sont consultables
   - **And** le libelle expose une raison metier actionnable plutot qu'une simple inversion technique opaque.

3. **Inversion comptable coherente et deterministe**
   - **Given** une ecriture d'origine comporte un debit, un credit, un montant et une regle comptable
   - **When** la contre-passation est generee
   - **Then** les comptes debit/credit sont inverses a montant strictement equivalent
   - **And** la numerotation de ligne, le statut et les metadonnees garantissent qu'une meme ecriture d'origine n'est pas contre-passee deux fois par erreur.

4. **Integration avec les workflows metier sans duplication incontrôlee**
   - **Given** les domaines `reservations`, `engagements`, `factures`, `depenses` et `paiements` declenchent deja des corrections
   - **When** la story est implementee
   - **Then** la logique commune de contre-passation est centralisee dans une abstraction backend partagee ou une facade existante
   - **And** les differenciations metier legitimes (motifs, garde-fous de statut, messages UX) restent dans les services de domaine sans recopier les insertions SQL partout.

5. **Securite, isolation tenant et non-regression UI**
   - **Given** plusieurs tenants et plusieurs exercices coexistent
   - **When** une correction est lancee ou consultee
   - **Then** les acces restent scopes par `client_id` et `exercice_id` avec les guards JWT/policies existants
   - **And** les ecrans et composants de consultation (`JournalComptable`, `EcrituresSection`, snapshots metier) continuent d'afficher correctement le couple origine/contre-passation sans regression.

## Tasks / Subtasks

- [x] Revalider le contrat de la story contre `FR49`, `FR48`, `FR29`, `FR32`, `NFR8`, `NFR9`, `NFR11`, `NFR25`, `NFR28`, `NFR33`, puis formaliser les invariants non negociables de correction comptable (AC: 1, 2, 3, 4, 5)
- [x] Cartographier et reutiliser les points de correction deja presents avant tout ajout:
  - [x] `backend/src/reservations/reservations.service.ts`
  - [x] `backend/src/engagements/engagements.service.ts`
  - [x] `backend/src/factures/factures.service.ts`
  - [x] `backend/src/depenses/depenses.service.ts`
  - [x] `backend/src/paiements/paiements.service.ts`
  - [x] `backend/src/ecritures-comptables/ecritures-comptables.service.ts` (AC: 1, 3, 4, 5)
- [x] Extraire ou renforcer une abstraction backend partagee de contre-passation au lieu de conserver cinq variantes d'`INSERT INTO public.ecritures_comptables` quasi identiques (AC: 1, 3, 4)
- [x] Durcir les garde-fous de non-duplication:
  - [x] interdire une seconde contre-passation pour une meme ecriture d'origine sans workflow explicite
  - [x] verifier tenant/exercice/source avant inversion
  - [x] conserver la coherence `numero_piece`, `numero_ligne`, `statut_ecriture`, `ecriture_origine_id` (AC: 1, 3, 5)
- [x] Completer le contrat de persistance et de consultation si necessaire:
  - [x] ajouter migration SQL versionnee si une contrainte/index manque sur `ecriture_origine_id`, `statut_ecriture` ou unicite logique
  - [x] enrichir si besoin les DTO et vues backend/frontend pour exposer motif, auteur et horodatage lisibles (AC: 2, 3, 5)
- [x] Garder la logique metier de decision au bon niveau:
  - [x] validations de statut et autorisations dans les services de domaine
  - [x] mecanique comptable d'inversion dans la couche partagee
  - [x] aucun calcul de contre-passation dans le frontend (AC: 2, 4, 5)
- [x] Aligner les composants UI qui consomment les ecritures:
  - [x] `src/components/ecritures/EcrituresSection.tsx`
  - [x] `src/pages/app/JournalComptable.tsx`
  - [x] snapshots `ReservationSnapshot`, `EngagementSnapshot`, `FactureSnapshot`, `DepenseSnapshot`, `BonCommandeSnapshot` si impactes (AC: 2, 5)
- [x] Ajouter les tests backend obligatoires:
  - [x] creation d'une contre-passation nominale a partir d'une ecriture validee
  - [x] refus d'une double contre-passation sur la meme origine
  - [x] refus cross-tenant / exercice incoherent
  - [x] preservation de `ecriture_origine_id`, `created_by`, `statut_ecriture`
  - [x] non-regression sur annulation/correction `reservation`, `engagement`, `facture`, `depense`, `paiement` (AC: 1, 2, 3, 4, 5)
- [x] Ajouter les tests frontend / contrat cibles:
  - [x] affichage groupe origine + contre-passation dans `EcrituresSection`
  - [x] affichage des statuts dans `JournalComptable`
  - [x] verification que les hooks/services existants n'ont pas besoin de logique locale supplementaire pour relier les ecritures (AC: 2, 5)
- [x] Confirmer explicitement qu'aucune nouvelle dependance runtime Supabase n'est introduite et que le lot reste conforme au workflow `pnpm` + NestJS/PostgreSQL + client API unifie (AC: 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.3).
- FR directes:
  - `FR49`: annulations/corrections traitees par contre-passation sans suppression destructive
  - `FR48`: suivi du statut d'une ecriture avec journal horodate
- FR connexes utiles:
  - `FR29`: coherence entre plan comptable, journal comptable et flux operationnels
  - `FR32`: historique non destructif complet avec double temporalite
  - `FR45`, `FR46`, `FR47`: generation fiable, equilibree et idempotente des ecritures d'origine
- NFR prioritaires:
  - `NFR8`, `NFR9`, `NFR11` pour securite, journalisation et integrite
  - `NFR25`, `NFR28`, `NFR33` pour determinisme, traçabilite des corrections et verrouillage des periodes.

### Developer Context Section

- Le repo contient deja une base fonctionnelle de contre-passation dans plusieurs services de domaine:
  - `backend/src/reservations/reservations.service.ts`
  - `backend/src/engagements/engagements.service.ts`
  - `backend/src/factures/factures.service.ts`
  - `backend/src/depenses/depenses.service.ts`
  - `backend/src/paiements/paiements.service.ts`
- Chaque implementation actuelle inverse deja `compte_debit_id` / `compte_credit_id`, conserve `montant`, renseigne `statut_ecriture = 'contrepassation'` et lie `ecriture_origine_id`.
- Le probleme principal n'est donc pas l'absence de fonctionnalite, mais la duplication:
  - cinq variantes de `createContrepassations(...)` existent avec une structure SQL quasi identique;
  - les differences legitimes portent surtout sur le contexte metier et le libelle (`Annulation`, `Workflow paiement inversé`, etc.);
  - sans abstraction partagee, le risque est d'introduire des divergences de comportement, d'audit ou de securite.
- Le frontend consomme deja ce modele de donnees:
  - `src/components/ecritures/EcrituresSection.tsx` groupe les ecritures validees et leur contre-passation via `ecritureOrigineId`;
  - `src/services/api/ecritures-comptables.service.ts`, `src/hooks/useEcrituresComptables.ts` et `src/pages/app/JournalComptable.tsx` attendent les champs `statutEcriture`, `ecritureOrigineId`, `regleComptable`, `createdBy`;
  - plusieurs snapshots metier affichent les ecritures par source et risquent une regression si le contrat change.

### Technical Requirements

- Backend
  - Centraliser la mecanique de creation des contre-passations dans un helper/service partage au lieu de maintenir des `INSERT` dupliques.
  - Laisser les services de domaine decider *quand* une correction est autorisee, mais deleguer *comment* l'ecriture inverse est creee.
  - Refuser toute correction si l'ecriture d'origine n'appartient pas au tenant/exercice attendu ou si elle est deja contre-passee.
  - Conserver une semantique claire entre:
    - ecriture d'origine `statut_ecriture = 'validee'`
    - ecriture de correction `statut_ecriture = 'contrepassation'`
    - lien `ecriture_origine_id` pointant uniquement vers une origine validee.
- Database / SQL
  - La table `public.ecritures_comptables` existe deja avec `statut_ecriture` et `ecriture_origine_id`.
  - Verifier si les index/contraintes actuels suffisent:
    - `unique_piece_ligne` protege `numero_piece + numero_ligne + client_id`
    - `idx_ecritures_statut` et `idx_ecritures_origine` existent
  - Si une garantie "une origine -> une seule contre-passation active" manque, l'ajouter via migration SQL rejouable et documentee plutot que via simple convention applicative.
- Frontend
  - Ne pas calculer les liens origine/contre-passation dans plusieurs composants differents au-dela du regroupement de presentation deja present dans `EcrituresSection`.
  - Preserver le contrat API actuel autant que possible; si enrichi, le faire de maniere additive et typée.
  - Toute nouvelle exposition du motif de correction doit etre compatible avec `JournalComptable` et les snapshots de source.

### Architecture Compliance

- Respecter les regles de `project-context.md`:
  - pas de nouvelle logique metier cote frontend;
  - pas de nouveau flux runtime Supabase pour la comptabilite;
  - backend NestJS comme source de verite;
  - multi-tenant strict sur tous les acces.
- Respecter les guards existants:
  - `JwtAuthGuard`
  - `AuthorizationPolicyGuard`
  - permissions `referentiels:read` / `referentiels:write` sur les endpoints comptables existants.
- Ne pas creer un nouveau domaine "corrections-comptables" si `ecritures-comptables` peut jouer le role de facade partagee.
- Maintenir la compatibilite avec la story `6.2`: la contre-passation corrige un jeu d'ecritures genere, elle ne doit pas recréer un autre moteur concurrent.

### Library / Framework Requirements

Versions observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, React Hook Form `7.61.1`, Zod `3.25.76`.
- Backend: NestJS `10.4.22`, `pg` `8.19.0`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`.
- Package manager: `pnpm@9.12.0`.

Decision pour cette story:

- Aucun upgrade de dependances n'est requis.
- Le sujet est la consolidation du contrat comptable et d'audit, pas une evolution de stack.

### File Structure Requirements

Points d'extension prioritaires:

- Backend
  - `backend/src/ecritures-comptables/*`
  - `backend/src/reservations/reservations.service.ts`
  - `backend/src/engagements/engagements.service.ts`
  - `backend/src/factures/factures.service.ts`
  - `backend/src/depenses/depenses.service.ts`
  - `backend/src/paiements/paiements.service.ts`
- Database / migrations
  - `supabase/migrations/20251123151034_35fe2c6e-9a5b-4823-8eae-62ac5439f359.sql`
  - `supabase/migrations/20251123163342_73d29804-c176-435c-8d2f-288472f97974.sql`
  - nouvelle migration versionnee si contrainte/index/colonne d'audit supplementaire est necessaire
- Frontend
  - `src/services/api/ecritures-comptables.service.ts`
  - `src/hooks/useEcrituresComptables.ts`
  - `src/pages/app/JournalComptable.tsx`
  - `src/components/ecritures/EcrituresSection.tsx`
  - snapshots metier consommateurs des ecritures par source

Regles de structure:

- factoriser la mecanique commune plutot que recopier les requetes SQL;
- garder les messages metier proches des domaines qui les emettent;
- ne pas changer le format de retour des ecritures sans verifier tous les consommateurs UI existants.

### Testing Requirements

1. Backend (obligatoire)
   - test nominal de contre-passation depuis une ecriture validee;
   - test de refus si l'origine a deja une contre-passation;
   - test de refus cross-tenant / exercice invalide;
   - test de preservation de `ecriture_origine_id`, `created_by`, `statut_ecriture`, comptes inverses;
   - non-regression sur les flux `annuler` / correction des domaines existants.

2. Frontend / contrat (obligatoire)
   - verification du groupement origine/contre-passation dans `EcrituresSection`;
   - verification de l'affichage des statuts dans `JournalComptable`;
   - tests des services/hooks si le payload evolue.

3. Qualite transversale
   - `pnpm --dir backend run lint`
   - `pnpm --dir backend run test`
   - `pnpm run lint`
   - tests cibles frontend/backend sur les zones impactees.

### Previous Story Intelligence

- La story `6.1` a impose:
  - reutilisation des modules comptables existants;
  - gouvernance de version des regles cote backend;
  - absence de nouvelle source de verite parallele.
- La story `6.2` a impose:
  - `ecritures-comptables` comme facade commune;
  - idempotence et traçabilite sur la generation nominale;
  - conservation des metadonnees `regle_comptable_id`, `source_id`, `statut_ecriture`, `ecriture_origine_id`.
- Consequence directe pour `6.3`:
  - la correction doit prolonger le contrat de `6.2`, pas le contourner;
  - si une abstraction partagee est creee pour les contre-passations, elle doit rester compatible avec les garanties d'idempotence et de reporting deja exigees.

### Git Intelligence Summary

- Commits recents observes:
  - `4d56bb3 Summarize code review request`
  - `5f7a90b Generate code review title`
  - `5ee1c9e Execute dev story workflow`
  - `856e87f Document sprint 4 4 updates`
  - `3eb7155 Clarify sprint review status`
- Aucun commit recent n'indique qu'une abstraction commune de contre-passation est deja en cours d'introduction.
- Le document doit donc pousser une consolidation explicite des implementations existantes, avec prudence sur les regressions metier.

### Latest Tech Information

- Aucune recherche web technique additionnelle n'est necessaire pour cette story.
- Les versions verrouillees dans `package.json` et `backend/package.json` sont suffisantes.
- Le risque ici est architectural et fonctionnel: duplication, incoherence d'audit et regressions UI, pas obsolescence de framework.

### Project Structure Notes

- Aucun `architecture.md` exploitable n'a ete trouve dans `/_bmad-output/planning-artifacts`; l'architecture de reference provient donc du code reel, de `project-context.md` et des stories `6.1` / `6.2`.
- Le projet reste en migration vers NestJS + PostgreSQL + client API unifie. Cette story doit rester dans cette trajectoire et ne pas reouvrir un couplage metier a Supabase.
- Le principal conflit detecte est la duplication actuelle des fonctions `createContrepassations(...)` dans plusieurs services:
  - acceptable comme heritage temporaire,
  - risquee comme fondation long terme si `6.3` ajoute encore une sixieme variante.
- Le lot doit preparer les futures stories de cloture, reporting et audit en preservant des liens origine/correction consultables sans requete ad hoc fragile.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [6-1-versionner-plan-comptable-et-mapping-ecritures.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-1-versionner-plan-comptable-et-mapping-ecritures.md)
- [6-2-generer-ecritures-en-double-entree-idempotentes.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-2-generer-ecritures-en-double-entree-idempotentes.md)
- [ecritures-comptables.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/ecritures-comptables/ecritures-comptables.service.ts)
- [ecritures-comptables.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/ecritures-comptables/ecritures-comptables.controller.ts)
- [reservations.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/reservations/reservations.service.ts)
- [engagements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.service.ts)
- [factures.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/factures/factures.service.ts)
- [depenses.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/depenses/depenses.service.ts)
- [paiements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/paiements/paiements.service.ts)
- [20251123151034_35fe2c6e-9a5b-4823-8eae-62ac5439f359.sql](/Volumes/mySD1.5/projects/agilys-spark-joy/supabase/migrations/20251123151034_35fe2c6e-9a5b-4823-8eae-62ac5439f359.sql)
- [20251123163342_73d29804-c176-435c-8d2f-288472f97974.sql](/Volumes/mySD1.5/projects/agilys-spark-joy/supabase/migrations/20251123163342_73d29804-c176-435c-8d2f-288472f97974.sql)
- [ecritures-comptables.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/ecritures-comptables.service.ts)
- [useEcrituresComptables.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useEcrituresComptables.ts)
- [JournalComptable.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/JournalComptable.tsx)
- [EcrituresSection.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/ecritures/EcrituresSection.tsx)
- [ecriture-comptable.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/types/ecriture-comptable.types.ts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Story context `6.3` cree avec focus sur la contre-passation comptable non destructive et auditable.
- Le document impose la reutilisation et la consolidation des implementations existantes plutot qu'une nouvelle duplication de SQL dans chaque service.
- Les guardrails couvrent lien origine/correction, non-duplication, multi-tenant, contrat API/UI et compatibilite avec les stories `6.1` et `6.2`.
- Aucune evolution de dependances ni nouveau runtime Supabase n'est recommandee pour ce lot.
- Implementation realisee via `EcrituresComptablesService.createContrepassations(...)` avec validation tenant/exercice/source, refus de double contre-passation et gestion explicite des collisions d'unicite.
- Les services `reservations`, `engagements`, `factures`, `depenses` et `paiements` deleguent maintenant la mecanique comptable partagee tout en conservant les decisions metier locales.
- Le journal comptable et `EcrituresSection` exposent maintenant plus clairement statut, auteur, horodatage et relation origine/contre-passation sans logique supplementaire cote frontend.
- Validations executees: `pnpm --dir backend run lint`, `pnpm --dir backend run test -- src/ecritures-comptables/ecritures-comptables.service.spec.ts`, `pnpm --dir backend run test -- src/reservations/reservations.service.spec.ts src/engagements/engagements.service.spec.ts src/factures/factures.service.spec.ts src/depenses/depenses.service.spec.ts src/paiements/paiements.service.spec.ts`, `pnpm exec eslint tests/ecritures-generation-ui.spec.ts backend/src/common/postgres.service.ts backend/src/ecritures-comptables/ecritures-comptables.service.ts backend/src/ecritures-comptables/ecritures-comptables.service.spec.ts`, et `pnpm exec playwright test tests/ecritures-generation-ui.spec.ts`.

### File List

- `_bmad-output/implementation-artifacts/6-3-gerer-corrections-et-contre-passations-auditables.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `backend/src/ecritures-comptables/ecritures-comptables.service.ts`
- `backend/src/ecritures-comptables/ecritures-comptables.service.spec.ts`
- `backend/src/common/postgres.service.ts`
- `backend/src/reservations/reservations.service.ts`
- `backend/src/reservations/reservations.service.spec.ts`
- `backend/src/engagements/engagements.service.ts`
- `backend/src/engagements/engagements.service.spec.ts`
- `backend/src/factures/factures.service.ts`
- `backend/src/factures/factures.service.spec.ts`
- `backend/src/depenses/depenses.service.ts`
- `backend/src/depenses/depenses.service.spec.ts`
- `backend/src/paiements/paiements.service.ts`
- `backend/src/paiements/paiements.service.spec.ts`
- `src/components/ecritures/EcritureComptableTable.tsx`
- `src/components/ecritures/EcrituresSection.tsx`
- `src/pages/app/JournalComptable.tsx`
- `tests/ecritures-generation-ui.spec.ts`
- `supabase/migrations/20260308153000_story_6_3_contrepassations_auditables.sql`

## Senior Developer Review (AI)

### Reviewer

- Max (GPT-5 Codex) le 2026-03-08

### Findings Summary

- Revue initiale: 2 points P1 et 1 point P2 identifies sur l'atomicite des contre-passations, la strategie de `numero_ligne`, et l'absence de couverture explicite de `EcrituresSection`.
- Correctifs appliques dans le meme lot avant cloture de revue.

### Verification Notes

- `createContrepassations(...)` est maintenant execute dans une transaction backend avec rollback complet en cas d'echec.
- La numerotation des lignes de contre-passation est allouee de maniere sequentielle a partir du maximum existant par `numero_piece`, ce qui evite les collisions directes avec `unique_piece_ligne`.
- Les collisions SQL `23505` sont maintenant distinguees entre doublon de contre-passation et conflit de numerotation.
- La couverture frontend verifie explicitement le rendu du couple origine/contre-passation dans le snapshot consommant `EcrituresSection`.

### Outcome

- Approved after fixes.

## Change Log

- 2026-03-07: Creation de la story context 6.3 avec cadrage complet des contre-passations, contraintes d'audit, centralisation backend et exigences de non-regression UI.
- 2026-03-08: Centralisation de la contre-passation dans `EcrituresComptablesService`, ajout d'une contrainte SQL anti-duplication, mise a jour des ecrans d'audit et couverture de tests backend/frontend ciblee.
- 2026-03-08: Correctifs post-review sur l'atomicite transactionnelle des contre-passations, la numerotation de ligne sans collision et la couverture explicite du rendu `EcrituresSection`.
- 2026-03-08: Revue senior cloturee avec validation des correctifs et passage du statut story a `done`.
