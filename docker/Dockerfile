FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

FROM base AS dev
RUN apk add --no-cache bash
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN chmod +x docker/entrypoint.sh || true
EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/app/docker/entrypoint.sh"]

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS prod
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache bash
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/db ./db
COPY --from=builder /app/drizzle.config.ts ./
# Toolchain isolato per le migrazioni: node_modules completo + migratore CJS.
# Evita tsx/esbuild (assenti nel bundle standalone) e non tocca il server.
COPY --from=deps /app/node_modules /opt/migrate/node_modules
COPY --from=builder /app/db/migrate.cjs /opt/migrate/migrate.cjs
COPY docker/entrypoint-prod.sh /entrypoint-prod.sh
RUN chmod +x /entrypoint-prod.sh && mkdir -p /app/uploads
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENTRYPOINT ["/entrypoint-prod.sh"]
