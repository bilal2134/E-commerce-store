# Architecture overview

USBA Official is a single Next.js 16.3 (App Router) application, a modular monolith with one deployable (ADR 0001). Data lives in PostgreSQL; media lives in an S3-compatible bucket; ordering happens off-site on WhatsApp/Instagram (ADR 0011).

## System context

```
Customer browser --HTTPS--> [CDN/edge optional] --> Next.js server (Docker, standalone)
                                                     |-- PostgreSQL 17 (Drizzle + postgres.js)
                                                     '-- S3-compatible bucket (writes: server only)
Customer browser --GET images--> MEDIA_BASE_URL (public bucket or CDN)
Customer browser --link--> wa.me / ig.me   (orders; no server involvement)
Admin (owner)    --HTTPS--> /admin/* (Server Actions, cookie session)
```

No third-party service is called from the browser except optional analytics (ADR 0013) and links to WhatsApp/Instagram.

## Module map

| Path                                 | Role                                                                                                                                                                                                                                                         | Rules                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `src/domain/`                        | Pure, isomorphic logic: catalog vocabulary (`catalog.ts`), categories (`category.ts`), listing filters/sort (`listing.ts`), search ranker (`search.ts`), ordering links (`ordering.ts`), order and review statuses, image variant maths (`images.ts`), money | No I/O, no `server-only`, importable by client and server; unit-tested |
| `src/server/config/`                 | Zod-validated `env()`; the only place that reads `process.env` (scripts and `next.config.ts` excepted)                                                                                                                                                       | server-only                                                            |
| `src/server/db/`                     | `client.ts` (postgres.js + Drizzle), `schema.ts` (tables, CHECKs, indexes)                                                                                                                                                                                   | server-only                                                            |
| `src/server/auth/`                   | Argon2id `password.ts`, opaque `tokens.ts`, `session.ts` (`requireAdmin`), `login.ts`, Postgres `rate-limit.ts`                                                                                                                                              | server-only                                                            |
| `src/server/storage/`                | `ObjectStorage` port (`types.ts`), S3 adapter (`s3.ts`), in-memory adapter for tests (`memory.ts`), factory (`index.ts`)                                                                                                                                     | only place with the AWS SDK (ADR 0005)                                 |
| `src/server/images/`                 | `pipeline.ts`: validate, decode, orient, strip, WebP variants, blur placeholder                                                                                                                                                                              | only place with `sharp` (ADR 0006)                                     |
| `src/server/catalog/`                | `queries.ts` (Drizzle), `public.ts` (`'use cache'` reads with tags/cacheLife)                                                                                                                                                                                | public reads only                                                      |
| `src/server/admin/`                  | Admin mutations (Server Actions and services); each calls `requireAdmin()` then `updateTag()`                                                                                                                                                                | being built (admin worktree)                                           |
| `src/server/cache.ts`                | `CACHE_TAGS` (`catalog`, `settings`, `reviews`)                                                                                                                                                                                                              | shared by reads and mutations                                          |
| `src/server/logger.ts`, `request.ts` | JSON logger with redaction; client-IP helper (`CLIENT_IP_HEADER`)                                                                                                                                                                                            |                                                                        |
| `src/app/`                           | Thin routes and layouts; no business logic                                                                                                                                                                                                                   |                                                                        |
| `src/components/{ui,store,admin}`    | UI primitives, storefront components, admin components                                                                                                                                                                                                       |                                                                        |
| `scripts/`                           | migrate, seed, setup-storage, create-admin (run with `tsx --conditions=react-server`); `migrate.mjs` for the production image                                                                                                                                |                                                                        |
| `drizzle/`                           | Generated + hand-written SQL migrations (ADR 0003)                                                                                                                                                                                                           | checked in                                                             |

## Request and data flow

1. Public page request: the prerendered static shell is served from the Next cache; `'use cache'` data functions in `src/server/catalog/public.ts` supply data; on a miss they query Postgres via Drizzle. Images are fetched directly from `MEDIA_BASE_URL` using `<img srcset>`.
2. Listing pages send the whole category list (tens of items) to the client; `applyFilters` runs in the browser; filter state lives in the URL query (ADR 0007).
3. Search: the client loads `/api/search-index` (small JSON) and ranks with `src/domain/search.ts`; `/search` runs the same ranker on the server (ADR 0008).
4. Ordering: `buildOrderMessage` + `buildWhatsappUrl` create the `wa.me` link at render time (not stored).
5. Admin mutation: Server Action -> `requireAdmin()` -> zod validation -> Drizzle write (for images: `pipeline.ts` -> `ObjectStorage.put`) -> `updateTag(CACHE_TAGS.x)` -> the next public read is fresh (read-your-writes).

## Caching model (ADR 0002)

- `cacheComponents: true`. Public data functions use `'use cache'`, `cacheTag(...)` and `cacheLife("storefront")`.
- `storefront` profile (next.config.ts): `stale: 300` s, `revalidate: 900` s, `expire: 86400` s. This is the safety net; explicit invalidation is the primary mechanism.
- Tags: `catalog` (products, categories, images, sizes), `settings` (site_settings), `reviews`. Coarse by design.
- Admin Server Actions call `updateTag()` (immediate expiry, read-your-writes). Do not use the one-argument `revalidateTag` (deprecated in 16; docs/research/stack.md).
- The cache is per instance (memory + disk). A single instance needs no extra config; multi-instance: see scaling.md.
- Build time: the production build prerenders pages and queries the DB, so `DATABASE_URL` and the S3/MEDIA variables must exist at build time.

## Rendering strategy per route

| Route                               | Strategy                                                                                                          | Data / tags                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `/`                                 | Static shell + cached data (PPR)                                                                                  | catalog, settings, reviews |
| `/shop`, `/shop/[slug]`             | Prerendered per category (cached); filtering client-side; `searchParams` read only in a client component/Suspense | catalog                    |
| `/product/[slug]`                   | Cached per slug; code URL (`USBA-001`) redirects to slug; JSON-LD Product                                         | catalog, settings          |
| `/search`                           | Dynamic (reads `q`), inside Suspense                                                                              | catalog                    |
| `/reviews`                          | Cached                                                                                                            | reviews                    |
| `/contact`, `/about`, `/size-guide` | Cached                                                                                                            | settings                   |
| `/admin`, `/admin/*`                | Fully dynamic, `no-store`, `noindex`; `requireAdmin()` on each page                                               | none cached                |
| `/api/search-index`                 | Route handler, cached JSON                                                                                        | catalog                    |
| `/api/health`                       | Dynamic, uncached; Docker/Render/ALB health check                                                                 | DB ping                    |
| `sitemap.xml`, `robots.txt`         | Metadata routes, cached                                                                                           | catalog                    |

Routes are being implemented in parallel; this table is the target design. Verify against `src/app` as pages land.

## Testing pyramid

| Layer       | Tool                           | Scope                                                                               | Command                                            |
| ----------- | ------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| Unit        | Vitest (`unit` project)        | `src/domain/*`, auth primitives, image pipeline (in-memory storage)                 | `pnpm test:unit`                                   |
| Integration | Vitest (`integration` project) | Real Postgres (`usba_test`) + RustFS: queries, admin services, rate limit, sessions | `pnpm test:integration`                            |
| E2E + a11y  | Playwright + axe               | Browse, filter, order link, admin login/CRUD                                        | `pnpm test:e2e`                                    |
| Static      | ESLint, tsc, Prettier          |                                                                                     | `pnpm lint`, `pnpm typecheck`, `pnpm format:check` |

CI (`.github/workflows/ci.yml`) runs all of them plus gitleaks and osv-scanner.

## Observability

- `src/server/logger.ts`: one JSON line per event on stdout (`level`, `time`, `msg`, context); keys matching `pass|secret|token|authorization|cookie|session|key` are redacted; level via `LOG_LEVEL`. Every host collects stdout (Render, CloudWatch, Docker).
- `/api/health`: liveness/readiness for orchestrators.
- Error boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`) render friendly pages and log server-side.
- Seam for an error tracker (Sentry-like): Next's `instrumentation.ts` `onRequestError` hook and `logger.error()` are the two integration points; nothing is installed by default (no vendor SDK until needed).
- Analytics: ADR 0013.
