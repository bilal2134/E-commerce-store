# Deployment: Docker on a server (alternative)

> The chosen production setup is now the AWS free tier: see [aws.md](aws.md) and ADR 0014. This page remains for running the Docker image on a conventional host.

Facts: docs/research/hosting.md (checked 2026-09-30). Price figures marked "secondary" there must be verified before purchase.

## Recommended setup (ADR 0009)

| Layer    | Choice                                                   | Notes                                                                                          |
| -------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| App      | Render Starter web service, Docker (`render.yaml`)       | Always-on, ~$7/mo (secondary), 512 MB RAM, one instance. See render.md                         |
| Database | Neon (Free/Launch) or Supabase Pro                       | Neon Free scales to zero after 5 min (first request slower); Supabase Free pauses after 1 week |
| Media    | Cloudflare R2 with a custom domain (or Supabase Storage) | Public read, CDN caching, zero egress                                                          |
| DNS/TLS  | Domain on Cloudflare or registrar; Render managed TLS    | `SITE_URL` must be the final https origin                                                      |

## Build-time note (all hosts)

With Cache Components the production build prerenders pages and queries the database. `DATABASE_URL`, `SITE_URL`, all `S3_*` and `MEDIA_BASE_URL` must be available during `next build`: the Dockerfile reads them from a BuildKit secret env file (`docker build --secret id=buildenv,src=.env.production .`), which never reaches an image layer (the standalone copy of `.env` is deleted in the same step; verified 2026-09-30 by inspecting the image). Pages then revalidate on the `storefront` cacheLife (stale 300 s / revalidate 900 s / expire 1 d) and on explicit tags (`catalog`, `settings`, `reviews`) via admin `updateTag()`. If the database is unreachable at build time the build fails; migrate first, then build (Render: DB migrations run in `preDeployCommand`, i.e. after build, so run migrations once manually before the very first deploy; see first-deploy checklist).

## Environment variables

Validated by `src/server/config/env.ts`. Template: `.env.example`.

| Variable                                   | Required            | Build | Runtime | Description                                                                                     |
| ------------------------------------------ | ------------------- | ----- | ------- | ----------------------------------------------------------------------------------------------- |
| `SITE_URL`                                 | yes                 | yes   | yes     | Public origin, no trailing slash. https enables Secure cookies, HSTS, `__Host-` cookie          |
| `DATABASE_URL`                             | yes                 | yes   | yes     | Postgres URL                                                                                    |
| `DATABASE_POOL_MAX`                        | no (5)              |       | yes     | Connections per instance                                                                        |
| `DATABASE_PREPARE`                         | no (true)           | yes   | yes     | `false` behind transaction poolers (Supabase :6543, PgBouncer)                                  |
| `DATABASE_SSL`                             | no (disable)        | yes   | yes     | `disable`, `require`, `verify-full`. Use `require` on managed DBs                               |
| `S3_ENDPOINT`                              | no                  | yes   | yes     | Empty for AWS S3; R2/Supabase/RustFS endpoint otherwise                                         |
| `S3_REGION`                                | no (us-east-1)      | yes   | yes     | `auto` for R2                                                                                   |
| `S3_BUCKET`                                | yes                 | yes   | yes     | Bucket name (min 3 chars)                                                                       |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | yes                 | yes   | yes     | Write-capable keys, server only                                                                 |
| `S3_FORCE_PATH_STYLE`                      | no (false)          | yes   | yes     | `true` for RustFS/MinIO and most non-AWS endpoints (verify per provider)                        |
| `MEDIA_BASE_URL`                           | yes                 | yes   | yes     | Public base URL of the bucket/CDN, no trailing slash. Also allowed in CSP `img-src`             |
| `CLIENT_IP_HEADER`                         | no                  |       | yes     | Header your proxy sets with the real client IP; empty = one shared rate-limit bucket            |
| `LOG_LEVEL`                                | no (info)           |       | yes     | debug, info, warn, error                                                                        |
| `ANALYTICS_PROVIDER`                       | no (none)           | yes   | yes     | `none` or `plausible`                                                                           |
| `PLAUSIBLE_DOMAIN`, `PLAUSIBLE_SCRIPT_URL` | no                  | yes   | yes     | Only with plausible                                                                             |
| `ANALYTICS_SALT`                           | recommended         |       | yes     | Secret for visitor hashes and IP keys (`openssl rand -hex 32`); empty = counts reset on restart |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`       | multi-instance only |       | yes     | base64 32 bytes; see scaling.md                                                                 |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`            | scripts only        |       |         | Used by `admin:create`; never set on the web service                                            |
| `SEED_WHATSAPP_NUMBER`                     | scripts only        |       |         | Overrides the owner number `923394009791` when seeding                                          |

## First-deploy checklist

1. Create Postgres. If Supabase: disable the Data API (or enable RLS, no policies) per security.md. Note pooled vs direct URL; set `DATABASE_PREPARE=false` for :6543.
2. Create the bucket; enable public read (R2: custom domain on the bucket, not `r2.dev`; Supabase: public bucket). Set `MEDIA_BASE_URL`. `pnpm storage:setup` does this only for local/CI RustFS.
3. Run migrations against the production DB from a trusted machine: `DATABASE_URL=... pnpm db:migrate` (or `node scripts/migrate.mjs` from the image). Do not run `db:seed` in production unless you want demo products.
4. Create the admin: `ADMIN_EMAIL=... ADMIN_PASSWORD=<12+ chars> DATABASE_URL=... pnpm admin:create`. Use a unique password (password manager).
5. Deploy (Render Blueprint or another host) with all env vars set for build and runtime.
6. Log in at `/admin/settings` and check the WhatsApp number (seeded as the owner number `923394009791`, AS-17), Instagram handles, delivery text, banner, about/FAQ/size chart.
7. Upload real products and photos; verify a `wa.me` link opens with the right number.
8. Verify `/api/health`, `/sitemap.xml`, `/robots.txt` (admin disallowed), response headers (CSP, HSTS) and that `/admin` sends `no-store`.
9. Backups: enable provider backups/PITR (Neon/Supabase paid) and schedule `pg_dump` to a separate bucket (weekly minimum); back up the media bucket with `rclone` or bucket versioning/replication. Test one restore.
10. Set up uptime monitoring on `/api/health` and log alerts.
11. Rotate any credential that was ever pasted in chat/tickets; keep `.env` out of git.
