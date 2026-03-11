#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

WEB_PORT="${WEB_PORT:-8080}"
API_PORT="${API_PORT:-3001}"
DB_PORT="${DB_PORT:-${POSTGRES_PORT:-5432}}"
POSTGRES_DB="${POSTGRES_DB:-agilys}"
POSTGRES_USER="${POSTGRES_USER:-agilys_app}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change-me-local-only}"
API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-${VITE_API_BASE_URL:-http://localhost:${API_PORT}}}"
JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-dev-access-secret}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-dev-refresh-secret}"
JWT_ACCESS_TTL_SECONDS="${JWT_ACCESS_TTL_SECONDS:-900}"
JWT_REFRESH_TTL_SECONDS="${JWT_REFRESH_TTL_SECONDS:-604800}"

is_port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltn "( sport = :${port} )" 2>/dev/null | tail -n +2 | grep -q .
    return $?
  fi

  if command -v netstat >/dev/null 2>&1; then
    netstat -an 2>/dev/null | grep -E "[\.:]${port}[[:space:]].*LISTEN" >/dev/null 2>&1
    return $?
  fi

  return 1
}

ensure_port_available() {
  local name="$1"
  local port="$2"

  if is_port_in_use "${port}"; then
    echo "[dev] ${name}=${port} est deja utilise par un autre processus local." >&2
    exit 1
  fi
}

wait_for_postgres_ready() {
  local max_attempts=30
  local attempt

  for attempt in $(seq 1 "${max_attempts}"); do
    if docker_compose_postgres exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "[dev] PostgreSQL n'est pas pret apres ${max_attempts}s. Verifier les logs Docker." >&2
  exit 1
}

if [[ "${WEB_PORT}" == "${API_PORT}" || "${WEB_PORT}" == "${DB_PORT}" || "${API_PORT}" == "${DB_PORT}" ]]; then
  echo "[dev] WEB_PORT, API_PORT et DB_PORT doivent etre distincts (actuel: WEB=${WEB_PORT}, API=${API_PORT}, DB=${DB_PORT})." >&2
  exit 1
fi

if [[ "${DEV_SKIP_PORT_AVAILABILITY_CHECK:-0}" != "1" ]]; then
  ensure_port_available "WEB_PORT" "${WEB_PORT}"
  ensure_port_available "API_PORT" "${API_PORT}"
fi

if [[ "${DEV_VALIDATE_ONLY:-0}" == "1" ]]; then
  echo "WEB_PORT=${WEB_PORT}"
  echo "API_PORT=${API_PORT}"
  echo "DB_PORT=${DB_PORT}"
  echo "NEXT_PUBLIC_API_BASE_URL=${API_BASE_URL}"
  echo "docker_compose_port_binding=${DB_PORT}:5432"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[dev] Docker est requis pour demarrer la base locale." >&2
  exit 1
fi

cd "${ROOT_DIR}"

docker_compose_postgres() {
  POSTGRES_DB="${POSTGRES_DB}" \
  POSTGRES_USER="${POSTGRES_USER}" \
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  POSTGRES_PORT="${DB_PORT}" \
    docker compose "$@"
}

cleanup() {
  local exit_code=$?

  if [[ -n "${WEB_PID:-}" ]] && kill -0 "${WEB_PID}" >/dev/null 2>&1; then
    kill "${WEB_PID}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${API_PID:-}" ]] && kill -0 "${API_PID}" >/dev/null 2>&1; then
    kill "${API_PID}" >/dev/null 2>&1 || true
  fi

  wait "${WEB_PID:-}" "${API_PID:-}" 2>/dev/null || true
  exit "${exit_code}"
}

trap cleanup INT TERM EXIT

echo "[dev] Demarrage PostgreSQL (DB_PORT=${DB_PORT})..."
docker_compose_postgres up -d postgres >/dev/null

wait_for_postgres_ready

echo "[dev] Demarrage API NestJS (API_PORT=${API_PORT})..."
PORT="${API_PORT}" \
JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET}" \
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}" \
JWT_ACCESS_TTL_SECONDS="${JWT_ACCESS_TTL_SECONDS}" \
JWT_REFRESH_TTL_SECONDS="${JWT_REFRESH_TTL_SECONDS}" \
  pnpm --dir backend run start:dev &
API_PID=$!

echo "[dev] Demarrage Frontend Next.js (WEB_PORT=${WEB_PORT}, API=${API_BASE_URL})..."
NEXT_PUBLIC_API_BASE_URL="${API_BASE_URL}" pnpm exec next dev --hostname 0.0.0.0 --port "${WEB_PORT}" &
WEB_PID=$!

echo "[dev] Stack locale active"
echo "[dev] Frontend: http://localhost:${WEB_PORT}"
echo "[dev] API:      http://localhost:${API_PORT}"
echo "[dev] DB:       localhost:${DB_PORT}"

while true; do
  if ! kill -0 "${API_PID}" >/dev/null 2>&1; then
    wait "${API_PID}"
    exit $?
  fi

  if ! kill -0 "${WEB_PID}" >/dev/null 2>&1; then
    wait "${WEB_PID}"
    exit $?
  fi

  sleep 1
done
