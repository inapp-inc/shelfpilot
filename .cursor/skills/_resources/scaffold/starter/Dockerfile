# ADR-0003 container-first API image — customize per project
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY api/package.json ./api/
RUN npm install --omit=dev -w api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY package.json ./
COPY api ./api
EXPOSE 3000
CMD ["node", "api/src/index.js"]
