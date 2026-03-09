# Story 6.6: Produire dossier de cloture et migration reconciliation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a auditeur,
I want disposer de preuves de cloture et migration,
so that la conformite soit verifiable.

## Acceptance Criteria

1. **Dossier de cloture consolide et exploitable**
   - **Given** une cloture d'exercice ou une reouverture gouvernee a ete executee
   - **When** le dossier est genere
   - **Then** il consolide checklist, preuves, decisions, journaux, ecarts et references des artefacts relies a la cloture
   - **And** chaque element du dossier reste rattache a l'exercice, au tenant, a l'auteur et a l'horodatage source.

2. **Reconciliation migration avant/apres incluse sans duplication**
   - **Given** un lot de migration ou un jeu de reconciliation associe au perimetre comptable est disponible
   - **When** le dossier est construit
   - **Then** il integre les rapports avant/apres, les anomalies, la decision Go/No-Go et les resolutions deja produites
   - **And** il reutilise les artefacts et moteurs de reconciliation existants au lieu de recalculer une logique divergente.

3. **Integrite verifiable du dossier et des pieces**
   - **Given** un dossier exportable est pret
   - **When** un auditeur ou un responsable controle son contenu
   - **Then** un manifeste verifiable reference les pieces, leur checksum, leur source et leur statut de couverture
   - **And** toute preuve critique manquante force un statut explicite de blocage ou de No-Go documente.

4. **Acces securise et isolation stricte du perimetre**
   - **Given** plusieurs tenants, exercices et dossiers coexistent
   - **When** un utilisateur consulte, prepare ou exporte un dossier
   - **Then** seules les preuves du tenant/exercice/lot autorise sont incluses
   - **And** la lecture/export respecte les permissions d'audit existantes sans bypass frontend ni acces direct base cote client.

5. **Generation performante et preparation des stories d'audit/reporting**
   - **Given** un perimetre standard de cloture ou de migration reconciliation
   - **When** la generation du dossier est declenchee
   - **Then** les livrables lisibles machine/humain sont produits dans l'enveloppe NFR cible avec structure stable
   - **And** la story prepare explicitement Epic 7/FR30 sans reimplementer un second systeme d'export d'audit.

## Tasks / Subtasks

- [x] Revalider le contrat story 6.6 contre `FR30`, `FR42`, `FR53`, `FR58`, `FR59`, `NFR3`, `NFR11`, `NFR13`, `NFR14`, `NFR15`, `NFR29`, `NFR34`, `NFR35` et les contraintes de migration du repo (NestJS source de verite, client API unifie, aucune nouvelle dependance runtime Supabase) (AC: 1, 2, 3, 4, 5)
- [x] Cartographier et reutiliser les briques deja presentes avant toute nouvelle abstraction:
  - [x] `backend/src/tresorerie/*`
  - [x] `backend/src/rapprochements-bancaires/*`
  - [x] `backend/src/operations-tresorerie/*`
  - [x] `backend/src/migration/lot-b/*`
  - [x] `scripts/build-migration-audit-dossier.mjs`
  - [x] `src/pages/app/ControleInterne.tsx`
  - [x] `src/pages/app/Tresorerie.tsx`
  - [x] `src/hooks/useTresorerie.ts`
  - [x] `src/hooks/useRapprochementsBancaires.ts`
  - [x] `src/services/api/rapprochements-bancaires.service.ts` (AC: 1, 2, 3, 4, 5)
- [x] Concevoir un modele canonique de dossier plutot que juxtaposer des exports heterogenes:
  - [x] type de dossier (`cloture_exercice`, `migration_reconciliation` ou equivalent documente)
  - [x] sections stables (`scope`, `decision_log`, `evidences`, `reconciliation`, `exceptions`, `signatures`, `manifest`)
  - [x] statut global (`ready`, `blocked`, `go`, `no_go`) derive des preuves et ecarts (AC: 1, 2, 3, 5)
- [x] Introduire une orchestration backend dediee pour assembler le dossier:
  - [x] agreger les artefacts issus de `6.4`, `6.5`, `M2.3`, `M4.2` et des journaux d'audit disponibles
  - [x] eviter toute logique critique d'assemblage cote React
  - [x] choisir un seam principal coherent avec le domaine existant (`tresorerie`/`cloture`) au lieu d'un endpoint parallele non aligne (AC: 1, 2, 3, 4, 5)
- [x] Reutiliser le moteur de reconciliation migration existant au lieu d'en creer un second:
  - [x] consommer les rapports `migration-reconciliation-*.json|csv|md` et le schema de sortie `backend/src/migration/lot-b/reconciliation.ts`
  - [x] relier anomalies, seuils et decision `GO`/`NO_GO` au dossier de cloture
  - [x] documenter clairement quand la story lit des preuves existantes vs quand elle regenere un artefact rejouable (AC: 2, 3, 5)
- [x] Reutiliser le pattern de packaging et d'integrite de `M4.2`:
  - [x] manifeste SHA-256 des pieces
  - [x] index de preuves/couverture
  - [x] archive structuree si un export ZIP est conserve
  - [x] aucune suppression destructive d'artefacts source (AC: 1, 2, 3)
- [x] Aligner le dossier de cloture avec les preuves et verrouillages de `6.4`:
  - [x] checklist pre-cloture validee
  - [x] journal des decisions de cloture/reouverture
  - [x] references aux preuves de verrouillage periode et preparation N+1
  - [x] ne pas recalculer ailleurs les preuves deja formalisees par `6.4` (AC: 1, 3, 5)
- [x] Aligner le dossier avec le rapprochement bancaire de `6.5`:
  - [x] ecarts qualifies
  - [x] decisions manuelles/automatiques
  - [x] operations non rapprochees residuelles
  - [x] compteurs de supervision et signaux utiles a l'audit (AC: 1, 2, 3, 5)
- [x] Exposer des contrats API/types explicites pour la consultation et la preparation d'export:
  - [x] DTO/query params pour identifier tenant, exercice, dossier cible, lot de migration ou plage
  - [x] types frontend pour sections de dossier, manifest entries, evidence coverage et decision log
  - [x] harmoniser les enums/statuts au lieu de litteraux disperses dans les composants (AC: 1, 3, 4, 5)
- [x] Integrer l'UX dans les surfaces audit existantes plutot qu'une page dissociee:
  - [x] etendre `ControleInterne` pour lecture/detail du dossier si la cible est orientee audit
  - [x] rebrancher `Tresorerie` ou `ExercicesManager` uniquement pour declenchement/contextualisation si necessaire
  - [x] afficher etat du dossier, preuves manquantes, decision finale et disponibilite de l'export de maniere actionnable (AC: 1, 3, 4, 5)
- [x] Garantir isolation et permissions:
  - [x] lecture et export sous `referentiels:audit:read`
  - [x] generation/rafraichissement sous permission existante ou extension explicite du systeme d'autorisations
  - [x] refus strict cross-tenant, cross-exercice ou lot incoherent avec payload d'erreur actionnable (AC: 4)
- [x] Ajouter les tests backend obligatoires:
  - [x] dossier cloture complet avec toutes preuves critiques presentes
  - [x] dossier bloque si preuve critique ou reconciliation requise manquante
  - [x] refus cross-tenant / exercice / lot
  - [x] checksum/manifeste deterministes
  - [x] performance et structure des sorties `md/json/(zip)` sur perimetre standard (AC: 1, 2, 3, 4, 5)
- [x] Ajouter les tests frontend / contrat cibles:
  - [x] restitution lisible du dossier, du manifest et des preuves manquantes
  - [x] affichage du statut `GO/NO_GO/blocked`
  - [x] message d'acces restreint sur absence de `referentiels:audit:read`
  - [x] non-regression des surfaces `ControleInterne`, `Tresorerie` et des hooks existants (AC: 4, 5)
- [x] Verifier explicitement qu'aucune nouvelle dependance runtime Supabase n'est introduite et que le lot reste conforme a `pnpm`, NestJS, PostgreSQL local et aux scripts/artefacts rejouables du repo (AC: 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.6).
- FR directes:
  - `FR53`: validation de migration legacy par reconciliation avant/apres des soldes comptables et statuts operationnels
  - `FR58`: dossier de cloture avec preuves et decisions
  - `FR59`: ouverture N+1 avec reprise controlee, a citer dans les preuves de cloture
  - `FR30`, `FR42`: export/piste d'audit exploitable pour inspection et audit externe
- NFR prioritaires:
  - `NFR3`, `NFR13`: generation/export dossier dans l'enveloppe attendue avec integrite verifiable
  - `NFR11`: historique non destructif
  - `NFR14`, `NFR15`: retention et conformite des preuves
  - `NFR29`, `NFR34`, `NFR35`: journal de cloture, dossier genere rapidement, exceptions/resolutions tracables

### Developer Context Section

- Le repo contient deja plusieurs pieces de la solution, mais pas encore un **dossier de cloture unifie**:
  - `6.4` a defini la checklist, le verrouillage de periode et la preparation des preuves de cloture;
  - `6.5` prepare la qualification des ecarts de rapprochement bancaire et la supervision utile au dossier;
  - `M2.3` a deja livre un moteur TypeScript de reconciliation avant/apres avec sorties `JSON/CSV/Markdown`;
  - `M4.2` a deja livre un pattern robuste de package d'audit avec index, evidence matrix, manifest SHA-256 et ZIP.
- Le vrai besoin de `6.6` n'est donc pas de reinventer un moteur d'audit, mais de **composer proprement**:
  - preuves de cloture d'exercice,
  - reconciliation migration liee au perimetre,
  - decisions/ecarts/resolutions,
  - packaging verifiable et exploitable par auditeur.
- Seams reels reperes dans le code:
  - `backend/src/tresorerie/tresorerie.controller.ts` expose deja `GET /tresorerie/exception-audit/export-prep`;
  - `src/pages/app/ControleInterne.tsx` est deja la surface read-only d'audit la plus naturelle;
  - `src/pages/app/Tresorerie.tsx` contient encore un placeholder sur l'onglet `Rapprochement`;
  - `backend/src/rapprochements-bancaires/*` et `src/hooks/useRapprochementsBancaires.ts` restent embryonnaires et devront etre enrichis sans changer de source de verite.

### Technical Requirements

- Backend
  - L'assemblage du dossier doit rester cote NestJS/script serveur; aucune composition critique ne doit etre laissee au client React.
  - Le systeme doit distinguer clairement:
    - collecte/lecture de preuves existantes,
    - regeneration deterministe d'un artefact si elle est requise,
    - packaging final verifiable.
  - Le manifeste doit porter source, checksum, auteur, horodatage, statut de couverture et lien logique avec l'AC/story.
  - Les erreurs doivent etre metier et actionnables: preuve critique absente, reconciliation manquante, dossier hors scope, acces refuse.
- Data / artefacts
  - Reutiliser les sorties et schemas existants avant d'introduire de nouvelles tables.
  - Si une persistence supplementaire est necessaire pour stocker un dossier assemble ou son manifest, la faire via migration SQL versionnee et rejouable.
  - Ne pas dupliquer le contenu des preuves source dans une table opaque si un referencement structure + package suffit.
- Frontend
  - Le front doit afficher les sections du dossier, les ecarts et la decision finale; il ne doit pas recalculer les checksums ni la couverture.
  - Les cles React Query et contrats API doivent rester coherents avec les hooks treasury/audit existants.
  - Les vues doivent etre lisibles pour un auditeur: liste des preuves, trous de couverture, decision, export disponible, detail par correlation/source.

### Architecture Compliance

- Respecter `JwtAuthGuard` et `AuthorizationPolicyGuard` pour toute lecture/export du dossier.
- Reutiliser la permission existante `referentiels:audit:read` pour la consultation; toute permission de generation supplementaire doit etre ajoutee explicitement au systeme d'autorisations existant.
- Garder le backend NestJS comme source de verite; ne pas reintroduire de runtime Supabase, Edge Functions ou acces direct base depuis le front.
- Preserver l'isolation stricte tenant/exercice/lot de migration deja imposee par les stories de migration et de tresorerie.
- Rester aligne sur la trajectoire du repo: artefacts versionnes sous `/_bmad-output/implementation-artifacts`, scripts rejouables, packaging verifiable.

### Library / Framework Requirements

Versions observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, React Hook Form `7.61.1`, Zod `3.25.76`.
- Backend: NestJS `10.4.22`, `pg` `8.19.0`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`.
- Package manager: `pnpm@9.12.0`.

Decision pour cette story:

- Aucun upgrade de dependances n'est requis.
- Reutiliser `node:crypto`, les scripts Node existants et les patterns de packaging deja livres par `M4.2` avant de considerer une nouvelle librairie d'archive ou de hashing.
- Aucune recherche web technique additionnelle n'est appliquee ici; les versions et patterns viennent des manifests et artefacts du repo conformement aux regles projet.

### File Structure Requirements

Points d'extension prioritaires:

- Backend
  - `backend/src/tresorerie/tresorerie.controller.ts`
  - `backend/src/tresorerie/tresorerie.service.ts`
  - `backend/src/tresorerie/dto/tresorerie.dto.ts`
  - `backend/src/rapprochements-bancaires/*`
  - `backend/src/migration/lot-b/reconciliation.ts`
  - `backend/src/migration/lot-b/reconciliation.cli.ts`
  - eventuellement un service/module de dossier de cloture si la logique devient trop dense pour `TresorerieService`
- Scripts / packaging
  - `scripts/build-migration-audit-dossier.mjs` comme reference directe pour manifeste, evidence matrix et ZIP
  - nouveau script/service seulement si l'assemblage dossier de cloture ne peut pas reutiliser ce pattern sans le polluer
- Frontend
  - `src/pages/app/ControleInterne.tsx`
  - `src/pages/app/Tresorerie.tsx`
  - `src/hooks/useTresorerie.ts`
  - `src/hooks/useRapprochementsBancaires.ts`
  - `src/services/api/rapprochements-bancaires.service.ts`
  - nouveaux composants sous `src/components/controle-interne/*` ou `src/components/tresorerie/*` si necessaire
- Artefacts
  - sorties attendues sous `/_bmad-output/implementation-artifacts/` avec nommage stable type `closeout-dossier-*` ou equivalent documente

Regles de structure:

- Etendre la surface audit/tresorerie existante plutot que creer un nouveau domaine UI deconnecte.
- Reutiliser le format de preuves/manifeste de `M4.2` et le format de reconciliation de `M2.3` au lieu de formats concurrents.
- Factoriser les types de sections/statuts du dossier pour eviter des litteraux disperses entre backend, frontend et scripts.

### Testing Requirements

1. Backend (obligatoire)
   - generation d'un dossier nominal de cloture avec preuves completes;
   - integration d'un rapport de reconciliation migration existant;
   - blocage explicite si preuve critique ou rapport requis manque;
   - refus cross-tenant / exercice / lot incoherent;
   - verification checksum/manifeste et stabilite des sorties.

2. Frontend / contrat (obligatoire)
   - affichage du dossier et de la decision finale;
   - rendu lisible des preuves manquantes/couverture;
   - message d'acces restreint si `referentiels:audit:read` absent;
   - non-regression des ecrans `ControleInterne` et `Tresorerie`.

3. Qualite transversale
   - `pnpm --dir backend run lint`
   - `pnpm --dir backend run test`
   - `pnpm run lint`
   - tests cibles sur le module/service de dossier, la lecture treasury audit et les scripts d'assemblage si un script est introduit.

### Previous Story Intelligence

- `6.4` a deja cadre les preuves a reutiliser:
  - checklist pre-cloture,
  - decisions de cloture/reouverture,
  - verrouillage de periode,
  - preparation N+1,
  - consigne explicite de preparer `6.6` sans regenerer ailleurs les memes preuves.
- `6.5` etend la matiere premiere du dossier:
  - rapprochements, ecarts qualifies, decisions manuelles et supervision treasury;
  - la story `6.6` doit donc **consommer** ces signaux, pas definir un autre systeme de reconciliation bancaire.
- `M2.3` impose un pattern utile:
  - moteur deterministe,
  - sorties `JSON/CSV/Markdown`,
  - decision `GO/NO_GO`,
  - CLI rejouable et tests de reproductibilite.
- `M4.2` apporte le pattern de packaging le plus proche:
  - `audit-index`,
  - `evidence-matrix`,
  - `sign-off`,
  - `manifest`,
  - `ZIP`,
  - hash SHA-256 et regle No-Go sur preuve critique absente.

### Git Intelligence Summary

- Commits recents observes:
  - `81c0705` Document disabled self-service sign
  - `8f7130b` Follow dev-story workflow steps
  - `4d56bb3` Summarize code review request
  - `5f7a90b` Generate code review title
  - `5ee1c9e` Execute dev story workflow
- Aucun commit recent n'indique qu'un vrai dossier de cloture Epic 6 est deja en cours d'implementation.
- Le lot doit donc partir des seams existants et des artefacts `M2.3` / `M4.2`, sans supposer une solution cachee.

### Latest Tech Information

- Aucune veille web technique externe n'est necessaire pour cette story.
- Les informations "latest" pertinentes ici sont deja dans le repo:
  - pattern de reconciliation deterministic/rejouable via `backend/src/migration/lot-b/reconciliation.ts`;
  - pattern d'audit package via `scripts/build-migration-audit-dossier.mjs`;
  - pattern d'audit read-only et d'export prep via `backend/src/tresorerie/*` et `src/pages/app/ControleInterne.tsx`.

### Project Structure Notes

- Aucun `architecture.md` exploitable n'a ete trouve dans `/_bmad-output/planning-artifacts`; l'architecture de reference provient donc du code reel, de `project-context.md` et des stories deja produites.
- Le projet reste hybride Vite/React + NestJS avec migration progressive hors Supabase. Cette story doit respecter cette trajectoire:
  - aucun nouvel appel metier direct a Supabase;
  - extension de la couche API existante;
  - logique critique centralisee au backend;
  - scripts/artefacts rejouables et archivables.
- Le principal ecart du repo pour cette story est clair:
  - il existe deja des preuves de cloture, d'exception audit et de reconciliation migration,
  - mais pas encore de **dossier unifie** reliant cloture d'exercice et reconciliation avant/apres dans un package exploitable par auditeur.
- Cette story doit donc unifier sans dupliquer: collecte de preuves, decision, integrite, packaging et surface de consultation.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [6-4-executer-cloture-dexercice-gouvernee.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-4-executer-cloture-dexercice-gouvernee.md)
- [6-5-implementer-rapprochement-bancaire-auto-manuel.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-5-implementer-rapprochement-bancaire-auto-manuel.md)
- [m2-3-reconciler-avant-apres-sur-donnees-critiques.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/m2-3-reconciler-avant-apres-sur-donnees-critiques.md)
- [m4-2-produire-le-dossier-daudit-de-migration.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/m4-2-produire-le-dossier-daudit-de-migration.md)
- [reconciliation.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/migration/lot-b/reconciliation.ts)
- [reconciliation.cli.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/migration/lot-b/reconciliation.cli.ts)
- [build-migration-audit-dossier.mjs](/Volumes/mySD1.5/projects/agilys-spark-joy/scripts/build-migration-audit-dossier.mjs)
- [tresorerie.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.controller.ts)
- [tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.service.ts)
- [rapprochements-bancaires.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/rapprochements-bancaires/rapprochements-bancaires.controller.ts)
- [rapprochements-bancaires.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/rapprochements-bancaires/rapprochements-bancaires.service.ts)
- [rapprochements-bancaires.dto.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/rapprochements-bancaires/dto/rapprochements-bancaires.dto.ts)
- [ControleInterne.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/ControleInterne.tsx)
- [Tresorerie.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Tresorerie.tsx)
- [useRapprochementsBancaires.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useRapprochementsBancaires.ts)
- [rapprochements-bancaires.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/rapprochements-bancaires.service.ts)
- [rapprochement-bancaire.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/types/rapprochement-bancaire.types.ts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`
- Validation executee:
  - `pnpm --dir backend test -- --runInBand src/tresorerie/tresorerie.service.spec.ts src/tresorerie/tresorerie.controller.spec.ts`
  - `pnpm --dir backend run lint`
  - `pnpm run lint`

### Completion Notes List

- Ajout d'une orchestration backend `closeout-dossier` dans `TresorerieService` avec sections canoniques (`scope`, `decisionLog`, `evidences`, `reconciliation`, `exceptions`, `manifest`) et statut global derive (`ready|blocked|go|no_go`).
- Reutilisation des artefacts existants M2.3/M4.2: lecture des rapports `migration-reconciliation-*.json|csv|md`, checksum SHA-256 des pieces, couverture des exigences critiques, decision `GO/NO_GO` sans moteur parallele.
- Renforcement isolation/permissions via endpoints `GET /tresorerie/closeout-dossier` et `GET /tresorerie/closeout-dossier/export-prep` sous `referentiels:audit:read`, avec scope explicite tenant/exercice/(lot).
- Extension front audit sur `ControleInterne` avec carte de synthese dossier de cloture (etat, couverture, decision reconciliation, preuves critiques manquantes) et hook/query dedies.
- Ajout/maj des tests backend (`tresorerie.service.spec.ts`, `tresorerie.controller.spec.ts`) et du contrat UI Playwright `tests/tresorerie-supervision-ui.spec.ts`.
- Correctifs post-review: verification stricte du scope tenant/exercice/lot des rapports de reconciliation, suppression des appels redondants pendant la generation du dossier, couverture manifeste corrigee (incluant exigences non critiques), enrichissement des metadonnees d evidence (scope/auteur/timestamp).
- Synchronisation du `File List` avec les fichiers applicatifs reellement modifies dans le lot pour restaurer la tracabilite d audit.

### File List

- `backend/src/tresorerie/dto/tresorerie.dto.ts`
- `backend/src/tresorerie/tresorerie.controller.ts`
- `backend/src/tresorerie/tresorerie.service.ts`
- `backend/src/tresorerie/tresorerie.controller.spec.ts`
- `backend/src/tresorerie/tresorerie.service.spec.ts`
- `src/types/tresorerie.types.ts`
- `src/services/api/tresorerie.service.ts`
- `src/hooks/useTresorerie.ts`
- `src/components/controle-interne/CloseoutDossierCard.tsx`
- `src/components/tresorerie/RapprochementBancaireDialog.tsx`
- `src/components/tresorerie/RapprochementBancaireWorkspace.tsx`
- `src/components/tresorerie/TresorerieSupervisionPanel.tsx`
- `src/pages/app/ControleInterne.tsx`
- `src/pages/app/Tresorerie.tsx`
- `src/pages/app/TresoreriePro.tsx`
- `tests/tresorerie-supervision-ui.spec.ts`
- `backend/src/rapprochements-bancaires/dto/rapprochements-bancaires.dto.ts`
- `backend/src/rapprochements-bancaires/rapprochement-matching.util.ts`
- `backend/src/rapprochements-bancaires/rapprochement-matching.util.spec.ts`
- `backend/src/rapprochements-bancaires/rapprochements-bancaires.controller.ts`
- `backend/src/rapprochements-bancaires/rapprochements-bancaires.service.ts`
- `backend/src/rapprochements-bancaires/rapprochements-bancaires.service.spec.ts`
- `src/hooks/useRapprochementsBancaires.ts`
- `src/services/api/rapprochements-bancaires.service.ts`
- `src/types/rapprochement-bancaire.types.ts`
- `tests/rapprochements-bancaires-client.spec.ts`
- `tests/rapprochements-bancaires-ui.spec.ts`
- `supabase/migrations/20260308110000_story_6_5_bank_reconciliation_workflow.sql`
- `_bmad-output/implementation-artifacts/6-6-produire-dossier-de-cloture-et-migration-reconciliation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-08: Creation de la story context 6.6 avec cadrage complet du dossier de cloture, de la reconciliation migration, du manifest verifiable et des surfaces audit/treasury a reutiliser.
- 2026-03-09: Implementation story 6.6: orchestration backend closeout dossier, endpoints audit/read-only, integration UI ControleInterne, couverture tests backend et contrat UI, statut passe a `review`.
- 2026-03-09: Revue senior (fix auto): correction couverture manifeste, validation stricte du scope reconciliation, reduction des requetes redondantes, enrichissement metadonnees d evidence, extension des tests backend et synchronisation complete du `File List`.

### Senior Developer Review (AI)

- Decision: **Approved after fixes**
- Findings HIGH/MEDIUM traites:
  - Couverture manifeste ajustee pour refléter l ensemble des exigences (critiques + non critiques).
  - Validation stricte du scope tenant/exercice/lot sur la reconciliation migration avant marquage `GO/NO_GO`.
  - Elimination des appels redondants supervision/reconciliation/audit pendant la generation du dossier.
  - Metadonnees d evidence enrichies (scope, auteur, timestamp source).
  - Mise a jour de la story pour aligner le `File List` sur les changements git reels.
- Verification:
  - Tests unitaires backend `TresorerieService` mis a jour avec cas de blocage sur scope incoherent et couverture manifeste.
