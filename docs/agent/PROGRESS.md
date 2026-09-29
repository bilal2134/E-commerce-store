# Progress

Updated 2026-09-30. Machine-readable ledger: `docs/agent/tasks.json`.

## Done

- Scaffold (commit 7a9e4f0): Next.js 16.3.7 modular monolith, domain modules, Drizzle schema + SQL migrations (0000_init, 0001_integrity), custom admin auth primitives, storage port + S3/memory adapters, image pipeline, seed/migrate/create-admin/setup-storage scripts, docker compose (Postgres 17 + RustFS), security headers.
- Research: docs/research/{hosting,stack,security,ux-seo}.md.
- Docs and infra (this pass): architecture docs, ADRs 0001-0013, deployment docs, traceability, assumptions, Dockerfile, .dockerignore, `scripts/migrate.mjs`, render.yaml, CI workflow, Dependabot, README.

## In progress

| Owner                      | Work                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Admin app (worktree agent) | `src/app/admin/*`, `src/server/admin/*`, `src/components/admin/*` (login, products CRUD, orders, reviews, settings) |
| Tests (worktree agent)     | `tests/**`, `playwright.config.ts`, Vitest projects (unit, integration), e2e + axe                                  |
| Storefront (orchestrator)  | `src/app/*` public routes, `src/components/store/*`, sitemap/robots, `/api/health`, `/api/search-index`             |

## Next actions

1. Land storefront routes, then verify `docker build` end to end (unverified so far) and confirm `drizzle-orm`/`postgres` resolution for `scripts/migrate.mjs` inside the image.
2. Wire CI: confirm script names/ports used by Playwright config match `.github/workflows/ci.yml` (`SITE_URL=http://localhost:3100`, `TEST_DATABASE_URL`).
3. Add `PLAUSIBLE_SCRIPT_URL` to `.env.example`; add periodic cleanup for sessions/rate limits.
4. Upgrade Next.js to 16.3.8 when the security release is published (expected 2026-09-30).
5. Resolve owner blockers (docs/agent/BLOCKERS.md), then measure CS-20 (Lighthouse mobile) on staging.
6. Update statuses in `docs/requirements-traceability.md` as features land.
