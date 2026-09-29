# ADR 0001: Modular monolith on Next.js 16

Status: Accepted (2026-09-30). Quick reference: D1.

## Context

The store needs a public catalogue, a single-owner admin, image handling and ordering links. Team is small; the owner needs low operating cost and few moving parts.

## Decision

One Next.js 16.3 App Router app at the repo root. Boundaries are folders, enforced by convention and lint: `src/domain` (pure, isomorphic), `src/server` (server-only: config, db, auth, storage, images, catalog, admin), `src/app` (thin routes), `src/components`. No monorepo packages, no separate API service.

## Alternatives considered

- Monorepo with packages (`domain`, `db`, `web`, `admin`): more tooling and build config for no team-size benefit.
- Separate admin app / API service: two deployables, duplicated auth, harder cache invalidation.
- Headless CMS + storefront: extra vendor and cost; admin requirements are simple CRUD.

## Consequences

- One deploy unit, one Docker image, shared types and domain code.
- Cache invalidation from admin actions is in-process.

* Boundaries rely on discipline (`server-only`, no `process.env` outside config). Extract packages later only if a second app appears.
