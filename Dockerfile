# syntax=docker/dockerfile:1
# USBA Official: Next.js 16 standalone image. glibc base (bookworm) so the
# prebuilt sharp and @node-rs/argon2 binaries work without compiling.
#
# IMPORTANT: with Cache Components the build prerenders pages and queries the
# database, so DATABASE_URL and the S3/MEDIA variables MUST be available at
# build time (pass them as --build-arg; they do not reach the final image
# because only the runtime stage's ENV is kept).
#
#   docker build -t usba \
#     --build-arg SITE_URL=https://example.com \
#     --build-arg DATABASE_URL=postgres://... \
#     --build-arg S3_BUCKET=... --build-arg S3_ACCESS_KEY_ID=... \
#     --build-arg S3_SECRET_ACCESS_KEY=... --build-arg MEDIA_BASE_URL=https://cdn.example.com .
#
# UNVERIFIED: this Dockerfile has not been built end to end yet.

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
ARG SITE_URL
ARG DATABASE_URL
ARG DATABASE_PREPARE=true
ARG DATABASE_SSL=disable
ARG S3_ENDPOINT=
ARG S3_REGION=us-east-1
ARG S3_BUCKET
ARG S3_ACCESS_KEY_ID
ARG S3_SECRET_ACCESS_KEY
ARG S3_FORCE_PATH_STYLE=false
ARG MEDIA_BASE_URL
ARG ANALYTICS_PROVIDER=none
ARG PLAUSIBLE_DOMAIN=
ENV SITE_URL=$SITE_URL DATABASE_URL=$DATABASE_URL DATABASE_PREPARE=$DATABASE_PREPARE \
    DATABASE_SSL=$DATABASE_SSL S3_ENDPOINT=$S3_ENDPOINT S3_REGION=$S3_REGION \
    S3_BUCKET=$S3_BUCKET S3_ACCESS_KEY_ID=$S3_ACCESS_KEY_ID \
    S3_SECRET_ACCESS_KEY=$S3_SECRET_ACCESS_KEY S3_FORCE_PATH_STYLE=$S3_FORCE_PATH_STYLE \
    MEDIA_BASE_URL=$MEDIA_BASE_URL ANALYTICS_PROVIDER=$ANALYTICS_PROVIDER \
    PLAUSIBLE_DOMAIN=$PLAUSIBLE_DOMAIN
# public/ may be empty (and therefore absent from a fresh clone)
RUN mkdir -p public && pnpm build

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
