<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# USBA project notes

- Read `docs/agent/PROGRESS.md`, `docs/agent/DECISIONS.md` and `docs/agent/BLOCKERS.md` first.
- Layout: `src/domain` (pure, isomorphic, unit-tested) · `src/server` (server-only: config/env, db, auth, storage, images, catalog, admin) · `src/app` (thin routes) · `src/components` (ui/store/admin).
- Every admin page and Server Action starts with `await requireAdmin()` (a unit test enforces it for actions). Never rely on `src/proxy.ts`.
- Read env only via `env()` from `src/server/config/env.ts`. No `NEXT_PUBLIC_*` variables.
- Storefront reads go through `src/server/catalog/public.ts` (`'use cache'` + tags); admin writes call `refreshAfterWrite(TAGS.…)`.
- Money is integer PKR. Enums live in `src/domain` and are mirrored by CHECK constraints (`pnpm db:generate` for schema changes; custom SQL in `drizzle/`).
- Checks: `pnpm verify` (format, lint, typecheck, unit, integration, build) and `pnpm test:e2e` (uses the `usba_test` DB on port 3100). Local infra: `pnpm infra:up`.
- Dev helpers: `scripts/dev/screenshot.mjs`, `scripts/dev/overflow.mjs`, `scripts/dev/admin-shots.mjs`.
- Seed data is sample content only; never present it as real products or reviews.
