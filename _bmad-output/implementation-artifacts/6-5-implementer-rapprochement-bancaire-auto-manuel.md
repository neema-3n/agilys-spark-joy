# Story 6.5: Implementer rapprochement bancaire auto + manuel

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tresorier,
I want rapprocher les mouvements bancaires,
so that les ecarts soient qualifies et resolus rapidement.

## Acceptance Criteria

1. **Rapprochement automatique assiste avec propositions deterministes**
   - **Given** des operations internes de tresorerie et un releve bancaire sur une meme plage
   - **When** le moteur de rapprochement automatique est lance
   - **Then** il propose des correspondances deterministes et explicables selon des regles explicites (montant, date, reference, compte)
   - **And** il n'applique aucune validation irreversible sans confirmation ou regle metier autorisee.

2. **Rapprochement manuel assiste pour les cas ambigus**
   - **Given** des mouvements non apparies ou ambigus
   - **When** le tresorier ouvre le mode manuel
   - **Then** il peut selectionner, accepter, rejeter ou requalifier des paires/candidats avec aide contextuelle
   - **And** chaque action manuelle conserve auteur, horodatage, motif et etat precedent/suivant.

3. **Qualification structuree des ecarts et traitement des exceptions**
   - **Given** des ecarts persistent apres tentative auto ou manuelle
   - **When** le tresorier qualifie l'ecart
   - **Then** le systeme impose une categorie d'ecart et une trace exploitable (`timing`, `montant`, `reference`, `operation_manquante`, `anomalie_externe` ou equivalent documente)
   - **And** les ecarts restent visibles jusqu'a resolution avec audit trail complet.

4. **Isolation tenant/exercice et coherence avec la tresorerie existante**
   - **Given** plusieurs tenants, exercices et comptes de tresorerie coexistent
   - **When** des propositions ou validations de rapprochement sont generees
   - **Then** aucune operation hors tenant, hors exercice ou hors compte cible ne peut etre rapprochee
   - **And** le statut des operations de tresorerie et du rapprochement bancaire reste coherent sans double source de verite.

5. **Supervision, non-regression et preparation du reporting**
   - **Given** un rapprochement est valide, rejete ou laisse en ecart
   - **When** la supervision de tresorerie ou les futures stories de reporting consultent les donnees
   - **Then** les indicateurs d'operations non rapprochees, les ecarts qualifies et les decisions restent exploitables
   - **And** la story prepare explicitement `FR67` et les usages futurs de cloture/dossier d'audit sans dupliquer la logique ailleurs.

## Tasks / Subtasks

- [ ] Revalider le contrat de la story contre `FR51`, `FR67`, `NFR9`, `NFR24`, `NFR30`, ainsi que les contraintes de migration du repo (NestJS source de verite, client API unifie, aucune nouvelle dependance Supabase) (AC: 1, 2, 3, 4, 5)
- [ ] Cartographier et reutiliser les briques deja presentes avant toute nouvelle abstraction:
  - [ ] `backend/src/rapprochements-bancaires/*`
  - [ ] `backend/src/operations-tresorerie/*`
  - [ ] `backend/src/tresorerie/*`
  - [ ] `backend/src/cash-risk/*`
  - [ ] `src/services/api/rapprochements-bancaires.service.ts`
  - [ ] `src/services/api/operations-tresorerie.service.ts`
  - [ ] `src/hooks/useRapprochementsBancaires.ts`
  - [ ] `src/pages/app/Tresorerie.tsx`
  - [ ] `src/pages/app/TresoreriePro.tsx` (AC: 1, 2, 3, 4, 5)
- [ ] Etendre le backend au-dela du simple CRUD actuel de rapprochement:
  - [ ] introduire un workflow de propositions automatiques, validation assistee et qualification d'ecart
  - [ ] garder `RapprochementsBancairesService` comme seam principal ou extraire un sous-service dedie si la logique devient trop dense
  - [ ] eviter de disperser la logique de matching dans le frontend ou dans plusieurs endpoints non coherents (AC: 1, 2, 3, 4, 5)
- [ ] Concevoir un modele de rapprochement plus riche sans casser l'existant:
  - [ ] etendre `rapprochements_bancaires` si necessaire pour stocker source, mode (`auto`/`manuel`), statut detaille, score, motif de qualification et metadata d'audit
  - [ ] introduire, si necessaire, une table enfant pour les lignes/correspondances de rapprochement plutot que surcharger une ligne unique de synthese
  - [ ] garder des migrations SQL versionnees, rejouables et compatibles avec les donnees existantes (AC: 1, 2, 3, 4, 5)
- [ ] Implementer le moteur de suggestions automatiques cote backend:
  - [ ] partir des `operations_tresorerie` non rapprochees et des donnees du releve bancaire capturees par le workflow
  - [ ] appliquer des regles deterministes de matching (compte, date, montant, reference bancaire, type de flux)
  - [ ] expliciter les cas `match unique`, `match ambigu`, `pas de match` et ne jamais auto-valider un cas ambigu (AC: 1, 3, 4)
- [ ] Implementer le workflow manuel assiste:
  - [ ] permettre la selection/validation/rejet de candidats de rapprochement
  - [ ] imposer une qualification d'ecart quand aucun match n'est retenu
  - [ ] journaliser auteur, justification, horodatage et impact sur les operations concernees (AC: 2, 3, 4, 5)
- [ ] Aligner les operations de tresorerie avec l'etat de rapprochement:
  - [ ] reutiliser `operations_tresorerie.rapproche`, `statut = 'rapprochee'`, `date_rapprochement`
  - [ ] verifier qu'une meme operation ne peut pas etre rattachee a plusieurs rapprochements incompatibles
  - [ ] proteger toute transition par tenant/exercice/compte et eviter les mises a jour en masse non scopees (AC: 1, 2, 4)
- [ ] Etendre les contrats DTO/types front-back:
  - [ ] DTO NestJS pour lancer un rapprochement auto, soumettre une decision manuelle et qualifier un ecart
  - [ ] types frontend pour candidats, decisions, statuts detailes et categories d'ecart
  - [ ] harmoniser les enums/status au lieu de multiplier des litteraux dans les composants (AC: 1, 2, 3, 4)
- [ ] Construire l'interface de rapprochement dans la surface tresorerie existante plutot qu'une page parallele:
  - [ ] remplacer le placeholder actuel de l'onglet `Rapprochement` dans `src/pages/app/Tresorerie.tsx`
  - [ ] reutiliser TanStack Query + hooks existants pour fetch/mutations
  - [ ] presenter clairement propositions auto, decisions manuelles, ecarts qualifies et etat final sans faire porter les regles au client (AC: 1, 2, 3, 5)
- [ ] Mettre a jour la supervision de tresorerie et les signaux de reporting:
  - [ ] conserver ou enrichir `operations_non_rapprochees`
  - [ ] exposer des compteurs d'ecarts qualifies et de rapprochements en attente
  - [ ] preparer les besoins de `FR67` et du dossier d'audit sans implementer encore tout le reporting Epic 9 (AC: 3, 5)
- [ ] Ajouter les tests backend obligatoires:
  - [ ] propositions automatiques deterministes sur cas nominal
  - [ ] non-validation automatique des cas ambigus
  - [ ] refus cross-tenant / exercice / compte incoherent
  - [ ] prevention du double rapprochement d'une meme operation
  - [ ] journalisation et qualification obligatoires pour les decisions manuelles/ecarts (AC: 1, 2, 3, 4, 5)
- [ ] Ajouter les tests frontend / contrat cibles:
  - [ ] rendu de l'onglet rapprochement avec listes d'operations/candidats/ecarts
  - [ ] invalidation React Query coherente apres validation
  - [ ] messages utilisateur actionnables sur ambiguite, absence de match et erreur metier
  - [ ] non-regression de la page `Tresorerie` et des hooks existants (AC: 2, 3, 5)
- [ ] Verifier explicitement qu'aucune nouvelle dependance runtime Supabase n'est introduite et que le lot reste aligne sur `pnpm`, NestJS et PostgreSQL local (AC: 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 6, Story 6.5).
- FR directes:
  - `FR51`: rapprochement bancaire automatique et manuel assiste avec qualification des ecarts
  - `FR67`: rapport de rapprochement bancaire qualifiant les ecarts
- NFR prioritaires:
  - `NFR9`: journalisation des actions critiques
  - `NFR24`: idempotence des operations critiques
  - `NFR30`: resolution assistee des ecarts avec audit trail complet et suivi mensuel
- Dependances fonctionnelles utiles:
  - `6.2` pour la discipline idempotente/backend-first
  - `6.3` pour la logique d'audit et de correction non destructive
  - `6.4` pour le verrouillage de periode qui doit aussi couvrir les rapprochements sur exercice non modifiable.

### Developer Context Section

- Le repo contient deja une premiere brique `rapprochements-bancaires`, mais elle est insuffisante pour la story:
  - `backend/src/rapprochements-bancaires/rapprochements-bancaires.service.ts` calcule seulement un ecart global entre `solde_releve` et les operations internes;
  - `PATCH /rapprochements-bancaires/:id/valider` marque un rapprochement `valide` sans workflow de propositions, sans qualification detaillee des ecarts et sans saisie de decisions manuelles;
  - les types frontend `src/types/rapprochement-bancaire.types.ts` ne modelisent aujourd'hui qu'un objet de synthese (`en_cours | valide | annule`), pas des lignes candidates ou des ecarts qualifies.
- Les operations de tresorerie disposent deja de signaux reutilisables:
  - `operations_tresorerie` porte `rapproche`, `statut = 'rapprochee'`, `date_rapprochement`;
  - `OperationsTresorerieService.rapprocher` realise deja un update de masse qu'il faudra probablement raffiner pour eviter les rapprochements aveugles;
  - `TresorerieService` et `CashRiskService` calculent deja des compteurs d'operations non rapprochees, donc la story doit enrichir cette chaine plutot que la reimplementer.
- La surface frontend est prete pour extension:
  - `src/pages/app/Tresorerie.tsx` et `src/pages/app/TresoreriePro.tsx` exposent deja un onglet `Rapprochement`, actuellement placeholder;
  - `src/hooks/useRapprochementsBancaires.ts` gere deja query + mutations et invalidation React Query;
  - la bonne approche est d'etendre ces seams, pas de creer une seconde experience treasury parallele.

### Technical Requirements

- Backend
  - Le moteur de matching doit rester cote NestJS; aucune logique metier critique de rapprochement ne doit vivre dans le composant React.
  - Le matching automatique doit etre deterministe, explicable et idempotent sur un meme jeu d'entrees.
  - Les decisions manuelles doivent etre auditees et reliees aux operations ou lignes de releve concernees.
  - Les updates d'operations rapprochees doivent etre transactionnels pour eviter des etats partiellement appliques.
- Data / SQL
  - Une migration SQL versionnee est tres probable pour stocker les details de rapprochement, les decisions manuelles et la qualification des ecarts.
  - Eviter d'encoder des structures complexes en colonnes texte libres si une table relationnelle apporte une meilleure auditabilite.
  - Si des categories d'ecart sont introduites, elles doivent etre bornees et documentees, pas laissées en texte arbitraire sans garde-fou.
- Frontend
  - Le front consomme des endpoints explicites et affiche les explications de matching, les candidats et les motifs d'ecart.
  - Les formulaires de validation/qualification doivent suivre le pattern projet `React Hook Form + Zod` si un formulaire riche est introduit.
  - Les messages doivent rester actionnables: cas ambigu, aucune correspondance, operation deja rapprochee, exercice verrouille, compte incoherent.

### Architecture Compliance

- Respecter les guards existants `JwtAuthGuard` et `AuthorizationPolicyGuard` sur les endpoints de rapprochement.
- Reutiliser le systeme de permissions existant plutot qu'un bypass:
  - lecture via `referentiels:read`
  - ecriture via `referentiels:write`
- Si une permission plus fine est necessaire pour qualifier ou approuver un rapprochement, l'ajouter explicitement au systeme d'autorisation existant.
- Garder le backend NestJS comme source de verite; ne pas reintroduire de runtime Supabase, Edge Function ou acces direct base depuis le front.
- S'assurer que la story reste compatible avec le verrouillage de periode introduit par `6.4`; un rapprochement ne doit pas contourner les regles d'exercice.

### Library / Framework Requirements

Versions observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, React Hook Form `7.61.1`, Zod `3.25.76`.
- Backend: NestJS `10.4.22`, `pg` `8.19.0`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`.
- Package manager: `pnpm@9.12.0`.

Decision pour cette story:

- Aucun upgrade de dependances n'est requis.
- Le risque principal n'est pas technique mais fonctionnel: le repo a un embryon de rapprochement, pas encore le workflow auto + manuel assiste demande par le PRD.

### File Structure Requirements

Points d'extension prioritaires:

- Backend
  - `backend/src/rapprochements-bancaires/rapprochements-bancaires.service.ts`
  - `backend/src/rapprochements-bancaires/rapprochements-bancaires.controller.ts`
  - `backend/src/rapprochements-bancaires/dto/rapprochements-bancaires.dto.ts`
  - `backend/src/operations-tresorerie/operations-tresorerie.service.ts`
  - `backend/src/tresorerie/tresorerie.service.ts`
  - `backend/src/cash-risk/cash-risk.service.ts`
  - eventuellement un sous-module/service de matching si l'orchestration devient trop lourde pour le service actuel
- Frontend
  - `src/pages/app/Tresorerie.tsx`
  - `src/pages/app/TresoreriePro.tsx`
  - `src/hooks/useRapprochementsBancaires.ts`
  - `src/services/api/rapprochements-bancaires.service.ts`
  - `src/services/api/operations-tresorerie.service.ts`
  - `src/types/rapprochement-bancaire.types.ts`
  - nouveaux composants treasury dedies si necessaire, idealement sous `src/components/tresorerie/*`
- Database / migrations
  - nouvelle migration versionnee dans `supabase/migrations/*` pour le modele detaille de rapprochement si requis.

Regles de structure:

- Etendre la surface treasury existante plutot que creer un nouveau domaine "rapprochement" deconnecte.
- Factoriser les statuts et categories de rapprochement dans des types partages au lieu de litteraux disperses.
- Eviter tout couplage direct composant -> logique de matching; les composants ne doivent orchestrer que l'affichage et la soumission de decisions.

### Testing Requirements

1. Backend (obligatoire)
   - suggestions auto sur cas simple `1 pour 1`;
   - cas ambigu qui reste en attente de decision manuelle;
   - prevention du double rapprochement;
   - refus cross-tenant / exercice / compte;
   - journalisation des qualifications et validations manuelles;
   - respect du verrouillage de periode si `6.4` est deja applique.

2. Frontend / contrat (obligatoire)
   - affichage de l'onglet rapprochement avec etats utiles;
   - invalidation cache React Query apres creation/validation;
   - erreurs metier actionnables;
   - non-regression des onglets `Comptes`, `Operations`, `Supervision`.

3. Qualite transversale
   - `pnpm --dir backend run lint`
   - `pnpm --dir backend run test`
   - `pnpm run lint`
   - tests cibles sur tresorerie, rapprochements bancaires et supervision.

### Previous Story Intelligence

- `6.1` a etabli la gouvernance backend-first et le versioning explicite sur la couche comptable.
- `6.2` a impose l'idempotence et des contrats tests autour des operations comptables critiques; le rapprochement doit suivre la meme discipline.
- `6.3` a renforce l'audit trail et les corrections non destructives; les decisions de rapprochement doivent donc etre tracables et reversibles par workflow, pas par edition silencieuse.
- `6.4` a pose la logique de verrouillage d'exercice et de checklist; `6.5` doit s'y brancher, pas l'ignorer.

### Git Intelligence Summary

- Commits recents observes:
  - `81c0705 Document disabled self-service sign`
  - `8f7130b Follow dev-story workflow steps`
  - `4d56bb3 Summarize code review request`
  - `5f7a90b Generate code review title`
  - `5ee1c9e Execute dev story workflow`
- Aucun commit recent n'indique qu'un vrai moteur de rapprochement auto + manuel est deja en cours.
- Le lot doit donc partir des seams existants sans supposer une implementation cachee ailleurs.

### Latest Tech Information

- Aucune recherche web technique additionnelle n'est necessaire pour cette story.
- Les versions observees dans `package.json` et `backend/package.json` couvrent les besoins; le gap est un gap de domaine et d'orchestration, pas d'API framework obsolete.

### Project Structure Notes

- Aucun `architecture.md` exploitable n'a ete trouve dans `/_bmad-output/planning-artifacts`; la base d'architecture provient donc du code reel, de `project-context.md` et des stories Epic 6 deja creees.
- Le projet reste hybride Vite/React + NestJS, avec migration progressive hors Supabase. Cette story doit respecter cette trajectoire:
  - aucun nouvel appel metier direct a Supabase;
  - extension de la couche API existante;
  - logique critique centralisee au backend.
- Le principal ecart du repo pour cette story est clair:
  - le domaine `rapprochements-bancaires` existe deja mais ne fait qu'un calcul global de solde/ecart;
  - l'UI treasury n'a encore aucun vrai ecran de rapprochement;
  - les operations de tresorerie savent etre marquees `rapprochee`, mais sans workflow detaille de proposition/qualification.
- Cette story doit donc transformer un CRUD minimal en vrai workflow assiste, sans repartir de zero et sans casser la supervision existante.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [6-2-generer-ecritures-en-double-entree-idempotentes.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-2-generer-ecritures-en-double-entree-idempotentes.md)
- [6-3-gerer-corrections-et-contre-passations-auditables.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-3-gerer-corrections-et-contre-passations-auditables.md)
- [6-4-executer-cloture-dexercice-gouvernee.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-4-executer-cloture-dexercice-gouvernee.md)
- [rapprochements-bancaires.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/rapprochements-bancaires/rapprochements-bancaires.service.ts)
- [rapprochements-bancaires.controller.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/rapprochements-bancaires/rapprochements-bancaires.controller.ts)
- [rapprochements-bancaires.dto.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/rapprochements-bancaires/dto/rapprochements-bancaires.dto.ts)
- [operations-tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/operations-tresorerie/operations-tresorerie.service.ts)
- [tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.service.ts)
- [cash-risk.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/cash-risk/cash-risk.service.ts)
- [useRapprochementsBancaires.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useRapprochementsBancaires.ts)
- [rapprochements-bancaires.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/rapprochements-bancaires.service.ts)
- [operations-tresorerie.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/operations-tresorerie.service.ts)
- [rapprochement-bancaire.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/types/rapprochement-bancaire.types.ts)
- [operation-tresorerie.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/types/operation-tresorerie.types.ts)
- [Tresorerie.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/Tresorerie.tsx)
- [TresoreriePro.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/TresoreriePro.tsx)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Completion Notes List

- Story context `6.5` cree avec focus sur le vrai gap du repo: un CRUD minimal de rapprochement bancaire existe deja, mais pas encore le workflow auto + manuel assiste requis par le PRD.
- Le document impose de reutiliser `rapprochements-bancaires`, `operations-tresorerie`, `tresorerie` et l'onglet treasury existant au lieu de reconstruire un domaine parallele.
- Les guardrails couvrent matching deterministe, decisions manuelles auditees, qualification des ecarts, isolation tenant/exercice/compte, coherence avec `6.4` et preparation de `FR67`.
- Aucune evolution de dependances n'est recommandee; le lot est surtout une extension d'orchestration et de modele de donnees.
- Le fichier `validate-workflow.xml` reference par le workflow BMAD n'est pas present dans le repo; la validation a donc ete faite manuellement contre le checklist et les artefacts sources.

### File List

- `_bmad-output/implementation-artifacts/6-5-implementer-rapprochement-bancaire-auto-manuel.md`
