# Stack research: Next.js and ORM

All facts checked 2026-09-30 against the URLs given. Items marked (secondary) or (unverified) were not confirmed on an official page.

## 1. Next.js

| Fact | Value | Source (checked 2026-09-30) |
|---|---|---|
| Current stable | **16.3.7** (npm `latest`; published 2026-09-29, bug-fix only). React `latest` = **19.3.0** | https://registry.npmjs.org/-/package/next/dist-tags ; https://registry.npmjs.org/-/package/react/dist-tags |
| Release cadence | 16.0 (2025-10-21), 16.1 (2025-12-18), 16.2 (2026-03-18), 16.3 (2026-08-03). Active LTS = 16.x, Maintenance LTS = 15.x | https://nextjs.org/blog |
| App Router / Server Actions | Stable and documented as "Server Functions / Server Actions". They are POST-only and directly reachable, so **every action must check auth itself** | https://nextjs.org/docs/app/getting-started/mutating-data |
| Self-hosting: standalone | `output: 'standalone'` makes `.next/standalone` with a minimal `server.js`. `public/` and `.next/static` are NOT copied automatically; copy them manually or serve from CDN. `PORT` and `HOSTNAME` env vars are honoured | https://nextjs.org/docs/app/api-reference/config/next-config-js/output |
| Native modules in standalone | Force-include with `outputFileTracingIncludes: {'/*': ['node_modules/sharp/**/*']}` | same page |
| Self-hosting guide | Node server, Docker image, or static export are all supported. Recommends a reverse proxy (nginx) for slow-connection, payload-size and rate-limit protection. Disable proxy buffering (`X-Accel-Buffering: no`) for streaming | https://nextjs.org/docs/app/guides/self-hosting |
| ISR / cache when self-hosted | Default cache is in-memory (50 MB) plus local disk **per instance**. One `next start` instance with persistent disk works with no extra config | https://nextjs.org/docs/app/guides/self-hosting |
| Multi-instance | Needs (a) a custom `cacheHandler` (Redis or S3 example) with `cacheMaxMemorySize: 0`; (b) `cacheHandlers` plus `refreshTags()` so `revalidateTag` propagates (by default it only invalidates the local instance); (c) identical `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` on all instances, or you get "Failed to find Server Action"; (d) consistent `generateBuildId` or `deploymentId` | same |
| `revalidatePath` | A convenience layer over cache tags | same |
| **revalidateTag signature (16.x)** | `revalidateTag(tag, profile)`. The one-argument form is **deprecated**. Use `'max'` for stale-while-revalidate, `{expire: 0}` for immediate expiry from Route Handlers, and `updateTag` in Server Actions for read-your-writes | https://nextjs.org/docs/app/api-reference/functions/revalidateTag |
| Image optimization self-hosted | `next/image` works with zero config under `next start`. Uses `sharp`. On glibc Linux, extra config may be needed to stop memory bloat (see the sharp linux memory allocator note, e.g. jemalloc or `MALLOC_ARENA_MAX`). Can use a custom loader or `unoptimized` instead | https://nextjs.org/docs/app/guides/self-hosting |
| Cache Components | Opt-in via `cacheComponents: true` in `next.config`; shipped in 16.0.0. Adds the `use cache` directive (`cacheLife`, `cacheTag`), Partial Prerendering as the default rendering model, and `<Suspense>` boundaries for runtime data (`cookies()`, `headers()`, `searchParams`). Without it the previous model applies ("Caching and Revalidating (Previous Model)"). `use cache` results are held in-memory per instance by default (ephemeral on serverless). `use cache: remote` plus a cache handler is needed for a durable shared cache. Cache entries are per-build (the build id is in the key) | https://nextjs.org/docs/app/getting-started/caching |
| Proxy | The `middleware` convention is now called Proxy (`proxy` file); it works when self-hosted | https://nextjs.org/docs/app/guides/self-hosting |

### Design implications for this site
- Simplest and safest: single container, `cacheComponents` off (or on, with `use cache` and `cacheTag('products')`), admin actions call `revalidateTag('products','max')` and `revalidatePath`. Single instance means no cache handler is needed.
- Going to 2+ instances requires the Redis or S3 cache handler and a shared encryption key. Otherwise the admin edits one instance and customers see stale pages on the others.
- Do not rely on `next/image` for admin uploads. Pre-generate WebP variants with `sharp` at upload time and serve them from object storage or a CDN. This also sidesteps the AVIF advisory below.
- Enforce auth in every Server Action, and call `await` on cookies/headers (async request APIs).

### Security advisories (2025-2026)

| Advisory | Impact | Affected / patched | Source (checked 2026-09-30) |
|---|---|---|---|
| **CVE-2025-55182 / CVE-2025-66478** ("React2Shell"), 2025-12-03, CVSS 10.0 | Pre-auth RCE in React Server Components (Flight protocol) | React 19.0 / 19.1.0 / 19.1.1 / 19.2.0 affected; fixed in React **19.0.1, 19.1.2, 19.2.1**. Next.js fixed in **15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7, 16.0.7** | https://nextjs.org/blog/CVE-2025-66478 ; https://vercel.com/changelog/cve-2025-55182 |
| 2025-12-11 | DoS (CVE-2025-55184, high) and source code exposure (CVE-2025-55183, medium) in RSC | See post for per-version fixes | https://nextjs.org/blog/security-update-2025-12-11 |
| 2026-07-20 (first monthly release) | 4 high, 5 medium | Fixed in **16.2.11 / 15.5.21** | https://nextjs.org/blog |
| **2026-08-25** | (1) Critical unauthenticated RCE in the Image Optimization API via **AVIF**, from libheif in `sharp` (GHSA-2xp9-vwfh-vxw4). Patch **disables AVIF optimization** until upstream fixes. (2) Critical unauthenticated RCE on **Windows-hosted** servers that use Pages Router + App Router without Cache Components (CVE-2026-75604) | Fixed in **16.3.3 / 15.5.24** | https://nextjs.org/blog/august-2026-security-release |
| **2026-09-22** | Critical RCE in Node.js `ImageResponse` (`next/og`) via Satori SVG escaping (GHSA-vcvr-r3jv-pc5j) | Affects `>=16.2.0 <16.3.6`; fixed in **16.3.6** (15.x not affected, hardened in 15.5.26) | https://nextjs.org/blog/nextjs-security-update-september-22-2026 |
| **2026-09-30 (scheduled, today)** | 9 vulns: 1 critical, 2 high, 5 medium, 1 low. Details not yet published at check time | Expected **16.3.8 / 15.5.27**; 16.3.7 does NOT contain them | https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026 |

**Recommendation:** pin `next` to the latest 16.3.x patch (>= 16.3.8 once published; do not use 16.3.7), keep React >= 19.2.1 (19.3.0 is current), enable Renovate or Dependabot, subscribe to Next.js security posts, and run on Linux containers. Do not enable AVIF in `images.formats`.

## 9. Drizzle ORM vs Prisma

| Item | Drizzle | Prisma |
|---|---|---|
| Current versions (npm dist-tags, 2026-09-30) | `drizzle-orm` **0.45.3** (`latest`), `drizzle-kit` **0.31.11** (`latest`). v1.0 is in **rc** (`1.0.0-rc.5`; `beta` tag = `1.0.0-beta.22`) and not yet `latest` | `@prisma/client` **7.10.0** (`latest`); `prisma` CLI `latest` tag is **8.0.0-rc.19** (`prev` = 7.10.0, 6.19.3 = last 6.x); v8 is a release candidate |
| Engine | Pure TypeScript, thin SQL builder, no binary | **v7 removes the Rust query engine** in favour of a TypeScript query compiler; **driver adapters are required** for all databases |
| v7 changes | n/a | Generator `output` path required (client no longer generated in `node_modules`; import from your output path); new `prisma.config.ts`; Node >= 20.19, TypeScript >= 5.4; middleware API and metrics removed; seeding no longer automatic |
| Serverless weight | Smallest, since it is just JS over `pg` / `postgres.js` / Neon / etc. | Much lighter than v6, but still has a generated client plus a query compiler (WASM) |
| SQL migrations in git | `drizzle-kit generate` emits plain `.sql` files plus a journal, applied by `drizzle-kit migrate` or the runtime `migrate()`. Easy to review and hand-edit | `prisma migrate` also produces SQL files in `prisma/migrations` (good), driven by `schema.prisma` |
| Transaction pooler (Supabase 6543) | Use `postgres.js` with `prepare: false` | Use the adapter and pgbouncer/Supavisor mode settings |

Sources (checked 2026-09-30): https://registry.npmjs.org/-/package/drizzle-orm/dist-tags ; https://registry.npmjs.org/-/package/drizzle-kit/dist-tags ; https://registry.npmjs.org/-/package/prisma/dist-tags ; https://registry.npmjs.org/-/package/@prisma/client/dist-tags ; https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 ; Supabase pooler doc https://supabase.com/docs/guides/database/connecting-to-postgres. Note: the drizzle release-notes page fetched was stale (showed beta.2, Feb 2025), so npm dist-tags were used instead. Whether Drizzle 1.0 is safe for production is unverified; the stable pick is 0.45.3 with kit 0.31.11.

**Recommendation:** Drizzle (0.45.3 + drizzle-kit 0.31.11, pinned) with `postgres.js` or `pg`. It is the lightest, keeps migrations as plain committed SQL, and works the same against local Postgres, Supabase, Neon, RDS. Prisma 7 is a legitimate choice but has more moving parts (generated client path, config file, v8 RC on the CLI tag). The `sharp` native module is unrelated to the ORM choice.
