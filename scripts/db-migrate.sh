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
MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change-me-local-only}"

export POSTGRES_DB="${APP_DB}"
export POSTGRES_USER="${DB_USER}"
export POSTGRES_PASSWORD

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "Migrations directory not found: ${MIGRATIONS_DIR}" >&2
  exit 1
fi

docker compose up -d "${SERVICE}" >/dev/null
docker compose exec -T "${SERVICE}" sh -lc "until pg_isready -U \"${DB_USER}\" -d postgres; do sleep 1; done" >/dev/null

for attempt in $(seq 1 30); do
  if docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d postgres -c 'SELECT 1;'" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ "${attempt}" == "30" ]]; then
    echo "PostgreSQL is not ready for SQL commands after multiple retries." >&2
    exit 1
  fi
done

docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d postgres -tc \"SELECT 1 FROM pg_database WHERE datname='${APP_DB}'\" | grep -q 1 || psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d postgres -c \"CREATE DATABASE \\\"${APP_DB}\\\";\"" >/dev/null

echo "Applying local DB compatibility bootstrap..."
cat scripts/sql/local-supabase-compat.sql | docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d \"${APP_DB}\"" >/dev/null

echo "Ensuring migration tracking table exists..."
docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d \"${APP_DB}\" -c \"CREATE TABLE IF NOT EXISTS public.schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());\"" >/dev/null

echo "Applying versioned SQL migrations from ${MIGRATIONS_DIR}..."
LEGACY_FIX_1="${MIGRATIONS_DIR}/20250207120000_update_facture_liquidation.sql"
LEGACY_FIX_2="${MIGRATIONS_DIR}/20250207123000_rename_facture_montant_liquide.sql"
MIGRATION_FILES="$(
  find "${MIGRATIONS_DIR}" -maxdepth 1 -type f -name "*.sql" \
    ! -name "20250207120000_update_facture_liquidation.sql" \
    ! -name "20250207123000_rename_facture_montant_liquide.sql" \
    | sort
)"

if [[ -f "${LEGACY_FIX_1}" ]]; then
  MIGRATION_FILES="${MIGRATION_FILES}
${LEGACY_FIX_1}"
fi
if [[ -f "${LEGACY_FIX_2}" ]]; then
  MIGRATION_FILES="${MIGRATION_FILES}
${LEGACY_FIX_2}"
fi

if [[ -z "${MIGRATION_FILES}" ]]; then
  echo "No migration files found."
  exit 0
fi

while IFS= read -r file; do
  version="$(basename "${file}" .sql)"
  already_applied="$(docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d \"${APP_DB}\" -At -c \"SELECT 1 FROM public.schema_migrations WHERE version='${version}' LIMIT 1;\"" </dev/null)"

  if [[ "${already_applied}" == "1" ]]; then
    echo "  - skip ${version} (already applied)"
    continue
  fi

  echo "  - apply ${version}"
  cat "${file}" | docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d \"${APP_DB}\"" >/dev/null
  docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${DB_USER}\" -d \"${APP_DB}\" -c \"INSERT INTO public.schema_migrations(version) VALUES ('${version}');\"" >/dev/null </dev/null
done <<< "${MIGRATION_FILES}"

echo "Migrations applied successfully."
