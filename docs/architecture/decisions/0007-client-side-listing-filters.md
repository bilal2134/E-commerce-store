# ADR 0007: Client-side listing filters over server-rendered lists

Status: Accepted (2026-09-30). Quick reference: D8.

## Context

CS-02/03/04 need category, colour and price filtering; SEO wants crawlable listing pages (docs/research/ux-seo.md section 2). Catalogue is tens of items per listing.

## Decision

Each listing page is prerendered with its full product list. Pure `applyFilters` (`src/domain/listing.ts`) runs in the browser; state lives in the URL query (`color,min,max,sub,stock,sort`); canonical URL is the unfiltered listing. Switch to server-side filtering above ~300 items per listing.

## Alternatives considered

- Server-side filtering with `searchParams` on day one: makes pages dynamic or explodes cache keys.
- Faceted URLs indexed by search engines: duplicate-content risk.

## Consequences

- Instant filtering, fully static/cached HTML, no query per filter.

* Ships the whole listing to the client; needs the migration described in scaling.md when catalogue grows.
* Price bands are presets (Rs. 1,499 to 2,500+ from CS-04); see ASSUMPTIONS.
