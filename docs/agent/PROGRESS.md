# Progress

_Last updated: 2026-09-30 (run 2: Phase 2 features, placeholder content, upgrades)._

## State

Phase 1, Phase 1.5 and Phase 2 stories (Urdu CS-15, wishlist CS-21, analytics AS-19) are implemented and verified. Only full checkout/payment remains (needs a payment provider and credentials). See `docs/requirements-traceability.md` (statuses verified by an independent audit).

| Area                                                                                                      | State                                      | Evidence                                               |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| Storefront (home, /shop, /shop/[slug], /product/[slug], search, reviews, contact, about, size guide, 404) | Done                                       | e2e `tests/e2e/store/*` (desktop + Pixel 7)            |
| Admin (auth, dashboard, products, featured order, orders + history, reviews, Instagram, settings)         | Done                                       | e2e `tests/e2e/admin/*`                                |
| Domain/unit                                                                                               | Done                                       | `pnpm test:unit` (154)                                 |
| DB/integration                                                                                            | Done                                       | `pnpm test:integration` (85) against `usba_test`       |
| SEO                                                                                                       | Done                                       | `docs/seo.md`, e2e seo.spec                            |
| Performance                                                                                               | Measured                                   | `docs/performance.md` (Lighthouse mobile 92–93, CLS 0) |
| Accessibility                                                                                             | axe clean on 12 pages; manual audit        | e2e quality.spec                                       |
| Security                                                                                                  | Audited, findings fixed                    | `docs/architecture/security.md`                        |
| Docker image                                                                                              | Built and run locally; no secrets in image | `Dockerfile`                                           |

## How to resume

1. `git log --oneline | head`, `git status`.
2. `pnpm infra:up` then `pnpm verify` (format, lint, typecheck, unit, integration, build) and `pnpm test:e2e`.
3. Read `docs/agent/DECISIONS.md`, `docs/agent/BLOCKERS.md`, `docs/agent/tasks.json`.

## Next actions

- Upgrade `next` to 16.3.8 as soon as it is on npm (React is already 19.3.0); re-run the full suite.
- Native-speaker review of `src/i18n/dictionaries/ur.ts`.
- Owner inputs in BLOCKERS (WhatsApp number, payment FAQ, brand story, real catalogue/photos, hosting accounts).
- First deployment (docs/deployment/current.md) once accounts exist; then Lighthouse + field Web Vitals on the real domain.
- Checkout/payments (ADR-0011) once a provider (e.g. JazzCash/Easypaisa/Stripe) and credentials are chosen.
- Optional: Urdu versions of owner content (hero/FAQ/about) via settings fields.
