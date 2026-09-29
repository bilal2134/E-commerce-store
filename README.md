# USBA Official

Fashion e-commerce storefront for USBA Official (Pakistan): browse footwear, bags, accessories and clothing, then order through WhatsApp or Instagram DM with a pre-filled message. A single-owner admin panel manages products, images, orders, reviews and site settings. Checkout and payments are a later phase.

## Stack

- Next.js 16.3 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4
- PostgreSQL 17, Drizzle ORM, postgres.js (SQL migrations in `drizzle/`)
- S3-compatible object storage (RustFS locally; R2, Supabase Storage or S3 in production), images processed with `sharp` into WebP variants
- Custom admin auth (Argon2id, opaque DB-backed sessions)
- Vitest, Playwright, axe; Docker; GitHub Actions

## Prerequisites

- Node.js 22.12 or newer (24 recommended)
- pnpm 10 (`corepack enable`; the repo pins `pnpm@10.4.1`)
- Docker (for local Postgres and object storage)

## Quick start

```bash
pnpm install
cp .env.example .env        # then set ADMIN_PASSWORD (12+ characters)
pnpm setup                  # infra:up + storage:setup + db:migrate + db:seed
pnpm admin:create           # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD
pnpm dev
```

Open http://localhost:3000 for the store and http://localhost:3000/admin for the admin panel. `pnpm setup` seeds demo products with a placeholder WhatsApp number; set the real one in Admin -> Settings.

## Commands

| Command                        | What it does                                                         |
| ------------------------------ | -------------------------------------------------------------------- |
| `pnpm dev`                     | Start the dev server                                                 |
| `pnpm build`                   | Production build (needs the database and S3/MEDIA env at build time) |
| `pnpm start`                   | Run the production build                                             |
| `pnpm lint`                    | ESLint (no warnings allowed)                                         |
| `pnpm typecheck`               | `next typegen` + `tsc --noEmit`                                      |
| `pnpm format`                  | Prettier write (`format:check` to verify)                            |
| `pnpm test:unit`               | Vitest unit tests                                                    |
| `pnpm test:integration`        | Vitest integration tests (Postgres + storage from `infra:up`)        |
| `pnpm test:e2e`                | Playwright end-to-end and accessibility tests                        |
| `pnpm verify`                  | format check, lint, typecheck, unit, integration, build              |
| `pnpm db:generate`             | Generate a migration from schema changes (drizzle-kit)               |
| `pnpm db:migrate`              | Apply SQL migrations                                                 |
| `pnpm db:seed`                 | Seed demo categories, products, settings                             |
| `pnpm admin:create`            | Create the admin user                                                |
| `pnpm infra:up` / `infra:down` | Start/stop local Postgres and RustFS                                 |

## Project structure

```
src/domain/          pure logic: catalog, categories, listing filters, search, ordering, orders
src/server/          server-only: config, db, auth, storage, images, catalog, admin, logger
src/app/             routes (storefront, /admin, /api)
src/components/      ui, store, admin components
scripts/             migrate, seed, setup-storage, create-admin
drizzle/             SQL migrations
infrastructure/      local Docker init scripts
docs/                architecture, deployment, research, agent notes
```

## Documentation

| Doc                                                                    | Purpose                                                                                         |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [docs/architecture/overview.md](docs/architecture/overview.md)         | System, modules, caching, rendering, testing, observability                                     |
| [docs/architecture/portability.md](docs/architecture/portability.md)   | Moving Postgres, storage, hosting                                                               |
| [docs/architecture/scaling.md](docs/architecture/scaling.md)           | Limits and scaling path                                                                         |
| [docs/architecture/security.md](docs/architecture/security.md)         | Threat model and controls                                                                       |
| [docs/architecture/decisions/](docs/architecture/decisions/README.md)  | ADRs                                                                                            |
| [docs/deployment/current.md](docs/deployment/current.md)               | Launch setup, env vars, first-deploy checklist (also render, vercel, cloudflare, aws-migration) |
| [docs/requirements-traceability.md](docs/requirements-traceability.md) | Requirement to code/test matrix                                                                 |
| [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md)                             | Assumptions where requirements were silent                                                      |
| [docs/research/](docs/research)                                        | Sourced research (hosting, stack, security, UX/SEO)                                             |
| [docs/agent/](docs/agent)                                              | Decisions, progress, blockers, task ledger                                                      |

## Deployment

Docker image (`Dockerfile`, Next standalone) on Render (`render.yaml`) with managed Postgres and R2 is the recommended launch setup; see [docs/deployment/current.md](docs/deployment/current.md). The production build queries the database, so `DATABASE_URL` and the S3/MEDIA variables must be present at build time.

## Security notes

- Never commit `.env` or any populated environment file; only `.env.example` is tracked. CI runs gitleaks and osv-scanner.
- Use a unique admin password of 12+ characters; rotate any credential that was exposed.
- If using Supabase, disable the Data API (see [docs/architecture/security.md](docs/architecture/security.md)).
- Report vulnerabilities privately to the site owner.
