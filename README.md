# USBA Official

Fashion e-commerce storefront for USBA Official (Pakistan): browse footwear, bags, accessories and clothing, then order through WhatsApp or Instagram DM with a pre-filled message. The store is available in English and Urdu (`/ur`, right-to-left), with saved lists, live search and URL-shareable filters. A single-owner admin panel manages products, images, categories, featured order, orders, reviews, Instagram posts, site settings, the owner account and privacy-friendly visitor insights. Checkout and payments are a later phase.

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

Open http://localhost:3000 for the store (http://localhost:3000/ur for Urdu) and http://localhost:3000/admin for the admin panel. `pnpm setup` seeds clearly labelled sample content (illustrated sample products, banner, Instagram posts, reviews, orders) and a placeholder WhatsApp number; replace all of it in the admin before launch. `SEED_PLACEHOLDERS=0 pnpm db:seed` seeds the minimal set used by E2E tests.

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
| `pnpm storage:cleanup`         | Report (or `-- --delete`) image objects no database row references   |

## Project structure

```
src/domain/          pure logic: catalog, categories, listing filters, search, ordering, orders, saved lists
src/i18n/            locales (en, ur), typed dictionaries, locale helpers
src/server/          server-only: config, db, auth, storage, images, catalog, admin, logger
src/app/             routes: [lang]/(store) storefront, /admin, /api (src/proxy.ts maps / → /en)
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

**Chosen setup: AWS free tier** (CloudFront Free plan, Lambda via OpenNext, Aurora DSQL, S3), $0 a month at this traffic. Step-by-step guide: [docs/deployment/aws.md](docs/deployment/aws.md); design and trade-offs: ADR 0014. Infrastructure code: `infrastructure/aws/cdk`; the Lambda bundle can be tested locally with `infrastructure/aws/local`.

The Docker image (`Dockerfile`, Next standalone) still works for a conventional server (Render, ECS); see [docs/deployment/current.md](docs/deployment/current.md). Either way the production build queries the database, so the database and S3/MEDIA variables must be present at build time.

## Security notes

- Never commit `.env` or any populated environment file; only `.env.example` is tracked. CI runs gitleaks and osv-scanner.
- Use a unique admin password of 12+ characters; rotate any credential that was exposed.
- If using Supabase, disable the Data API (see [docs/architecture/security.md](docs/architecture/security.md)).
- Report vulnerabilities privately to the site owner.
