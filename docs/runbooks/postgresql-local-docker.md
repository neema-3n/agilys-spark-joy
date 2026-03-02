# PostgreSQL local via Docker

Ce runbook permet de demarrer PostgreSQL localement sans installation SGBD native.

## Prerequis

- Docker Desktop (ou Docker Engine) installe et demarre
- Commande `docker compose` disponible
- Variables PostgreSQL definies dans `.env` (voir `.env.example`)

## Demarrage

```bash
docker compose up -d postgres
```

Si le port `5432` est deja occupe sur la machine:

```bash
POSTGRES_PORT=55432 docker compose up -d postgres
```

## Verification healthcheck

```bash
docker compose ps postgres
docker compose exec postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Etat attendu:
- service `postgres` avec status `healthy`
- commande `pg_isready` retourne `accepting connections`

## Logs

```bash
docker compose logs -f postgres
```

## Arret

```bash
docker compose stop postgres
```

## Arret + suppression conteneur/reseau

```bash
docker compose down
```

## Reset complet des donnees (attention destructif)

```bash
docker compose down -v
```

## Persistance des donnees

Les donnees persistent dans le volume Docker nomme `agilys_postgres_data`.

Procedure de verification rapide:
1. Creer une table ou inserer une ligne dans PostgreSQL.
2. Executer `docker compose down`.
3. Redemarrer `docker compose up -d postgres`.
4. Verifier que les donnees sont toujours presentes.

Verification reproductible automatisee:

```bash
./scripts/verify-postgres-local.sh
```

## Migrations versionnees et seed (Story CC-01.03)

Prerequis:
- Avoir `pnpm` installe
- Avoir initialise les variables PostgreSQL locales (`.env.example` -> `.env`)

Ordre recommande:

```bash
pnpm run db:reset
pnpm run db:seed
```

Details:
- `db:migrate`: applique toutes les migrations SQL versionnees (`supabase/migrations/*.sql`) avec suivi `public.schema_migrations` (utile sur une base deja initialisee, sans reset).
- `db:reset`: reset destructif (volume Docker), redemarrage PostgreSQL, puis rejeu complet des migrations (donc `db:migrate` est deja inclus).
- `db:seed`: injecte des donnees de base rejouables (exercice/enveloppe de demo).

Verification complete:

```bash
pnpm run db:verify
```

## Importer des donnees reelles Supabase vers local

Cette procedure importe les donnees `public` de Supabase vers PostgreSQL local.

Variables attendues:
- `SUPABASE_DB_PASSWORD` (deja present dans `.env` actuel)
- Optionnel `SUPABASE_REMOTE_DB_URL` (sinon auto-resolution via `supabase/.temp/pooler-url`)

Execution standard (recommandee):

```bash
pnpm run db:import:remote
```

Comportement:
- reset local automatique avant import (`DB_IMPORT_RESET=1` par defaut),
- dump data-only schema `public`,
- import du dump dans la DB locale,
- mise a jour automatique du dataset local reutilisable par `db:seed`:
  - `output/db-seeds/remote-public-data.sql`.

Mode test sans execution:

```bash
DB_IMPORT_DRY_RUN=1 pnpm run db:import:remote
```

Conserver le fichier dump:

```bash
DB_IMPORT_KEEP_DUMP=1 pnpm run db:import:remote
```

## Mettre a jour le dataset seed depuis la DB locale

Quand vous modifiez des donnees localement et voulez les reutiliser comme seed:

```bash
pnpm run db:snapshot:local
```

Ensuite `pnpm run db:seed` rechargera ce dataset en priorite.
