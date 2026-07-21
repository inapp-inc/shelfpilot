#!/usr/bin/env bash
# ShelfPilot — Docker production deploy.
# Run ON THE SERVER from inside the unpacked package folder.
# Builds a single container (UI + API) and serves under /shelfpilot on HOST_PORT (default 4520).
# Point your host nginx at 127.0.0.1:${HOST_PORT} for http://foundry.inapp.com/shelfpilot.
#
# Usage:
#   unzip shelfpilot-<version>.zip -d /opt/shelfpilot
#   cd /opt/shelfpilot
#   bash deploy.sh
#
# Optional:
#   bash deploy.sh --no-build     # recreate/restart without rebuilding the image
#   bash deploy.sh --down         # stop and remove the container
#   HOST_PORT=8080 bash deploy.sh # publish on a different host port
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

NO_BUILD=0
DO_DOWN=0
for arg in "$@"; do
  case "$arg" in
    --no-build) NO_BUILD=1 ;;
    --down) DO_DOWN=1 ;;
    -h|--help)
      sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "!! Unknown argument: $arg (try --help)"
      exit 1
      ;;
  esac
done

echo "==> ShelfPilot Docker deploy :: $APP_DIR"

# 1) Prerequisites -------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "!! docker not found on PATH — install Docker Engine + Compose plugin"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "!! 'docker compose' not available — install the Compose V2 plugin"
  exit 1
fi

# 2) Environment ---------------------------------------------------------------
if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example (review HOST_PORT / BASE_PATH / CORS_ORIGINS)"
fi
# shellcheck disable=SC1091
set -a; . ./.env; set +a

export NODE_ENV="${NODE_ENV:-production}"
export BASE_PATH="${BASE_PATH:-/shelfpilot}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://foundry.inapp.com}"
# Host port published by compose (container always listens on 4520).
export HOST_PORT="${HOST_PORT:-${PORT:-4520}}"
# Image tag from VERSION file when present.
if [ -f VERSION ]; then
  export SHELFPILOT_VERSION="$(head -n1 VERSION | tr -d '[:space:]')"
else
  export SHELFPILOT_VERSION="${SHELFPILOT_VERSION:-latest}"
fi

if [ ! -f Dockerfile ] || [ ! -f docker-compose.yml ]; then
  echo "!! Dockerfile / docker-compose.yml missing — repackage with scripts/package.*"
  exit 1
fi
if [ ! -f web/dist/index.html ]; then
  echo "!! Built UI missing at web/dist/index.html — repackage with scripts/package.*"
  exit 1
fi
if [ ! -d api/src ]; then
  echo "!! API source missing at api/src — repackage with scripts/package.*"
  exit 1
fi

# 3) Stop-only path ------------------------------------------------------------
if [ "$DO_DOWN" -eq 1 ]; then
  echo "==> Stopping ShelfPilot containers"
  docker compose down
  echo "==> Stopped"
  exit 0
fi

# 4) Build + start -------------------------------------------------------------
if [ "$NO_BUILD" -eq 1 ]; then
  echo "==> Starting (no rebuild) on host port $HOST_PORT (base $BASE_PATH)"
  docker compose up -d --force-recreate --remove-orphans
else
  echo "==> Building image shelfpilot:${SHELFPILOT_VERSION} and starting on host port $HOST_PORT (base $BASE_PATH)"
  docker compose build
  docker compose up -d --force-recreate --remove-orphans
fi

# 5) Health check --------------------------------------------------------------
HEALTH_URL="http://127.0.0.1:${HOST_PORT}${BASE_PATH}/api/health"
echo "==> Waiting for health at $HEALTH_URL"
for _ in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "==> Healthy."
    echo "    UI + API:  http://127.0.0.1:${HOST_PORT}${BASE_PATH}/"
    echo "    Public:    http://foundry.inapp.com${BASE_PATH}/  (nginx → 127.0.0.1:${HOST_PORT})"
    echo "    Logs:      docker compose logs -f shelfpilot"
    echo "    Stop:      bash deploy.sh --down"
    exit 0
  fi
  sleep 1
done

echo "!! Health check failed. Recent logs:"
docker compose logs --tail=80 shelfpilot || true
exit 1
