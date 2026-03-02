#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

assert_contains() {
  local haystack="$1"
  local needle="$2"

  if [[ "${haystack}" != *"${needle}"* ]]; then
    echo "[FAIL] attendu: ${needle}" >&2
    exit 1
  fi
}

default_output="$(DEV_VALIDATE_ONLY=1 bash ./scripts/dev.sh)"
assert_contains "${default_output}" "WEB_PORT=8080"
assert_contains "${default_output}" "API_PORT=3001"
assert_contains "${default_output}" "DB_PORT=5432"
assert_contains "${default_output}" "VITE_API_BASE_URL=http://localhost:3001"

custom_output="$(WEB_PORT=8181 API_PORT=3100 DB_PORT=55432 DEV_VALIDATE_ONLY=1 bash ./scripts/dev.sh)"
assert_contains "${custom_output}" "WEB_PORT=8181"
assert_contains "${custom_output}" "API_PORT=3100"
assert_contains "${custom_output}" "DB_PORT=55432"
assert_contains "${custom_output}" "docker_compose_port_binding=55432:5432"

if WEB_PORT=3001 API_PORT=3001 DEV_VALIDATE_ONLY=1 bash ./scripts/dev.sh >/tmp/dev-ports.out 2>/tmp/dev-ports.err; then
  echo "[FAIL] conflit de ports non detecte" >&2
  exit 1
fi

if ! rg -q "doivent etre distincts" /tmp/dev-ports.err; then
  echo "[FAIL] message de conflit de ports absent" >&2
  exit 1
fi

echo "[PASS] tests dev-command"
