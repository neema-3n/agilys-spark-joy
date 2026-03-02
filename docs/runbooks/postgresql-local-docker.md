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
