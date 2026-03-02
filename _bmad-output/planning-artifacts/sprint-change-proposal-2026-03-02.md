# Sprint Change Proposal - Correct Course

Date: 2026-03-02
Projet: agilys-spark-joy
Mode: Batch

## 1) Issue Summary

### Problème déclencheur
Ajustement de trajectoire demandé pendant l'implémentation pour couvrir un chantier technique transverse manquant du flux stories actuel:
1. Finaliser la migration outillage `npm -> pnpm`.
2. Unifier le démarrage des services via une seule commande.
3. Permettre la configuration des ports par service.
4. Ajouter explicitement un lot de migration finale des données (legacy/Supabase -> PostgreSQL local/cible) avec validation de réconciliation.

### Contexte de découverte
- Le backlog migration contient `CC-01.02 - PostgreSQL local et migrations initiales`, mais cette story n'est pas matérialisée dans les stories d'implémentation générées.
- Le projet dispose déjà d'un `pnpm-lock.yaml` mais conserve `package-lock.json` et des usages `npm` dans les validations récentes.
- Le besoin utilisateur exprime clairement une orchestration locale multi-services pilotable par variables de ports.

### Inputs utilisateur intégrés (verbatim fonctionnel)
- Migrer de `npm` à `pnpm`.
- Démarrage de tous les services via une seule commande.
- Possibilité de spécifier les ports par service.
- Prévoir à la fin une migration des données.
- Contrainte d'environnement: pas de SGBD installé localement; Docker disponible.

---

## 2) Impact Analysis

### 2.1 Impact Epics
- Impact principal: Epic de fondation migration (CC-01) + trajectoire décommission Supabase.
- Impact secondaire: stories auth et modules métier consommatrices de services/API.

### 2.2 Impact Stories
Stories déjà présentes (observées):
- `2-4-migrer-le-frontend-auth-sans-rupture-ux` (review)
- `2-5-persister-refresh-tokens-en-postgresql` (ready-for-dev)
- `3-1-configurer-referentiels-budgetaires-de-base` (ready-for-dev)

Gap confirmé:
- Absence d'une story explicite couvrant `CC-01.02` au niveau implémentation, incluant scripts DB standardisés et orchestration locale complète.

### 2.3 Conflits d'artefacts
- `sprint-backlog-migration-2026-03-01.md` définit `CC-01.02` mais la trajectoire stories actuelle est numérotée `2-*`, `3-*`.
- Risque de dérive de priorisation tant que le backlog sprintable et les stories exécutables ne sont pas réalignés.

### 2.4 Impact technique
- DevEx: standardisation package manager (`pnpm`) et scripts racine.
- Runtime local: orchestration multi-process (web, api, db tooling) avec ports paramétrables.
- Data: ajout d'un lot de migration de données final avec critères de succès mesurables (réconciliation avant/après).

---

## 3) Recommended Approach

### Choix recommandé
**Direct Adjustment (modéré) avec réalignement backlog/stories immédiat**

Rationale:
- Le besoin est transversal mais circonscrit à la fondation technique + trajectoire data.
- Il peut être absorbé sans replanification complète du PRD, via création de story dédiée et dépendances claires.

### Estimation et risque
- Effort: Medium
- Risque: Medium (scripts CI/local, ports, orchestration, cohérence des environnements)
- Mitigation: migration progressive, double-support temporaire des commandes, checklist de décommission.

---

## 4) Detailed Change Proposals

### 4.1 Story à créer (prioritaire)

Story: `CC-01.02 - PostgreSQL local et migrations initiales (étendue orchestration pnpm)`
Section: Acceptance Criteria

OLD:
- PostgreSQL local opérationnel
- Migrations versionnées exécutables (`db:migrate`, `db:reset`, `db:seed`)
- Schéma minimal: users, roles, tenants/client, tables cœur paramétrage

NEW:
- PostgreSQL local opérationnel via Docker (`docker compose`) + scripts DB versionnés exécutables via `pnpm`.
- Commande unique de demarrage local multi-services (`pnpm dev`) documentee.
- Ports configurables par service via variables d'environnement (`WEB_PORT`, `API_PORT`, `DB_PORT` ou équivalents).
- CI/local alignés sur `pnpm` avec lockfile unique; suppression progressive des usages `npm` et retrait planifié de `package-lock.json`.
- Runbook local à jour (docker up/down, healthcheck DB, install, start, override ports, migrate/reset/seed).

Rationale:
- Répond à l'exigence utilisateur explicite.
- Supprime l'ambiguïté opérationnelle entre outillage courant et cible.
- Prépare proprement les stories dépendantes (`2-5`, `3-1`, etc.).

### 4.2 Story à ajouter en fin de migration (nouvelle)

Story: `CC-04.04 - Migration finale des données et réconciliation`
Section: Story / Acceptance Criteria (nouvelle)

OLD:
- N/A

NEW:
- Définir le périmètre des données legacy à migrer (auth résiduelle, tables métier, historiques utiles).
- Exécuter la migration vers PostgreSQL cible avec scripts idempotents et rejouables.
- Produire un rapport de réconciliation avant/après (comptages, statuts critiques, montants critiques avec écart nul sur périmètres sensibles).
- Documenter anomalies, règles de correction et preuves de validation.
- Valider la readiness de décommission Supabase runtime après migration data.

Rationale:
- Couvre explicitement ta demande “à la fin une migration des data”.
- Aligne avec FR52/FR53/NFR31 déjà présents dans PRD/epics.

### 4.3 Mises à jour backlog/suivi

- Ajouter `CC-01.02` au flux stories exécutables immédiatement.
- Ajouter `CC-04.04` en fin de séquence migration.
- Mettre à jour le `sprint-status` après création des nouvelles stories (statut initial `ready-for-dev`).

---

## 5) Implementation Handoff

### Classification
**Scope: Moderate** (réorganisation backlog + outillage transverse)

### Handoff recipients
- Scrum Master / PO: création et ordonnancement des stories `CC-01.02` (étendue) et `CC-04.04`.
- Dev Team: implémentation technique (`pnpm`, orchestration, ports, scripts DB).
- QA/Review: validation non-régression + preuve de réconciliation data finale.

### Success criteria
- Le projet démarre tous les services via une seule commande documentée.
- Les ports sont surchargables par service sans modifier le code.
- Les scripts DB sont normalisés `pnpm` et utilisables localement avec PostgreSQL exécuté dans Docker.
- La migration finale des données est tracée et validée avec rapport de réconciliation.

---

## 6) Checklist Status Snapshot

### Section 1 - Trigger & Context
- 1.1 Triggering issue identified: [x] Done
- 1.2 Core problem defined: [x] Done
- 1.3 Evidence gathered: [x] Done

### Section 2 - Epic/Story Impact
- 2.1 Epic impact reviewed: [x] Done
- 2.2 Story gaps identified: [x] Done
- 2.3 Sequencing impact assessed: [x] Done

### Section 3 - Artifact Conflict Analysis
- 3.1 Backlog vs stories mismatch: [x] Done
- 3.2 PRD/epics alignment for data migration: [x] Done

### Section 4 - Path Forward
- 4.1 Recommended path selected: [x] Done (Direct Adjustment modéré)
- 4.2 Risk and mitigation documented: [x] Done

### Section 5 - Proposal Components
- 5.1 Issue summary: [x] Done
- 5.2 Impact analysis: [x] Done
- 5.3 Detailed edits: [x] Done
- 5.4 Handoff plan: [x] Done

### Section 6 - Finalization
- 6.1 Proposal document generated: [x] Done
- 6.2 User approval pending: [ ] Action-needed
