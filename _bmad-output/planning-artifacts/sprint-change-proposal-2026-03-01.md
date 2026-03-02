# Sprint Change Proposal - Correct Course

Date: 2026-03-01  
Projet: agilys-spark-joy  
Mode: Incremental

## 1) Issue Summary

### Problème déclencheur
Le projet doit corriger sa trajectoire sur trois axes simultanés:
1. Refactor global du code pour réduire la dette technique et améliorer la maintenabilité.
2. Finalisation des modules non terminés:
   - Paramètres utilisateurs
   - Paramètres généraux
   - Rapprochement bancaire
3. Migration technologique progressive de l’architecture actuelle (frontend Vite/React + backend Supabase) vers:
   - Next.js (frontend)
   - NestJS (backend API)
   - PostgreSQL en local (localhost)
   - Couverture complète de l’authentification hors Supabase Auth

### Contexte de découverte
Le besoin a émergé durant l’exécution produit: fort couplage Supabase (auth, requêtes CRUD, fonctions edge, types générés), modules métier encore en placeholders, et nécessité d’une base technique plus industrialisable.
Contrainte validée avec le sponsor: la transition doit être **transparente pour l’utilisateur final** (pas de rupture UX perçue).

### Preuves observées
- Couplage massif à Supabase dans `src/services/api/*`, hooks et certaines pages.
- Auth dépendante de Supabase (`src/contexts/AuthContext.tsx`, `src/services/api/auth.service.ts`).
- Modules explicitement “à venir”:
  - `src/pages/app/Parametres.tsx` (utilisateurs, général)
  - `src/pages/app/Tresorerie.tsx` (rapprochement bancaire)

---

## 2) Impact Analysis

### 2.1 Impact Epics
- Les epics existants ne sont pas disponibles dans les artefacts de planning.
- Changement classé **majeur**: il introduit une nouvelle architecture d’exécution et impacte transversalement les domaines métier.
- Décision: créer un lot d’epics de transition/migration + finalisation fonctionnelle.

### 2.2 Impact Stories
- Les stories d’implémentation actuelles ne sont pas disponibles dans les artefacts.
- Toutes les stories liées aux modules métiers qui lisent/écrivent via Supabase devront être migrées vers API NestJS.
- Les stories auth doivent être recréées autour de JWT + RBAC côté NestJS.

### 2.3 Conflits d’artefacts
- PRD disponible: oui (`_bmad-output/planning-artifacts/prd.md`)
- Architecture: non disponible
- UX: non disponible
- Tech spec: non disponible

Conséquence: la proposition inclut des **modifications PRD ciblées** et recommande la création d’un document d’architecture de migration.

### 2.4 Impact technique
- Backend:
  - Remplacement des fonctions Supabase par modules NestJS.
  - Centralisation des règles métier côté API.
- Data:
  - Migration schéma SQL Supabase vers PostgreSQL local.
  - Reprise des contraintes d’intégrité et règles multi-tenant.
- Auth:
  - Remplacement Supabase Auth par auth NestJS (JWT access/refresh) + gestion rôles.
- Frontend:
  - Transition Vite/React Router vers Next.js App Router.
  - Remplacement progressif des services Supabase par client API typé.
- Ops:
  - Nouvel environnement local (API + DB + Front), scripts de seed/migrate.

---

## 3) Recommended Approach

### Évaluation des options
- Option 1 - Direct Adjustment (migration progressive par module): **Viable**
  - Effort: High
  - Risque: Medium
- Option 2 - Rollback: **Non viable**
  - Effort: High
  - Risque: High
- Option 3 - PRD MVP Review (re-scope): **Viable partiellement**
  - Effort: Medium
  - Risque: Medium

### Choix recommandé
**Approche retenue: Hybrid (Option 1 + Option 3 léger)**
- Migration progressive par module (demandé) pour limiter le risque opérationnel.
- Re-scope limité: concentrer d’abord sur fondations (auth, architecture, data), puis finaliser les 3 modules prioritaires.
- Contrainte UX: conserver la continuité visuelle et interactionnelle en réutilisant `shadcn/ui` et en améliorant les composants existants avant extension.

### Estimation macro
- Effort global: élevé (plusieurs sprints)
- Risque: moyen à élevé (auth + data + modules critiques)
- Impact timeline: notable mais maîtrisable avec incréments courts et feature flags.

---

## 4) Detailed Change Proposals

### 4.1 Propositions de Stories (création)

#### Epic CC-01 - Fondations de migration (Next.js + NestJS + PostgreSQL)

Story: CC-01.01 - Bootstrap monorepo migration
Section: Story (nouvelle)
OLD:
- N/A
NEW:
- Créer la structure cible: `apps/web-next`, `apps/api-nest`, `packages/shared-types`.
- Ajouter outillage commun (lint, tsconfig, scripts de dev local).
- Mettre en place conventions de réutilisation (DTO partagés, helpers communs).
Rationale: éviter duplication et sécuriser les futures migrations module par module.

Story: CC-01.02 - PostgreSQL local et migrations initiales
Section: Story (nouvelle)
OLD:
- N/A
NEW:
- Déployer PostgreSQL local.
- Rejouer schéma métier minimal (tenants, users, roles, budget core) via migrations versionnées.
- Créer scripts `db:migrate`, `db:seed`, `db:reset`.
Rationale: établir une base de données stable hors Supabase.

Story: CC-01.03 - Client API front unifié
Section: Story (nouvelle)
OLD:
- N/A
NEW:
- Créer un client HTTP typé (fetch wrapper, gestion erreurs, auth headers).
- Introduire une couche service réutilisable pour remplacer les appels Supabase.
Rationale: migration progressive sans casser l’UI existante.

Story: CC-01.04 - Stratégie UI de transition transparente
Section: Story (nouvelle)
OLD:
- N/A
NEW:
- Auditer les composants `shadcn/ui` et composants maison existants.
- Améliorer les composants existants (accessibilité, cohérence, props réutilisables) avant création de nouveaux.
- Interdire les ruptures visuelles majeures durant la migration (mêmes patterns d’écran, formulaires, feedbacks).
Rationale: garantir une expérience stable côté utilisateur final pendant la transition technique.

#### Epic CC-02 - Migration Auth complète

Story: CC-02.01 - Auth NestJS (JWT + refresh)
Section: Story (nouvelle)
OLD:
- N/A
NEW:
- Implémenter login/logout/refresh côté NestJS.
- Sécuriser endpoints via guards.
- Journaliser les événements de sécurité.
Rationale: remplacer Supabase Auth de manière autonome.

Story: CC-02.02 - RBAC et permissions métier
Section: Story (nouvelle)
OLD:
- N/A
NEW:
- Modéliser rôles et permissions.
- Exposer middleware/guards RBAC.
- Garantir contrôle d’accès par module.
Rationale: préserver les règles actuelles de rôle et les rendre explicites.

Story: CC-02.03 - Migration frontend AuthContext vers API NestJS
Section: Story (nouvelle)
OLD:
- N/A
NEW:
- Remplacer `AuthContext` lié Supabase par provider basé tokens.
- Adapter `ProtectedRoute`/middleware Next.js.
- Ajouter gestion session expirée/refresh silencieux.
Rationale: continuité UX et sécurité sans dépendance Supabase Auth.

#### Epic CC-03 - Finalisation modules prioritaires

Story: CC-03.01 - Paramètres Utilisateurs (complet)
Section: Story (nouvelle)
OLD:
- Module placeholder “à venir”
NEW:
- CRUD utilisateurs.
- Affectation rôles.
- Activation/désactivation compte.
- Audit minimal des changements sensibles.
Rationale: besoin opérationnel immédiat.

Story: CC-03.02 - Paramètres Généraux (complet)
Section: Story (nouvelle)
OLD:
- Module placeholder “à venir”
NEW:
- Configuration organisation (infos, devises, préférences globales).
- Paramètres métier transverses.
- Historique des modifications.
Rationale: réduire dépendance aux hardcodes et configs dispersées.

Story: CC-03.03 - Rapprochement bancaire (MVP exploitable)
Section: Story (nouvelle)
OLD:
- Interface “à venir”
NEW:
- Import/relevé de mouvements.
- Matching semi-automatique avec opérations.
- État de rapprochement + journal d’écarts.
Rationale: module critique de clôture et fiabilité cash.

#### Epic CC-04 - Migration métier progressive avec réutilisation forte

Story: CC-04.01 - Adapter services partagés sans duplication
Section: Story (nouvelle)
OLD:
- N/A
NEW:
- Introduire une façade par domaine (budget, engagements, factures, paiements).
- Remplacer implémentations Supabase sous la façade, sans dupliquer logique UI.
- Réutiliser en priorité les composants UI existants (basés `shadcn/ui`) après amélioration ciblée.
Rationale: réutilisation maximale et réduction du risque de régression.

Story: CC-04.02 - Migration progressive par lot métier
Section: Story (nouvelle)
OLD:
- N/A
NEW:
- Lot 1: Paramètres + Auth
- Lot 2: Trésorerie (incluant rapprochement)
- Lot 3: Chaîne dépense (réservation -> engagement -> BC -> facture -> dépense -> paiement)
Rationale: contrôler la complexité et valider à chaque lot.

Story: CC-04.03 - Décommission Supabase
Section: Story (nouvelle)
OLD:
- N/A
NEW:
- Retirer dépendances `@supabase/supabase-js` et code mort.
- Archiver scripts/functions non utilisés.
- Mettre à jour docs runbook.
Rationale: finaliser proprement la migration.

### 4.2 Modifications PRD proposées

PRD: `prd.md` - Section “Technical Architecture Considerations”
OLD:
- Architecture actuelle implicite (stack couplée Supabase côté implémentation).
NEW:
- Cible officielle: Next.js (web), NestJS (API), PostgreSQL local/dev.
- Exiger une migration progressive module par module avec coexistence temporaire.
Rationale: aligner produit et exécution technique réelle.

PRD: `prd.md` - Section “Integration Requirements”
OLD:
- Intégrations orientées stack actuelle.
NEW:
- Contrat API backend-first (NestJS) + versionnement endpoints.
- Politique de compatibilité transitoire durant migration.
Rationale: sécuriser la continuité de service.

PRD: `prd.md` - Section “Security / Compliance”
OLD:
- Exigences sécurité générales.
NEW:
- Auth JWT/refresh token, RBAC explicite, audit trail sur actions sensibles.
Rationale: couvrir explicitement le remplacement de Supabase Auth.

### 4.3 Changements Architecture proposés

OLD:
- Front appelle directement Supabase (DB/Auth/Functions) de façon distribuée.
NEW:
- Front Next.js -> API NestJS -> PostgreSQL.
- Domaine métier centralisé dans NestJS (services + transactions).
- Types partagés via package commun.
Rationale: séparation claire des responsabilités, meilleure testabilité et maintenabilité.

### 4.4 Changements UI/UX proposés

OLD:
- 3 modules en état placeholder.
NEW:
- Spécifier parcours complets pour:
  - Paramètres Utilisateurs
  - Paramètres Généraux
  - Rapprochement bancaire
- Ajouter états vides, erreurs, confirmations, permissions par rôle.
Rationale: réduire ambiguïtés de livraison et accélérer la recette.

---

## 5) Implementation Handoff

### Classification
**Scope: Major**

### Handoff recipients
- PM/Architect: validation architecture cible, séquencement migration, gestion risques.
- PO/SM: priorisation backlog, découpage sprint, critères d’acceptation.
- Équipe dev: implémentation incrémentale, migration data/API/auth, finalisation modules.

### Responsabilités
- PM/Architect:
  - Valider l’architecture cible et la stratégie de coexistence temporaire.
  - Valider plan de sortie Supabase.
- PO/SM:
  - Transformer les stories ci-dessus en backlog sprintable.
  - Définir priorités et dépendances.
- Dev team:
  - Implémenter epics CC-01 à CC-04.
  - Garantir non-régression fonctionnelle lot par lot.

### Success criteria
- Les 3 modules prioritaires sont en production fonctionnelle.
- L’auth ne dépend plus de Supabase.
- Les flux critiques passent via NestJS + PostgreSQL.
- La dette technique Supabase résiduelle est documentée puis retirée.
- La transition est transparente pour l’end user: UX cohérente, composants `shadcn/ui` réutilisés/améliorés, aucune rupture majeure de parcours.

---

## 6) Checklist Status Snapshot

### Section 1 - Trigger & Context
- 1.1 Triggering story identified: [!] Action-needed (pas d’ID story historique)
- 1.2 Core problem defined: [x] Done
- 1.3 Evidence gathered: [x] Done

### Section 2 - Epic Impact Assessment
- 2.1 Epic viability review: [x] Done
- 2.2 Epic-level changes: [x] Done
- 2.3 Future epics impact: [x] Done
- 2.4 New/obsolete epics: [x] Done
- 2.5 Epic sequencing: [x] Done

### Section 3 - Artifact Conflict Analysis
- 3.1 PRD conflict check: [x] Done
- 3.2 Architecture conflict check: [!] Action-needed (doc architecture absent)
- 3.3 UX conflict check: [!] Action-needed (doc UX absent)
- 3.4 Secondary artifacts: [x] Done

### Section 4 - Path Forward Evaluation
- 4.1 Option Direct Adjustment: [x] Viable
- 4.2 Option Rollback: [x] Not viable
- 4.3 Option PRD MVP Review: [x] Viable
- 4.4 Recommended path selected: [x] Done (Hybrid Option 1 + Option 3 léger)

### Section 5 - Sprint Change Proposal Components
- 5.1 Issue summary: [x] Done
- 5.2 Epic/artifact impacts: [x] Done
- 5.3 Recommended path rationale: [x] Done
- 5.4 MVP impact/action plan: [x] Done
- 5.5 Handoff plan: [x] Done

### Section 6 - Final Review and Handoff
- 6.1 Checklist completion reviewed: [x] Done
- 6.2 Proposal consistency check: [x] Done
- 6.3 Explicit user approval: [ ] Action-needed
- 6.4 sprint-status.yaml updated: [N/A] Fichier non trouvé
- 6.5 Next steps confirmation: [ ] Action-needed
