# M3.3 Supabase Infra Closeout Runbook

Date: 2026-03-03
Story: `m3-3-decommissionner-supabase-de-facon-controlee`
Mode: preparation only (no cloud execution in this runbook)

## 1) Scope and guardrails

- Scope: Edge Functions, webhooks, secrets, storage.
- Out of scope: destructive cloud actions in this phase.
- Rule: no `delete`, no `--prune`, no `secrets unset` without explicit human approval.
- Policy override (2026-03-04): cloud freeze requested by stakeholder; no cloud mutation is part of M3.3 closeout.

## 2) Infra inventory (local evidence)

### 2.1 Edge Functions present in repo

1. `contrepasser-ecritures`
2. `create-bon-commande`
3. `create-depense`
4. `create-engagement`
5. `create-facture`
6. `create-modification-budgetaire`
7. `create-operation-tresorerie`
8. `create-paiement`
9. `create-recette`
10. `create-reservation`
11. `generate-ecritures-comptables`
12. `generate-test-factures`
13. `import-plan-comptable`
14. `init-test-users`

### 2.2 Webhooks

- No webhook declaration found in local repo (`rg "webhook"` returned no runtime config/signature usage).
- Required manual verification in Supabase dashboard and project settings before closeout.

### 2.3 Secrets and env variables to audit

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `SUPABASE_DB_PASSWORD`
- Runtime function code references also expect:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 2.4 Storage

- No active runtime use found in app code paths.
- Legacy examples/docs still mention Supabase storage in documentation files only.
- Required manual verification: buckets and object lifecycle in Supabase dashboard.

## 3) Function replacement map (target)

| Supabase function | Target replacement |
| --- | --- |
| `init-test-users` | `POST /auth/init-test-users` |
| `import-plan-comptable` | `POST /comptes/import-csv` |
| `generate-test-factures` | `POST /factures/generate-test-data` |
| `create-facture` | `POST /factures` |
| `create-bon-commande` | `POST /bons-commande` |
| `create-engagement` | `POST /engagements` |
| `create-reservation` | `POST /reservations` |
| `create-depense` | `POST /depenses` |
| `create-paiement` | `POST /paiements` |
| `create-recette` | `POST /recettes` |
| `create-operation-tresorerie` | `POST /operations-tresorerie` |
| `create-modification-budgetaire` | backend budget module flow (NestJS) |
| `generate-ecritures-comptables` | DB/Nest accounting generation path |
| `contrepasser-ecritures` | accounting reversal flow in backend/domain |

## 4) Remote verification sequence (read-only first)

1. List deployed functions (read-only).
2. List secrets (read-only).
3. Capture storage buckets and object counts (read-only).
4. Confirm webhook endpoints/signing config (read-only).
5. Compare each deployed function with replacement map and traffic.

## 5) Exit criteria before any destructive action

1. Each function has:
   - replacement endpoint validated,
   - smoke test evidence,
   - owner and rollback note.
2. No production traffic depends on function/webhook.
3. Secrets cleanup plan is approved.
4. Storage migration/archive decision is approved.
5. CAB/approval checkpoint is signed.

## 5bis) Exit criteria for "cloud freeze" closeout (no cloud mutation)

1. Zero runtime Supabase gate is PASS on active app surfaces.
2. Function replacement map is documented and current.
3. Read-only cloud inventory evidence is captured and timestamped.
4. Open cloud items (functions/secrets/storage/webhooks) are tracked as accepted deferred scope.
5. Story/report explicitly states that cloud decommission is postponed to a separate approved lot.

## 6) Deferred destructive actions (explicitly not executed here)

- `supabase functions delete <name>`
- `supabase functions deploy --prune`
- `supabase secrets unset <name>`
- bucket/object deletion operations
