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
SERVICE="${POSTGRES_SERVICE:-postgres}"

export POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD POSTGRES_PORT

echo "Resetting local PostgreSQL docker volume (destructive)..."
POSTGRES_DB="${POSTGRES_DB}" POSTGRES_USER="${POSTGRES_USER}" POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" POSTGRES_PORT="${POSTGRES_PORT}" docker compose down -v
POSTGRES_DB="${POSTGRES_DB}" POSTGRES_USER="${POSTGRES_USER}" POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" POSTGRES_PORT="${POSTGRES_PORT}" docker compose up -d "${SERVICE}"
POSTGRES_DB="${POSTGRES_DB}" POSTGRES_USER="${POSTGRES_USER}" POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" POSTGRES_PORT="${POSTGRES_PORT}" docker compose exec -T "${SERVICE}" sh -lc 'until pg_isready -U "$POSTGRES_USER" -d postgres; do sleep 1; done'

echo "Replaying migrations after reset..."
POSTGRES_SERVICE="${SERVICE}" POSTGRES_DB="${POSTGRES_DB}" POSTGRES_USER="${POSTGRES_USER}" POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" bash ./scripts/db-migrate.sh

echo "Local DB reset completed."
