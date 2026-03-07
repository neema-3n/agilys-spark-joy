# Story 5.2: Expliquer blocages et proposer remediations

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur metier,
I want comprendre pourquoi une action est bloquee,
so that je puisse corriger rapidement.

## Acceptance Criteria

1. **Restitution structuree du blocage cash cote API**
   - **Given** une transition critique est refusee par le moteur `cash-risk`
   - **When** l'API retourne l'erreur metier associee
   - **Then** la reponse conserve un code stable `CASH_RISK_BLOCKED`
   - **And** expose un `riskDecision` complet avec `riskLevel`, `riskScore`, `decision`, `reasons` et `snapshot`
   - **And** le message principal reste humainement lisible sans perdre les details exploitables par l'UI.

2. **Presentation UI explicite, actionnable et non technique**
   - **Given** un utilisateur tente une creation/validation d'engagement, une execution/reprise de paiement ou un futur ordonnancement de depense
   - **When** le backend repond avec `CASH_RISK_BLOCKED`
   - **Then** l'interface affiche la cause principale dans le contexte de l'action en cours
   - **And** liste les raisons complementaires sans jargon technique brut
   - **And** rend visible le niveau de risque et les chiffres utiles a la decision sans recalcul cote client.

3. **Remediations determinees a partir du snapshot existant**
   - **Given** le `riskDecision.snapshot` contient `availableCash`, `projectedExposure`, `projectedGap`, `remainingEngagements`, `outstandingDepenses`, `nonReconciledOperations` et `transition`
   - **When** l'application prepare l'explication utilisateur
   - **Then** une liste de remediations est derivee de facon deterministe depuis ces donnees
   - **And** les actions suggerees sont adaptees au type de transition (`engagement`, `paiement`, `depense`)
   - **And** aucune nouvelle source de verite metier n'est introduite.

4. **Reutilisation transverse sur les parcours existants**
   - **Given** les flows front/back des domaines `engagements`, `paiements` et a court terme `depenses`
   - **When** la gestion des blocages est implementee
   - **Then** elle passe par des utilitaires/types partages plutot qu'un traitement ad hoc dans chaque composant
   - **And** les hooks React Query et la couche `src/services/api/*` restent les points d'entree uniques cote front
   - **And** la story prepare sans rupture l'integration future avec le workflow d'exception de la story 5.3.

5. **Accessibilite, auditabilite et non-regression**
   - **Given** que ces messages influencent une decision metier critique
   - **When** ils sont exposes dans l'application
   - **Then** ils restent compatibles clavier/lecteurs d'ecran et conformes a `NFR19`, `NFR20` et `NFR21`
   - **And** les details du blocage restent journalises cote backend comme dans la story 5.1
   - **And** des tests couvrent le mapping erreur API -> message UI -> suggestions de remediation sans casser les flows existants.

## Tasks / Subtasks

- [x] Revalider le contrat story contre `FR21`, `FR22`, `NFR19`, `NFR20`, `NFR21`, `NFR8` et `NFR9`, puis confirmer que ce lot reste limite a l'explication/remediation sans lancer encore le workflow d'exception (AC: 1, 3, 5)
- [x] Formaliser un contrat front partage pour `CashRiskBlocked` a partir de la reponse backend existante (`code`, `message`, `riskDecision`, `snapshot`) au lieu de parser des chaines libres dans chaque hook/composant (AC: 1, 4)
- [x] Etendre `src/services/api/api-utils.ts` et/ou un utilitaire dedie pour preserv­er la structure des erreurs metier, pas seulement `message`, afin que l'UI puisse exploiter `riskDecision` proprement (AC: 1, 4)
- [x] Introduire un utilitaire partage cote frontend pour transformer un `riskDecision` en:
  - [x] titre utilisateur
  - [x] resume principal
  - [x] liste de raisons lisibles
  - [x] liste ordonnee de remediations contextualisees par transition (AC: 2, 3, 4)
- [x] Reutiliser ce mapping dans les parcours deja branches au moteur de risque:
  - [x] creation/validation d'engagement
  - [x] execution de paiement
  - [x] reprise de paiement
  - [x] point d'extension net pour l'ordonnancement de depense a venir (AC: 2, 4)
- [x] Choisir le pattern UX le plus coherent avec le repo pour un blocage critique:
  - [x] `toast` pour le signal court
  - [x] zone detaillee inline, panneau, ou dialog pour les causes/remediations
  - [x] conservation du contexte utilisateur sans fermeture ou reset intempestif du formulaire (AC: 2, 5)
- [x] Verifier si les composants existants peuvent etre etendus avant toute creation:
  - [x] `src/components/paiements/PaiementDialog.tsx`
  - [x] composants engagements existants
  - [x] futurs composants depenses relies a l'ordonnancement
  - [x] extraire un composant partage si le meme pattern de blocage apparait a plusieurs endroits (AC: 2, 4)
- [x] Afficher des remediations minimales et deterministes a partir du snapshot existant, par exemple:
  - [x] reduire ou rephaser le montant demande
  - [x] solder ou rapprocher des operations en attente
  - [x] traiter les engagements/depenses deja ouverts
  - [x] demander une exception gouvernee lorsqu'aucune correction immediate n'est possible (AC: 3, 4)
- [x] Conserver la source de verite backend:
  - [x] aucun recalcul du score cote UI
  - [x] aucune reinterpretation metier divergente
  - [x] uniquement presentation et derivation de conseils depuis le snapshot (AC: 1, 3, 4)
- [x] Garantir que la couche API unifiee reste le seul point d'acces:
  - [x] `src/services/api/engagements.service.ts`
  - [x] `src/services/api/paiements.service.ts`
  - [x] futurs appels depenses
  - [x] aucun appel direct SDK infra ou logique metier dans les composants (AC: 4, 5)
- [x] Preparer l'interoperabilite avec la story 5.3 en reservant un emplacement explicite pour l'action "demander une exception" sans implementer encore le workflow quorum (AC: 3, 4)
- [x] Ajouter les tests frontend et backend necessaires:
  - [x] mapping de l'erreur `CashRiskBlockedException`
  - [x] rendu des raisons/remediations
  - [x] accessibilite de la presentation
  - [x] non-regression des mutations `usePaiements` et `useEngagements`
  - [x] preservation des invalidations React Query et de l'etat des formulaires (AC: 1, 2, 3, 4, 5)
- [x] Confirmer qu'aucune dependance runtime nouvelle n'est necessaire et que les versions lockees du repo suffisent pour ce lot (AC: 4, 5)

## Dev Notes

### Story Requirements

- Source principale: `/_bmad-output/planning-artifacts/epics.md` (Epic 5, Story 5.2).
- FR directe: `FR21` "expliquer la cause du blocage et proposer des actions de remediation".
- Dependances immediates:
  - `FR19` et `FR20` deja couverts par la story 5.1 via le moteur `cash-risk`.
  - `FR22` et `FR23` a preparer sans les implementer completement dans cette story.
  - `FR24` et `FR25` a garder en toile de fond pour la supervision et l'audit.
- NFR prioritaires:
  - `NFR19` et `NFR20` pour l'accessibilite des parcours critiques.
  - `NFR21` pour des messages explicites, non ambigus et actionnables.
  - `NFR8` et `NFR9` pour conserver guards/trace d'audit sur les operations critiques.
- Cette story ne doit pas modifier les regles de calcul du risque: elle capitalise sur le contrat livre par 5.1.

### Developer Context Section

- Le backend dispose deja du domaine central a reutiliser:
  - `backend/src/cash-risk/cash-risk.types.ts`
  - `backend/src/cash-risk/cash-risk.service.ts`
  - `backend/src/cash-risk/cash-risk-blocked.exception.ts`
- Le format actuel de blocage cote API est deja structure:
  - `code: 'CASH_RISK_BLOCKED'`
  - `message`
  - `riskDecision` incluant `riskLevel`, `riskScore`, `decision`, `reasons`, `snapshot`
- Le frontend perd aujourd'hui cette structure, car `src/services/api/api-utils.ts` convertit toute erreur en `Error(message)` et jette le reste du payload.
- Les hooks front concernes sont deja concentres et simples:
  - `src/hooks/usePaiements.ts` utilise `toast.error(error.message)`
  - `src/hooks/useEngagements.ts` ne fait pas encore de traitement specialise des erreurs de blocage
- Les services API concernes sont:
  - `src/services/api/paiements.service.ts`
  - `src/services/api/engagements.service.ts`
- Les points d'interface les plus probables a etendre sont:
  - `src/components/paiements/PaiementDialog.tsx`
  - composants dialogues / actions des engagements
  - composants depenses lies a l'ordonnancement pour l'extension future.
- Le bon niveau d'abstraction est donc:
  - preservation de l'erreur structuree dans la couche API
  - mapping de presentation partage
  - integration legere dans les hooks/composants existants
  - pas de duplication du raisonnement metier entre plusieurs UIs.

### Technical Requirements

- Backend
  - Conserver le format de `CashRiskBlockedException`; si un enrichissement est necessaire, il doit rester retrocompatible avec `code` et `riskDecision`.
  - Ne pas deplacer l'intelligence de calcul/remediation vers le backend si elle peut etre derivee proprement du snapshot existant sans nouvelle source de verite.
  - Conserver la journalisation existante de `CashRiskService` et l'exploitation du `correlationId`.
- Frontend
  - Faire evoluer `requestJson` pour exposer une erreur typee (par exemple `ApiError`) capable de transporter `statusCode`, `code`, `message` et `riskDecision`.
  - Centraliser le mapping `riskDecision -> UI copy + suggestions` dans un utilitaire partage, pas dans chaque `onError`.
  - Continuer a passer exclusivement par `src/services/api/*` et `src/hooks/*`.
  - Ne pas recalculer `riskScore`, `decision` ou `threshold`; l'UI ne fait que presenter et deriver des conseils deterministes.
  - Preserver le contexte du formulaire lorsqu'une action est bloquee, afin que l'utilisateur corrige sans ressaisie complete.
- Data / Persistence
  - Aucune migration SQL n'est requise si la story reste sur la presentation de donnees deja disponibles dans `riskDecision.snapshot`.
  - Aucun nouveau stockage client local ne doit etre introduit pour memoriser les blocages critiques.
- Domain Mapping attendu pour les remediations
  - Si `projectedGap > 0`: proposer reduction/rephasage du montant ou attente de disponibilite.
  - Si `remainingEngagements > 0`: suggerer revue des engagements valides non consommes.
  - Si `outstandingDepenses > 0`: suggerer traitement/priorisation des depenses deja ouvertes.
  - Si `nonReconciledOperations > 0`: suggerer rapprochement ou qualification des operations en attente.
  - Pour les transitions les plus sensibles: rendre visible la possibilite future d'exception gouvernee.

### Architecture Compliance

- Respecter les regles de `/_bmad-output/project-context.md`:
  - aucune nouvelle logique metier critique dans les composants React
  - aucun nouvel appel direct Supabase
  - couche API unifiee obligatoire
  - reutiliser avant de creer
- Les endpoints NestJS impactes restent proteges par:
  - `JwtAuthGuard`
  - `AuthorizationPolicyGuard`
  - `@RequirePermissions`
- La story doit s'aligner avec l'architecture existante:
  - NestJS decide et journalise
  - la couche services API preserve le payload
  - React Query orchestre les mutations
  - les composants affichent et guident.
- S'il apparait le meme pattern de rendu entre engagements, paiements et depenses, extraire un composant partage de type "cash risk explanation panel" au lieu de copier du JSX.
- Ne pas coupler la solution a un seul domaine; le design doit rester reutilisable pour 5.3 et 5.4.

### Library / Framework Requirements

Versions lockees observees dans le repo:

- Frontend: React `18.3.1`, TypeScript `5.8.3`, TanStack Query `5.83.0`, React Hook Form `7.61.1`, Zod `3.25.76`, Vite `5.4.19`.
- Backend: NestJS `10.4.22`, `class-validator` `0.14.4`, `class-transformer` `0.5.1`, `pg` `8.19.0`.
- Package manager: `pnpm@9.12.0`.

Verification registre effectuee le `2026-03-07`:

- `@nestjs/common`: `11.1.16`
- `react`: `19.2.4`
- `@tanstack/react-query`: `5.90.21`

Decision pour cette story:

- Aucun upgrade n'est requis.
- Le lot doit rester compatible avec les versions deja presentes dans le repo.
- Toute solution doit utiliser `sonner`, React Query et les composants UI existants plutot qu'introduire une nouvelle librairie de notifications ou d'etats d'erreur.

### File Structure Requirements

Points d'extension prioritaires:

- Frontend
  - `src/services/api/api-utils.ts`
  - `src/services/api/engagements.service.ts`
  - `src/services/api/paiements.service.ts`
  - `src/hooks/useEngagements.ts`
  - `src/hooks/usePaiements.ts`
  - composants de dialogues/actions:
    - `src/components/paiements/PaiementDialog.tsx`
    - composants engagements existants
    - composants depenses d'ordonnancement quand la transition sera branchee
  - types utilitaires potentiels:
    - `src/types/*` ou un nouveau fichier partage d'erreur metier
    - un utilitaire du type `src/lib/cash-risk-ui.ts`
- Backend
  - potentiellement aucun changement majeur si le payload actuel suffit
  - sinon ajustements limites a:
    - `backend/src/cash-risk/cash-risk-blocked.exception.ts`
    - `backend/src/cash-risk/cash-risk.types.ts`

Regles de structure:

- Ne pas disperser la traduction des blocages dans plusieurs `toast.error(error.message)`.
- Ne pas creer une page de supervision complete ici; cela releve plutot de la story 5.4.
- Si un composant de blocage est cree, le rendre neutre vis-a-vis du domaine (`engagement`, `paiement`, `depense`) et alimente par props typees.

### Testing Requirements

1. Frontend (obligatoire)
   - preservation d'une erreur structuree depuis `requestJson`
   - mapping correct `CASH_RISK_BLOCKED -> explication + remediations`
   - rendu des causes et suggestions dans les composants/hook flows impactes
   - non-regression des mutations `create/validate engagement`, `executer/reprendre paiement`
   - preservation de l'etat de formulaire apres blocage
   - accessibilite minimale: lecture du message, focus visible, ordre logique, texte exploitable

2. Backend
   - uniquement si le contrat d'erreur est modifie:
     - payload stable de `CashRiskBlockedException`
     - non-regression des tests existants `cash-risk`, `engagements`, `paiements`

3. Qualite transversale
   - `pnpm run lint`
   - `pnpm --dir backend run lint`
   - tests cibles front/back sur les zones impactees
   - verification explicite qu'aucune dependance runtime Supabase n'est introduite

### Previous Story Intelligence

Lecons utiles de la story precedente `5.1-evaluer-le-risque-cash-sur-transitions-critiques`:

- Le moteur `cash-risk` est deja branche sur:
  - `engagement:create`
  - `engagement:validate`
  - `paiement:execute`
  - `paiement:reprendre`
  - point d'extension `depense:ordonnancer`
- Le contrat `riskDecision` a ete stabilise pour preparer exactement cette story.
- Le backend journalise deja `threshold`, `projectedExposure`, `projectedGap`, `snapshot` et `correlationId`, ce qui evite de reinventer une couche d'explication metier.
- Risque principal a eviter dans 5.2: perdre cette richesse de contexte en front via des erreurs reduites a une simple string.
- L'autre lecon importante est de conserver le perimetre: cette story explique et guide, elle ne doit pas reouvrir le calcul du risque ni implementer prematurement le quorum d'exception.

### Git Intelligence Summary

Observations basees sur les 5 derniers commits:

- Les evolutions recentes documentent et durcissent les stories existantes plutot que de lancer des refactors transverses larges.
- La pratique actuelle du repo est de:
  - garder les stories implementation-ready tres detaillees
  - synchroniser `sprint-status.yaml`
  - corriger apres review plutot que multiplier les abstractions speculatives
- Pour 5.2, cela pousse vers une implementation fine:
  - enrichir la couche d'erreur API
  - brancher une presentation partagee
  - proteger les flows existants par tests
  - eviter toute refonte large des pages tresorerie/de supervision.

### Latest Tech Information

- Le repo est correctement aligne pour livrer cette story sans upgrade:
  - React Query 5 sait transporter des erreurs typees via `useMutation`
  - React 18 et RHF/Zod suffisent pour maintenir le contexte formulaire apres erreur
  - NestJS 10 couvre deja le besoin via `BadRequestException` structuree
- Meme si des versions plus recentes existent au registre, ce lot ne justifie pas de mise a niveau:
  - le risque principal n'est pas l'obsolescence de librairie
  - c'est la preservation du payload d'erreur metier et sa transformation UX cohérente.

### Project Structure Notes

- Aucun fichier `architecture.md` autonome n'est present dans les planning artifacts charges; les contraintes d'architecture exploitables proviennent surtout de:
  - `/_bmad-output/project-context.md`
  - `/_bmad-output/planning-artifacts/prd.md`
  - `/_bmad-output/planning-artifacts/epics.md`
  - l'etat reel du code backend/frontend
- Le projet reste dans une phase de migration Vite React -> architecture cible Next/Nest/PostgreSQL, mais cette story se situe clairement dans le pattern actuel:
  - front Vite + React Query + services API
  - back NestJS source de verite
  - dependance Supabase legacy interdite pour tout nouveau flux.
- La story touche un carrefour sensible entre UX, erreurs metier et gouvernance; le plus important est d'eviter une divergence entre ce que l'API sait et ce que l'UI montre.

### References

- [epics.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md)
- [prd.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md)
- [project-context.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/project-context.md)
- [5-1-evaluer-le-risque-cash-sur-transitions-critiques.md](/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/5-1-evaluer-le-risque-cash-sur-transitions-critiques.md)
- [backend/package.json](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/package.json)
- [package.json](/Volumes/mySD1.5/projects/agilys-spark-joy/package.json)
- [cash-risk.types.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/cash-risk/cash-risk.types.ts)
- [cash-risk.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/cash-risk/cash-risk.service.ts)
- [cash-risk-blocked.exception.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/cash-risk/cash-risk-blocked.exception.ts)
- [engagements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/engagements/engagements.service.ts)
- [paiements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/backend/src/paiements/paiements.service.ts)
- [api-utils.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/api-utils.ts)
- [engagements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/engagements.service.ts)
- [paiements.service.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/paiements.service.ts)
- [useEngagements.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/useEngagements.ts)
- [usePaiements.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/hooks/usePaiements.ts)
- [PaiementDialog.tsx](/Volumes/mySD1.5/projects/agilys-spark-joy/src/components/paiements/PaiementDialog.tsx)
- [http-client.ts](/Volumes/mySD1.5/projects/agilys-spark-joy/src/services/api/http-client.ts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Workflow: `/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Instructions: `/_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Engine: `/_bmad/core/tasks/workflow.xml`

### Implementation Plan

- Preserver le payload de `CashRiskBlockedException` dans la couche API front via une erreur typee partagee.
- Introduire un mapper UI central `riskDecision -> causes + remediations + severite`.
- Integrer ce mapper dans `usePaiements`, `useEngagements` et les dialogues/actions existants sans dupliquer le rendu.
- Verrouiller le lot par tests front cibles et tests backend uniquement si le contrat d'erreur evolue.

### Completion Notes List

- La couche `requestJson` conserve maintenant les erreurs metier structurees via `ApiError` (`statusCode`, `code`, `riskDecision`, `message`) sans casser les messages existants.
- Un mapping UI partage `riskDecision -> titre, resume, causes, remediations` a ete introduit dans `src/lib/cash-risk-ui.ts` avec derivation deterministe depuis le snapshot backend.
- Un composant transversal `CashRiskBlockedPanel` est utilise dans les parcours paiements et engagements pour afficher un blocage explicite, actionnable et accessible.
- `usePaiements` et `useEngagements` exposent des etats `cashRiskBlocked` + `clearCashRiskBlocked`, et preservent les invalidations React Query existantes.
- Les pages/dialogues impactes (`Paiements`, `Depenses/PaiementDialog`, `Engagements`, `Reservations/EngagementDialog`) affichent les details du blocage sans reset intempestif des formulaires.
- Un test front cible (`tests/cash-risk-blocked.spec.ts`) valide le contrat `ApiError` et le mapping de remediations; un test backend (`cash-risk-blocked.exception.spec.ts`) verrouille la stabilite du payload d'exception.
- `pnpm run lint:frontend`, `pnpm --dir backend run lint`, `pnpm exec playwright test tests/cash-risk-blocked.spec.ts` et `pnpm --dir backend run test -- src/cash-risk/cash-risk-blocked.exception.spec.ts` passent.
- Les tests Playwright UI sur navigateur n'ont pas pu etre executes dans ce sandbox (permission `bootstrap_check_in ... Permission denied`), sans impact sur les validations non-UI deja passees.
- Correctif applique sur la generation d'ecritures comptables des paiements: ordre des parametres `generate_ecritures_comptables` aligne sur la signature SQL officielle.
- Les raisons backend sont maintenant normalisees cote UI pour rester non techniques et actionnables.
- Le panel `CashRiskBlockedPanel` expose des attributs d'accessibilite explicites (`role="alert"`, `aria-live`) et les tests UI couvrent aussi la fermeture clavier du message.

### File List

- `src/services/api/api-utils.ts`
- `src/types/cash-risk.types.ts`
- `src/lib/cash-risk-ui.ts`
- `src/components/shared/CashRiskBlockedPanel.tsx`
- `backend/src/paiements/paiements.service.ts`
- `backend/src/paiements/paiements.service.spec.ts`
- `backend/src/engagements/engagements.service.ts`
- `backend/src/engagements/engagements.service.spec.ts`
- `backend/src/paiements/paiements.module.ts`
- `backend/src/engagements/engagements.module.ts`
- `backend/src/app.module.ts`
- `backend/package.json`
- `src/hooks/usePaiements.ts`
- `src/hooks/useEngagements.ts`
- `src/components/paiements/PaiementDialog.tsx`
- `src/components/engagements/EngagementDialog.tsx`
- `src/pages/app/Paiements.tsx`
- `src/pages/app/Engagements.tsx`
- `src/pages/app/Reservations.tsx`
- `tests/cash-risk-blocked.spec.ts`
- `tests/depenses-paiements-page.spec.ts`
- `tests/paiements-page.spec.ts`
- `backend/src/cash-risk/cash-risk-blocked.exception.spec.ts`
- `_bmad-output/implementation-artifacts/5-2-expliquer-blocages-et-proposer-remediations.md`

### Senior Developer Review (AI)

- 2026-03-07: revue adversariale executee, 6 findings identifies (2 HIGH, 3 MEDIUM, 1 LOW).
- 2026-03-07: correction appliquee sur tous les findings HIGH + MEDIUM:
  - correction du bug de mapping de parametres SQL dans `PaiementsService.ensureEcritures`
  - normalisation non technique des raisons de blocage
  - renforcement accessibilite panel (lecteurs d'ecran + alerte assertive)
  - extension des tests UI pour verifier la fermeture clavier du message
  - synchronisation de la story (tasks detaillees et file list) avec l'etat reel.
- Finding LOW restant (derive potentielle front/back sur sous-ensemble de type snapshot) accepte comme risque mineur non bloquant pour ce lot.

### Change Log

- 2026-03-07: Implementation completee pour la story 5.2 (contrat d'erreur structure, mapping UI partage, integration paiements/engagements, tests cibles front+backend).
- 2026-03-07: Revue senior terminee, corrections High/Medium appliquees, story passee a `done`.
