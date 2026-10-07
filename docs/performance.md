# Performance

Requirement CS-20: "Page loads in under 3 seconds on 4G mobile. Images are optimized." Targets: Core Web Vitals p75 LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.

## Measurements (production build, 2026-09-30)

Lighthouse 13.5 mobile preset (Moto G Power emulation, **simulated slow 4G: 1.6 Mbps, 150 ms RTT, 4× CPU slowdown**), `next start` on localhost, media served from local RustFS. Seeded sample images are small placeholders, so image weight is lower than it will be with real photos.

| Page                               | Perf | LCP   | FCP   | TBT    | CLS | A11y    | SEO | Best practices |
| ---------------------------------- | ---- | ----- | ----- | ------ | --- | ------- | --- | -------------- |
| `/`                                | 93   | 3.2 s | 1.2 s | 70 ms  | 0   | 100     | 100 | 100            |
| `/shop/heels`                      | 93   | 3.1 s | 1.2 s | 60 ms  | 0   | 95→100* | 100 | 100            |
| `/product/cherry-red-trendy-heels` | 92   | 3.1 s | 1.2 s | 140 ms | 0   | 100     | 100 | 100            |

\* The 95 was a missing accessible name on the mobile sort select, fixed afterwards (axe E2E now clean).

**Final re-measurement after all audit fixes (same method, 2026-09-30):** home 93 / listing 93 / product 93 performance, accessibility 100, best practices 100, SEO 100 on all three; LCP 3.2 s (simulated slow 4G), TBT 50–60 ms, CLS 0. Repeated home runs ranged 76–93: the low run was a TBT spike (580 ms) from load on the shared development machine, not a code change; judge with field data after launch.

**Urdu pages (/ur, after i18n):** home 89, product 90, listing 87 (LCP 3.3–4.0 s, CLS 0). A 230 KB Nastaliq web font initially pushed Urdu LCP to 4.4 s and caused layout shift (CLS 0.25) on swap; Urdu now uses system Nastaliq/Naskh fonts. English pages re-measured after the locale rewrite: 91–92; the proxy adds no measurable TTFB once warm (10–18 ms locally).

First measurement before optimisation: home 72 (LCP 4.4 s, TBT 520 ms). Changes that moved it: inlined CSS (removes the render-blocking stylesheet), preconnect to the media origin, blur placeholders only for eager images, hover images only on listing grids, fewer homepage cards, display font not preloaded (no longer competes with the LCP image), 26 KB `favicon.ico` replaced by a 0.3 KB SVG.

Interpretation: "slow 4G" in Lighthouse is harsher than typical Pakistani 4G. LCP there is ~3.1 s; on a regular 4G link (≈9 Mbps / 70 ms) the same waterfall finishes well under 2 s. Field data (CrUX / RUM) must confirm after launch.

## Live measurements (AWS, 2026-10-07)

Lighthouse mobile preset against https://usbaofficial.com.pk from Pakistan (CloudFront edge: Dubai, server: Sydney): home 85 / listing 86 / product 89, LCP 2.5–3.0 s, CLS 0. Cached pages answer in ~0.16 s; an edge cache miss goes to Sydney (~0.5 s warm, up to ~1.4 s with a Lambda cold start). A 5-minute EventBridge warm-up ping (`KeepWarm` in the app stack, free tier) keeps one instance warm. Deploys invalidate CloudFront only after the new server code is live.

Homepage redesign (premium hero, 2026-10-07), local production build, same method: 89–92, LCP 3.3 s, CLS 0 (unchanged from before). A word-by-word headline animation was tried and dropped: each word box re-wrapped when Bodoni replaced the fallback font (CLS 0.13 on mobile).

## Budgets and what ships

| Item                      | Size (gzip)                                                    | Notes                                                                                               |
| ------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| HTML `/shop/heels`        | ~17 KB                                                         | includes inlined CSS and RSC payload                                                                |
| HTML `/`                  | ~31 KB                                                         |                                                                                                     |
| JavaScript (listing page) | ~185 KB total                                                  | ~170 KB is React 19 + Next 16 runtime; **our code ≈ 13 KB** (filters, search, gallery, order panel) |
| Fonts                     | Hanken Grotesk (preloaded) + Bodoni Moda (swap, not preloaded) | self-hosted by `next/font`, latin subset                                                            |
| Product image             | WebP, `srcset` 320–1600 w                                      | eager + `fetchpriority=high` only for the LCP candidate                                             |

Budget: keep first-party client JS under 30 KB gzip per route; any new client component needs a reason. Admin code is only imported under `/admin` (separate route chunks).

## How it's achieved

- **Rendering**: Cache Components; all catalogue pages are static (prerendered at build, revalidated by tag or every 15 min). Product cards are Server Components; the filterable grid receives them as pre-rendered nodes, so cards never hydrate as client components.
- **Images**: sharp WebP variants, explicit dimensions, 4:5 frames (CLS 0), `sizes` per layout, lazy below the fold, immutable cache headers on objects.
- **Data**: one cached catalogue query (2 SQL statements, no N+1) feeds every listing, search index and homepage section.
- **Search**: ~100 bytes/product JSON index loaded only when the search dialog opens.

## Re-running

```bash
pnpm build && pnpm start -p 3200
CHROME_PATH=<chrome> npx lighthouse@13.5.0 http://localhost:3200/ --only-categories=performance,accessibility,seo,best-practices
```

## Next steps

- Measure again with real product photography (expect larger images; the pipeline caps them at 1600 px, quality 78).
- Add RUM (`web-vitals` → analytics provider) once analytics is chosen.
- Put a CDN in front of media (R2 custom domain / CloudFront) in production.
