# syntax=docker/dockerfile:1
# Builds the OpenNext bundle for AWS Lambda on Linux x86_64, so the native
# sharp and @node-rs/argon2 binaries match the Lambda runtime (ADR 0014).
#
#   docker build -f infrastructure/aws/opennext.Dockerfile \
#     --secret id=buildenv,src=<env file> --target export -o dist/aws .
#
# Output (dist/aws/): one zip per Lambda function plus the static assets and
# prerendered cache, ready for the CDK stack in infrastructure/aws/cdk.
# Functions are zipped inside Linux so pnpm's symlinked node_modules survive
# (exporting them as loose files to a Windows host breaks the links).
#
# The build prerenders pages from the database (Cache Components), so it needs
# the target environment, mounted as a BuildKit secret for the build step only.
# Every .env* file is removed from the output.

FROM node:22-bookworm-slim AS build
# 1 = local-test variant with file-system caches (see open-next.config.ts).
ARG OPEN_NEXT_LOCAL=0
ENV NEXT_TELEMETRY_DISABLED=1 OPEN_NEXT_LOCAL=${OPEN_NEXT_LOCAL}
RUN apt-get update && apt-get install -y --no-install-recommends zip && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN --mount=type=secret,id=buildenv,target=/app/.env,required=true     mkdir -p public && pnpm exec open-next build
RUN bash scripts/aws/package-opennext.sh /out

FROM scratch AS export
COPY --from=build /out /
