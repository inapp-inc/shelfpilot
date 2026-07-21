#!/usr/bin/env bash
# Optional: native (non-Docker) foreground start.
# Prefer `bash deploy.sh` (Docker) for production. This script needs Node >= 22.5 on the host.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-4520}"
export BASE_PATH="${BASE_PATH:-/shelfpilot}"
if [ -z "${WEB_DIST:-}" ] || [ "$WEB_DIST" = "./web/dist" ]; then
  WEB_DIST="$APP_DIR/web/dist"
elif [[ "$WEB_DIST" != /* ]]; then
  WEB_DIST="$APP_DIR/$WEB_DIST"
fi
export WEB_DIST
export SQLITE_PATH="${SQLITE_PATH:-$APP_DIR/data/shelfpilot.db}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://foundry.inapp.com}"

mkdir -p "$(dirname "$SQLITE_PATH")"
if [ ! -f "$WEB_DIST/index.html" ]; then
  echo "!! Built UI missing at $WEB_DIST/index.html"; exit 1
fi

echo "ShelfPilot starting on port $PORT (UI + API) under base '$BASE_PATH'"
exec node api/src/index.js
