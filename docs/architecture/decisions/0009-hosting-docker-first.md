# ADR 0009: Docker-first hosting, Render Starter recommended

Status: Accepted (2026-09-30). Quick reference: D18.

## Context

Vercel Hobby is non-commercial; Cloudflare Workers cannot run `sharp`; free tiers pause or expire (docs/research/hosting.md).

## Decision

Deploy a Docker image (Next standalone output). Recommended launch: Render Starter (~$7/mo, secondary source) + Neon or Supabase Postgres + Cloudflare R2 or Supabase Storage, single instance. AWS target: ECR + ECS Express Mode/Fargate + ALB, RDS, S3 + CloudFront. Vercel Pro and Cloudflare are documented alternatives, not recommended.

## Alternatives considered

- Vercel Pro ($20/mo): works but pricier, 4.5 MB body limit, more lock-in.
- Cloudflare Workers + OpenNext: `sharp` unsupported.
- AWS from day one: higher cost and setup for a small shop.
- App Runner: closed to new customers.

## Consequences

- Same artifact runs anywhere containers run; low cost.

* Render Starter has 512 MB RAM and a single instance (no redundancy).
* Price facts are from secondary sources; verify before purchase.
