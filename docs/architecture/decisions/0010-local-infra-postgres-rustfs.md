# ADR 0010: Local infrastructure: Postgres + RustFS via docker compose

Status: Accepted (2026-09-30). Quick reference: D4.

## Context

Developers and CI need Postgres and an S3 API. The Supabase CLI stack is large; MinIO no longer publishes community images.

## Decision

`docker-compose.yml`: `postgres:17-alpine` on :54329 (databases `usba` and `usba_test`, created by `infrastructure/docker/postgres-init`) and `rustfs/rustfs:latest` on :9100 (console :9101). `pnpm setup` = `infra:up` + `storage:setup` + `db:migrate` + `db:seed`. CI starts the same images.

## Alternatives considered

- Supabase CLI local stack: many containers we do not use.
- MinIO: no community images.
- LocalStack: heavier, AWS-only emulation.

## Consequences

- Minimal, provider-neutral, mirrors production (Postgres + S3).

* RustFS is young and uses `latest`; pin a tag if it causes flakiness (S3 compatibility differences vs R2/S3 are possible).
