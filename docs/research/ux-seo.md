# UX / SEO research (checked 2026-09-30)

Store: PK fashion/accessories, mobile/Instagram traffic, WhatsApp/IG DM ordering (no cart). Items marked (knowledge) were not re-fetched this session; verify before relying on them.

## 1. Google structured data

Sources (checked 2026-09-30): https://developers.google.com/search/docs/appearance/structured-data/product-snippet, .../merchant-listing, .../product-variants, .../organization, .../review-snippet, .../sitelinks-searchbox

| Topic | Rule |
|---|---|
| Product snippet | Required: `name` + at least one of `review` / `aggregateRating` / `offers`. Recommended: those three. Offer needs `price` + `priceCurrency`; recommended `availability`, `priceValidUntil`. |
| Merchant listing | Required: `name`, `image` (multiple, >=50K px), `offers` with `price` (> 0) + `priceCurrency` (ISO 4217, `PKR`). Recommended: `availability`, `brand`, `sku`/`gtin`/`mpn`, `description`, `priceValidUntil`, `shippingDetails`, `hasMerchantReturnPolicy`. |
| Availability values | `InStock`, `OutOfStock`, `PreOrder`, `BackOrder`, `Discontinued`, `LimitedAvailability`, `OnlineOnly`, `InStoreOnly` (full URL form, e.g. `https://schema.org/InStock`). Must match visible page state. |
| Sale price | Active price in `offers.price` (no priceType). Original price goes in `priceSpecification` with `priceType: "https://schema.org/StrikethroughPrice"`; must be higher than active price and visible on the page. If both `offers.price` and `priceSpecification` exist Google uses `offers.price`. Use `priceValidUntil` for timed sales. Omit strikethrough if there is no real original price. |
| Variants (ProductGroup) | Requires `name`, `productGroupID`, `variesBy` (color, size, suggestedAge, suggestedGender, material, pattern; full schema.org URLs), `hasVariant` Products each with unique `sku`/`gtin`, and a distinct preselectable URL per variant (or single page with query param plus one canonical). Size-only is valid but only worthwhile if each size has its own price/stock AND its own URL (e.g. `?size=38`). Recommendation: use ONE Product with one Offer (or AggregateOffer lowPrice/highPrice if prices differ). Skip ProductGroup. |
| shippingDetails / hasMerchantReturnPolicy | Optional. Omit when unknown; wrong data is worse than none and must match the policy shown on site. Can be set once at Organization level (`hasMerchantReturnPolicy`, `hasShippingService`) and overridden per product. Add only after policy is real and published. |
| BreadcrumbList | Yes on category/product pages: `itemListElement` of ListItem with `position`, `name`, `item` (last may omit `item`). Must mirror visible breadcrumbs. |
| Organization | No required props. Recommended: `name`, `url`, `logo` (>=112x112 px, crawlable, legible on white), `sameAs` (Instagram, @fairycoreforher profile). Put on home/about page only. |
| WebSite / sitelinks search box | Sitelinks search box REMOVED (Nov 2024); `SearchAction` markup gives no benefit. `WebSite` with `name`/`url` is still fine for site name. |
| Reviews | Site-collected product reviews on Product pages are OK if genuine, user-sourced (not editor-curated), visible on page, not incentivised (discounts/free items). Self-serving: `Organization`/`LocalBusiness` pages whose reviews are controlled by the entity (including embedded widgets) are ineligible for stars. Pros/cons (`positiveNotes`) are editorial-review only. |

What NOT to do
- No `aggregateRating`/`review` unless real, visible, user-sourced ratings exist. Never hardcode ratings.
- Don't mark up price/availability that differs from the visible page; use numeric `price: 1999` and `priceCurrency: "PKR"`, never `0` or "Rs 1,999" strings.
- No review markup on Organization/home page; no Product markup on category listing pages.
- Don't ship guessed `shippingDetails`/return policy. Don't add SearchAction sitelinks markup.
- Prefer JSON-LD, server-rendered in initial HTML; escape `<` in serialized JSON.

Minimal Product JSON-LD
```json
{"@context":"https://schema.org","@type":"Product","name":"...","image":["https://.../1.jpg"],
 "description":"...","sku":"USBA-123","brand":{"@type":"Brand","name":"USBA Official"},
 "offers":{"@type":"Offer","url":"https://.../p/slug","priceCurrency":"PKR","price":1999,
  "availability":"https://schema.org/InStock","itemCondition":"https://schema.org/NewCondition"}}
```
Sale: add `"priceSpecification":{"@type":"UnitPriceSpecification","priceType":"https://schema.org/StrikethroughPrice","price":2500,"priceCurrency":"PKR"}` alongside `offers.price` 1999. Pre-order: `availability` = `https://schema.org/PreOrder`.

## 2. Faceted navigation / filtered URLs / pagination

Sources (checked 2026-09-30): https://developers.google.com/search/docs/crawling-indexing/crawling-managing-faceted-navigation, https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading

| Need | Method |
|---|---|
| Filter/sort/search URLs not needed in index | `robots.txt` Disallow on parameters (Google's first recommendation, most effective for crawl load), e.g. `Disallow: /*?*sort=`, `/*?*filter`, `/search`. |
| Some facet pages should rank | Clean crawlable URLs, self-canonical; other combos canonical to base category. Canonical reduces crawl only slowly over time. |
| Remove duplicate filtered/sorted content from index | `noindex` (per pagination doc). noindex needs crawling, so do NOT also robots-disallow the same URLs. Pick one. |
| Internal search results | Disallow `/search` or `noindex`; keep out of sitemap. |
| Client-only filters | URL fragments (#) ignored by Google; fine for pure UI state. |
| If facets are crawlable | Standard `&` separators, consistent parameter order, return 404 (not redirect) for empty result sets. |
| Pagination | Real URLs (`?page=N`), each with its own self-referencing canonical (never canonicalise all to page 1), crawlable `<a href>` links between pages (not JS-only "load more"). `rel=next/prev` no longer used by Google. No fragments for pages. |

For this store: sitemap lists only category, product and static pages; sort/filter params disallowed in robots.txt with canonical to base as backstop; page>1 self-canonical and indexable.

## 3. Core Web Vitals

Sources (checked 2026-09-30): https://web.dev/articles/vitals, https://web.dev/articles/optimize-lcp

| Metric | Good | Poor (knowledge) |
|---|---|---|
| LCP | <= 2.5 s | > 4 s |
| INP | <= 200 ms | > 500 ms |
| CLS | <= 0.1 | > 0.25 |

Assessed at the 75th percentile of page loads, mobile and desktop separately.

LCP image rules
- LCP element discoverable in initial HTML (server-rendered `<img>`), same origin/CDN if possible.
- `fetchpriority="high"` on hero / first product image; NEVER `loading="lazy"` on it. Lazy only below the fold.
- Preload only if the image is not discoverable in markup.
- Modern formats (AVIF/WebP), CDN, long cache. LCP budget: TTFB ~40%, load duration ~40%, load delay <10%, render delay <10%.
- Always set `width`/`height` or `aspect-ratio` (CLS).
- `srcset` with `w` descriptors plus accurate `sizes` (e.g. `(min-width:1024px) 25vw, 50vw` for a 2-column mobile grid). In Next.js: `next/image` with `priority` on LCP image and correct `sizes`.
- Keep third parties (Instagram embeds, chat widgets) off the critical path (INP/LCP).

## 4. Mobile fashion e-commerce UX (Baymard)

Sources (checked 2026-09-30): https://baymard.com/blog/current-state-product-list-and-filtering, https://baymard.com/blog/ecommerce-filter-ui, https://baymard.com/blog/current-state-ecommerce-product-page-ux, https://baymard.com/blog/ecommerce-navigation-best-practice, https://baymard.com/blog/autocomplete-design, https://baymard.com/blog/mobile-ux-ecommerce. Sticky CTA and some gallery details are (knowledge) of Baymard research.

- Filters: full-screen or bottom-sheet drawer on mobile with a sticky apply button showing "Show N results"; multi-select inside a group; a filter for every attribute displayed on cards (size, colour, price, category); clear labels.
- Applied filters: removable chips above the list in addition to state inside the drawer; "Clear all"; users misjudge scope if applied state is only shown at the control.
- Show total result count in list header. Sort: one labelled control (Newest, Price low-high, high-low), current sort visible, sensible default.
- Product card: consistent-aspect primary image, name, price (strikethrough + badge if on sale), sold-out/pre-order badge; whole card tappable.
- Gallery: swipe, dots or "2/6" counter, thumbnails, tap/pinch zoom; in-scale and on-model images (42% of users judge size from images; 23% of sites lack model imagery).
- Size selector: exposed buttons, NOT a dropdown (57% of sites wrongly use dropdowns). Unavailable sizes visibly disabled but still readable. If order tapped without a size, show inline error next to the selector and scroll/focus it. Size guide link near selector.
- Sticky primary CTA: bottom bar with "Order on WhatsApp" and price on mobile; must not obscure focused elements. Show shipping and return info near the CTA (44% of sites lack return info; 67% omit shipping cost on product page; 15% abandon over returns).
- Search autocomplete: 4-8 suggestions on mobile (max ~10 desktop), handle misspellings, suggest categories (72% of mobile sites don't), explicit submit button beside field.
- Home/category nav: about 10 or fewer visible subcategories; featured links state full scope (e.g. "Women's heels on sale"); highlight current category (95% of sites fail); parent headings clickable; subcategory thumbnails; avoid auto-rotating carousels.

## 5. WhatsApp and Instagram links

Sources (checked 2026-09-30): https://faq.whatsapp.com/5913398998672934 (fetch was thin, format below is (knowledge) of documented click-to-chat), https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/ig-me-links

- WhatsApp: `https://wa.me/<number>?text=<urlencoded>`. Number in full international format, digits only: no `+`, spaces, dashes, brackets or leading zeros. Pakistan 0300 1234567 becomes `923001234567`. Alternative `https://api.whatsapp.com/send?phone=923001234567&text=...` behaves the same.
- Encode text with `encodeURIComponent` (newline `%0A`; `&`, `#`, `+`, emoji). Keep short (aim <= ~500 chars, total URL well under ~2,000): product name, size, price, product URL, quantity. Message is prefilled only; user taps send. Use `target="_blank" rel="noopener"`.
- Instagram DM: `https://ig.me/m/<username>` (no @) is documented by Meta (ig.me links). Optional `?ref=` (alphanumeric, `-_=`, up to 2,083 chars) only meaningful with Icebreakers on a professional account. Works only in the mobile app (NOT Instagram Web), app version 235+. DM text cannot be prefilled, so copy order details to clipboard or show them beside the button. Fallback `https://instagram.com/<username>` for desktop / failure.

## 6. Accessibility (W3C APG / WCAG 2.2)

Sources (checked 2026-09-30): https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/, https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html; other patterns from APG (knowledge).

| Pattern | Rules |
|---|---|
| Search autocomplete | Input `role="combobox"` `aria-autocomplete="list"` `aria-controls`=listbox id `aria-expanded`; popup `role="listbox"` with `role="option"` items, `aria-selected` on active; DOM focus stays on input via `aria-activedescendant`. Keys: Down/Up navigate, Enter select/submit, Esc close/clear, Alt+Down open. Announce result count in a polite live region. |
| Carousel (gallery) | Container `aria-roledescription="carousel"` with label; slides `role="group" aria-roledescription="slide" aria-label="2 of 6"`; visible prev/next buttons; no auto-rotation (or provide pause); swipe needs button alternative; thumbnails are buttons with `aria-current`. |
| Dialog / drawer (filters, mobile menu) | `role="dialog" aria-modal="true"` with label (or native `<dialog>`); focus moves in, Tab trapped, Esc closes, focus returns to trigger; background `inert`. |
| Disclosure (size guide, shipping) | `<button aria-expanded aria-controls>` toggling a region; native `<details>` acceptable. |
| Size selection | `role="radiogroup"` with label; native `<input type="radio">` styled as chips is simplest; arrows move selection; unavailable sizes `disabled`/`aria-disabled` with "sold out" text, not colour alone; error tied via `aria-describedby`. |

WCAG 2.2 AA items
- 2.5.8 Target Size (Minimum): pointer targets >= 24x24 CSS px (or spacing exception). Aim for 44px on size chips, CTAs, gallery arrows, filter-chip remove buttons.
- 2.4.11 Focus Not Obscured (Minimum): sticky header/CTA bar/banners must not fully hide focused elements; use `scroll-padding-top/bottom`.
- 2.5.7 Dragging Movements (AA): all functionality using dragging must be achievable with a single pointer without dragging. Admin drag-reorder needs "Move up/down" buttons or a position input.
- Also 3.2.6 Consistent Help: keep the WhatsApp/contact entry in the same place on every page.

## 7. Instagram feed embedding

Sources (checked 2026-09-30): search results (behold.so, wpzoom, spotlightwp, smashballoon) confirming Basic Display API shutdown on 2024-12-04; Meta API specifics (knowledge).

- Instagram Basic Display API: shut down 2024-12-04; endpoints error, no grace period. Do not use.
- Replacement: Instagram API with Instagram Login (or Instagram Graph API via Facebook Login). Both require an Instagram Business or Creator (professional) account; personal accounts unsupported.
- Owner must provide: a professional Instagram account; a Meta developer app with the Instagram product, with the owner added as app tester/role (own-account use generally works in Standard access without App Review); an access token (long-lived ~60 days, must be refreshed on a schedule, stored only in server env). The Facebook Login route also needs a linked Facebook Page.
- Fetch server-side: `GET /me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp`. `media_url` values expire, so cache/proxy (ISR, revalidate about 1 h) and fall back to a static curated set on token failure.
- Official embeds (blockquote + embed.js / oEmbed): third-party JS/iframes, cookies and tracking (privacy/consent), hurt LCP/INP/CLS; oEmbed needs a Meta app token. Preferred for a small store: admin-curated image grid linking to permalinks (zero API dependency), or server-fetched thumbnails via `next/image`, lazy-loaded below the fold.
