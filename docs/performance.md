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

First measurement before optimisation: home 72 (LCP 4.4 s, TBT 520 ms). Changes that moved it: inlined CSS (removes the render-blocking stylesheet), preconnect to the media origin, blur placeholders only for eager images, hover images only on listing grids, fewer homepage cards, display font not preloaded (no longer competes with the LCP image), 26 KB `favicon.ico` replaced by a 0.3 KB SVG.

Interpretation: "slow 4G" in Lighthouse is harsher than typical Pakistani 4G. LCP there is ~3.1 s; on a regular 4G link (≈9 Mbps / 70 ms) the same waterfall finishes well under 2 s. Field data (CrUX / RUM) must confirm after launch.

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
