# Story 6.2: Generer ecritures en double entree idempotentes

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a comptable,
I want des ecritures automatiques fiables,
so that les operations restent conformes et sans doublons.

## Acceptance Criteria

1. **Generation centralisee et deterministe pour chaque transition critique**
   - **Given** une transition metier critique admissible (`reservation`, `engagement`, `bon_commande`, `facture`, `depense`, `paiement`)
   - **When** la generation comptable est declenchee depuis le backend cible
   - **Then** un seul chemin nominal de generation est utilise pour produire les ecritures
   - **And** les services metier reutilisent ce point d'entree sans logique concurrente ou duplication ad hoc.

2. **Controle debit=credit bloqueur avant validation**
   - **Given** une ou plusieurs regles comptables actives s'appliquent a la transition
   - **When** les lignes comptables candidates sont preparees
   - **Then** le moteur verifie explicitement l'equilibre total `somme(debit) = somme(credit)` avant insertion finale
   - **And** toute incoherence ou absence de compte/regle applicable echoue avec une erreur metier actionnable et journalisee.

3. **Idempotence forte sur retries et concurrence**
   - **Given** le meme evenement metier peut etre rejoue, relance ou traite concurremment
   - **When** deux executions portent le meme couple `(client_id, exercice_id, type_operation, source_id)` et la meme configuration applicable
   - **Then** le moteur n'insere pas de doublon logique dans `ecritures_comptables`
   - **And** le resultat renvoye indique clairement si les ecritures ont ete creees ou deja presentes.

4. **Traçabilite complete des ecritures generees**
   - **Given** une generation comptable reussit ou echoue
   - **When** l'utilisateur ou un service consulte les ecritures associees
   - **Then** chaque ecriture conserve la piece source, la regle appliquee, le statut, l'auteur technique, l'horodatage et le rattachement a l'entite metier source
   - **And** le contrat prepare explicitement les stories `6.3` (contre-passations) et `9.1` (balance / grand livre / fiche compte) sans suppression destructive.

5. **Securite multi-tenant et non-regression des workflows existants**
   - **Given** les modules `reservations`, `engagements`, `bons_commande`, `factures`, `depenses` et `paiements` utilisent deja la generation comptable
   - **When** la story est implementee
   - **Then** les acces restent strictement scopes par `client_id` et `exercice_id` avec les guards JWT/policies existants
   - **And** les tests couvrent idempotence, equilibre, concurrence, refus cross-tenant et non-regression des parcours comptables deja en place.

## Tasks / Subtasks

- [ ] Revalider le contrat story 6.2 contre `FR45`, `FR46`, `FR47`, `FR48`, `FR29`, `FR32`, `NFR8`, `NFR9`, `NFR11`, `NFR25`, `NFR26`, `NFR27` et formaliser les invariants non negociables du moteur (AC: 1, 2, 3, 4, 5)
- [ ] Cartographier puis consolider tous les points d'entree existants de generation comptable avant toute modification:
  - [ ] `backend/src/ecritures-comptables/ecritures-comptables.service.ts`
  - [ ] `backend/src/reservations/reservations.service.ts`
  - [ ] `backend/src/engagements/engagements.service.ts`
  - [ ] `backend/src/bons-commande/bons-commande.service.ts`
  - [ ] `backend/src/factures/factures.service.ts`
  - [ ] `backend/src/depenses/depenses.service.ts`
  - [ ] `backend/src/paiements/paiements.service.ts` (AC: 1, 3, 4, 5)
- [ ] Renforcer la persistence et le moteur SQL pour l'idempotence forte:
  - [ ] definir une cle logique d'idempotence basee sur la source metier et la regle appliquee
  - [ ] remplacer les insertions aveugles par un mecanisme deterministe (`ON CONFLICT`, contrainte unique adaptee, ou verrou applicatif/transactionnel justifie)
  - [ ] conserver une reponse exploitable quand la generation a deja ete effectuee (AC: 2, 3, 4)
- [ ] Introduire un pre-check d'equilibre avant insertion finale:
  - [ ] preparer les lignes candidates en memoire/CTE
  - [ ] verifier qu'au moins une regle applicable existe
  - [ ] refuser tout lot dont le total debit-credit n'est pas nul
  - [ ] refuser toute ligne sans compte valide dans le tenant et l'exercice (AC: 2, 5)
- [ ] Centraliser la responsabilite de generation dans la couche backend cible:
  - [ ] faire de `ecritures-comptables` le point d'orchestration nominal
  - [ ] supprimer les comportements qui recréent implicitement les memes ecritures sans garde d'idempotence
  - [ ] conserver les contre-passations manuelles existantes comme preparation de la story `6.3`, sans les confondre avec le flux nominal (AC: 1, 3, 4)
- [ ] Aligner les contrats d'exposition:
  - [ ] enrichir si necessaire `backend/src/ecritures-comptables/dto/*` et `src/services/api/ecritures-comptables.service.ts`
  - [ ] exposer de maniere explicite `regleComptable`, `statutEcriture`, resultat idempotent et erreurs metier actionnables
  - [ ] ne pas dupliquer la logique de calcul dans `JournalComptable` (AC: 4, 5)
- [ ] Verrouiller le nettoyage d'architecture:
  - [ ] ne pas reintroduire de runtime Supabase pour la logique metier
  - [ ] traiter `supabase/functions/generate-ecritures-comptables` comme heritage a ne pas etendre
  - [ ] preferer des migrations SQL rejouables dans `supabase/migrations/*.sql` pour les contraintes/index/fonctions supportant NestJS (AC: 1, 3, 5)
- [ ] Ajouter tests backend obligatoires:
  - [ ] generation nominale pour au moins `engagement`, `depense` et `paiement`
  - [ ] rejet si debit != credit
  - [ ] aucun doublon sur double appel successif
  - [ ] aucun doublon sur scenario concurrent/retry
  - [ ] refus cross-tenant / exercice invalide
  - [ ] conservation des metadonnees `regle_comptable_id`, `source_id`, `statut_ecriture` (AC: 2, 3, 4, 5)
- [ ] Ajouter tests frontend / contrat cibles:
  - [ ] lecture `JournalComptable` et services API avec le resultat reel du moteur
  - [ ] affichage cohérent des statuts/erreurs actionnables
  - [ ] non-regression des ecrans qui exposent `ecrituresCount` ou detail des ecritures (AC: 4, 5)
- [ ] Confirmer explicitement qu'aucune nouvelle dependance runtime Supabase n'est introduite et que le workflow standard reste `pnpm` + NestJS/PostgreSQL (AC: 1, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.2).
- FR directes:
  - `FR45`: generation automatique en double entree pour transitions critiques
  - `FR46`: verification `debit=credit` avant validation
  - `FR47`: idempotence pour eviter les doublons
  - `FR48`: suivi du statut des ecritures avec journal horodate
- FR connexes utiles:
  - `FR29`: coherence plan comptable / journal comptable
  - `FR32`: historique non destructif complet
  - `FR49`: contre-passation sans suppression destructive (story suivante)
- NFR prioritaires:
  - `NFR25`, `NFR26`, `NFR27` pour reproductibilite, equilibre et performance
  - `NFR8`, `NFR9`, `NFR11` pour securite, journalisation et integrite.

### Developer Context Section

- Le backend expose deja un service cible a reutiliser:
  - `backend/src/ecritures-comptables/ecritures-comptables.service.ts`
  - `backend/src/ecritures-comptables/ecritures-comptables.controller.ts`
- La generation est deja appelee depuis plusieurs domaines, donc le risque principal est la duplication logique:
  - `backend/src/reservations/reservations.service.ts`
  - `backend/src/engagements/engagements.service.ts`
  - `backend/src/bons-commande/bons-commande.service.ts`
  - `backend/src/factures/factures.service.ts`
  - `backend/src/depenses/depenses.service.ts`
  - `backend/src/paiements/paiements.service.ts`
- La base de donnees porte encore une partie critique de l'orchestration:
  - `supabase/migrations/20251123151034_35fe2c6e-9a5b-4823-8eae-62ac5439f359.sql`
  - `supabase/migrations/20251123163342_73d29804-c176-435c-8d2f-288472f97974.sql`
- Constats actuels a prendre en compte:
  - la fonction SQL `generate_ecritures_comptables` insere les lignes pour chaque regle applicable mais n'expose pas de garde d'idempotence metier explicite;
  - la contrainte `unique_piece_ligne` (`numero_piece`, `numero_ligne`, `client_id`) protege une partie des collisions, mais ne formalise pas a elle seule le contrat "un evenement metier produit un seul jeu d'ecritures";
  - plusieurs services appellent directement la fonction SQL; `paiements.service.ts` ajoute en plus un pre-check local sur des ecritures existantes, ce qui signale une logique de duplication a rationaliser;
  - les contre-passations existent deja par insertions dediees dans plusieurs services; elles doivent rester hors flux nominal de 6.2 mais compatibles avec lui.

### Technical Requirements

- Backend
  - Garder la generation nominale cote NestJS/PostgreSQL, sans logique comptable dans le frontend.
  - Definir un contrat d'idempotence explicite et testable sur la source metier (`type_operation`, `source_id`, `client_id`, `exercice_id`, regle applicable).
  - Verifier l'equilibre global du lot avant l'insertion definitive, pas seulement la validite de chaque ligne unitaire.
  - Retourner un resultat stable distinguant `cree`, `deja_genere`, `erreur_metier`.
- Database / SQL
  - Preferer un durcissement de schema/migration rejouable a un simple check applicatif fragile.
  - Evaluer si la cle existante `unique_piece_ligne` doit etre completee par une contrainte plus proche de la source metier et de la regle.
  - Preserver `regle_comptable_id`, `source_id`, `statut_ecriture`, `ecriture_origine_id` pour les stories comptables suivantes.
- Frontend
  - `JournalComptable` et `src/services/api/ecritures-comptables.service.ts` restent des consommateurs du contrat backend.
  - Aucun calcul local de debit/credit ou d'idempotence ne doit etre duplique dans l'UI.

### Architecture Compliance

- Respecter la source de verite actuelle:
  - regles et mappings dans `regles-comptables`
  - consultation/generation dans `ecritures-comptables`
  - orchestration metier dans les services de domaine.
- Respecter le scope de securite:
  - `client_id` obligatoire partout
  - `exercice_id` obligatoire sur la generation
  - guards JWT/policies existants conserves sur les endpoints comptables.
- Aucun nouveau module comptable parallele ne doit etre cree si l'extension des modules existants suffit.
- Aucune nouvelle Edge Function Supabase ne doit etre introduite; le residuel `supabase/functions/generate-ecritures-comptables` n'est pas une base acceptable pour du nouveau code.

### Library / Framework Requirements

Versions observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, React Hook Form `7.61.1`, Zod `3.25.76`.
- Backend: NestJS `10.4.22`, `pg` `8.19.0`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`.
- Package manager: `pnpm@9.12.0`.

Decision pour cette story:

- Pas d'upgrade de dependances dans ce lot.
- Le sujet est la fiabilisation du moteur existant, pas un changement de stack.

### File Structure Requirements

Points d'extension prioritaires:

- Backend
  - `backend/src/ecritures-comptables/*`
  - `backend/src/regles-comptables/*`
  - `backend/src/reservations/reservations.service.ts`
  - `backend/src/engagements/engagements.service.ts`
  - `backend/src/bons-commande/bons-commande.service.ts`
  - `backend/src/factures/factures.service.ts`
  - `backend/src/depenses/depenses.service.ts`
  - `backend/src/paiements/paiements.service.ts`
- Database / migrations
  - `supabase/migrations/20251123151034_35fe2c6e-9a5b-4823-8eae-62ac5439f359.sql`
  - `supabase/migrations/20251123163342_73d29804-c176-435c-8d2f-288472f97974.sql`
  - nouvelle migration versionnee si contrainte/index/fonction doivent evoluer
- Frontend
  - `src/services/api/ecritures-comptables.service.ts`
  - `src/pages/app/JournalComptable.tsx`
  - vues de detail metier qui lisent `ecrituresCount` si impactees

Regles de structure:

- garder `ecritures-comptables` comme facade commune de generation/consultation;
- extraire un helper partage si plusieurs services reproduisent le meme guard d'idempotence;
- ne pas disperser la logique entre SQL, services de domaine et UI sans contrat clair.

### Testing Requirements

1. Backend (obligatoire)
   - tests de generation nominale sur transitions critiques;
   - tests d'equilibre du lot comptable;
   - tests d'idempotence sur double appel et scenario concurrent;
   - tests cross-tenant / exercice invalide;
   - tests de conservation des metadonnees comptables.

2. Frontend / contrat (obligatoire)
   - tests du service API `ecritures-comptables`;
   - verification de l'affichage des statuts et erreurs dans `JournalComptable`;
   - non-regression des zones affichant le nombre d'ecritures ou leur detail.

3. Qualite transversale
   - `pnpm --dir backend run lint`
   - `pnpm --dir backend run test`
   - `pnpm run lint`
   - tests cibles sur les modules comptables impactes.

### Previous Story Intelligence

- La story `6.1` a deja etabli que:
  - `regles-comptables` et `ecritures-comptables` sont les briques a etendre, pas a contourner;
  - la selection de regle doit rester deterministic et cote backend;
  - la preparation des stories `6.2` et `6.3` depend d'un historique non destructif et de metadonnees de version/gouvernance explicites.
- Consequence directe pour `6.2`:
  - ne pas reconstruire un moteur parallele;
  - s'appuyer sur les regles versionnees de `6.1` pour produire des ecritures fiables et rejouables.

### Git Intelligence Summary

- Commits recents observes:
  - `5ee1c9e Execute dev story workflow`
  - `856e87f Document sprint 4 4 updates`
  - `3eb7155 Clarify sprint review status`
  - `a517779 Run adversarial code review`
  - `9fbf1ab Document reservation story`
- Aucun commit recent n'indique une refonte deja en cours du moteur comptable Epic 6.
- Le document doit donc guider une implementation prudente basee sur l'etat courant du repo, pas sur une hypothese de chantier parallele invisible.

### Latest Tech Information

- Aucune recherche web technique additionnelle n'est requise pour cette story.
- Les versions verrouillees du repo sont suffisantes; le besoin critique est l'alignement du contrat d'idempotence et de double entree dans le code existant.

### Project Structure Notes

- Aucun `architecture.md` cible n'a ete trouve dans `/_bmad-output/planning-artifacts`; l'architecture de reference de cette story provient donc de `project-context.md` et du code reel du repo.
- Le projet reste en migration progressive vers NestJS + PostgreSQL + client API unifie.
- Cette story doit consolider la cible backend sans reintroduire un nouveau couplage metier au runtime Supabase.
- Les changements doivent preparer sans les casser les stories `6.3`, `6.4`, `6.5`, `6.6` et les besoins de reporting `9.1`.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [6-1-versionner-plan-comptable-et-mapping-ecritures.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-1-versionner-plan-comptable-et-mapping-ecritures.md)
- [ecritures-comptables.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/ecritures-comptables/ecritures-comptables.service.ts)
- [ecritures-comptables.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/ecritures-comptables/ecritures-comptables.controller.ts)
- [regles-comptables.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/regles-comptables/regles-comptables.service.ts)
- [reservations.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/reservations/reservations.service.ts)
- [engagements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.service.ts)
- [bons-commande.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/bons-commande/bons-commande.service.ts)
- [factures.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/factures/factures.service.ts)
- [depenses.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/depenses/depenses.service.ts)
- [paiements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/paiements/paiements.service.ts)
- [20251123151034_35fe2c6e-9a5b-4823-8eae-62ac5439f359.sql](/Volumes/mySD1.5/projects/agilys-spark-joy/supabase/migrations/20251123151034_35fe2c6e-9a5b-4823-8eae-62ac5439f359.sql)
- [20251123163342_73d29804-c176-435c-8d2f-288472f97974.sql](/Volumes/mySD1.5/projects/agilys-spark-joy/supabase/migrations/20251123163342_73d29804-c176-435c-8d2f-288472f97974.sql)
- [ecritures-comptables.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/ecritures-comptables.service.ts)
- [JournalComptable.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/JournalComptable.tsx)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Story context `6.2` cree avec focus sur le moteur de generation comptable existant et ses seams d'idempotence.
- Le document impose la reutilisation de `ecritures-comptables` comme facade backend commune plutot qu'une multiplication des checks locaux par domaine.
- Les guardrails couvrent double entree, idempotence, concurrence, securite multi-tenant, traçabilite et compatibilite avec les stories comptables suivantes.
- Aucune evolution de dependances ou retour vers un runtime Supabase n'est recommandee pour ce lot.

### File List

- `_bmad-output/implementation-artifacts/6-2-generer-ecritures-en-double-entree-idempotentes.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-03-07: Creation de la story context 6.2 avec cadrage complet du moteur d'ecritures, invariants d'equilibre, idempotence et points d'integration backend/frontend.
