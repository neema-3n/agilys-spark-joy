# Story 7.3: Produire dossier d'audit exportable

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a auditeur,
I want exporter un dossier d'audit complet,
so that l'inspection externe soit facilitee.

## Acceptance Criteria

1. **Dossier d'audit structure et consultable**
   - **Given** une plage temporelle ou un dossier cible appartenant au tenant/exercice courant
   - **When** l'utilisateur prepare puis declenche l'export
   - **Then** un dossier structure est produit avec au minimum index, timeline, preuves, decisions, meta de scope et references des artefacts sources
   - **And** chaque element du dossier reste rattachable a son correlationId, son auteur et son horodatage source.

2. **Packaging verifiable PDF/ZIP sans reinvention**
   - **Given** les donnees d'audit et preuves necessaires sont disponibles
   - **When** le package est construit
   - **Then** un livrable exportable coherent est genere en reutilisant les briques de packaging, de manifeste et de checksum deja presentes dans le repo
   - **And** le systeme n'introduit pas une seconde filiere d'export concurrente pour la meme preuve.

3. **Couverture des preuves et tracabilite explicites**
   - **Given** des journaux d'audit, details d'exception, traces budgetaires et artefacts lies au perimetre
   - **When** le dossier est assemble
   - **Then** chaque preuve est reliee a une section/objectif du dossier avec statut (`covered`, `partial`, `missing` ou equivalent documente)
   - **And** toute preuve critique manquante est visible dans l'index et le manifeste avec justification actionnable.

4. **Permissions et isolation strictes**
   - **Given** plusieurs tenants, exercices et dossiers coexistent
   - **When** un utilisateur consulte, prepare ou exporte un dossier d'audit
   - **Then** seules les donnees du tenant/exercice autorise sont incluses
   - **And** la lecture/export applique les guards JWT + autorisation existants, sans acces direct base depuis le frontend.

5. **UX exploitable et performance ciblees**
   - **Given** un auditeur utilise les surfaces `ControleInterne` ou assimilables
   - **When** il filtre, previsualise ou exporte le dossier
   - **Then** l'interface expose clairement loading, empty, error, disponibilite de l'export et lacunes de couverture
   - **And** la preparation/export respecte l'enveloppe NFR du produit pour un perimetre standard, sans waterfall front fragile.

## Tasks / Subtasks

- [ ] Revalider la story contre `FR30`, `FR32`, `FR42`, `FR67`, `FR70`, `NFR3`, `NFR8`, `NFR9`, `NFR11`, `NFR13`, `NFR14`, `NFR15`, `NFR34`, `NFR35`, ainsi que les regles projet (`NestJS` source de verite, `React Query`, client API unifie, aucune nouvelle dependance runtime Supabase) (AC: 1, 2, 3, 4, 5)
- [ ] Cartographier les briques existantes a reutiliser avant toute nouvelle abstraction:
  - [ ] `backend/src/tresorerie/tresorerie.controller.ts`
  - [ ] `backend/src/tresorerie/tresorerie.service.ts`
  - [ ] `backend/src/tresorerie/dto/tresorerie.dto.ts`
  - [ ] `src/services/api/tresorerie.service.ts`
  - [ ] `src/hooks/useTresorerie.ts`
  - [ ] `src/pages/app/ControleInterne.tsx`
  - [ ] `src/components/controle-interne/ExceptionAuditTable.tsx`
  - [ ] `src/components/controle-interne/ExceptionAuditDetail.tsx`
  - [ ] `src/lib/export-utils.ts`
  - [ ] `scripts/build-migration-audit-dossier.mjs`
  - [ ] `backend/src/budget-referentiels/budget-referentiels.controller.ts`
  - [ ] `backend/src/exercice-cloture/exercice-cloture.service.ts` (AC: 1, 2, 3, 4, 5)
- [ ] Definir un modele canonique de dossier d'audit exportable plutot qu'une juxtaposition d'exports:
  - [ ] sections minimales `scope`, `timeline`, `decision_log`, `evidences`, `coverage`, `manifest`, `deliverables`
  - [ ] statut global du dossier (`ready`, `blocked`, `go`, `no_go` ou equivalent documente)
  - [ ] convention stable de nommage des livrables et des entrees de manifeste (AC: 1, 2, 3, 5)
- [ ] Etendre le backend d'audit existant au lieu de creer un domaine parallele:
  - [ ] conserver `tresorerie` comme seam principal pour lecture/detail/export-prep si cela couvre le besoin
  - [ ] ajouter un endpoint de generation/assemblage seulement si `export-prep` ne suffit pas
  - [ ] laisser l'agregation sensible et le calcul de couverture cote backend/script serveur, jamais dans le JSX (AC: 1, 2, 3, 4, 5)
- [ ] Reutiliser explicitement le pattern `M4.2` pour le packaging:
  - [ ] index de dossier
  - [ ] matrice de preuves/couverture
  - [ ] manifeste SHA-256
  - [ ] archive ZIP structuree
  - [ ] decision explicite si preuves critiques manquantes (AC: 2, 3, 5)
- [ ] Evaluer la strategie PDF sans supposer une librairie absente:
  - [ ] verifier si le besoin fonctionnel peut etre satisfait par un index HTML/printable + ZIP dans un premier temps
  - [ ] n'introduire une vraie generation PDF que si le besoin est explicite et couvert par une solution compatible avec le repo
  - [ ] documenter clairement l'ecart entre "exportable PDF/ZIP" du PRD et la capacite actuelle de `src/lib/export-utils.ts` (AC: 1, 2, 5)
- [ ] Consolider les preuves a inclure sans duplicer la logique source:
  - [ ] journal `exception-audit`
  - [ ] detail `exception-audit/detail`
  - [ ] preparation `exception-audit/export-prep`
  - [ ] traces budgetaires via `budget-referentiels/audit-log` si pertinentes
  - [ ] preuves de cloture/reconciliation deja structurees par `6.6`, `6.5` et `M4.2` lorsque le perimetre les croise (AC: 1, 2, 3, 5)
- [ ] Definir des types/DTO explicites pour le dossier:
  - [ ] query params de scope (`tenant`, `exercice`, `fromDate`, `toDate`, `sourceType`, `sourceId`, `entityId`, `correlationId` ou dossier cible)
  - [ ] types pour `audit dossier summary`, `timeline item`, `evidence entry`, `coverage entry`, `manifest entry`, `delivery`
  - [ ] harmonisation des enums/statuts entre backend, frontend et artefacts exportes (AC: 1, 3, 4, 5)
- [ ] Integrer l'UX dans la surface audit existante:
  - [ ] etendre `ControleInterne` avec une preparation/export du dossier et une lecture de couverture
  - [ ] reutiliser `ExceptionAuditTable` et le detail comme point d'entree vers le dossier plutot qu'une nouvelle page de zero
  - [ ] afficher les preuves manquantes, la decision du dossier et la disponibilite des livrables de facon actionnable (AC: 1, 3, 4, 5)
- [ ] Garantir isolation et permissions:
  - [ ] `JwtAuthGuard` + `AuthorizationPolicyGuard`
  - [ ] permission `referentiels:audit:read` pour lecture/export
  - [ ] verifier si une permission de generation distincte est necessaire et l'ajouter proprement au modele d'autorisations si oui
  - [ ] refuser strictement tout scope cross-tenant ou exercice absent/incoherent (AC: 4)
- [ ] Ajouter les tests backend obligatoires:
  - [ ] payload `export-prep` enrichi ou nouveau dossier nominal complet
  - [ ] detail de couverture et manifeste deterministes
  - [ ] blocage/flag explicite si preuve critique manquante
  - [ ] refus cross-tenant / exercice invalide / permission absente
  - [ ] verification structure des sorties `json/md/zip` et cible de performance sur perimetre standard (AC: 1, 2, 3, 4, 5)
- [ ] Ajouter les tests frontend / contrat cibles:
  - [ ] rendu de la preparation du dossier et des etats loading/empty/error
  - [ ] message d'acces restreint si `referentiels:audit:read` absent
  - [ ] alignement filtres ecran -> dossier exporte
  - [ ] non-regression de `ControleInterne`, `useTresorerie` et du pattern de listes/filtres existant (AC: 4, 5)
- [ ] Verifier explicitement qu'aucune nouvelle dependance runtime Supabase ni aucune nouvelle librairie d'export/archive n'est introduite sans justification forte et compatibilite prouvee avec le stack existant (AC: 2, 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 7, Story 7.3).
- FR directes:
  - `FR30`: dossier d'audit exportable structure avec preuves et timeline
  - `FR32`: historique non destructif et double temporalite
  - `FR42`: traces necessaires aux inspections et audits externes
  - `FR67`: rapport de rapprochement et ecarts qualifies, utile comme source de preuve
  - `FR70`: dossier de depense unifie avec preuves exportables, a ne pas contredire par un format concurrent
- NFR prioritaires:
  - `NFR3`, `NFR34`: generation/export dans un temps acceptable sur perimetre standard
  - `NFR8`, `NFR9`: controles d'acces et journalisation
  - `NFR11`, `NFR13`, `NFR14`, `NFR15`: historique, integrite, retention et conformite des preuves
  - `NFR35`: ecarts et resolutions tracables.

### Developer Context Section

- Le repo possede deja le squelette fonctionnel d'un dossier d'audit, mais il est disperse:
  - [`TresorerieController`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.controller.ts) expose deja `GET /tresorerie/exception-audit`, `detail` et `export-prep`.
  - [`TresorerieService`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/tresorerie/tresorerie.service.ts) sait deja filtrer, paginer, enrichir les exceptions avec `approvers`, `snapshot`, `votes`, `events` et generer un payload de preparation d'export.
  - [`ControleInterne.tsx`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/pages/app/ControleInterne.tsx) est deja la surface UI la plus naturelle pour la lecture d'audit; elle consomme `useExceptionAudit` et `useExceptionAuditDetail` mais pas encore l'export.
  - [`build-migration-audit-dossier.mjs`](/Volumes/mySD1.5/projects/agilys-spark-joy/scripts/build-migration-audit-dossier.mjs) a deja resolu l'index, la matrice de preuves, le manifeste SHA-256 et le ZIP pour `M4.2`.
- Le besoin de `7.3` n'est donc pas de creer "un export audit from scratch", mais de composer proprement:
  - sources d'audit transactionnel deja exposees,
  - preuve/couverture/manifeste deja industrialises en `M4.2`,
  - surfaces UI d'audit deja presentes.
- Risques majeurs a eviter:
  - dupliquer la logique de packaging de `M4.2`,
  - reimplementer les filtres d'audit cote front au lieu de reutiliser `tresorerie.service.ts`,
  - promettre un vrai PDF alors que [`exportBudgetToPDF`](/Volumes/mySD1.5/projects/agilys-spark-joy/src/lib/export-utils.ts) n'est aujourd'hui qu'un wrapper d'impression navigateur,
  - perdre l'isolation tenant/exercice lors de l'assemblage du dossier.

### Technical Requirements

- Backend / orchestration
  - Le backend doit rester source de verite pour le scope du dossier, la timeline, la couverture et le manifeste.
  - Si `export-prep` evolue, il doit retourner des metadonnees directement exploitables pour assembler le dossier sans recalcul cote React.
  - Si un nouvel endpoint est ajoute, il doit rester dans le domaine audit/tresorerie existant ou etre extrait en service partage clairement rattache, pas dans une route opportuniste de reporting.
- Packaging / integrite
  - Reutiliser `node:crypto`, les conventions de nommage et le pattern de checksum de `M4.2`.
  - Le manifeste doit porter source, checksum, statut de couverture, auteur et horodatage quand disponibles.
  - Toute preuve critique absente doit forcer un statut visible (`blocked` ou `no_go`) au niveau dossier.
- Frontend
  - React Query reste la couche de fetch/cache; pas d'appel manuel `fetch` disperse depuis les composants.
  - Les erreurs doivent transiter par `requestJson` / `ApiError`.
  - L'UX doit afficher au minimum: scope du dossier, nombre d'elements couverts/manquants, disponibilite du package, raison de blocage si applicable.
- PDF / ZIP
  - Le repo dispose d'une vraie logique ZIP cote Node/script, pas d'une vraie generation PDF cote front.
  - Inference a partir du code: pour etre coherent avec l'etat actuel du repo, il est plus sur de cibler d'abord `Markdown/JSON/ZIP` et d'encadrer explicitement la strategie PDF plutot que de supposer une librairie inexistante.

### Architecture Compliance

- Regles de [`project-context.md`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md) a respecter:
  - aucune nouvelle dependance runtime Supabase
  - toute logique metier critique cote NestJS/script serveur
  - client API unifie + React Query cote front
  - reutilisation avant creation.
- Les endpoints d'audit existants appliquent deja [`JwtAuthGuard`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/jwt-auth.guard.ts), [`AuthorizationPolicyGuard`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/auth/authorization-policy.guard.ts) et `referentiels:audit:read`; toute extension doit suivre exactement le meme pattern.
- [`budget-referentiels.controller.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/budget-referentiels/budget-referentiels.controller.ts) expose aussi `GET /budget-referentiels/audit-log`; cette source doit etre evaluee pour le dossier plutot que contournee.
- [`exercice-cloture.service.ts`](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/exercice-cloture/exercice-cloture.service.ts) produit deja des items de blocage avec preuves; ces patterns sont a reutiliser pour la section coverage/gaps du dossier.

### Library / Framework Requirements

Versions observees localement:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, Recharts `2.15.4`.
- Backend: NestJS `10.4.22`, `pg` `8.19.0`, `class-validator` `0.14.4`.
- Package manager: `pnpm@9.12.0`.

Veille technique utile:

- TanStack Query est bien en ligne `v5`; rester sur les patterns `queryKey` stables et eviter les waterfalls inutiles. Source: [TanStack Query v5 docs](https://tanstack.com/query/v5).
- La documentation NestJS officielle confirme l'usage des guards pour l'autorisation par route; cela est aligne avec le pattern deja applique dans `TresorerieController`. Source: [NestJS Guards](https://docs.nestjs.com/guards), [NestJS Authorization](https://docs.nestjs.com/security/authorization).
- Recharts `3.x` a introduit des ruptures, notamment sur l'accessibilite active par defaut; le repo restant en `2.15.4`, ne pas supposer des APIs `3.x` si une visualisation de couverture/timeline est ajoutee. Sources: [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide), [Recharts accessibility wiki](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility).

Decision pour cette story:

- Aucun upgrade de dependance n'est requis.
- Reutiliser les primitives existantes du repo et les scripts Node deja presents.
- Toute proposition de vraie generation PDF doit etre justifiee par un besoin fonctionnel explicite et une compatibilite prouvee avec les versions courantes du repo.

### File Structure Requirements

Points d'extension prioritaires:

- Backend
  - `backend/src/tresorerie/tresorerie.controller.ts`
  - `backend/src/tresorerie/tresorerie.service.ts`
  - `backend/src/tresorerie/dto/tresorerie.dto.ts`
  - eventuellement un service partage d'assemblage de dossier si la logique devient trop volumineuse pour `TresorerieService`
- Frontend
  - `src/services/api/tresorerie.service.ts`
  - `src/hooks/useTresorerie.ts`
  - `src/pages/app/ControleInterne.tsx`
  - `src/components/controle-interne/ExceptionAuditTable.tsx`
  - `src/components/controle-interne/ExceptionAuditDetail.tsx`
  - eventuellement un composant dedie `AuditDossierPanel` ou hook `useAuditDossier` si la reutilisation le justifie
- Scripts / artefacts
  - `scripts/build-migration-audit-dossier.mjs` comme reference directe pour packaging et integrite
  - nouvelles sorties d'artefacts sous `/_bmad-output/implementation-artifacts/` avec convention stable documentee

Regles de structure:

- Etendre la surface `ControleInterne` plutot que creer une nouvelle page audit concurrente.
- Garder le mapping API, la couverture et le packaging hors des composants de presentation.
- Factoriser les types du dossier plutot que multiplier des litteraux entre backend, frontend et scripts.

### Testing Requirements

1. Backend
   - test nominal de preparation/assemblage d'un dossier d'audit complet;
   - test de couverture avec preuve critique manquante et statut explicite;
   - test de refus cross-tenant / exercice absent / permission absente;
   - test de stabilite du manifeste et des checksums;
   - test de structure des livrables `json/md/zip`.

2. Frontend / contrat
   - test de rendu de la preparation du dossier et de ses etats `loading`, `empty`, `error`;
   - test d'acces restreint sans `referentiels:audit:read`;
   - test d'alignement entre filtres actifs et scope du dossier prepare;
   - non-regression des composants `ExceptionAuditTable` / `ExceptionAuditDetail`.

3. Verification transversale
   - `pnpm --dir backend run lint`
   - `pnpm --dir backend run test`
   - `pnpm run lint`
   - tests cibles du module d'assemblage ou du script de packaging si ajoute.

### Previous Story Intelligence

- [`7-2-fournir-vues-danalyse-et-axes-analytiques.md`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/7-2-fournir-vues-danalyse-et-axes-analytiques.md) a deja formalise une regle cle: ne pas dupliquer les agregations et garder la logique sensible cote backend.
- [`6-6-produire-dossier-de-cloture-et-migration-reconciliation.md`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/6-6-produire-dossier-de-cloture-et-migration-reconciliation.md) a deja pose le pattern fonctionnel le plus proche pour un dossier consolide:
  - sections stables;
  - reuse des preuves existantes;
  - manifeste/checksum;
  - statut `GO/NO_GO` ou `blocked`.
- [`M4.2`](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/m4-2-produire-le-dossier-daudit-de-migration.md) est la reference technique la plus directe pour:
  - index,
  - evidence matrix,
  - sign-off,
  - manifest,
  - ZIP,
  - checksum SHA-256,
  - regle No-Go en cas de preuve critique absente.
- Inference a partir des commits recents:
  - le repo avance story par story via contextes `ready-for-dev` et lots atomiques;
  - `7.3` doit donc rester un lot d'extension coherent autour du domaine audit existant, pas un refactor transverse.

### Git Intelligence Summary

- Commits recents observes:
  - `25098ba` Review backend parametres updates
  - `c6d8679` Document story 7.2 ready for dev
  - `4b83ba1` Add dashboard budgetaire story
  - `40eb40a` Perform adversarial code review
  - `81e450b` Summarize sprint status
- Tendance utile:
  - les stories Epic 7 sont actuellement documentees avant implementation;
  - la priorite immediate est de produire un contexte dev precis, pas de refondre l'architecture;
  - garder le lot focalise sur l'audit exportable et la reutilisation des seams existants.

### Latest Tech Information

- TanStack Query `v5` reste la reference officielle pour les patterns de query et de cache utilises par le repo. Source: [TanStack Query v5 docs](https://tanstack.com/query/v5).
- NestJS recommande l'usage declaratif des guards pour l'autorisation par route; c'est exactement le pattern en place sur les endpoints `tresorerie` d'audit. Source: [NestJS Guards](https://docs.nestjs.com/guards), [NestJS Authorization](https://docs.nestjs.com/security/authorization).
- Recharts `3.x` change certaines hypotheses d'accessibilite; comme le repo est en `2.15.4`, toute timeline graphique eventuelle doit rester compatible `2.x`. Sources: [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide), [Recharts accessibility wiki](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility).

### Project Context Reference

- Document de reference: `/_bmad-output/project-context.md`.
- Regles critiques appliquees a `7.3`:
  - pas de nouvelle dependance runtime Supabase,
  - logique sensible cote backend,
  - client API unifie + React Query,
  - reutilisation avant creation,
  - tests et lint propres avant fin de lot.

### Story Completion Status

- Story context generee pour execution `dev-story`.
- Statut story cible: `ready-for-dev`.
- Note de completion: `Ultimate context engine analysis completed - comprehensive developer guide created`.

### References

- `/_bmad-output/planning-artifacts/epics.md` (Epic 7 / Story 7.3)
- `/_bmad-output/planning-artifacts/prd.md` (`FR30`, `FR32`, `FR42`, `FR67`, `FR70`)
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/_bmad-output/project-context.md`
- `/_bmad-output/implementation-artifacts/7-2-fournir-vues-danalyse-et-axes-analytiques.md`
- `/_bmad-output/implementation-artifacts/6-6-produire-dossier-de-cloture-et-migration-reconciliation.md`
- `/_bmad-output/implementation-artifacts/m4-2-produire-le-dossier-daudit-de-migration.md`
- `/backend/src/tresorerie/tresorerie.controller.ts`
- `/backend/src/tresorerie/tresorerie.service.ts`
- `/backend/src/tresorerie/tresorerie.service.spec.ts`
- `/src/services/api/tresorerie.service.ts`
- `/src/hooks/useTresorerie.ts`
- `/src/pages/app/ControleInterne.tsx`
- `/src/components/controle-interne/ExceptionAuditTable.tsx`
- `/src/lib/export-utils.ts`
- `/scripts/build-migration-audit-dossier.mjs`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- create-story workflow execute pour `7-3-produire-dossier-daudit-exportable`
- contexte charge: `epics.md`, `prd.md`, `project-context.md`, `sprint-status.yaml`, stories `7.2`, `6.6`, `M4.2`
- analyse des seams reels backend/frontend d'audit (`tresorerie`, `ControleInterne`, `export-utils`, packaging `M4.2`)
- veille technique officielle ciblee sur TanStack Query, NestJS guards/authorization et compatibilite Recharts 2.x/3.x

### Completion Notes List

- Story `7.3` creee avec contexte implementation complet et guardrails de reutilisation.
- Les seams concrets backend/frontend et les limites actuelles du repo sur le PDF ont ete explicites.
- Le pattern `M4.2` est designe comme reference obligatoire pour packaging, checksum et ZIP.
- La story est prete pour execution `dev-story` avec statut `ready-for-dev`.

### File List

- `/_bmad-output/implementation-artifacts/7-3-produire-dossier-daudit-exportable.md`
- `/_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-09: creation du contexte story `7.3` (ready-for-dev) avec exigences de dossier d'audit exportable, packaging verifiable, permissions strictes et reutilisation des patterns `6.6` / `M4.2`.
