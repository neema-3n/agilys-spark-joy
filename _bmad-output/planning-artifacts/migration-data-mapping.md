# Migration Data Mapping (Baseline V1)

Date: 2026-03-02  
Scope: mapping source legacy (Supabase + stores transitoires) -> cible NestJS/PostgreSQL

## Regles globales de mapping

1. Les identifiants UUID legacy sont conserves quand possible pour reduire les tables de correspondance.
2. Toutes les entites cibles critiques doivent porter `tenant_id` et `exercice_id` si applicable.
3. Les timestamps sont normalises en UTC ISO8601.
4. Les statuts legacy doivent etre mappes vers enums cibles explicites (pas de string libre).
5. Les doublons techniques sont traites par idempotence (`ON CONFLICT DO UPDATE` ou hash metier).

## Mapping par domaine

| Domaine | Source legacy | Cible migration | Regles de transformation | Etat |
|---|---|---|---|---|
| Auth utilisateurs | `auth.users` (Supabase) + seeds locaux | `public.auth_users` | Email lowercase, roles normalises array unique, `is_active=true` | migre (partiel seeds) |
| Auth refresh tokens | Supabase session/token legacy | `public.auth_refresh_tokens` | Stockage hash token uniquement, revoke timestamp, rotation JTI | migre |
| Catalogue tenants | Legacy implicite via utilisateurs | `public.tenants` | Creer tenant si absent, `is_active=true`, lien users->tenant | migre (minimal) |
| Politiques retention | Legacy config variable/non versionnee | `public.tenant_retention_policies` | Version incrementale, `is_current=true` unique par tenant/policy | migre |
| Referentiels budget (new API) | Store JSON `.data/budget-referentiels.json` | PostgreSQL (tables a creer: `budget_exercices`, `budget_enveloppes`, `budget_sections`, `budget_programmes`, `budget_actions`) | Mapping 1:1 des attributs metier, conservation `createdBy/updatedAt` | partiel (cible SQL non finalisee) |
| Allocations/reallocations | Store JSON `.data/budget-referentiels.json` + legacy `modifications_budgetaires` | PostgreSQL (table cible: `budget_allocations`) | Harmoniser operationType (`allocation`/`reallocation`), recalcul soldes, conserver motif/auteur/dateValidation | partiel |
| Versions decisions | Store JSON `.data/budget-referentiels.json` | PostgreSQL (table cible: `budget_decision_versions`) | Version monotone par allocation, snapshots avant/apres immuables | partiel |
| Lignes budgetaires | `lignes_budgetaires` | PostgreSQL cible budget (`lignes_budgetaires` ou table renommee) | Normaliser montants en numeric(18,2), verifier non-negatif et cohérence dispo | non migre |
| Reservations | `reservations_credits` | PostgreSQL `reservations_credits` | Mapping statut workflow, FK ligne budgetaire obligatoire | non migre |
| Engagements | `engagements` | PostgreSQL `engagements` | Lien reservation optionnel, lien ligne budgetaire obligatoire | non migre |
| Bons de commande | `bons_commande` | PostgreSQL `bons_commande` | Conserver references et liens engagement/fournisseur | non migre |
| Factures | `factures` | PostgreSQL `factures` | Mapping cycle facture, pieces justificatives et metadonnees | non migre |
| Depenses | `depenses` | PostgreSQL `depenses` | Validation limite `1..20` factures et statut depense cible | non migre |
| Paiements | `paiements` | PostgreSQL `paiements` | Mapping statuts retour banque, gestion partiels/rejets | non migre |
| Ecritures comptables | `ecritures_comptables` | PostgreSQL `ecritures_comptables` | Controle debit=credit, idempotence generation, contre-passation | non migre |
| Previsions | `scenarios_prevision`, `lignes_prevision` | PostgreSQL `scenarios_prevision`, `lignes_prevision` | Normaliser periode et type scenario, recalcul ecarts vs execution | non migre |
| Tresorerie operations | `operations_tresorerie` | PostgreSQL `operations_tresorerie` | Correlation avec paiements/depenses, statut rapprochement | non migre |
| Rapprochements bancaires | `rapprochements_bancaires` | PostgreSQL `rapprochements_bancaires` | Mapping auto/manual match, qualification ecarts | non migre |
| Referentiels parametres | `parametres_referentiels` | PostgreSQL `parametres_referentiels` | Versionner valeurs sensibles, audit update | non migre |
| Projets | `projets` | PostgreSQL `projets` | Reconciliation montants `budget_alloue/consomme/engage` | non migre |
| Comptes | `comptes` | PostgreSQL `comptes` | Validation classes/comptes/sous-comptes, statut actif | non migre |
| Regles comptables | `regles_comptables` | PostgreSQL `regles_comptables` | Mapping evenement->schema ecriture, version/date effet | non migre |
| Fournisseurs | `fournisseurs` | PostgreSQL `fournisseurs` | Normalisation identifiants fiscaux et contacts | non migre |
| Recettes | `recettes` | PostgreSQL `recettes` | Mapping mode encaissement et affectation analytique | non migre |
| Structures | `structures` | PostgreSQL `structures` | Mapping hierarchie organisationnelle, statut actif/archive | non migre |
| Comptes tresorerie | `comptes_tresorerie` | PostgreSQL `comptes_tresorerie` | Normaliser devise/banque/solde initial | non migre |

## Cas anormaux et traitement

1. Enregistrement sans `tenant_id`: mettre en quarantaine (`migration_quarantine`) et bloquer le lot.
2. FK orpheline (ex: facture sans bon de commande attendu): rejeter la ligne et produire rapport d'ecart.
3. Statut legacy inconnu: mapper sur `invalide` + action manuelle obligatoire.
4. Montants invalides (NaN, negatif interdit): rejeter la ligne et journaliser code erreur.
5. Doublon metier (meme numero + tenant + exercice): fusion conditionnelle par regle de priorite horodatage.

## Tables source detectees dans le code legacy

`bons_commande`, `comptes`, `comptes_tresorerie`, `depenses`, `ecritures_comptables`, `engagements`, `factures`, `fournisseurs`, `lignes_budgetaires`, `lignes_prevision`, `operations_tresorerie`, `paiements`, `parametres_referentiels`, `projets`, `rapprochements_bancaires`, `recettes`, `regles_comptables`, `reservations_credits`, `scenarios_prevision`, `structures`.

## Decoupage de migration recommande

1. Lot A (deja migre): auth + retention + tenants.
2. Lot B (en cours): budget referentiels + allocations + decisions (store JSON -> PostgreSQL).
3. Lot C: chaine depense (`reservations_credits` -> `paiements`) + ecritures comptables.
4. Lot D: previsions/reporting/tresorerie/rapprochements + analytics.
