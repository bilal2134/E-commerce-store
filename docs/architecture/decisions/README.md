# Architecture Decision Records

Short ADRs (Context / Decision / Alternatives considered / Consequences). The terse quick reference is `docs/agent/DECISIONS.md` (D1-D18).

| ADR                                                   | Title                                                      | Quick ref |
| ----------------------------------------------------- | ---------------------------------------------------------- | --------- |
| [0001](0001-modular-monolith-nextjs.md)               | Modular monolith on Next.js 16                             | D1        |
| [0002](0002-cache-components-and-tags.md)             | Cache Components with coarse tags                          | D2        |
| [0003](0003-postgres-drizzle-sql-migrations.md)       | PostgreSQL + Drizzle with checked-in SQL migrations        | D3        |
| [0004](0004-custom-admin-auth.md)                     | Custom single-owner admin authentication                   | D7        |
| [0005](0005-s3-compatible-storage-port.md)            | S3-compatible storage behind a port                        | D5        |
| [0006](0006-image-pipeline-sharp-webp-variants.md)    | Server-side sharp pipeline with WebP variants              | D6        |
| [0007](0007-client-side-listing-filters.md)           | Client-side listing filters over server-rendered lists     | D8        |
| [0008](0008-search-in-process-ranker.md)              | In-process search ranker                                   | D9        |
| [0009](0009-hosting-docker-first.md)                  | Docker-first hosting, Render Starter recommended           | D18       |
| [0010](0010-local-infra-postgres-rustfs.md)           | Local infrastructure: Postgres + RustFS via docker compose | D4        |
| [0011](0011-whatsapp-ordering-and-future-checkout.md) | WhatsApp/Instagram ordering now, checkout-ready schema     | D12, D13  |
| [0012](0012-localization-strategy.md)                 | English first, RTL-ready for Urdu later                    | D17       |
| [0013](0013-analytics-seam.md)                        | Analytics seam, none by default                            | -         |
