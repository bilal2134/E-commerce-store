# ADR 0002: Cache Components with coarse tags

Status: Accepted (2026-09-30). Quick reference: D2.

## Context

Requirements want a fast storefront (CS-20, under 3 s on 4G) and admin edits that appear on the live site immediately (AS-02, AS-05, AS-15, AS-16). Next.js 16 offers Cache Components (`'use cache'`, `cacheTag`, `cacheLife`, PPR) and `updateTag()` for read-your-writes (docs/research/stack.md).

## Decision

`cacheComponents: true`. Public reads in `src/server/catalog/public.ts` use `'use cache'`, `cacheTag()` and `cacheLife("storefront")` (stale 300 s, revalidate 900 s, expire 1 d). Three coarse tags: `catalog`, `settings`, `reviews`. Every admin mutation calls `updateTag()` for the affected tags. Runtime data (`searchParams`, cookies) only inside Suspense/client components so shells stay static.

## Alternatives considered

- Previous caching model with `revalidatePath`: page-level, easy to miss pages that show a product.
- Fully dynamic SSR: DB hit per request, slower on 4G, more load on small DB.
- Per-product tags: more precise but more places to forget; catalogue is small.

## Consequences

- Static shells, instant navigation, immediate freshness after admin edits.
- Time-based expiry is a safety net if an invalidation is missed.

* Cache is per instance: multi-instance needs a shared cache handler (scaling.md).
* Prerendering at build time needs the DB reachable during `next build`.
* Coarse tags re-render more than necessary; acceptable at this size.
