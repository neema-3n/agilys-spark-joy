#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_DB="${POSTGRES_DB:-agilys}"
POSTGRES_USER="${POSTGRES_USER:-agilys_app}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change-me-local-only}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD POSTGRES_PORT

echo "Running reset..."
POSTGRES_PORT="${POSTGRES_PORT}" POSTGRES_DB="${POSTGRES_DB}" POSTGRES_USER="${POSTGRES_USER}" POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" pnpm run db:reset

echo "Running migrations..."
POSTGRES_HOST="127.0.0.1" POSTGRES_PORT="${POSTGRES_PORT}" POSTGRES_DB="${POSTGRES_DB}" POSTGRES_USER="${POSTGRES_USER}" POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" pnpm run db:migrate

echo "Running seed..."
POSTGRES_HOST="127.0.0.1" POSTGRES_PORT="${POSTGRES_PORT}" POSTGRES_DB="${POSTGRES_DB}" POSTGRES_USER="${POSTGRES_USER}" POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" pnpm run db:seed

ROW_COUNT="$(POSTGRES_DB="${POSTGRES_DB}" POSTGRES_USER="${POSTGRES_USER}" POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" POSTGRES_PORT="${POSTGRES_PORT}" docker compose exec -T postgres sh -lc "psql -U \"${POSTGRES_USER}\" -d \"${POSTGRES_DB}\" -At -c \"SELECT count(*) FROM public.exercices WHERE client_id='client-demo' AND code='EX-2026';\"")"

if [[ "${ROW_COUNT}" -lt 1 ]]; then
  echo "Verification failed: seeded base data not found." >&2
  exit 1
fi

echo "DB workflow verification passed."
