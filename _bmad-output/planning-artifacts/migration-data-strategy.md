# Migration Data Strategy (V1)

Date: 2026-03-02  
Objectif: executer une migration data progressive, idempotente et auditable vers PostgreSQL/NestJS.

## Principes d'execution

1. Migration par lots fonctionnels, jamais en big-bang.
2. Chaque lot est idempotent et rejouable.
3. Aucune bascule lot sans pre-check + post-check + rapport.
4. Tout ecart critique bloque la progression vers le lot suivant.

## Ordre des lots

### Lot A - Fondations d'identite et gouvernance (etat: realise)

- Entites: `auth_users`, `auth_refresh_tokens`, `tenants`, `tenant_retention_policies`
- Prerequis: migrations SQL appliquees, variables env auth valides
- Post-check:
  - login/refresh/logout OK
  - policies retention lisibles/modifiables

### Lot B - Budget referentiels et arbitrages (etat: en cours)

- Entites source: `.data/budget-referentiels.json`, `lignes_budgetaires`, `modifications_budgetaires`
- Cible: tables PostgreSQL budget referentiels/allocations/decision versions
- Prerequis:
  - schema cible cree
  - mapping validé (`migration-data-mapping.md`)
- Post-check:
  - CRUD referentiels OK
  - allocations/reallocations coherentes
  - decisions versionnees consultables/comparees

### Lot C - Chaine depense coeur (etat: a lancer)

- Entites: `reservations_credits`, `engagements`, `bons_commande`, `factures`, `depenses`, `paiements`, `ecritures_comptables`
- Prerequis:
  - API NestJS Epic 4 minimum disponibles
  - regles metier transitions et controle debit=credit definies
- Post-check:
  - parcours reservation -> paiement passant
  - reconciliation montants et statuts sans ecart critique

### Lot D - Previsions, tresorerie, reporting et rapprochements (etat: a lancer)

- Entites: `scenarios_prevision`, `lignes_prevision`, `operations_tresorerie`, `rapprochements_bancaires`, `projets`, `regles_comptables`, `parametres_referentiels`
- Prerequis:
  - API NestJS epics 5, 6, 9, 10 disponibles
  - strategie d'agregation et exports validee
- Post-check:
  - rapports critiques generes sans ecart bloquant
  - indicateurs p50/p95 disponibles

## Pipeline type par lot

1. **Pre-check**
   - verifier schema cible
   - verifier acces DB + quotas
   - figer snapshot source (ou watermark)

2. **Extract**
   - extraire par tenant et exercice
   - ajouter correlation id de lot

3. **Transform**
   - appliquer mapping colonne par colonne
   - normaliser statuts/dates/montants
   - detecter anomalies

4. **Load**
   - chargement transactionnel par batch
   - upsert idempotent
   - journal de migration par lot

5. **Post-check**
   - controles cardinalite
   - controles coherence metier
   - comparaison echantillons avant/apres

6. **Decision**
   - `PASS`: lot valide
   - `FAIL`: rollback lot + corrections + re-run

## Criteres d'acceptation de lot

1. Ecart cardinalite critique: `0`.
2. Ecart montants critiques (controle): `0`.
3. Taux de rejet hors seuil: `< 0.5%` (hors cas explicitement exclus).
4. Tous les rejets doivent etre traces dans un rapport actionnable.

## Strategie d'anomalies

1. **Reject hard**: donnees invalides bloquantes (tenant absent, FK impossible, montant impossible).
2. **Quarantine**: donnees inexploitables non bloquantes, stockees pour correction manuelle.
3. **Autocorrect**: normalisations deterministes (trim, casse email, format date) avec journalisation.
4. **Replay**: relancer uniquement les sous-lots en echec via watermark/batch id.

## Rollback lot

1. Chaque lot charge dans une transaction ou partition temp dediee.
2. En cas d'echec post-check: rollback transactionnel ou suppression partitionnee par `migration_batch_id`.
3. Aucun rollback global tant que les lots precedents sont valides.

## Evidence et audit

Artefacts obligatoires par lot:

1. `migration-report-<lot>-<date>.md`
2. `migration-anomalies-<lot>-<date>.csv`
3. `migration-reconciliation-<lot>-<date>.md`
4. Logs applicatifs avec correlation id

## Go/No-Go cutover data

Go si et seulement si:

1. Lots A a D valides selon criteres.
2. Aucune anomalie critique ouverte.
3. Reconciliation globale signee metier + technique.
4. Runbook rollback repete avec succes.
