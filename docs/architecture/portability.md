# Portability

Goal: move Postgres, storage or hosting by changing environment variables and running documented commands, without code changes. Sources: docs/research/hosting.md, docs/research/stack.md.

## Rule: no vendor SDK outside adapters

- `@aws-sdk/client-s3` may be imported only in `src/server/storage/s3.ts` (plus dev/CI tooling in `scripts/`).
- `sharp` may be imported only in `src/server/images/pipeline.ts`.
- `@node-rs/argon2` only in `src/server/auth/password.ts`.
- No `@supabase/*`, `@vercel/*`, `@cloudflare/*` packages anywhere. Environment is read only via `src/server/config/env.ts`.
- Application code depends on the `ObjectStorage` port and the `ProcessedImage` result, never on a provider.

## What is provider-specific and where

| Concern          | Where                                                                       | Provider-specific bits                                                                                             |
| ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Object storage   | `src/server/storage/s3.ts`, env `S3_*`                                      | endpoint, region (`auto` for R2), path-style (`S3_FORCE_PATH_STYLE`); public access is set in the provider console |
| Public media URL | env `MEDIA_BASE_URL`, CSP `img-src` (next.config.ts)                        | CDN or public bucket domain                                                                                        |
| Postgres         | env `DATABASE_URL`, `DATABASE_SSL`, `DATABASE_PREPARE`, `DATABASE_POOL_MAX` | SSL requirement; pooler mode                                                                                       |
| Container        | `Dockerfile`, `next.config.ts` `output: "standalone"`                       | none; `HOSTNAME=0.0.0.0`, `PORT`                                                                                   |
| Client IP        | env `CLIENT_IP_HEADER`                                                      | header differs per proxy (`cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`)                                      |
| Deploy config    | `render.yaml`, `.github/workflows`, `docs/deployment/*`                     | one file per host                                                                                                  |
| Migrations       | `drizzle/*.sql`, `scripts/migrate.mjs`                                      | plain SQL, no extensions required                                                                                  |

## Moving Postgres

1. Create the target DB. If it is behind a transaction-mode pooler (Supabase :6543, PgBouncer) set `DATABASE_PREPARE=false`.
2. Pause admin writes (the site keeps serving cached pages).
3. `pg_dump --format=custom --no-owner --no-acl "$OLD_URL" -f usba.dump`
4. `pg_restore --no-owner --no-acl --dbname "$NEW_URL" usba.dump` into an empty DB. Do not run the seed.
5. Set `DATABASE_URL` and `DATABASE_SSL`; run `node scripts/migrate.mjs` (no-op if the dump included the drizzle migrations table) and redeploy (the build prerenders against the DB).
6. Smoke test `/api/health`, `/`, `/admin`.

## Moving object storage

1. Create the bucket and enable public read (or front it with a CDN domain).
2. Copy: `rclone copy old:usba-media new:usba-media --progress` (define both remotes with `rclone config`, type `s3`). Object keys are unchanged (`<key>-<width>.webp` under `products/`, `banners/`, `reviews/`) and the DB stores keys, not URLs.
3. Set `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, keys, `S3_FORCE_PATH_STYLE`, and switch `MEDIA_BASE_URL` to the new public base. Rebuild/restart (the CSP is computed from `MEDIA_BASE_URL` when `next.config.ts` loads).
4. Objects are written with `Cache-Control: public, max-age=31536000, immutable`; preserve it (`rclone copy --header-upload "Cache-Control: public, max-age=31536000, immutable"`).

## Moving hosting

The deploy unit is the Docker image built from `Dockerfile`. Any host that runs a container and provides env vars works (Render, ECS/Fargate, Fly, a VPS). Steps: build the image with build args, push, run `node scripts/migrate.mjs` as a pre-deploy step, start `node server.js`, point the health check at `/api/health`, move DNS. Vercel works (docs/deployment/vercel.md); Cloudflare Workers does not without replacing `sharp` (docs/deployment/cloudflare.md).

## Known couplings

| Coupling                                                    | Impact                                                                                                    | Mitigation                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `sharp` native binary                                       | Blocks Cloudflare Workers; needs a matching prebuilt binary                                               | `pipeline.ts` is the seam; Dockerfile uses bookworm-slim (glibc) |
| `@node-rs/argon2` native binary                             | Same                                                                                                      | Swap behind `password.ts`                                        |
| Next.js in-memory/disk cache                                | Single instance only                                                                                      | scaling.md                                                       |
| `next.config.ts` reads `process.env` (CSP)                  | `MEDIA_BASE_URL`, `SITE_URL`, `ANALYTICS_PROVIDER`, `PLAUSIBLE_SCRIPT_URL` must be present at build/start | documented in deployment docs                                    |
| Build needs DB and S3 vars                                  | CI/CD must provide them at build                                                                          | Dockerfile build args                                            |
| Supabase Data API exposes public tables if enabled          | Security                                                                                                  | security.md                                                      |
| `__Host-` cookie prefix requires HTTPS, no Domain attribute | Site must be served over HTTPS on a single origin                                                         | `SITE_URL=https://...`                                           |
