# Progress

_Last updated: 2026-10-07 (live at https://usbaofficial.com.pk; stock quantities; GitHub deploys)._

## State

Phase 1, Phase 1.5 and Phase 2 stories (Urdu CS-15, wishlist CS-21, analytics AS-19) are implemented and verified. Only full checkout/payment remains (needs a payment provider and credentials). See `docs/requirements-traceability.md` (statuses verified by an independent audit).

| Area                                                                                                      | State                                                                                                             | Evidence                                                                             |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Storefront (home, /shop, /shop/[slug], /product/[slug], search, reviews, contact, about, size guide, 404) | Done                                                                                                              | e2e `tests/e2e/store/*` (desktop + Pixel 7)                                          |
| Admin (auth, dashboard, products, featured order, orders + history, reviews, Instagram, settings)         | Done                                                                                                              | e2e `tests/e2e/admin/*`                                                              |
| Domain/unit                                                                                               | Done                                                                                                              | `pnpm test:unit` (154)                                                               |
| DB/integration                                                                                            | Done                                                                                                              | `pnpm test:integration` (85) against `usba_test`                                     |
| SEO                                                                                                       | Done                                                                                                              | `docs/seo.md`, e2e seo.spec                                                          |
| Performance                                                                                               | Measured                                                                                                          | `docs/performance.md` (Lighthouse mobile 92–93, CLS 0)                               |
| Accessibility                                                                                             | axe clean on 12 pages; manual audit                                                                               | e2e quality.spec                                                                     |
| Security                                                                                                  | Audited, findings fixed                                                                                           | `docs/architecture/security.md`                                                      |
| Docker image                                                                                              | Built and run locally; no secrets in image                                                                        | `Dockerfile`                                                                         |
| AWS deployment (ADR 0014)                                                                                 | Live at https://usbaofficial.com.pk (Cloudflare DNS, ACM certificate); pushes to `main` deploy via GitHub Actions | Smoke test on the domain (pages 200, www→apex, http→https); local Lambda harness e2e |

## How to resume

1. `git log --oneline | head`, `git status`.
2. `pnpm infra:up` then `pnpm verify` (format, lint, typecheck, unit, integration, build) and `pnpm test:e2e`.
3. Read `docs/agent/DECISIONS.md`, `docs/agent/BLOCKERS.md`, `docs/agent/tasks.json`.

## Next actions

- Owner: replace sample products with the real catalogue and turn on "Count stock"; change the temporary admin password.
- Native-speaker review of `src/i18n/dictionaries/ur.ts`.
- Owner inputs in BLOCKERS (WhatsApp number, payment FAQ, brand story, real catalogue/photos, hosting accounts).
- Lighthouse + field Web Vitals on the real domain once it serves the new site.
- Checkout/payments (ADR-0011) once a provider (e.g. JazzCash/Easypaisa/Stripe) and credentials are chosen.
- Optional: Urdu versions of owner content (hero/FAQ/about) via settings fields.
