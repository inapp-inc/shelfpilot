# ShelfPilot API — Node 22 + built-in node:sqlite (no native build)
# npm workspaces hoist packages to /app/node_modules (no per-workspace node_modules).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY api/package.json ./api/
RUN npm install --omit=dev -w api

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_PATH=/data/shelfpilot.db
RUN mkdir -p /data
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/api/package.json ./api/package.json
# Changing CACHEBUST (fresh timestamp from the rebuild scripts / compose) forces the
# API source COPY below to always re-run so edits ship, while deps stay cached above.
ARG CACHEBUST=dev
RUN echo "cachebust=$CACHEBUST"
COPY api ./api
COPY api/seed/product-images ./seed/product-images
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "api/src/index.js"]
