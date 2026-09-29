# ADR 0013: Analytics seam, none by default

Status: Accepted (2026-09-30). Quick reference: none (new).

## Context

AS-19 (P3) wants product views, top categories and visitors (Google Analytics). Privacy and page weight matter; CSP is strict.

## Decision

`ANALYTICS_PROVIDER=none|plausible` (env). With `plausible`, the script from `PLAUSIBLE_SCRIPT_URL` (default `https://plausible.io/js/script.js`) for `PLAUSIBLE_DOMAIN` is added and its origin allowed in the CSP. A planned tiny `track(event, props)` wrapper defines the event vocabulary: `product_view`, `whatsapp_order_click`, `instagram_dm_click`, `search`, `filter_apply`, `size_guide_open`. Nothing is sent when `none`. GA4 for AS-19 is P3 and would be a further provider value (needs consent handling and CSP additions).

## Alternatives considered

- GA4 now: heavier, cookie consent, CSP loosening, P3 anyway.
- Self-built analytics tables: more admin UI and privacy work.

## Consequences

- Zero third-party requests by default; adding a provider is an env change plus CSP origin.

* Admin dashboard analytics (AS-19) depend on the provider's dashboard until built.
