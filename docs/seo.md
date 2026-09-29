# SEO

Sources and rationale: [docs/research/ux-seo.md](research/ux-seo.md). Verified by `tests/e2e/store/seo.spec.ts`.

## Crawlability

- Every public page is server-rendered/prerendered HTML; product and category content does not need JavaScript. Listing pages contain real `<a href="/product/…">` links (asserted on raw HTML in E2E).
- Categories are reachable from the header nav, footer, homepage shortcuts and the chip links under each listing title (`src/lib/shop-nav.ts`), all as `<a href>`.
- Filters/sort are client-side over the full server-rendered list, so `?color=…&sort=…` never creates new server content. They share the base listing's canonical, and `robots.txt` disallows the parameter permutations (Google's recommended first line of defence for faceted URLs).
- `/search` is `noindex, follow` and disallowed in robots; `/admin` and `/api/` are disallowed; admin responses also send `X-Robots-Tag: noindex`.
- Unknown products and categories return **HTTP 404** with the store chrome (`not-found.tsx`). Hidden products 404. `/product/USBA-001` (requirement's `/product/:id`) permanently redirects (308) to the slug URL.

## Metadata

| Page                    | Title                                          | Canonical | Notes                                                                               |
| ----------------------- | ---------------------------------------------- | --------- | ----------------------------------------------------------------------------------- |
| `/`                     | "USBA Official — Heels, Bags & Accessories"    | `/`       | Organization + WebSite JSON-LD                                                      |
| `/shop`, `/shop/[slug]` | category name (template `%s \| USBA Official`) | self      | description includes item count; og:image = first product                           |
| `/product/[slug]`       | product name                                   | self      | description = price (+ "was") + description excerpt; og:image = first photo (1200w) |
| `/search`               | "Search"                                       | `/search` | `noindex`                                                                           |
| info pages              | page name                                      | self      |                                                                                     |

`metadataBase` = `SITE_URL`, so all canonicals/OG URLs are absolute. Each page has exactly one `h1` and a unique title (E2E).

## Structured data (`src/lib/structured-data.ts`, unit-testable, escaped with `serializeJsonLd`)

- **Product** on every product page: name, description, sku/productID (USBA code), all images, brand, category, colour, and one **Offer** with `priceCurrency: PKR`, numeric `price` (current/sale price), `availability` (`InStock` / `OutOfStock` / `PreOrder` — mirrors the visible stock label), `itemCondition`, seller. When on sale, the original price is added as a `StrikethroughPrice` `priceSpecification` (only when visible on the page).
- **BreadcrumbList** on product and listing pages, mirroring the visible breadcrumbs.
- **Organization** + **WebSite** on the homepage (`sameAs` = the brand Instagram).
- Deliberately **omitted**: `aggregateRating`/`review` (no fabricated ratings; reviews are not per-product yet), `shippingDetails` and `hasMerchantReturnPolicy` (no published policy yet — add at Organization level once the owner provides one), ProductGroup (size-only variants share one URL), SearchAction (sitelinks search box retired).

## Sitemap and robots

- `src/app/sitemap.ts`: home, `/shop`, info pages, every category + `/shop/collab` + `/shop/sale`, every visible product with `lastModified`. Regenerated with the `catalog` cache tag.
- `src/app/robots.ts`: allow all, disallow `/admin`, `/api/`, `/search` and filter/sort parameters; points to the sitemap.

## Images

Descriptive alt text: admin-entered alt, falling back to "<product name> — photo n of m". Fixed 4:5 frames, explicit `width`/`height`, no layout shift.

## Open items

- Real product photography and descriptions (current seed content is sample data).
- Return/shipping policy text → then add `hasMerchantReturnPolicy`/`shippingDetails`.
- Urdu (CS-15, Phase 2): add `hreflang` alternates when localized routes exist.
- Submit the sitemap in Google Search Console after launch (needs owner's Google account).
