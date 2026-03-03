# Runbook Lot B - Backfill idempotent par lots

## Objectif

Migrer les donnees Lot B (referentiels budget, allocations, decisions) depuis un snapshot JSON vers PostgreSQL, avec reprise selective et sans doublons.

## Format standard `migration_batch_id`

Format: `lot-b-<tenant>-<YYYYMMDDHHmmss>-<hash8>`

Exemple: `lot-b-client-demo-20260303103045-a1b2c3d4`

- `lot-b`: identifie le lot metier.
- `tenant`: identifiant tenant normalise.
- `YYYYMMDDHHmmss`: horodatage UTC du lancement.
- `hash8`: suffixe anti-collision.

## Watermark par domaine

Format: `<domain>:<chunkIndex>/<chunkTotal>`

Exemples:
- `exercices:1/1`
- `sections:2/5`
- `allocations:4/12`

La reprise traite uniquement les sous-lots non `success` (ou hash source modifie).

## Prerequis

1. PostgreSQL local demarre via `docker compose`.
2. Migrations appliquees:
   - `pnpm run db:migrate`
3. Fichier source snapshot present (exemple):
   - `backend/.data/budget-referentiels.test.json`

## Commande d'execution

Depuis la racine du repo:

```bash
pnpm --dir backend run migrate:lot-b -- \
  --source backend/.data/budget-referentiels.test.json \
  --chunk-size 100 \
  --max-retries 2 \
  --actor-id migration-bot \
  --resume true
```

## Commande de reprise apres incident

Reprendre avec le meme `migration_batch_id`:

```bash
pnpm --dir backend run migrate:lot-b -- \
  --source backend/.data/budget-referentiels.test.json \
  --batch-id lot-b-client-demo-20260303103045-a1b2c3d4 \
  --chunk-size 100 \
  --max-retries 2 \
  --resume true
```

## Journalisation standard

- Niveau batch: `public.migration_batches`
  - volumes (inserts/updates/rejects), retries, erreurs, duree.
- Niveau sous-lot: `public.migration_batch_sub_lots`
  - domaine, watermark, hash source, retries, anomalies, erreur eventuelle.
- Dedoublonnage metier: `public.migration_business_hash_registry`
  - hash metier par cle metier et domaine.

## Verification rapide

```sql
SELECT id, status, total_inserts, total_updates, total_rejects, total_errors, retry_count, duration_ms
FROM public.migration_batches
ORDER BY started_at DESC
LIMIT 5;
```

```sql
SELECT batch_id, domain, watermark, status, inserts_count, updates_count, rejects_count, retry_count, error_message
FROM public.migration_batch_sub_lots
WHERE batch_id = '<migration_batch_id>'
ORDER BY domain, watermark;
```
