#!/usr/bin/env bash
set -euo pipefail

SERVICE="${1:-postgres}"
TABLE="smoke_persistence"

echo "Starting ${SERVICE}..."
docker compose up -d "${SERVICE}"

echo "Waiting for PostgreSQL health..."
docker compose exec -T "${SERVICE}" sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo "Creating persistence smoke table and inserting marker row..."
docker compose exec -T "${SERVICE}" sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -v ON_ERROR_STOP=1 -c \"CREATE TABLE IF NOT EXISTS ${TABLE}(id serial primary key, marker text not null); INSERT INTO ${TABLE}(marker) VALUES ('persist-ok');\""

echo "Restarting stack to validate volume persistence..."
docker compose down
docker compose up -d "${SERVICE}"

echo "Verifying persisted rows after restart..."
ROW_COUNT="$(docker compose exec -T "${SERVICE}" sh -lc "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -At -c \"SELECT count(*) FROM ${TABLE} WHERE marker='persist-ok';\"")"
echo "Persisted marker rows: ${ROW_COUNT}"

if [[ "${ROW_COUNT}" -lt 1 ]]; then
  echo "Persistence verification failed."
  exit 1
fi

echo "PostgreSQL local smoke verification passed."
