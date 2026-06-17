# syntax=docker/dockerfile:1

# vizi.ge — Next.js 15 + better-sqlite3/sharp (native) + Drizzle migrations.
# All runtime config is read from environment variables (see .env.example).
# Run with:  docker run --env-file .env -p 3000:3000 -v vizi-data:/app/data vizi
#
# Note: NEXT_PUBLIC_* vars are inlined into the client bundle at BUILD time, so
# NEXT_PUBLIC_MAP_STYLE_URL is wired through as a build arg (not a runtime env).

FROM node:22-bookworm-slim AS base
WORKDIR /app

# ---- builder: install all deps (incl dev) and produce the production build ----
FROM base AS builder
# Toolchain to compile native modules (better-sqlite3, sharp) when no prebuilt
# binary is available for this platform.
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time public config (inlined into the client bundle).
ARG NEXT_PUBLIC_MAP_STYLE_URL
ENV NEXT_PUBLIC_MAP_STYLE_URL=${NEXT_PUBLIC_MAP_STYLE_URL}

ENV NODE_ENV=production
RUN npm run build

# ---- runner: minimal image that serves the build and runs migrations ----
FROM base AS runner
ENV NODE_ENV=production
# Default storage locations live under the mounted data volume.
ENV DATABASE_PATH=/app/data/vizi.db \
    UPLOAD_DIR=/app/data/uploads \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Unprivileged runtime user.
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Reuse the deps compiled in the builder (same base image → ABI-compatible native
# binaries). devDeps are kept because db:migrate runs through tsx at startup.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Persisted SQLite DB + uploaded images.
RUN mkdir -p /app/data \
    && chmod +x ./docker-entrypoint.sh \
    && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
VOLUME ["/app/data"]

# Apply pending migrations, then start the server.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
