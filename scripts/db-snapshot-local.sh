#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

SERVICE="${POSTGRES_SERVICE:-postgres}"
LOCAL_DB="${POSTGRES_DB:-agilys}"
LOCAL_DB_USER="${POSTGRES_USER:-agilys_app}"
LOCAL_DB_PASSWORD="${POSTGRES_PASSWORD:-change-me-local-only}"
SEED_DATASET_PATH="${DB_SEED_DATASET_PATH:-output/db-seeds/remote-public-data.sql}"

tmp_dump="$(mktemp -t local-seed-dataset.XXXXXX.sql)"
trap 'rm -f "${tmp_dump}"' EXIT

POSTGRES_DB="${LOCAL_DB}" POSTGRES_USER="${LOCAL_DB_USER}" POSTGRES_PASSWORD="${LOCAL_DB_PASSWORD}" docker compose up -d "${SERVICE}" >/dev/null
POSTGRES_DB="${LOCAL_DB}" POSTGRES_USER="${LOCAL_DB_USER}" POSTGRES_PASSWORD="${LOCAL_DB_PASSWORD}" docker compose exec -T "${SERVICE}" sh -lc \
  "until pg_isready -U \"${LOCAL_DB_USER}\" -d postgres; do sleep 1; done" >/dev/null

POSTGRES_DB="${LOCAL_DB}" POSTGRES_USER="${LOCAL_DB_USER}" POSTGRES_PASSWORD="${LOCAL_DB_PASSWORD}" docker compose exec -T "${SERVICE}" sh -lc \
  "pg_dump --data-only --schema=public --exclude-table=public.schema_migrations --no-owner --no-privileges -U \"${LOCAL_DB_USER}\" \"${LOCAL_DB}\"" \
  > "${tmp_dump}"

mkdir -p "$(dirname "${SEED_DATASET_PATH}")"
sed '/^SET transaction_timeout = /d' "${tmp_dump}" > "${SEED_DATASET_PATH}"

echo "Local seed dataset updated: ${SEED_DATASET_PATH}"
