# ShelfPilot — production packaging & Docker deploy

Single **Docker container** serves **UI + API on one port** (default host **4520**),
under the subpath **`/shelfpilot`** → **`http://foundry.inapp.com/shelfpilot`**.

SQLite data is kept in a Docker volume (`shelfpilot_data`). Put your host nginx in
front and proxy `/shelfpilot/` to `127.0.0.1:4520` (without stripping the prefix).

The subpath is set in two matching places:
- UI build base: `VITE_BASE_PATH=/shelfpilot/` (baked in by the package scripts)
- Server mount: `BASE_PATH=/shelfpilot` (in `.env` / compose)

## 1. Build the package (on your dev machine)

Windows (batch):

```bat
cd codebase
scripts\package.bat
```

Windows (PowerShell):

```powershell
cd codebase
npm run package:win
```

macOS / Linux:

```bash
cd codebase
npm run package        # or: ./scripts/package.sh
```

Output: `codebase/dist-package/shelfpilot-<version>-<timestamp>.zip`

The zip contains:

```
api/                 # API source + package.json + package-lock.json
shared/              # ESM modules imported by the API (productBuffer, etc.)
web/dist/            # prebuilt UI (base /shelfpilot/)
Dockerfile           # production image (UI + API)
docker-compose.yml   # single-service compose
deploy.sh            # Docker build + up + health check
start.sh             # optional native (non-Docker) foreground start
ecosystem.config.cjs # optional native pm2 config
.env.example
README.md
VERSION
```

## 2. Deploy with Docker (on the server)

**Requirements:** Docker Engine + Compose V2 plugin. Node.js is **not** required on the host.

```bash
# copy the zip up, then:
unzip shelfpilot-<version>-<timestamp>.zip -d /opt/shelfpilot
cd /opt/shelfpilot
bash deploy.sh
```

`deploy.sh`:
- creates `.env` from `.env.example` on first run (edit `HOST_PORT` / `BASE_PATH` / `CORS_ORIGINS`),
- verifies `Dockerfile`, `docker-compose.yml`, and `web/dist/index.html` are present,
- runs `docker compose build` then `docker compose up -d --force-recreate`,
- health-checks `http://127.0.0.1:$HOST_PORT$BASE_PATH/api/health`.

Useful flags:

```bash
bash deploy.sh --no-build   # restart without rebuilding the image
bash deploy.sh --down       # stop and remove the container
HOST_PORT=8080 bash deploy.sh
```

Logs / status:

```bash
docker compose logs -f shelfpilot
docker compose ps
```

Re-deploy = unzip over the folder (keep the Docker volume / don’t delete named volumes)
and run `bash deploy.sh` again. SQLite persists in the `shelfpilot_data` volume.

## 3. nginx (your side, not shipped)

Proxy `/shelfpilot/` to the published host port **without stripping** the prefix.
Enable **gzip** for JS/CSS/JSON (see `nginx-host.conf.example` in this folder).

```nginx
gzip on;
gzip_vary on;
gzip_min_length 256;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;

location = /shelfpilot {
    return 301 /shelfpilot/;
}

location /shelfpilot/ {
    proxy_pass http://127.0.0.1:4520;      # keeps the /shelfpilot prefix
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Both the UI (`/shelfpilot/`, `/shelfpilot/layouts`, …) and the API
(`/shelfpilot/api/...`) are served by the container on that single port.

### CORS
UI and API are same-origin (both under `foundry.inapp.com/shelfpilot`).
`CORS_ORIGINS` defaults to `http://foundry.inapp.com` as a safe allow-list.

## Optional: native (non-Docker) start
If you cannot use Docker on a given host, `start.sh` + `ecosystem.config.cjs` still
run the same single-port Node process (requires Node >= 22.5 on the host). Prefer
`bash deploy.sh` (Docker) for production.

## Notes
- Data: Docker volume `shelfpilot_data` → `/data/shelfpilot.db` inside the container.
  Backup with `docker run --rm -v shelfpilot_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/shelfpilot-data.tgz -C /data .`
- Env: `HOST_PORT`, `BASE_PATH`, `CORS_ORIGINS`, `SKIP_DEMO_BOOTSTRAP`, `SHELFPILOT_VERSION` (see `.env.example`).
- Public URL: **`http://foundry.inapp.com/shelfpilot`**.

## Production readiness checklist
- [ ] Package built with `scripts/package.bat` (or `.ps1` / `.sh`) so UI base is `/shelfpilot/`.
- [ ] Server `.env` has `BASE_PATH=/shelfpilot` matching the UI build.
- [ ] `SKIP_DEMO_BOOTSTRAP=1` after first deploy (demo data persists in volume).
- [ ] Host nginx gzip enabled (`nginx-host.conf.example`).
- [ ] Docker Engine + Compose V2 installed on the server.
- [ ] `bash deploy.sh` reports healthy.
- [ ] nginx proxies `/shelfpilot/` to `127.0.0.1:4520` without stripping the prefix.
- [ ] Browser: open `http://foundry.inapp.com/shelfpilot/`, hard-refresh `/shelfpilot/layouts` (no 401).
