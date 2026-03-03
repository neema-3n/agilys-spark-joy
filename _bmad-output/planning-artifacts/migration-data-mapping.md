# Migration Data Mapping (Baseline V2)

Date: 2026-03-03  
Scope: mapping source legacy (Supabase + stores transitoires) -> cible NestJS/PostgreSQL

## Regles globales de mapping

1. Les identifiants UUID legacy sont conserves quand possible pour reduire les tables de correspondance.
2. Toutes les entites cibles critiques doivent porter `tenant_id` et `exercice_id` si applicable.
3. Les timestamps sont normalises en UTC ISO8601.
4. Les statuts legacy doivent etre mappes vers enums cibles explicites (pas de string libre).
5. Les doublons techniques sont traites par idempotence (`ON CONFLICT DO UPDATE` ou hash metier).

## Perimetre des entites critiques (couverture 100%)

Entites critiques couvertes attribut-par-attribut dans ce document:
`auth_users`, `auth_refresh_tokens`, `tenants`, `tenant_retention_policies`, `budget_allocations`, `budget_decision_versions`, `depenses`, `paiements`, `ecritures_comptables`.

## Mapping par domaine (vue macro)

| Domaine | Source legacy | Cible migration | Regles de transformation | Etat |
|---|---|---|---|---|
| Auth utilisateurs | `auth.users` (Supabase) + seeds locaux | `public.auth_users` | Email lowercase, roles normalises array unique, `is_active=true` | migre |
| Auth refresh tokens | Supabase session/token legacy | `public.auth_refresh_tokens` | Stockage hash token uniquement, revoke timestamp, rotation JTI | migre |
| Catalogue tenants | Legacy implicite via utilisateurs | `public.tenants` | Creer tenant si absent, `is_active=true`, lien users->tenant | migre |
| Politiques retention | Legacy config variable/non versionnee | `public.tenant_retention_policies` | Version incrementale, `is_current=true` unique par tenant/policy | migre |
| Budget allocations | `.data/budget-referentiels.json` + `modifications_budgetaires` | `public.budget_allocations` | Harmoniser operation type, recalcul soldes, conserver validation/audit | partiel |
| Versions decisions | `.data/budget-referentiels.json` | `public.budget_decision_versions` | Version monotone par allocation, snapshot immuable | partiel |
| Depenses | `depenses` + `factures` | `public.depenses` | Validation limite `1..20` factures, statut cible explicite | non migre |
| Paiements | `paiements` | `public.paiements` | Mapping statuts retour banque, gestion partiels/rejets | non migre |
| Ecritures comptables | `ecritures_comptables` | `public.ecritures_comptables` | Controle debit=credit, idempotence, contre-passation | non migre |

## Mapping attribut-par-attribut (entites critiques)

### 1) `auth_users`

| Source | Cible | Transformation | Validation | Action si erreur |
|---|---|---|---|---|
| `auth.users.id` | `auth_users.id` | copie UUID | UUID valide | reject hard |
| `auth.users.email` | `auth_users.email` | `trim + lowercase` | format email RFC basique | quarantine |
| `auth.users.user_metadata.full_name` | `auth_users.full_name` | `trim`, fallback `NULL` | longueur <= 255 | autocorrect (truncate) |
| `auth.users.user_metadata.roles[]` | `auth_users.roles[]` | dedupe + tri + whitelist | roles autorises uniquement | reject hard |
| `auth.users.created_at` | `auth_users.created_at` | UTC ISO8601 | date parseable | reject hard |
| `auth.users.last_sign_in_at` | `auth_users.last_login_at` | UTC ISO8601 | date parseable ou NULL | autocorrect NULL |
| `auth.users.deleted_at` | `auth_users.is_active` | `deleted_at != NULL => false` | booleen | reject hard |
| `tenant inference` | `auth_users.tenant_id` | derive via mapping utilisateur->tenant | FK tenant existante | quarantine |

### 2) `auth_refresh_tokens`

| Source | Cible | Transformation | Validation | Action si erreur |
|---|---|---|---|---|
| `legacy.token_id` | `auth_refresh_tokens.id` | copie UUID | UUID valide | reject hard |
| `legacy.user_id` | `auth_refresh_tokens.user_id` | copie UUID | FK user existante | reject hard |
| `legacy.token_value` | `auth_refresh_tokens.token_hash` | `sha256(token_value)` | hash non vide | reject hard |
| `legacy.jti` | `auth_refresh_tokens.jti` | copie + uppercase | unicite par user | reject hard |
| `legacy.expires_at` | `auth_refresh_tokens.expires_at` | UTC ISO8601 | > created_at | reject hard |
| `legacy.revoked_at` | `auth_refresh_tokens.revoked_at` | UTC ISO8601 ou NULL | coherent avec statut | autocorrect NULL |
| `legacy.created_at` | `auth_refresh_tokens.created_at` | UTC ISO8601 | date parseable | reject hard |
| `legacy.tenant` | `auth_refresh_tokens.tenant_id` | resolution tenant canonical | FK tenant existante | quarantine |

### 3) `tenants`

| Source | Cible | Transformation | Validation | Action si erreur |
|---|---|---|---|---|
| `legacy.tenant_id` | `tenants.id` | copie UUID | UUID valide | reject hard |
| `legacy.tenant_code` | `tenants.code` | `trim + uppercase` | regex `^[A-Z0-9_\-]{2,20}$` | quarantine |
| `legacy.tenant_name` | `tenants.name` | `trim` | non vide | reject hard |
| `legacy.status` | `tenants.is_active` | map `active/inactive` | booleen | reject hard |
| `legacy.created_at` | `tenants.created_at` | UTC ISO8601 | date parseable | reject hard |
| `legacy.updated_at` | `tenants.updated_at` | UTC ISO8601 | date parseable | autocorrect created_at |

### 4) `tenant_retention_policies`

| Source | Cible | Transformation | Validation | Action si erreur |
|---|---|---|---|---|
| `legacy.policy_id` | `tenant_retention_policies.id` | copie UUID | UUID valide | reject hard |
| `legacy.tenant_id` | `tenant_retention_policies.tenant_id` | copie UUID | FK tenant existante | reject hard |
| `legacy.policy_type` | `tenant_retention_policies.policy_type` | normalize enum | enum supporte | reject hard |
| `legacy.retention_days` | `tenant_retention_policies.retention_days` | cast int | 1..3650 | quarantine |
| `legacy.version` | `tenant_retention_policies.version` | cast int | monotone par tenant/type | reject hard |
| `legacy.current` | `tenant_retention_policies.is_current` | booleen | unique `is_current=true` par tenant/type | reject hard |
| `legacy.created_at` | `tenant_retention_policies.created_at` | UTC ISO8601 | date parseable | reject hard |

### 5) `budget_allocations`

| Source | Cible | Transformation | Validation | Action si erreur |
|---|---|---|---|---|
| `modifications_budgetaires.id` | `budget_allocations.id` | copie UUID | UUID valide | reject hard |
| `modifications_budgetaires.tenant_id` | `budget_allocations.tenant_id` | copie UUID | FK tenant existante | reject hard |
| `modifications_budgetaires.exercice_id` | `budget_allocations.exercice_id` | copie UUID | FK exercice existante | reject hard |
| `operationType` | `operation_type` | map `allocation/reallocation` | enum supporte | reject hard |
| `montant` | `amount` | decimal(18,2), round half-up | >= 0 | reject hard |
| `motif` | `reason` | `trim` | longueur <= 2000 | autocorrect (truncate) |
| `auteur_validation` | `validated_by` | copie UUID | FK user existante ou NULL | quarantine |
| `date_validation` | `validated_at` | UTC ISO8601 | date parseable ou NULL | autocorrect NULL |
| `created_at` | `created_at` | UTC ISO8601 | date parseable | reject hard |

### 6) `budget_decision_versions`

| Source | Cible | Transformation | Validation | Action si erreur |
|---|---|---|---|---|
| `legacy.version_id` | `budget_decision_versions.id` | copie UUID | UUID valide | reject hard |
| `legacy.allocation_id` | `budget_decision_versions.allocation_id` | copie UUID | FK allocation existante | reject hard |
| `legacy.version_number` | `version_no` | cast int | > 0 et monotone | reject hard |
| `legacy.before_state` | `snapshot_before` | JSON canonicalise | JSON valide | reject hard |
| `legacy.after_state` | `snapshot_after` | JSON canonicalise | JSON valide | reject hard |
| `legacy.created_by` | `created_by` | copie UUID | FK user existante | quarantine |
| `legacy.created_at` | `created_at` | UTC ISO8601 | date parseable | reject hard |

### 7) `depenses`

| Source | Cible | Transformation | Validation | Action si erreur |
|---|---|---|---|---|
| `depenses.id` | `depenses.id` | copie UUID | UUID valide | reject hard |
| `depenses.tenant_id` | `depenses.tenant_id` | copie UUID | FK tenant existante | reject hard |
| `depenses.numero` | `depenses.number` | `trim + uppercase` | unique par tenant/exercice | reject hard |
| `depenses.montant_total` | `depenses.total_amount` | decimal(18,2), round half-up | >= 0 | reject hard |
| `depenses.statut` | `depenses.status` | map vers enum cible | enum supporte | reject hard |
| `depenses.facture_ids[]` | `depenses.invoice_ids[]` | dedupe + tri | cardinalite `1..20` | reject hard |
| `depenses.date_liquidation` | `depenses.liquidated_at` | UTC ISO8601 | coherent avec status | quarantine |
| `depenses.ordonnance_par` | `depenses.ordered_by` | copie UUID | FK user existante ou NULL | quarantine |
| `depenses.created_at` | `depenses.created_at` | UTC ISO8601 | date parseable | reject hard |

### 8) `paiements`

| Source | Cible | Transformation | Validation | Action si erreur |
|---|---|---|---|---|
| `paiements.id` | `paiements.id` | copie UUID | UUID valide | reject hard |
| `paiements.depense_id` | `paiements.depense_id` | copie UUID | FK depense existante + status ordonnancee | reject hard |
| `paiements.numero` | `paiements.number` | `trim + uppercase` | unique par tenant | reject hard |
| `paiements.montant` | `paiements.amount` | decimal(18,2), round half-up | > 0 | reject hard |
| `paiements.statut` | `paiements.status` | map vers enum cible | enum supporte | reject hard |
| `paiements.date_transmission` | `paiements.submitted_at` | UTC ISO8601 | date parseable | autocorrect NULL |
| `paiements.retour_banque_code` | `paiements.bank_return_code` | `trim + uppercase` | longueur <= 64 | autocorrect (truncate) |
| `paiements.retour_banque_message` | `paiements.bank_return_message` | `trim` | longueur <= 2000 | autocorrect (truncate) |
| `paiements.created_at` | `paiements.created_at` | UTC ISO8601 | date parseable | reject hard |

### 9) `ecritures_comptables`

| Source | Cible | Transformation | Validation | Action si erreur |
|---|---|---|---|---|
| `ecritures_comptables.id` | `ecritures_comptables.id` | copie UUID | UUID valide | reject hard |
| `ecritures_comptables.tenant_id` | `ecritures_comptables.tenant_id` | copie UUID | FK tenant existante | reject hard |
| `ecritures_comptables.event_id` | `ecritures_comptables.event_id` | copie UUID | non vide | reject hard |
| `ecritures_comptables.compte_debit` | `debit_account` | `trim + uppercase` | compte existe/actif | reject hard |
| `ecritures_comptables.compte_credit` | `credit_account` | `trim + uppercase` | compte existe/actif | reject hard |
| `ecritures_comptables.montant` | `amount` | decimal(18,2), round half-up | > 0 | reject hard |
| `ecritures_comptables.journal` | `journal_code` | `trim + uppercase` | journal autorise | reject hard |
| `ecritures_comptables.statut` | `status` | map `generee/postee/rejetee/corrigee` | enum supporte | reject hard |
| `ecritures_comptables.idempotency_key` | `idempotency_key` | hash metier stable | unique par event/type | reject hard |
| `ecritures_comptables.created_at` | `created_at` | UTC ISO8601 | date parseable | reject hard |

## Regles de normalisation / conversion / arrondi par domaine critique

1. Auth: emails lowercase, roles dedupes et tries, valeurs vides -> NULL (sauf email).
2. Budget: montants en `decimal(18,2)` avec arrondi half-up; type d'operation strict (`allocation`/`reallocation`).
3. Depense: numero uppercase, cardinalite factures `1..20`, statuts mappes selon workflow cible.
4. Paiement: montant > 0, codes banque uppercase, statuts retour mappes et historises.
5. Comptabilite: debit=credit obligatoire par piece, comptes normalises uppercase, idempotency key obligatoire.

## Cas anormaux et traitement

1. Enregistrement sans `tenant_id`: mettre en quarantaine (`migration_quarantine`) et bloquer le lot.
2. FK orpheline (ex: facture sans bon de commande attendu): rejeter la ligne et produire rapport d'ecart.
3. Statut legacy inconnu: mapper sur `invalide` + action manuelle obligatoire.
4. Montants invalides (NaN, negatif interdit): rejeter la ligne et journaliser code erreur.
5. Doublon metier (meme numero + tenant + exercice): fusion conditionnelle par regle de priorite horodatage.

## Impacts qualite data traces (AC2)

| Anomalie | Metrique | Seuil lot | Severite | Owner | Action |
|---|---|---|---|---|---|
| `tenant_id` manquant | `% records sans tenant` | `0%` | critique | data-architect | reject hard + blocage lot |
| FK orpheline | `% FK non resolues` | `<= 0.1%` (hors perimetre exclu) | elevee | migration-dev | reject + ticket correction |
| Statut inconnu | `% statuts non mappes` | `0%` | elevee | product+data | quarantine + mapping update |
| Montant invalide | `% montants invalides` | `0%` | critique | finance-control | reject + revue source |
| Doublon metier | `% doublons detectes` | `<= 0.05%` | elevee | backend-lead | merge rule + audit |
| Date incoherente | `% dates non parseables/incoherentes` | `<= 0.2%` | moyenne | migration-dev | autocorrect/quarantine |

## Specification de la table de quarantaine `migration_quarantine`

| Colonne | Type | Description |
|---|---|---|
| `id` | UUID PK | Identifiant technique de la ligne en quarantaine |
| `migration_batch_id` | UUID | Correlation vers lot de migration |
| `tenant_id` | UUID NULL | Tenant resolu si disponible |
| `source_table` | TEXT | Table/source d'origine |
| `source_pk` | TEXT | Cle primaire source (serialisee) |
| `target_table` | TEXT | Table cible visee |
| `error_code` | TEXT | Code normalise (`MISSING_TENANT`, `ORPHAN_FK`, etc.) |
| `error_message` | TEXT | Detaillage erreur actionnable |
| `severity` | TEXT | Valeurs autorisees: `critical`, `high`, `medium` |
| `payload_raw` | JSONB | Donnee source brute |
| `payload_transformed` | JSONB | Etat transforme au moment de l'echec |
| `detected_at` | TIMESTAMPTZ | Horodatage detection |
| `detected_by` | TEXT | Composant/pipeline ayant detecte |
| `status` | TEXT | `open`, `in_review`, `resolved`, `ignored` |
| `resolved_at` | TIMESTAMPTZ NULL | Horodatage resolution |
| `resolved_by` | UUID NULL | Utilisateur/agent de resolution |
| `resolution_note` | TEXT NULL | Decision appliquee |

Workflow de resolution:
1. Insertion automatique en quarantaine pendant `Transform`/`Load`.
2. Tri par severite + lot + domaine.
3. Resolution manuelle ou correction source.
4. Rejeu cible des enregistrements resolves via `migration_batch_id`.
5. Cloture lot seulement si anomalies critiques ouvertes = 0.

## Tables source detectees dans le code legacy

`bons_commande`, `comptes`, `comptes_tresorerie`, `depenses`, `ecritures_comptables`, `engagements`, `factures`, `fournisseurs`, `lignes_budgetaires`, `lignes_prevision`, `operations_tresorerie`, `paiements`, `parametres_referentiels`, `projets`, `rapprochements_bancaires`, `recettes`, `regles_comptables`, `reservations_credits`, `scenarios_prevision`, `structures`.

## Decoupage de migration recommande

1. Lot A (deja migre): auth + retention + tenants.
2. Lot B (en cours): budget referentiels + allocations + decisions (store JSON -> PostgreSQL).
3. Lot C: chaine depense (`reservations_credits` -> `paiements`) + ecritures comptables.
4. Lot D: previsions/reporting/tresorerie/rapprochements + analytics.
