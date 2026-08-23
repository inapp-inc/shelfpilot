#!/usr/bin/env bash
# Builds a production package (UI + API on one port) and zips it for the server.
# The zip contains NO nginx config and NO Dockerfiles — you front it with your own nginx.
#
#   ./scripts/package.sh
#
# Output: dist-package/shelfpilot-<version>-<timestamp>.zip
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

VERSION="$(node -p "require('./package.json').version")"
STAMP="$(date +%Y%m%d-%H%M%S)"
NAME="shelfpilot-$VERSION-$STAMP"
STAGE=".package/$NAME"

export VITE_BASE_PATH="${VITE_BASE_PATH:-/shelfpilot/}"

echo "==> Cleaning staging"
rm -rf .package && mkdir -p "$STAGE"

echo "==> Installing workspace dependencies (npm ci)"
npm ci

echo "==> Building web UI (base $VITE_BASE_PATH)"
npm run build -w web
[ -f web/dist/index.html ] || { echo "!! web build missing web/dist/index.html"; exit 1; }

echo "==> Staging package files"
mkdir -p "$STAGE/api" "$STAGE/web"
cp -r api/src "$STAGE/api/src"
cp api/package.json "$STAGE/api/package.json"
cp -r shared "$STAGE/shared"
cp -r web/dist "$STAGE/web/dist"

# Deploy scripts + env sample + Docker production files
cp deploy/deploy.sh deploy/start.sh deploy/ecosystem.config.cjs deploy/.env.example "$STAGE/"
cp deploy/README.md "$STAGE/README.md"
cp deploy/Dockerfile "$STAGE/Dockerfile"
cp deploy/docker-compose.yml "$STAGE/docker-compose.yml"
chmod +x "$STAGE/deploy.sh" "$STAGE/start.sh"

# Lock API deps for reproducible installs (used inside the Docker image build)
echo "==> Generating api/package-lock.json"
( cd "$STAGE/api" && npm install --omit=dev --package-lock-only --no-audit --no-fund )

printf "%s\n%s\n" "$VERSION" "$STAMP" > "$STAGE/VERSION"

echo "==> Creating zip"
mkdir -p dist-package
ZIP="$REPO_ROOT/dist-package/$NAME.zip"
rm -f "$ZIP"
( cd "$STAGE" && zip -rq "$ZIP" . )

rm -rf .package
echo ""
echo "==> Package ready: dist-package/$NAME.zip"
echo "    Copy to the server, unzip into a folder, then run ./deploy.sh"
