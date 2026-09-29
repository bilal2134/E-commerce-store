# Scaling

## Current design

One Next.js container, one Postgres, one bucket. The cache (Cache Components data and prerendered shells) lives in the instance's memory and disk. Sessions, rate limits and orders are in Postgres, so the app is otherwise stateless. Expected load: low hundreds of daily visitors; catalogue in the tens to low hundreds of products (docs/research/hosting.md).

## Limits of the single-instance design

| Limit                       | Why                                                                | Symptom                                                                           |
| --------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| One instance only           | Per-instance cache; `updateTag()` invalidates only the local cache | Stale pages on other instances after admin edits                                  |
| 512 MB RAM (Render Starter) | `sharp` uploads plus the Next runtime                              | OOM on large uploads; keep `sharp` concurrency low; 10 MB / 40 MP caps (ADR 0006) |
| Client-side filtering       | Whole listing shipped to the browser                               | Slow above ~300 items per listing                                                 |
| In-process search           | Index JSON downloaded by the client                                | Above roughly 1-2k products (estimate, not measured)                              |
| Postgres rate limiter       | One row per key and window                                         | Fine for login protection; not DDoS protection                                    |

## Scaling to multiple instances

Required (docs/research/stack.md, Next.js self-hosting guide):

1. Shared cache handler: configure `cacheHandlers` in `next.config.ts` (Redis or S3-backed; `use cache: remote` for shared entries), `cacheMaxMemorySize: 0`, and implement tag refresh (`refreshTags()`) so `updateTag` propagates to all instances.
2. Identical `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` on all instances (base64, 32 bytes); otherwise "Failed to find Server Action" after rolling deploys.
3. Consistent `deploymentId` / `generateBuildId` across instances of the same build.
4. Sticky sessions are not needed (sessions are in Postgres).
5. Set `CLIENT_IP_HEADER` to the header your load balancer sets.
6. Keep `instances x DATABASE_POOL_MAX` below the DB connection limit; use a pooler.

Alternative that avoids all of the above: put a CDN in front of one larger instance. Vertical scaling covers this shop's foreseeable load.

## Listing filters: client to server

Trigger: any single listing above ~300 products, or listing JSON above ~150 KB gzipped (estimate). Change: make `/shop/[slug]` read validated `searchParams` on the server and call a paginated query (`WHERE` on colour/price/sub/stock, `ORDER BY`, keyset or `LIMIT/OFFSET`). Keep `applyFilters` in `src/domain/listing.ts` as the reference implementation for tests. Canonical URL stays the unfiltered listing.

## Search upgrade path

1. Now: in-process ranker `src/domain/search.ts` over `/api/search-index`.
2. Next: Postgres `pg_trgm` (typo tolerance) and/or full-text search (`tsvector` + GIN) behind a `searchProducts(q)` server function; keep client suggestions on the JSON index while it is small.
3. Later: Typesense or Meilisearch (self-hosted container) fed from admin mutations; keep the domain ranker as fallback.

## Images and CDN

Objects are immutable (`Cache-Control: public, max-age=31536000, immutable`) fixed-width WebP variants. A CDN in front of `MEDIA_BASE_URL` (Cloudflare on an R2 custom domain, CloudFront on S3) needs no code change. No dynamic image optimizer is used, so nothing scales server-side except upload processing.

## Database

- Indexes present (`src/server/db/schema.ts`, `drizzle/`): categories slug (unique) and parent/position; products code and slug (unique), category, visible + created desc, featured; product_images (product, position) and storage key (unique); reviews (status, created desc); orders code (unique), status + created, created; order_items (order), (product); order_status_events (order, created); admin_users lower(email) unique; admin_sessions (admin), (expires); rate_limits (window).
- Pooling: `DATABASE_POOL_MAX` per instance (default 5). Behind Supabase :6543 or PgBouncer transaction mode set `DATABASE_PREPARE=false`. Neon: use the pooled connection string for the app and the direct one for migrations (verify against Neon docs when configuring).
- Housekeeping: `pruneSessions()` and rate-limit window cleanup should run periodically (scheduled job); tracked in `docs/agent/tasks.json`.
