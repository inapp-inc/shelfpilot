# ShelfPilot — production image (single container: UI + API under /shelfpilot)
# Build context = unpacked package root (contains api/ + web/dist/).
# Used by deploy/docker-compose.yml and bash deploy.sh.
FROM node:22-bookworm-slim

WORKDIR /app

# Install API deps first (lockfile when present → reproducible).
COPY api/package.json api/package-lock.json* ./api/
RUN cd api && \
    if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; \
    else npm install --omit=dev --no-audit --no-fund; fi

COPY api/src ./api/src
COPY web/dist ./web/dist

ENV NODE_ENV=production
ENV PORT=4520
ENV BASE_PATH=/shelfpilot
ENV WEB_DIST=/app/web/dist
ENV SQLITE_PATH=/data/shelfpilot.db
# CORS allow-list (comma-separated). Same-origin by default — override via compose/.env.
ENV CORS_ORIGINS=http://foundry.inapp.com

RUN mkdir -p /data

VOLUME ["/data"]
EXPOSE 4520

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=6 \
  CMD node -e "const p=process.env.PORT||4520;const b=process.env.BASE_PATH||'';fetch('http://127.0.0.1:'+p+b+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "api/src/index.js"]
