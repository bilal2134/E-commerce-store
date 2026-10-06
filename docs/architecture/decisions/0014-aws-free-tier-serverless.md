# ADR 0014: AWS free-tier serverless hosting

Status: Accepted (2026-10-06). Supersedes the "Render Starter" launch recommendation in ADR 0009 and `docs/research/hosting.md`; the Docker image remains supported.

## Context

The owner (AWS certified) asked for a fully free deployment with no feature compromises: instant admin updates (AS-02/05/15–17), email + password login (AS-01), Postgres-style SQL, server-side image processing. Traffic is at most ~10k visitors a month and ~400 product images. Options researched on official pages (2026-09-30 → 10-06): Vercel Hobby (non-commercial only), Netlify Free (site paused when credits run out), Render/Koyeb free (sleep, short-lived DB), Cloudflare Workers/D1 (no native addons, 10 ms CPU, SQLite rewrite), Oracle Always Free (idle VMs reclaimed), Google Cloud Run (billing account, egress beyond 1 GB/month North America), Neon (≈400 compute hours/month), Supabase (pauses after a week idle).

## Decision

Run the existing Next.js app on AWS always-free services, region ap-southeast-2 (Sydney), with DNS on Cloudflare's free plan:

| Concern                 | Service                                                                     | Always-free allowance used                      |
| ----------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| CDN, TLS                | CloudFront (pay-as-you-go) + ACM certificate in us-east-1                   | 1 TB transfer, 10M requests a month; ACM free   |
| DNS                     | Cloudflare Free, records DNS only                                           | $0 (a Route 53 zone would be $0.50 a month)     |
| App                     | Lambda (Node 22, x86_64, 1 GB) behind a Function URL, built with OpenNext 4 | 1M requests, 400k GB-s                          |
| Stale-page regeneration | SQS FIFO + revalidation Lambda                                              | 1M requests                                     |
| Next tag cache          | DynamoDB, provisioned 5/5                                                   | 25 RCU/WCU, 25 GB                               |
| Database                | Aurora DSQL (PostgreSQL-compatible)                                         | 100k DPUs + 1 GB per month                      |
| Media and build assets  | One private S3 bucket: `_assets/`, `_cache/`, `media/`                      | not always-free: cents a month, paid by credits |
| Logs                    | CloudWatch Logs, 1-week retention                                           | 5 GB                                            |

Infrastructure is code (`infrastructure/aws/cdk`: `UsbaData` for the database and bucket, `UsbaApp`, optional `UsbaCi` for GitHub OIDC, optional `UsbaEdge` for Route 53 on standard accounts). Nothing billable is created: no NAT gateway, public IPv4, load balancer, RDS, Secrets Manager, API Gateway, Lambda@Edge, WAF, Route 53 zone or provisioned concurrency. A $1 budget alerts on any spend, and CloudWatch alarms email the owner on Lambda errors, throttles and a growing regeneration backlog (budget notifications, the alarms and SNS email are within free allowances).

### Why Sydney, Cloudflare DNS and no flat-rate plan

The owner's account is an AWS Builder Experience **project account**. A service control policy limits it to the region chosen for the country (Pakistan → ap-southeast-2) plus global services, so CloudFormation can't run in us-east-1 (the original plan used Mumbai and a us-east-1 `UsbaEdge` stack). The certificate is therefore requested with the CLI (ACM in us-east-1 is allowed) and passed in as `USBA_CERTIFICATE_ARN`. The CloudFront flat-rate Free plan includes WAF, which project accounts can't attach. Without it, a Route 53 zone would cost $0.50 a month, so DNS moved to Cloudflare (free), with records set to DNS only so CloudFront stays the only cache and admin invalidations take effect immediately. CloudFront's always-free tier covers this traffic many times over. Project accounts pause at their spend limit instead of billing.

### Changes this required in the app

- **DSQL compatibility** (verified against AWS docs): array columns can't be stored, so `colors`/`widths` became `jsonb` (migration `0006`, transparent to the code); `DEFERRABLE` is FK-only, so the image-position unique constraint is immediate (saves already delete and re-insert image rows); indexes are `CREATE INDEX ASYNC` without `DESC`; one DDL per transaction. The DSQL schema lives in `drizzle/dsql/` and `tests/integration/dsql-baseline.test.ts` proves it matches the Drizzle schema exactly. `pnpm db:migrate:dsql` applies it, waits for index jobs and maps the `usba_app` role to the Lambda IAM role.
- **Auth to DSQL**: `DATABASE_AUTH=dsql-iam` signs a 15-minute IAM token per new connection; connections recycle before DSQL's 1-hour limit; transactions and the rate-limit upsert retry on optimistic-concurrency conflicts (SQLSTATE 40001).
- **Origin lock**: the Function URL is public (CloudFront OAC would require browsers to hash every POST body, which breaks Server Actions), so CloudFront sends a secret `x-origin-verify` header and `src/proxy.ts` rejects requests without it. OpenNext's own revalidation requests carry the build's revalidation token instead.
- **Instant updates through the CDN**: admin saves call `updateTag()` (OpenNext tag cache in DynamoDB) and then invalidate CloudFront with a single `/*` path (`src/server/cdn.ts`; the first 1,000 paths a month are free). OpenNext's per-path invalidation handler is deliberately not used.
- **Client IP**: `CLIENT_IP_HEADER=cloudfront-viewer-address`, port stripped (`parseViewerAddress`).
- **Uploads under 6 MB**: Lambda caps a request at 6 MB (base64), so every admin photo is re-encoded in the browser to ≤ 3.5 MB first.
- **sharp in Lambda**: OpenNext strips sharp; `open-next.config.ts` installs the linux-x64 build and `scripts/aws/package-opennext.sh` repoints Turbopack's hashed alias to it.
- **Streaming wrapper fix**: OpenNext 4.1.8's `aws-lambda-streaming` wrapper gzips cached pages but forwards Next's uncompressed `Content-Length`, so clients wait for bytes that never come. `infrastructure/aws/opennext/streaming-wrapper.ts` is the same wrapper with that header dropped when compressing. Re-check on OpenNext upgrades.
- **Background regeneration via SQS**: OpenNext awaits `queue.send()` inside the visitor's request, so the in-process `direct` queue would make stale pages wait for their own regeneration; production uses `sqs-lite` + the revalidation Lambda.
- **Analytics rows cascade with their product** (migration `0007`): with the per-day dedupe index, `ON DELETE SET NULL` turned two views by one visitor into identical rows and made product deletion fail.

## Verification (local, before any AWS account exists)

- The real Lambda bundle runs behind `infrastructure/aws/local/harness.mjs` (CloudFront + Function URL emulation: S3 behaviours, streaming protocol, x-forwarded-host, viewer address, origin secret) and the full Playwright suite runs against it (`E2E_PORT=3300`). This found the sharp, Content-Length, revalidation-queue and redirect-host issues above before deployment.
- `cdk synth` produces the four stacks; the DSQL baseline equals the Drizzle schema (`tests/integration/dsql-baseline.test.ts`); proxy origin-lock rules are unit-tested.

## Consequences

- Cost is $0 within the allowances above, except S3 storage and requests (a few cents a month), which credits cover. The project account's spend limit pauses it rather than billing.
- Cold starts (~1–2 s) only affect CloudFront misses and the admin.
- DSQL limits future migrations: new columns can't be `NOT NULL` with a default in one step, constraints are added `NOT VALID`; write migrations for both `drizzle/` and `drizzle/dsql/` and keep the baseline test green.
- Local development is unchanged (Postgres, RustFS, `pnpm dev`). The Docker image (ADR 0009) still works for Render/ECS if the owner ever prefers a server.
