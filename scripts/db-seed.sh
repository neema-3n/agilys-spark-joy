#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

SERVICE="${POSTGRES_SERVICE:-postgres}"
APP_DB="${POSTGRES_DB:-agilys}"
DB_USER="${POSTGRES_USER:-agilys_app}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change-me-local-only}"
SEED_DATASET_PATH="${DB_SEED_DATASET_PATH:-output/db-seeds/remote-public-data.sql}"
SEED_FALLBACK_SQL="${DB_SEED_FALLBACK_SQL:-scripts/sql/seed-base.sql}"

export POSTGRES_DB="${APP_DB}"
export POSTGRES_USER="${DB_USER}"
export POSTGRES_PASSWORD

docker compose up -d "${SERVICE}" >/dev/null
docker compose exec -T "${SERVICE}" sh -lc "until pg_isready -U \"${DB_USER}\" -d postgres; do sleep 1; done" >/dev/null
docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d postgres -tc \"SELECT 1 FROM pg_database WHERE datname='${APP_DB}'\" | grep -q 1 || psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d postgres -c \"CREATE DATABASE \\\"${APP_DB}\\\";\"" >/dev/null

if [[ -f "${SEED_DATASET_PATH}" && -s "${SEED_DATASET_PATH}" ]]; then
  echo "Applying seed dataset: ${SEED_DATASET_PATH}"
  filtered_seed="$(mktemp -t seed-dataset.filtered.XXXXXX.sql)"
  trap 'rm -f "${filtered_seed}"' EXIT
  sed '/^SET transaction_timeout = /d' "${SEED_DATASET_PATH}" > "${filtered_seed}"

  docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d \"${APP_DB}\" -c \"DO \\\$\\\$ DECLARE stmt text; BEGIN SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' RESTART IDENTITY CASCADE' INTO stmt FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'; IF stmt IS NOT NULL THEN EXECUTE stmt; END IF; END \\\$\\\$;\"" >/dev/null

  {
    echo "SET session_replication_role = replica;"
    cat "${filtered_seed}"
    echo "SET session_replication_role = origin;"
  } | docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d \"${APP_DB}\"" >/dev/null
else
  echo "Applying fallback seed SQL: ${SEED_FALLBACK_SQL}"
  cat "${SEED_FALLBACK_SQL}" | docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d \"${APP_DB}\"" >/dev/null
fi

public_rows="$(docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d \"${APP_DB}\" -At -c \"SELECT COALESCE(sum(rows),0) FROM (SELECT n_live_tup::bigint AS rows FROM pg_stat_user_tables WHERE schemaname='public' AND relname <> 'schema_migrations') t;\"")"
if [[ "${public_rows}" -lt 1 ]]; then
  echo "Seed verification failed: no data loaded into public schema." >&2
  exit 1
fi

echo "Seed data applied successfully."
