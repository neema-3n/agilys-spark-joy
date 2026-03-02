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

REMOTE_DB_URL="${SUPABASE_REMOTE_DB_URL:-}"
REMOTE_POOLER_URL="${SUPABASE_POOLER_URL:-}"
REMOTE_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
AUTO_RESET="${DB_IMPORT_RESET:-1}"
DRY_RUN="${DB_IMPORT_DRY_RUN:-0}"
KEEP_DUMP_FILE="${DB_IMPORT_KEEP_DUMP:-0}"
DUMP_FILE_PATH="${DB_IMPORT_DUMP_FILE:-}"
IMPORT_METHOD="${DB_IMPORT_METHOD:-auto}"
SEED_DATASET_PATH="${DB_SEED_DATASET_PATH:-output/db-seeds/remote-public-data.sql}"

if [[ -z "${REMOTE_DB_URL}" ]]; then
  if [[ -n "${REMOTE_POOLER_URL}" ]]; then
    REMOTE_DB_URL="${REMOTE_POOLER_URL}"
  elif [[ -f "supabase/.temp/pooler-url" ]]; then
    REMOTE_DB_URL="$(cat supabase/.temp/pooler-url)"
  fi
fi

if [[ -z "${REMOTE_DB_URL}" ]]; then
  echo "Missing remote DB URL. Set SUPABASE_REMOTE_DB_URL or SUPABASE_POOLER_URL." >&2
  exit 1
fi

if [[ "${REMOTE_DB_URL}" =~ ^postgres(ql)?://([^:/@?]+)(:[^@?]*)?@(.+)$ ]]; then
  remote_user="${BASH_REMATCH[2]}"
  remote_pass="${BASH_REMATCH[3]}"
  remote_tail="${BASH_REMATCH[4]}"

  if [[ -z "${remote_pass}" ]]; then
    if [[ -z "${REMOTE_PASSWORD}" ]]; then
      echo "Missing SUPABASE_DB_PASSWORD for remote URL without password." >&2
      exit 1
    fi
    REMOTE_DB_URL="postgresql://${remote_user}:${REMOTE_PASSWORD}@${remote_tail}"
  fi
fi

if [[ "${REMOTE_DB_URL}" != *"sslmode="* ]]; then
  if [[ "${REMOTE_DB_URL}" == *"?"* ]]; then
    REMOTE_DB_URL="${REMOTE_DB_URL}&sslmode=require"
  else
    REMOTE_DB_URL="${REMOTE_DB_URL}?sslmode=require"
  fi
fi

if [[ -z "${DUMP_FILE_PATH}" ]]; then
  DUMP_FILE_PATH="$(mktemp -t supabase-data-dump.XXXXXX.sql)"
fi
FILTERED_DUMP_PATH="$(mktemp -t supabase-data-dump.filtered.XXXXXX.sql)"

cleanup() {
  if [[ "${KEEP_DUMP_FILE}" != "1" && -f "${DUMP_FILE_PATH}" ]]; then
    rm -f "${DUMP_FILE_PATH}"
  fi
  if [[ "${KEEP_DUMP_FILE}" != "1" && -f "${FILTERED_DUMP_PATH}" ]]; then
    rm -f "${FILTERED_DUMP_PATH}"
  fi
}
trap cleanup EXIT

echo "Remote import configuration:"
echo "- local target: ${LOCAL_DB} (user: ${LOCAL_DB_USER})"
echo "- source URL host: $(echo "${REMOTE_DB_URL}" | sed -E 's#^postgres(ql)?://([^@]+)@([^/?]+).*#\3#')"
echo "- reset before import: ${AUTO_RESET}"

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "Dry run enabled. No dump/import executed."
  exit 0
fi

if [[ "${AUTO_RESET}" == "1" ]]; then
  echo "Resetting local DB before remote import..."
  POSTGRES_DB="${LOCAL_DB}" POSTGRES_USER="${LOCAL_DB_USER}" POSTGRES_PASSWORD="${LOCAL_DB_PASSWORD}" pnpm run db:reset
fi

echo "Dumping remote Supabase data (schema public, data-only)..."
dump_with_pg_dump() {
  pg_dump \
    --data-only \
    --schema=public \
    --exclude-table=public.schema_migrations \
    --no-owner \
    --no-privileges \
    --file "${DUMP_FILE_PATH}" \
    "${REMOTE_DB_URL}"
}

dump_with_supabase_cli() {
  supabase db dump \
    --data-only \
    --schema public \
    --exclude public.schema_migrations \
    --db-url "${REMOTE_DB_URL}" \
    --file "${DUMP_FILE_PATH}" \
    --use-copy
}

case "${IMPORT_METHOD}" in
  pg_dump)
    dump_with_pg_dump
    ;;
  supabase)
    dump_with_supabase_cli
    ;;
  auto)
    if command -v pg_dump >/dev/null 2>&1; then
      if ! dump_with_pg_dump; then
        echo "pg_dump failed, trying supabase db dump fallback..."
        dump_with_supabase_cli
      fi
    else
      dump_with_supabase_cli
    fi
    ;;
  *)
    echo "Unknown DB_IMPORT_METHOD: ${IMPORT_METHOD} (expected: auto|pg_dump|supabase)" >&2
    exit 1
    ;;
esac

echo "Importing dump into local PostgreSQL..."
sed '/^SET transaction_timeout = /d' "${DUMP_FILE_PATH}" > "${FILTERED_DUMP_PATH}"
POSTGRES_DB="${LOCAL_DB}" POSTGRES_USER="${LOCAL_DB_USER}" POSTGRES_PASSWORD="${LOCAL_DB_PASSWORD}" docker compose up -d "${SERVICE}" >/dev/null
POSTGRES_DB="${LOCAL_DB}" POSTGRES_USER="${LOCAL_DB_USER}" POSTGRES_PASSWORD="${LOCAL_DB_PASSWORD}" docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${LOCAL_DB_USER}\" -d \"${LOCAL_DB}\" -c \"DO \\\$\\\$ DECLARE stmt text; BEGIN SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' RESTART IDENTITY CASCADE' INTO stmt FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'; IF stmt IS NOT NULL THEN EXECUTE stmt; END IF; END \\\$\\\$;\"" >/dev/null
{
  echo "SET session_replication_role = replica;"
  cat "${FILTERED_DUMP_PATH}"
  echo "SET session_replication_role = origin;"
} | POSTGRES_DB="${LOCAL_DB}" POSTGRES_USER="${LOCAL_DB_USER}" POSTGRES_PASSWORD="${LOCAL_DB_PASSWORD}" docker compose exec -T "${SERVICE}" sh -lc "psql -v ON_ERROR_STOP=1 -U \"${LOCAL_DB_USER}\" -d \"${LOCAL_DB}\"" >/dev/null

mkdir -p "$(dirname "${SEED_DATASET_PATH}")"
cp "${FILTERED_DUMP_PATH}" "${SEED_DATASET_PATH}"
echo "Seed dataset refreshed: ${SEED_DATASET_PATH}"

echo "Remote data import completed successfully."
if [[ "${KEEP_DUMP_FILE}" == "1" ]]; then
  echo "Dump preserved at: ${DUMP_FILE_PATH}"
fi
