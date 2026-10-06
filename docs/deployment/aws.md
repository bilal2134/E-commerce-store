# Deploy to AWS for free

This is the chosen production setup (ADR 0014). Everything runs on AWS always-free allowances in Mumbai (`ap-south-1`):

| Part                      | AWS service                         | Free allowance                               |
| ------------------------- | ----------------------------------- | -------------------------------------------- |
| CDN, HTTPS, firewall, DNS | CloudFront **Free plan**            | $0 a month, never any overage charge         |
| Website and admin         | Lambda                              | 1M requests and 400,000 GB-seconds a month   |
| Database                  | Aurora DSQL (PostgreSQL-compatible) | 100,000 DPUs and 1 GB a month                |
| Photos and build files    | S3                                  | 5 GB storage credit from the CloudFront plan |
| Page cache bookkeeping    | DynamoDB, SQS                       | 25 GB / 25 capacity units, 1M requests       |

For ~10k visitors a month you use a small fraction of each. The only metered leftovers are S3 request fees (fractions of a cent per month), covered by the account's sign-up credits. A budget emails you if anything is ever charged.

Time needed: about an hour, plus waiting for the `.pk` nameserver change at PKNIC.

## 0. Before you start

Install on your computer:

- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- Node.js 22+ and pnpm 10 (already used for this project)
- Docker Desktop (builds the Lambda bundle on Linux, needed on Windows)

AWS account:

1. Sign up through the AWS Builder Experience (no card needed to start; $100 credits).
2. Turn on MFA for the root user and create an admin user in **IAM Identity Center**; use that user from now on.
3. Log the CLI in: `aws configure sso` (choose region `ap-south-1`), then `aws sts get-caller-identity` should show your account.
4. **Within 6 months, switch the account to the Paid plan** (Billing → Account plan). The Free plan ends after 6 months and AWS suspends the account; on the Paid plan the always-free allowances continue. Set the spend limit to the minimum ($20) as a safety net.

## 1. Create two secrets

```bash
openssl rand -hex 32   # ORIGIN_VERIFY_SECRET: proves requests came through CloudFront
openssl rand -hex 32   # ANALYTICS_SALT: keys visitor counts and rate limits
```

Keep both in your password manager. Export them in the terminal you deploy from (Git Bash shown; PowerShell uses `$env:NAME="..."`):

```bash
export CDK_DEFAULT_ACCOUNT=<your 12-digit account id>
export ORIGIN_VERIFY_SECRET=<first value>
export ANALYTICS_SALT=<second value>
export USBA_DOMAIN=<your domain, e.g. usba.pk>
export USBA_ALERT_EMAIL=<email for the $0 budget alert>
```

## 2. Prepare CDK (once per account)

```bash
cd infrastructure/aws/cdk
pnpm install --ignore-workspace
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/ap-south-1 aws://$CDK_DEFAULT_ACCOUNT/us-east-1
```

## 3. Domain and HTTPS certificate

```bash
npx cdk deploy UsbaEdge
```

This creates the DNS zone and requests the certificate, then **waits** until the domain points to AWS. While it waits:

1. Open Route 53 → Hosted zones → your domain, copy the four **NS** values (also printed later as `NameServers`).
2. In the PKNIC panel, replace the domain's nameservers with those four.
3. The deploy finishes once PKNIC publishes the change (minutes to a few hours).

No domain yet? Skip this step, deploy the rest with `export USBA_SITE_URL=https://<id>.cloudfront.net` instead of `USBA_DOMAIN` (deploy once to learn the id, then again), and come back later.

## 4. Database and storage

```bash
npx cdk deploy UsbaData
```

Note the outputs `DatabaseEndpoint` and `BucketName`.

## 5. Schema, sample content and the owner account

In the repository root, copy `infrastructure/aws/env.aws.example` to `.env.aws` (git-ignored) and fill in the endpoint, bucket, domain, `ANALYTICS_SALT` and the owner's email and password. Then:

```bash
pnpm aws:migrate   # creates the tables (waits for indexes)
pnpm aws:seed      # optional: sample catalogue, clearly marked as samples
pnpm aws:admin     # creates the owner login from ADMIN_EMAIL / ADMIN_PASSWORD
```

After this, remove `ADMIN_PASSWORD` from `.env.aws`.

## 6. Build the site

```bash
pnpm aws:build
```

Builds in Docker (Linux, matching Lambda) and prerenders pages from the production database. Output: `dist/aws/`.

## 7. Deploy the app

```bash
cd infrastructure/aws/cdk
npx cdk deploy UsbaApp
```

Note the output `ServerRoleArn`.

## 8. Let the app use the database

```bash
cd ../../..
pnpm aws:migrate -- --grant-app-role <ServerRoleArn>
```

This creates the `usba_app` database role (data access only, no schema changes) and maps it to the Lambda's IAM role.

## 9. Switch CloudFront to the Free plan (console, once)

1. CloudFront → Distributions → the USBA distribution → **Pricing plan** → choose **Free**. Accept the WAF protections it offers; they're included.
2. In the same plan settings, **attach the Route 53 hosted zone** so the plan covers its monthly fee.

Until this is done the distribution is on pay-as-you-go pricing (cents at this traffic), so do it right after the first deploy.

## 10. Check it works

- `https://<domain>/api/health` returns `{"status":"ok"}`.
- `https://<domain>/admin` → sign in with the owner account; change something in Settings and see it on the homepage straight away.
- Upload a product photo in the admin.
- Billing → Budgets shows `usba-zero-spend`; Billing → Bills shows $0.00 at the end of the month.

## Later deploys

Manual: `pnpm aws:migrate` (if the schema changed), `pnpm aws:build`, then `npx cdk deploy UsbaApp`.

Automatic from GitHub (optional): deploy once with `export USBA_GITHUB_REPO=<owner>/<repo>` to create the `UsbaCi` stack, then in the GitHub repository settings add:

- Variables: `AWS_DEPLOY_ROLE_ARN` (UsbaCi output), `AWS_ACCOUNT_ID`, `DSQL_ENDPOINT`, `S3_BUCKET`, `SITE_URL`, `USBA_DOMAIN`, `USBA_ALERT_EMAIL`
- Secrets: `ORIGIN_VERIFY_SECRET`, `ANALYTICS_SALT`

Every push to `main` then runs `.github/workflows/deploy-aws.yml` (migrate → build → deploy). It does nothing until `AWS_DEPLOY_ROLE_ARN` is set.

## Staying at $0

The stack only creates free-tier resources. If you change it, avoid: NAT gateways, EC2/load balancers or anything with a public IPv4 address, RDS, Secrets Manager (use SSM Parameter Store), API Gateway, Lambda@Edge, provisioned concurrency, CloudWatch log retention beyond a week, DynamoDB on-demand mode.

## How it fits together

```
visitor ──HTTPS──▶ CloudFront (Free plan: WAF, cache, TLS)
                    ├─ /_next/*, /brand/*, /media/* ──▶ S3 (private, origin access control)
                    └─ everything else ──x-origin-verify──▶ Lambda Function URL (Next.js via OpenNext)
                                                            ├─ Aurora DSQL (IAM token login)
                                                            ├─ S3 _cache/ + DynamoDB (Next cache)
                                                            └─ SQS ──▶ revalidation Lambda (stale pages)
```

Admin saves refresh Next's cache (`updateTag`) and invalidate CloudFront (`/*`), so changes show immediately. Details and trade-offs: `docs/architecture/decisions/0014-aws-free-tier-serverless.md`.

## Troubleshooting

- **403 on every page**: `ORIGIN_VERIFY_SECRET` differs between the CloudFront origin header and the Lambda; redeploy `UsbaApp` with one value.
- **500 with "password authentication failed"/"access denied" in the logs**: step 8 wasn't run for the current `ServerRoleArn`.
- **Admin saves show "Something went wrong"**: check CloudWatch → Log groups → `UsbaApp-ServerLogs…`.
- **`UsbaEdge` deploy hangs**: the PKNIC nameservers don't match the hosted zone's NS record yet.
- **Test the Lambda bundle locally** (no AWS needed): see `infrastructure/aws/local/` (`harness.mjs` emulates CloudFront + the Function URL; the Playwright suite runs against it with `E2E_PORT`).
