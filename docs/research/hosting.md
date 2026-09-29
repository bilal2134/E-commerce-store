# Hosting research (sections 2-8)

All facts checked 2026-09-30. "(secondary)" means confirmed only on a third-party page; "(not found)" means the official page did not state it in what was fetched.

## Recommendation

**(a) Cheapest production-appropriate launch:** a single Docker container of the Next.js standalone build on **Render paid web service (Starter, about $7/mo, secondary)** + **Neon Free Postgres** (0.5 GB) + **Cloudflare R2** (S3 API, 10 GB free, zero egress) with a custom domain on the bucket. Expected cost is about $7/mo. Rationale:
- Vercel Hobby is explicitly non-commercial, and this shop is commercial (selling products).
- Render Free spins down after 15 min and Free Postgres expires after 30 days, so it is not for production.
- Cloudflare Workers/OpenNext cannot run `sharp`, which the design requires.
- Supabase Free pauses projects after 1 week of inactivity, which is risky for a low-traffic shop. Supabase Pro ($25/mo) is a reasonable "one vendor" alternative (DB + S3-compatible storage) if the owner prefers about $32/mo total with no cold starts.
- Keep the DB and storage behind env vars (`DATABASE_URL`, `S3_ENDPOINT`, `S3_BUCKET`, keys) so nothing is vendor-specific. Use plain Postgres SQL migrations (Drizzle) and the standard AWS SDK S3 client.
- Caveats to verify before launch: Render's official price page did not render in my fetch (the $7 Starter figure comes from secondary sources; official plan docs only confirm plan IDs), and Starter has only 512 MB RAM, so limit `sharp` concurrency (e.g. `sharp.concurrency(1)`, one upload at a time) or use the next plan up. Neon free has 5-min scale-to-zero ("a few hundred ms" wake-up), so the first request after idle is slower; use ISR/`use cache` for catalog pages so most visits do not hit the DB.
- Run one instance only. Multi-instance requires a shared Next.js cache handler (see stack.md).

**(b) AWS migration path:** same container image -> **ECR + ECS on Fargate** (use **ECS Express Mode**, which provisions Fargate service + ALB + autoscaling + networking with no extra charge), **RDS for PostgreSQL** (or Aurora) via `pg_dump`/restore, **S3** (R2 -> S3 copy with `rclone`; the S3 API means only the endpoint and keys change), **CloudFront** in front of the ALB and S3 (Free plan: 1M requests + 100 GB/mo). Do NOT choose App Runner (closed to new customers) and do not choose Amplify Hosting (docs list Next.js support only "up through Next.js 15" and no on-demand ISR or streaming).

## Comparison

| Option | Commercial OK | Cost (entry) | Runs sharp | Postgres | Verdict |
|---|---|---|---|---|---|
| Vercel Hobby | **No** (non-commercial only) | $0 | Function bundles up to 250 MB; native binaries need correct Linux x64 install | Bring your own | Not allowed for a shop |
| Vercel Pro | Yes | $20/mo (includes $20 credit, 1 seat) | Yes, but uploads through functions capped at 4.5 MB | Bring your own | Works, but pricier and lock-in |
| Cloudflare Workers + OpenNext | Free plan commercial use allowed | Free (100k req/day) or $5/mo | **No** (native `.node` not supported) | Hyperdrive to external PG | Blocked by sharp |
| Render Free | Not for production | $0 | Yes (Docker) | Free PG expires in 30 days | Demo only |
| **Render Starter** | Yes | about $7/mo (secondary) | Yes (Docker) | Bring your own | **Recommended** |
| Supabase Free | Allowed | $0 | n/a | 500 MB, pauses after 1 week idle | Too fragile |
| Supabase Pro | Yes | from $25/mo | n/a | 8 GB, no pausing | Good all-in-one |
| Neon Free | Allowed | $0 | n/a | 0.5 GB, 100 CU-hrs, 5-min autosuspend | **Recommended for launch DB** |
| Cloudflare R2 | Yes | 10 GB free, then $0.015/GB-mo | n/a | n/a | **Recommended for images** |
| AWS ECS Fargate + RDS + S3 + CloudFront | Yes | Not priced here (not fetched) | Yes | RDS/Aurora | Migration target |

## 2. Vercel

| Fact | Value | Source (checked 2026-09-30) |
|---|---|---|
| Hobby commercial restriction | "**Hobby teams are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan.**" Commercial use is defined as any deployment "used for the purpose of financial gain of **anyone** involved in **any part of the production** of the project, including a paid employee or consultant writing the code". Examples: "Any method of requesting or processing payment from visitors", "Advertising the sale of a product or service", "Receiving payment to create, update, or host the site". Donations are not commercial | https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage |
| Pro price | **$20/month platform fee**, 1 deploying seat and **$20 monthly usage credit** included; extra paid seats $20/mo; viewer seats free; flat-rate CDN tier (1M requests, 1 TB) included | https://vercel.com/docs/plans/pro-plan |
| Function duration | Hobby 300s max; Pro 300s default, 800s max (1800s extended, beta) | https://vercel.com/docs/functions/limitations |
| Request/response body | **4.5 MB max** (413 `FUNCTION_PAYLOAD_TOO_LARGE`). Workaround is direct client upload to storage (e.g. Vercel Blob, or presigned S3/R2 URL) | https://vercel.com/docs/functions/limitations ; https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions |
| Function size / memory | 250 MB uncompressed (5 GB "large functions" beta); Hobby 2 GB RAM, Pro up to 4 GB | https://vercel.com/docs/functions/limitations |
| Image optimization pricing | Pro on-demand: $0.05 per 1K transformations (regional up to $0.0812), $0.40 per 1M cache reads, $4.00 per 1M cache writes. Hobby included: 5K transformations, 300K reads, 100K writes | https://vercel.com/docs/image-optimization/limits-and-pricing |
| Image optimization limits | Output <= 10 MB, source <= 8192 px wide/high | same |
| `sharp` in Vercel Functions | Not stated on an official page I could fetch. Native binary must match Linux x64 (community reports of "module not found" needing `npm install --arch=x64 --platform=linux sharp`); Vercel itself does optimization for `next/image` on the platform. Treat as workable but unverified officially | https://community.vercel.com/t/help-adding-sharp-to-serverless-function/6069 (secondary) |

## 3. Cloudflare Workers + OpenNext

| Fact | Value | Source (checked 2026-09-30) |
|---|---|---|
| Adapter | `@opennextjs/cloudflare` **1.20.7** (`latest`). Peers: `next >=15.5.26 <16 || >=16.3.6`, `wrangler ^4.125.0` | https://registry.npmjs.org/@opennextjs/cloudflare/latest |
| Next.js support | All 16.x, latest 15 minors (docs say 14 dropped Q1 2026). SSR, SSG, ISR, middleware, PPR supported; Node middleware (15.2) unsupported; `runtime = "edge"` must be removed | https://opennext.js.org/cloudflare ; https://opennext.js.org/cloudflare/get-started |
| Node compat | Needs `nodejs_compat` flag and compatibility date >= 2024-09-23 | https://opennext.js.org/cloudflare/get-started |
| `sharp` / native modules | **Not supported.** Workers cannot load native `.node` addons; OpenNext build fails on sharp's `.node` binaries (GitHub issue), workaround is aliasing sharp to a stub. Image optimization there uses Cloudflare Images (extra cost; `minimumCacheTTL` unsupported) | https://github.com/opennextjs/opennextjs-cloudflare/issues/1394 ; https://opennext.js.org/cloudflare/howtos/image |
| Worker size | Cloudflare limits page: **64 MiB uncompressed** on Free and Paid (no compressed limit). The OpenNext page still says 3 MiB Free / 10 MiB Paid gzip; these conflict, treat the OpenNext figure as possibly stale | https://developers.cloudflare.com/workers/platform/limits/ ; https://opennext.js.org/cloudflare |
| Free plan | 100,000 requests/day; 10 ms CPU per request; 50 subrequests; 128 MB memory | https://developers.cloudflare.com/workers/platform/limits/ |
| Paid plan | **$5/month minimum**; 10M requests/mo included then $0.30/M; 30M CPU-ms included; CPU up to 5 min; 10,000 subrequests | https://developers.cloudflare.com/workers/platform/pricing/ |
| Commercial use on Free | Allowed (Cloudflare community answer: free plans may be used commercially, no SLA/support) (secondary) | https://community.cloudflare.com/t/is-cloudflare-pages-workers-free-plan-free-for-commercial-use/291741 |
| Postgres | **Hyperdrive** (Free and Paid plans): connection pooling and caching for PostgreSQL/MySQL (Neon, AWS, etc.) | https://developers.cloudflare.com/hyperdrive/ |
| Request body | 100 MB (Free/Pro account plan) | https://developers.cloudflare.com/workers/platform/limits/ |

Conclusion: fine for a `sharp`-free app; here the sharp requirement rules it out (unless image processing moves to a separate Node service, adding complexity).

## 4. Render

| Fact | Value | Source (checked 2026-09-30) |
|---|---|---|
| Free web service | Spins down after **15 minutes** of inactivity; **about 1 minute** to restart; 750 instance-hours/month per workspace; one instance; no persistent disk, no SSH. Docs: for testing, hobby and previews, not production | https://render.com/docs/free |
| Free Postgres | Expires after **30 days**; 1 GB | https://render.com/docs/free |
| Commercial use on free | Not explicitly stated; AUP forbids reselling the service. Docs position free tier as non-production | https://render.com/acceptable-use (not read in full) |
| Cheapest always-on | Starter **$7/mo** (0.5 vCPU, 512 MB) and Standard **$25/mo** (1 vCPU, 2 GB) (secondary, e.g. https://makerkit.dev/pricing-calculator/render). Official docs confirm Aug 2026 rename to plan IDs like `1c-2g` with no price change but did not list prices in my fetch. Paid workspace plan "Pro" $25/mo flat; Hobby workspace has no monthly fee | https://render.com/docs/compute-plans ; https://render.com/docs/new-workspace-plans (search snippet) |
| Docker | Supported: Git repo with Dockerfile or prebuilt image; bind to `0.0.0.0` and `PORT` (default 10000); zero-downtime deploys, managed TLS, custom domains | https://render.com/docs/web-services |

## 5. Supabase

| Fact | Free | Pro | Source (checked 2026-09-30) |
|---|---|---|---|
| Price | $0 | from **$25/mo** ($10 compute credit covers one Micro) | https://supabase.com/pricing |
| Database | 500 MB (shared CPU, 500 MB RAM) | 8 GB included, then $0.125/GB | same |
| File storage | 1 GB | 100 GB, then $0.0213/GB | same |
| Egress | 5 GB | 250 GB, then $0.09/GB | same |
| Max file size | 50 MB | 500 GB | same |
| Inactivity | **Paused after 1 week of inactivity**; 2 active projects max | Never paused | same |

- **Storage S3 compatibility:** supports bucket ops (create/list/delete/location), object get/put/delete/copy, multipart uploads, listings. Not supported: versioning, server-side encryption, ACLs, lifecycle, tagging, object lock. Auth via S3 access keys (server-side only, bypass RLS) or session token. Use the direct hostname `https://<project_id>.storage.supabase.co` for large uploads; local dev endpoint `http://127.0.0.1:54321/storage/v1/s3`, `region: local`. Sources: https://supabase.com/docs/guides/storage/s3/compatibility ; https://supabase.com/docs/guides/storage/s3/authentication
- **Pooling:** port **5432** = direct and session-mode pooler; port **6543** = transaction-mode pooler (Supavisor). "Transaction mode does not support prepared statements", so set `prepare: false` (postgres.js). Session state (cursors, temp tables, advisory locks) does not persist across transactions. Direct connections need IPv6; the shared pooler works over IPv4. Source: https://supabase.com/docs/guides/database/connecting-to-postgres
- **Local dev:** Supabase CLI (`npm i supabase --save-dev`, `supabase init`, `supabase start`) needs a Docker-compatible runtime (Docker Desktop, Rancher, Podman, OrbStack); Studio at http://localhost:54323. Source: https://supabase.com/docs/guides/local-development
- The app itself only needs plain Postgres + S3; do not use Supabase Auth (custom auth is required).

## 6. Neon

| Fact | Value | Source (checked 2026-09-30) |
|---|---|---|
| Free plan | 0.5 GB storage per project, 100 CU-hours/project/month, up to 100 projects | https://neon.com/docs/introduction/plans |
| Scale to zero | Suspends after **5 minutes** idle; mandatory on Free, configurable on paid; wake-up in "a few hundred milliseconds" | https://neon.com/docs/introduction/scale-to-zero |
| Launch plan | No base fee; $0.106/CU-hour, $0.35/GB-month storage, 500 GB egress included then $0.10/GB | https://neon.com/docs/introduction/plans |
| Free-tier backups / SLA | (not found in fetched content) | |

## 7. Cloudflare R2

| Fact | Value | Source (checked 2026-09-30) |
|---|---|---|
| Storage | Standard $0.015/GB-month; Infrequent Access $0.01/GB-month (30-day minimum) | https://developers.cloudflare.com/r2/pricing/ |
| Operations | Class A $4.50/M, Class B $0.36/M (Standard); deletes free | same |
| Free tier (Standard) | 10 GB-month, 1M Class A, 10M Class B, all egress | same |
| Egress | Zero egress fees for all storage classes | same |
| S3 API | S3-compatible (use AWS SDK with account endpoint; region `auto`) (not re-verified on a dedicated page) | https://developers.cloudflare.com/r2/ |
| Public access | **Custom domain** recommended for production (WAF, caching, access rules, Tiered Cache; the domain must be a zone on Cloudflare). `r2.dev` is rate-limited, development only. By default only some file types are cached; set Cache Everything to cache all | https://developers.cloudflare.com/r2/buckets/public-buckets/ |

## 8. AWS migration target

| Service | Status / facts | Source (checked 2026-09-30) |
|---|---|---|
| **App Runner** | "**no longer open to new customers**." Existing customers can continue; no new features planned. AWS recommends **ECS Express Mode** | https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html |
| **ECS Express Mode on Fargate** | One API call (image + 2 IAM roles) provisions ECS service on Fargate, ALB, autoscaling, networking; no extra charge beyond the resources. Provisioning 3-5 min; `aws ecs create-express-gateway-service`; GitHub Action available. Requires an ACM certificate for custom HTTPS domains | same page |
| **Fargate pricing** | Per-second billing, 1-minute minimum; 20 GB ephemeral storage included; Spot up to 70% off; ALB, CloudWatch and public IPv4 are extra. Per-vCPU/GB rates not retrieved (page did not render them) | https://aws.amazon.com/fargate/pricing/ |
| **Amplify Hosting** | Docs: Next.js supported "up through Next.js 15" (compute SSR for 12-15). Unsupported: on-demand ISR, Next.js streaming, `unstable_after`, edge API routes. Managed sharp; image output max 4.3 MB. No Next.js 16 mentioned, so it is a poor fit for the 16.3.x design | https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html |
| **RDS for PostgreSQL** | Free tier text on page: 12 months, 750 hrs Single-AZ, 20 GB gp2 for new AWS customers (verify current account terms). Instance hourly rates not shown in fetch | https://aws.amazon.com/rds/postgresql/pricing/ |
| **CloudFront** | Free plan 1M requests and 100 GB/month; flat-rate Pro $15/mo (10M requests, 50 TB), Business $200/mo; pay-as-you-go also available | https://aws.amazon.com/cloudfront/pricing/ |

Migration steps: (1) keep the Dockerfile and standalone output as the deploy unit; (2) push image to ECR; (3) create RDS Postgres, restore via `pg_dump`/`pg_restore` (Drizzle SQL migrations then continue as-is); (4) `rclone` R2 -> S3, switch `S3_ENDPOINT`/keys (or drop the endpoint override), front with CloudFront; (5) create ECS Express Mode service, then shift DNS with Route 53 weighted records (AWS's documented blue/green pattern); (6) if running more than one task, add the shared Next.js cache handler (Redis/ElastiCache or S3) and a fixed `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.
