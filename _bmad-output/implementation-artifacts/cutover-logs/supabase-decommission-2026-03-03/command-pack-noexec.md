# Supabase Command Pack (NOEXEC)

Date: 2026-03-03
Purpose: prepare commands for M3.3 infra closeout without executing cloud mutations.

## Safety mode

- This file is preparation only.
- Do not run destructive commands without explicit approval.
- Replace placeholders before use:
  - `<PROJECT_REF>`
  - `<FUNCTION_NAME>`
  - `<SECRET_NAME>`
  - `<LINKED_SERVICE>`

## Read-only inspection commands

```bash
supabase functions list --project-ref <PROJECT_REF>
supabase secrets list --project-ref <PROJECT_REF>
supabase projects list
```

```bash
# Optional dashboard/API checks for storage and webhook configuration
echo "Manual check: Storage buckets, object counts, webhook endpoints, signing keys"
```

## Dry-run execution sheet (not to execute yet)

```bash
# Function decommission candidate list (example)
echo "CANDIDATE delete: create-facture -> replaced by POST /factures"
echo "CANDIDATE delete: create-bon-commande -> replaced by POST /bons-commande"
echo "CANDIDATE delete: init-test-users -> replaced by POST /auth/init-test-users"
```

```bash
# Secrets cleanup candidates (example)
echo "CANDIDATE unset: SUPABASE_SERVICE_ROLE_KEY (after final cutover validation)"
echo "CANDIDATE unset: SUPABASE_ANON_KEY (after final cutover validation)"
```

## Destructive commands template (blocked until approval)

```bash
# DO NOT EXECUTE WITHOUT APPROVAL
supabase functions delete <FUNCTION_NAME> --project-ref <PROJECT_REF>
supabase functions deploy --project-ref <PROJECT_REF> --prune
supabase secrets unset <SECRET_NAME> --project-ref <PROJECT_REF>
```

## Approval checklist

1. Replacement endpoint validated in staging/prod-like.
2. Runtime gate green.
3. Smoke tests green.
4. Rollback path documented.
5. Explicit approval recorded.

