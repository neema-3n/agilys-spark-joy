#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

TMP_OUT="/tmp/dev-ports.out"
TMP_ERR="/tmp/dev-ports.err"
LISTENER_PID=""

cleanup() {
  if [[ -n "${LISTENER_PID}" ]] && kill -0 "${LISTENER_PID}" >/dev/null 2>&1; then
    kill "${LISTENER_PID}" >/dev/null 2>&1 || true
    wait "${LISTENER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

assert_contains() {
  local haystack="$1"
  local needle="$2"

  if [[ "${haystack}" != *"${needle}"* ]]; then
    echo "[FAIL] attendu: ${needle}" >&2
    exit 1
  fi
}

baseline_output="$(WEB_PORT=18080 API_PORT=13001 DB_PORT=15432 DEV_VALIDATE_ONLY=1 bash ./scripts/dev.sh)"
assert_contains "${baseline_output}" "WEB_PORT=18080"
assert_contains "${baseline_output}" "API_PORT=13001"
assert_contains "${baseline_output}" "DB_PORT=15432"
assert_contains "${baseline_output}" "VITE_API_BASE_URL=http://localhost:13001"

custom_output="$(WEB_PORT=8181 API_PORT=3100 DB_PORT=55432 DEV_VALIDATE_ONLY=1 bash ./scripts/dev.sh)"
assert_contains "${custom_output}" "WEB_PORT=8181"
assert_contains "${custom_output}" "API_PORT=3100"
assert_contains "${custom_output}" "DB_PORT=55432"
assert_contains "${custom_output}" "docker_compose_port_binding=55432:5432"

if WEB_PORT=3001 API_PORT=3001 DEV_VALIDATE_ONLY=1 bash ./scripts/dev.sh >/tmp/dev-ports.out 2>/tmp/dev-ports.err; then
  echo "[FAIL] conflit de ports non detecte" >&2
  exit 1
fi

if ! rg -q "doivent etre distincts" "${TMP_ERR}"; then
  echo "[FAIL] message de conflit de ports absent" >&2
  exit 1
fi

OCCUPIED_WEB_PORT=19991
node -e "const net=require('net'); const server=net.createServer(); server.listen(${OCCUPIED_WEB_PORT}, '127.0.0.1'); setInterval(() => {}, 1000);" >/tmp/dev-port-listener.log 2>&1 &
LISTENER_PID=$!
sleep 1

if WEB_PORT="${OCCUPIED_WEB_PORT}" API_PORT=13011 DB_PORT=15433 DEV_VALIDATE_ONLY=1 bash ./scripts/dev.sh >"${TMP_OUT}" 2>"${TMP_ERR}"; then
  echo "[FAIL] port deja occupe non detecte" >&2
  exit 1
fi

if ! rg -q "est deja utilise" "${TMP_ERR}"; then
  echo "[FAIL] message port occupe absent" >&2
  exit 1
fi

echo "[PASS] tests dev-command"
