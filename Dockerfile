# syntax=docker/dockerfile:1
# USBA Official: Next.js 16 standalone image. glibc base (bookworm) so the
# prebuilt sharp and @node-rs/argon2 binaries work without compiling.
#
# IMPORTANT: with Cache Components the build prerenders pages and queries the
# database, so the build needs the production environment. Pass it as a
# BuildKit secret (an env file, never baked into any layer or history):
#
#   docker build -t usba --secret id=buildenv,src=.env.production .
#
# At runtime pass the same variables with `docker run --env-file` (or your
# platform's secret store). Verified end to end against local infra.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js loads .env at build time; the secret is mounted only for this step.
# The standalone output copies .env* files, so they are deleted in the same
# step: the build secret must never reach an image layer.
RUN --mount=type=secret,id=buildenv,target=/app/.env,required=true \
    mkdir -p public && pnpm build \
    && rm -f .next/standalone/.env .next/standalone/.env.*

# drizzle-orm/postgres-js/migrator is not imported by the app, so Next's file
# tracing does not put it in .next/standalone. Install just what scripts/migrate.mjs needs.
FROM base AS migrate-deps
COPY package.json ./
RUN mkdir /migrate && cd /migrate && npm init -y >/dev/null \
 && npm install --no-audit --no-fund --omit=dev \
      "drizzle-orm@$(node -p "require('/app/package.json').dependencies['drizzle-orm']")" \
      "postgres@$(node -p "require('/app/package.json').dependencies['postgres']")"

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=migrate-deps --chown=node:node /migrate/node_modules ./scripts/node_modules
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
