# Migration Parity Matrix (Baseline V1)

Date: 2026-03-02  
Owner global: Equipe migration (Max)  
Source de verite: `epics.md` + `sprint-status.yaml` + routes `src/App.tsx` + controllers NestJS

## Legende

- `migre`: flux critique implemente et trace dans sprint status en `done`
- `partiel`: flux disponible mais incomplet, en `review` ou coverage incomplet
- `non migre`: flux critique backlog ou route UI sans backend cible confirme

## Matrice de parite (flux critiques)

| ID | Flux critique | Route/Page | API NestJS cible | Data cible | Couverture story | Statut | Owner | Date cible |
|---|---|---|---|---|---|---|---|---|
| AUTH-01 | Login JWT | `/auth/login` | `POST /auth/login` | `public.auth_users`, `public.auth_refresh_tokens` | 2.1 | migre | Equipe migration | 2026-03-02 |
| AUTH-02 | Refresh session | N/A (http client auto-refresh) | `POST /auth/refresh` | `public.auth_refresh_tokens` | 2.1, 2.5 | migre | Equipe migration | 2026-03-02 |
| AUTH-03 | Logout | N/A | `POST /auth/logout` | `public.auth_refresh_tokens` | 2.1 | migre | Equipe migration | 2026-03-02 |
| AUTH-04 | Gestion roles RBAC | `/app/parametres` (section roles) | `PATCH /auth/users/:userId/roles/assign`, `PATCH /auth/users/:userId/roles/revoke` | `public.auth_users.roles` | 2.2 | migre | Equipe migration | 2026-03-02 |
| TENANT-01 | Politique retention tenant | `/app/parametres` | `GET/PATCH /tenant-policies/retention` | `public.tenant_retention_policies` | 2.3 | migre | Equipe migration | 2026-03-02 |
| BUD-01A | Referentiel budget - Exercices | `/app/structure`, `/app/budgets` | `GET/POST/PATCH/DELETE /budget-referentiels/exercices*` | Store cible transitoire `.data/budget-referentiels.json` (a migrer PostgreSQL) | 3.1 | migre | Equipe migration | 2026-03-02 |
| BUD-01B | Referentiel budget - Enveloppes | `/app/enveloppes`, `/app/budgets` | `GET/POST/PATCH/DELETE /budget-referentiels/enveloppes*` | Store cible transitoire `.data/budget-referentiels.json` (a migrer PostgreSQL) | 3.1 | migre | Equipe migration | 2026-03-02 |
| BUD-01C | Referentiel budget - Sections | `/app/structure`, `/app/budgets` | `GET/POST/PATCH/DELETE /budget-referentiels/sections*` | Store cible transitoire `.data/budget-referentiels.json` (a migrer PostgreSQL) | 3.1 | migre | Equipe migration | 2026-03-02 |
| BUD-01D | Referentiel budget - Programmes | `/app/structure`, `/app/budgets` | `GET/POST/PATCH/DELETE /budget-referentiels/programmes*` | Store cible transitoire `.data/budget-referentiels.json` (a migrer PostgreSQL) | 3.1 | migre | Equipe migration | 2026-03-02 |
| BUD-01E | Referentiel budget - Actions | `/app/structure`, `/app/budgets` | `GET/POST/PATCH/DELETE /budget-referentiels/actions*` | Store cible transitoire `.data/budget-referentiels.json` (a migrer PostgreSQL) | 3.1 | migre | Equipe migration | 2026-03-02 |
| BUD-02 | Allocations/reallocations | `/app/budgets` | `GET /budget-referentiels/allocations`, `POST /budget-referentiels/allocations`, `POST /budget-referentiels/reallocations` | Store cible transitoire `.data/budget-referentiels.json` | 3.2 | migre | Equipe migration | 2026-03-02 |
| BUD-03 | Versionnement decisions budgetaires | `/app/budgets` | `POST /budget-referentiels/allocations/:id/decision/*`, `GET /budget-referentiels/allocations/:id/decisions*` | Store cible transitoire `.data/budget-referentiels.json` | 3.3 | partiel | Equipe migration | 2026-03-07 |
| BUD-04 | Previsions + ecarts | `/app/previsions` | API cible a finaliser | PostgreSQL (schema previsions/ecarts a definir) | 3.4 | non migre | Equipe migration | 2026-03-15 |
| OPS-01 | Reservations | `/app/reservations` | API cible a creer (Epic 4) | PostgreSQL (domain reservations) | 4.1 | non migre | Equipe migration | 2026-03-22 |
| OPS-02 | Engagements | `/app/engagements` | API cible a creer (Epic 4) | PostgreSQL (domain engagements) | 4.1 | non migre | Equipe migration | 2026-03-22 |
| OPS-03 | Bons de commande | `/app/bons-commande` | API cible a creer (Epic 4) | PostgreSQL (domain bons_commande) | 4.2 | non migre | Equipe migration | 2026-03-29 |
| OPS-04 | Factures | `/app/factures` | API cible a creer (Epic 4) | PostgreSQL (domain factures) | 4.2 | non migre | Equipe migration | 2026-03-29 |
| OPS-05 | Depenses | `/app/depenses` | API cible a creer (Epic 4) | PostgreSQL (domain depenses) | 4.3 | non migre | Equipe migration | 2026-04-05 |
| OPS-06 | Paiements | `/app/paiements` | API cible a creer (Epic 4) | PostgreSQL (domain paiements) | 4.4 | non migre | Equipe migration | 2026-04-05 |
| RISK-01 | Controle cash + exceptions | `/app/tresorerie`, `/app/controle-interne` | API cible a creer (Epic 5) | PostgreSQL (risk/exceptions) | 5.1-5.4 | non migre | Equipe migration | 2026-04-12 |
| ACC-01 | Ecritures comptables et cloture | `/app/plan-comptable`, `/app/journal-comptable` | API cible a creer (Epic 6) | PostgreSQL (ledger/close/reconciliation) | 6.1-6.6 | non migre | Equipe migration | 2026-04-19 |
| AUD-01 | Audit exportable / controle interne | `/app/controle-interne` | API cible a creer (Epic 7) | PostgreSQL + exports | 7.1-7.4 | non migre | Equipe migration | 2026-04-26 |
| LEG-01 | Integration legacy asynchrone | N/A (backend integration) | API/worker cible a creer (Epic 8) | PostgreSQL + queue/events | 8.1-8.3 | non migre | Equipe migration | 2026-05-03 |
| REP-01 | Reporting financier/tresorerie | `/app/reporting`, `/app/analyses` | API cible a creer (Epic 9/10) | PostgreSQL + aggregation | 9.1-10.4 | non migre | Equipe migration | 2026-05-10 |
| PUB-01 | Vitrine multi-pages + SEO/perf funnel | `/`, `/fonctionnalites`, `/cas-clients`, `/contact` | N/A (frontend public + analytics) | N/A | 1.1-1.4 | non migre | Equipe migration | 2026-03-29 |

## Gaps critiques identifies

1. Les modules budget referentiels (3.1-3.3) sont actifs mais encore sur store JSON transitoire (`.data/budget-referentiels.json`) et non PostgreSQL.
2. La majeure partie des flux coeur finance (Epic 4 a 10) est encore `non migre` malgre presence des pages UI.
3. La vitrine cible (routes publiques FR84-FR90) n'est pas encore deployee dans le routeur.
4. La parite “ancien Supabase -> nouveau” est partielle tant que les domaines non migres n'ont pas de mapping data et contrats API valides.

## Actions suivantes liees a M1.1

1. Valider cette baseline avec metier + tech et ajuster owner/date par flux.
2. Enchainer sur `M2.1` pour mapper source legacy -> cible PostgreSQL par domaine critique.
3. Mettre a jour cette matrice a chaque passage de story `review/done`.
