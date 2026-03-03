# Migration Parity Matrix (Baseline V1)

Date: 2026-03-03  
Owner global: Equipe migration (Max)  
Source de verite: `epics.md` + `sprint-status.yaml` + routes `src/App.tsx` + controllers NestJS

## Legende

- `migre`: flux critique implemente et trace dans sprint status en `done`
- `partiel`: flux disponible mais incomplet, en `review` ou coverage incomplet
- `non migre`: flux critique backlog ou route UI sans backend cible confirme

## Synchronisation stories migration (M*)

| Story | Statut sprint-status | Derniere sync matrice | Commentaire |
|---|---|---|---|
| M2.3 - Reconciler avant/apres sur donnees critiques | `done` | 2026-03-03 | Synchronise avec `/_bmad-output/implementation-artifacts/sprint-status.yaml` |
| M3.1 - Produire le runbook de cutover production | `done` | 2026-03-03 | Runbook cutover, rapport tabletop, procedure rollback M3.2 et corrections review synchronises avec `/_bmad-output/implementation-artifacts/sprint-status.yaml` |
| M3.2 - Tester le plan de rollback operationnel | `done` | 2026-03-03 | Drill rollback staging, preuves d'audit, gate automatisee et updates runbook synchronises avec `/_bmad-output/implementation-artifacts/sprint-status.yaml` |

## Matrice de parite (flux critiques)

| ID | Flux critique | Route/Page | API NestJS cible | Data cible | Couverture story | Statut | Priorite | Owner | Date cible | Dependances techniques/externes |
|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-01 | Login JWT | `/auth/login` | `POST /auth/login` | `public.auth_users`, `public.auth_refresh_tokens` | 2.1 | migre | P0 | Equipe migration | 2026-03-02 | Middleware JWT front + politique rotation refresh token |
| AUTH-02 | Refresh session | `/auth/login` (refresh automatique du client HTTP) | `POST /auth/refresh` | `public.auth_refresh_tokens` | 2.1, 2.5 | migre | P0 | Equipe migration | 2026-03-02 | Intercepteur HTTP + stockage refresh token cote backend |
| AUTH-03 | Logout | `/app/*` (action utilisateur de deconnexion) | `POST /auth/logout` | `public.auth_refresh_tokens` | 2.1 | migre | P1 | Equipe migration | 2026-03-02 | Invalidation refresh token + cleanup session front |
| AUTH-04 | Gestion roles RBAC | `/app/parametres` (section roles a finaliser) | `PATCH /auth/users/:userId/roles/assign`, `PATCH /auth/users/:userId/roles/revoke` | `public.auth_users.roles` | 2.2 | partiel | P0 | Equipe migration | 2026-03-07 | Endpoints backend en place; integration UI gestion des roles a finaliser dans Parametres |
| TENANT-01 | Politique retention tenant | `/app/parametres` (section retention a finaliser) | `GET/PATCH /tenant-policies/retention` | `public.tenant_retention_policies` | 2.3 | partiel | P1 | Equipe migration | 2026-03-07 | Endpoints backend en place; integration UI retention tenant a finaliser |
| BUD-01A | Referentiel budget - Exercices | `/app/structure`, `/app/budgets` | `GET/POST/PATCH/DELETE /budget-referentiels/exercices*` | Store cible transitoire `.data/budget-referentiels.json` (a migrer PostgreSQL) | 3.1 | partiel | P1 | Equipe migration | 2026-03-02 | Contrat: endpoints `budget-referentiels/exercices*`; Prerequis: migration PostgreSQL non finalisee; Services: BudgetReferentielsController + JsonBudgetStore |
| BUD-01B | Referentiel budget - Enveloppes | `/app/enveloppes`, `/app/budgets` | `GET/POST/PATCH/DELETE /budget-referentiels/enveloppes*` | Store cible transitoire `.data/budget-referentiels.json` (a migrer PostgreSQL) | 3.1 | partiel | P1 | Equipe migration | 2026-03-02 | Contrat: endpoints `budget-referentiels/enveloppes*`; Prerequis: migration PostgreSQL non finalisee; Services: BudgetReferentielsController + JsonBudgetStore |
| BUD-01C | Referentiel budget - Sections | `/app/structure`, `/app/budgets` | `GET/POST/PATCH/DELETE /budget-referentiels/sections*` | Store cible transitoire `.data/budget-referentiels.json` (a migrer PostgreSQL) | 3.1 | partiel | P1 | Equipe migration | 2026-03-02 | Contrat: endpoints `budget-referentiels/sections*`; Prerequis: migration PostgreSQL non finalisee; Services: BudgetReferentielsController + JsonBudgetStore |
| BUD-01D | Referentiel budget - Programmes | `/app/structure`, `/app/budgets` | `GET/POST/PATCH/DELETE /budget-referentiels/programmes*` | Store cible transitoire `.data/budget-referentiels.json` (a migrer PostgreSQL) | 3.1 | partiel | P1 | Equipe migration | 2026-03-02 | Contrat: endpoints `budget-referentiels/programmes*`; Prerequis: migration PostgreSQL non finalisee; Services: BudgetReferentielsController + JsonBudgetStore |
| BUD-01E | Referentiel budget - Actions | `/app/structure`, `/app/budgets` | `GET/POST/PATCH/DELETE /budget-referentiels/actions*` | Store cible transitoire `.data/budget-referentiels.json` (a migrer PostgreSQL) | 3.1 | partiel | P1 | Equipe migration | 2026-03-02 | Contrat: endpoints `budget-referentiels/actions*`; Prerequis: migration PostgreSQL non finalisee; Services: BudgetReferentielsController + JsonBudgetStore |
| BUD-02 | Allocations/reallocations | `/app/budgets` | `GET /budget-referentiels/allocations`, `POST /budget-referentiels/allocations`, `POST /budget-referentiels/reallocations` | Store cible transitoire `.data/budget-referentiels.json` | 3.2 | partiel | P0 | Equipe migration | 2026-03-02 | Contrat: endpoints allocations/reallocations; Prerequis: persistance PostgreSQL et idempotence cross-instance; Services: AllocationService + AuditLogService |
| BUD-03 | Versionnement decisions budgetaires | `/app/budgets` | `POST /budget-referentiels/allocations/:id/decision/*`, `GET /budget-referentiels/allocations/:id/decisions*` | Store cible transitoire `.data/budget-referentiels.json` | 3.3 | partiel | P0 | Equipe migration | 2026-03-07 | Workflow validation/rejet + historique versions complet |
| BUD-04 | Previsions + ecarts | `/app/previsions` | Aucun endpoint NestJS implemente a ce jour (gap Epic 3.4, contrat a finaliser) | Aucune table PostgreSQL implementee (cible: schema previsions/ecarts) | 3.4 | non migre | P0 | Equipe migration | 2026-03-15 | Contrats API previsions + schema SQL non finalises |
| OPS-01 | Reservations | `/app/reservations` | Aucun endpoint NestJS implemente a ce jour (gap Epic 4.1) | Aucune table PostgreSQL implementee (cible: domain reservations) | 4.1 | non migre | P0 | Equipe migration | 2026-03-22 | Contrats reservation + validations budgetaires backend |
| OPS-02 | Engagements | `/app/engagements` | Aucun endpoint NestJS implemente a ce jour (gap Epic 4.1) | Aucune table PostgreSQL implementee (cible: domain engagements) | 4.1 | non migre | P0 | Equipe migration | 2026-03-22 | Regles conversion reservation->engagement + roles |
| OPS-03 | Bons de commande | `/app/bons-commande` | Aucun endpoint NestJS implemente a ce jour (gap Epic 4.2) | Aucune table PostgreSQL implementee (cible: domain bons_commande) | 4.2 | non migre | P1 | Equipe migration | 2026-03-29 | Mapping BC<->engagement + pieces justificatives |
| OPS-04 | Factures | `/app/factures` | Aucun endpoint NestJS implemente a ce jour (gap Epic 4.2) | Aucune table PostgreSQL implementee (cible: domain factures) | 4.2 | non migre | P1 | Equipe migration | 2026-03-29 | Cycle facture metier + controles de coherence documentaire |
| OPS-05 | Depenses | `/app/depenses` | Aucun endpoint NestJS implemente a ce jour (gap Epic 4.3) | Aucune table PostgreSQL implementee (cible: domain depenses) | 4.3 | non migre | P0 | Equipe migration | 2026-04-05 | Regles 1..20 factures + idempotence creation depense |
| OPS-06 | Paiements | `/app/paiements` | Aucun endpoint NestJS implemente a ce jour (gap Epic 4.4) | Aucune table PostgreSQL implementee (cible: domain paiements) | 4.4 | non migre | P0 | Equipe migration | 2026-04-05 | Verification ordonnancee + gestion partiels/rejets |
| OPS-07 | Dashboard applicatif | `/app/dashboard` | Aucun endpoint NestJS implemente a ce jour (gap Epic 7.1) | Aucune table PostgreSQL implementee (cible: aggregation KPI) | 7.1 | non migre | P1 | Equipe migration | 2026-04-26 | Pipelines KPI + contrats dashboard |
| OPS-08 | Mandats | `/app/mandats` | Aucun endpoint NestJS implemente a ce jour (backlog Epic 4.x) | Aucune table PostgreSQL implementee (cible: domain mandats) | 4.x | non migre | P1 | Equipe migration | 2026-04-12 | Clarification metier mandat + mapping dans Epic 4 |
| OPS-09 | Fournisseurs | `/app/fournisseurs` | Aucun endpoint NestJS implemente a ce jour (backlog Epic 4.x) | Aucune table PostgreSQL implementee (cible: domain fournisseurs) | 4.x | non migre | P1 | Equipe migration | 2026-04-12 | Contrat CRUD fournisseurs + liens BC/factures |
| OPS-10 | Projets | `/app/projets` | Aucun endpoint NestJS implemente a ce jour (backlog Epic 7.x) | Aucune table PostgreSQL implementee (cible: domain projets) | 7.x | non migre | P1 | Equipe migration | 2026-04-26 | Axes analytiques + rattachement budgetaire |
| RISK-01 | Controle cash + exceptions | `/app/tresorerie`, `/app/controle-interne` | Aucun endpoint NestJS implemente a ce jour (gap Epic 5) | Aucune table PostgreSQL implementee (cible: risk/exceptions) | 5.1-5.4 | non migre | P0 | Equipe migration | 2026-04-12 | Moteur de risque + workflow quorum exceptions |
| ACC-01 | Ecritures comptables et cloture | `/app/plan-comptable`, `/app/journal-comptable` | Aucun endpoint NestJS implemente a ce jour (gap Epic 6) | Aucune table PostgreSQL implementee (cible: ledger/close/reconciliation) | 6.1-6.6 | non migre | P0 | Equipe migration | 2026-04-19 | Moteur double entree + cloture gouvernee |
| AUD-01 | Audit exportable / controle interne | `/app/controle-interne` | Aucun endpoint NestJS implemente a ce jour (gap Epic 7) | Aucune table PostgreSQL implementee (cible: exports audit) | 7.1-7.4 | non migre | P1 | Equipe migration | 2026-04-26 | Dossier audit PDF/ZIP + piste d'audit verifiable |
| LEG-01 | Integration legacy asynchrone | Worker backend asynchrone (sans route UI) | Aucun endpoint/worker NestJS implemente a ce jour (gap Epic 8) | Aucune table PostgreSQL implementee (cible: queue/events integration) | 8.1-8.3 | non migre | P1 | Equipe migration | 2026-05-03 | Connecteurs ERP/Tresor + correlation ID |
| REP-01 | Reporting financier/tresorerie | `/app/reporting`, `/app/analyses` | Aucun endpoint NestJS implemente a ce jour (gap Epic 9/10) | Aucune table PostgreSQL implementee (cible: marts reporting) | 9.1-10.4 | non migre | P1 | Equipe migration | 2026-05-10 | Marts de reporting + exports metier |
| PUB-01 | Vitrine multi-pages + SEO/perf funnel | `/`, `/fonctionnalites`, `/cas-clients`, `/contact` | Frontend public (pas d'endpoint API critique a ce stade) | Aucun stockage metier persistant (parcours vitrine + analytics) | 1.1-1.4 | partiel | P1 | Equipe migration | 2026-03-29 | Routes publiques exposees dans le routeur; contenus dedies + instrumentation FR81/FR90 a finaliser |

## Gaps critiques identifies

1. Les modules budget referentiels (3.1-3.3) sont actifs mais encore sur store JSON transitoire (`.data/budget-referentiels.json`) et non PostgreSQL.
2. La majeure partie des flux coeur finance (Epic 4 a 10) est encore `non migre` malgre presence des pages UI.
3. La vitrine cible (routes publiques FR84-FR90) est exposee au routeur, mais les contenus dedies et la couverture analytics restent a finaliser.
4. La parite “ancien Supabase -> nouveau” est partielle tant que les domaines non migres n'ont pas de mapping data et contrats API valides.
5. Requalification appliquee: les flux budget relies au store JSON transitoire sont marques `partiel` jusqu'a migration PostgreSQL effective.

## Actions suivantes liees a M1.1

1. Valider cette baseline avec metier + tech et ajuster owner/date par flux.
2. Enchainer sur `M2.1` pour mapper source legacy -> cible PostgreSQL par domaine critique.
3. Mettre a jour cette matrice a chaque passage de story `review/done`.
