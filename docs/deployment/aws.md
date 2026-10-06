# Deploy to AWS for free

This is the chosen production setup (ADR 0014). Everything runs on AWS always-free allowances in Sydney (`ap-southeast-2`); DNS is on Cloudflare's free plan:

| Part                   | Service                             | Free allowance                             |
| ---------------------- | ----------------------------------- | ------------------------------------------ |
| CDN and HTTPS          | CloudFront + ACM certificate        | 1 TB transfer and 10M requests a month     |
| Website and admin      | Lambda                              | 1M requests and 400,000 GB-seconds a month |
| Database               | Aurora DSQL (PostgreSQL-compatible) | 100,000 DPUs and 1 GB a month              |
| Page cache bookkeeping | DynamoDB, SQS                       | 25 GB / 25 capacity units, 1M requests     |
| DNS                    | Cloudflare Free                     | $0, no Route 53 zone fee                   |
| Photos and build files | S3                                  | not always-free: cents a month (see below) |

For ~10k visitors a month you use a small fraction of each allowance. S3 is the only metered part: a few hundred MB of photos plus request fees come to a few cents a month, paid from the account's credits. A $1 budget emails you if anything is ever charged.

Time needed: about an hour, plus waiting for PKNIC to publish the nameserver change.

## 0. Before you start

Install on your computer:

- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (on Windows without admin rights, extract the MSI with `msiexec /a` and use `aws.exe` from the extracted folder)
- Node.js 22+ and pnpm 10 (already used for this project)
- Docker Desktop (builds the Lambda bundle on Linux, needed on Windows)

AWS account. This guide uses an AWS **project account** (AWS Builder Experience). These accounts have two restrictions:

- They are locked to one region. Pakistan gets Sydney. Global services (CloudFront, ACM in `us-east-1`, IAM, budgets) still work, but CloudFormation stacks can only be deployed in Sydney.
- They don't bill past their spend limit; the project is paused instead.

Steps:

1. Log the CLI in: `aws login --region ap-southeast-2` (the sign-in region must be the project's region). Check with `aws sts get-caller-identity`.
2. In AWS Settings → Projects, set the project's spend limit to the minimum as a safety net.

A standard (non-project) account works too: set `USBA_REGION` to any region and optionally `USBA_ROUTE53=1` to let CDK create a Route 53 zone and certificate (`UsbaEdge` stack in `us-east-1`, $0.50 a month).

## 1. Create two secrets

```bash
openssl rand -hex 32   # ORIGIN_VERIFY_SECRET: proves requests came through CloudFront
openssl rand -hex 32   # ANALYTICS_SALT: keys visitor counts and rate limits
```

Keep both in your password manager and in a git-ignored `.env.aws-deploy` in the repository root:

```bash
CDK_DEFAULT_ACCOUNT=<your 12-digit account id>
ORIGIN_VERIFY_SECRET=<first value>
ANALYTICS_SALT=<second value>
USBA_ALERT_EMAIL=<email for budget and error alerts>
```

Load it before each CDK command: `set -a; . ./.env.aws-deploy; set +a` (Git Bash).

## 2. Prepare CDK (once per account)

```bash
cd infrastructure/aws/cdk
pnpm install --ignore-workspace
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/ap-southeast-2
```

## 3. Database and storage

```bash
npx cdk deploy UsbaData
```

Note the outputs `DatabaseEndpoint` and `BucketName`. Both are retained (and the stack is termination-protected) even if the stack is deleted.

## 4. Schema, sample content and the owner account

In the repository root, copy `infrastructure/aws/env.aws.example` to `.env.aws` (git-ignored) and fill in the endpoint, bucket, `ANALYTICS_SALT` and the owner's email and password. Until the domain works, `SITE_URL` and `MEDIA_BASE_URL` can be any placeholder; they are fixed in step 6. Then:

```bash
pnpm aws:migrate   # creates the tables (waits for indexes)
SEED_ALLOW_PRODUCTION=1 pnpm aws:seed   # optional, empty database only: sample catalogue, clearly marked as samples
pnpm aws:admin     # creates the owner login from ADMIN_EMAIL / ADMIN_PASSWORD
```

After this, remove `ADMIN_PASSWORD` from `.env.aws`.

## 5. Build and deploy the app

```bash
pnpm aws:build                       # Docker build (Linux, like Lambda); prerenders from the production database
cd infrastructure/aws/cdk
USBA_SITE_URL=https://example.invalid npx cdk deploy UsbaApp
```

Note the outputs `DistributionDomain` (`<id>.cloudfront.net`) and `ServerRoleArn`. Set `SITE_URL=https://<id>.cloudfront.net` and `MEDIA_BASE_URL=https://<id>.cloudfront.net/media` in `.env.aws`, then build and deploy again with `USBA_SITE_URL=https://<id>.cloudfront.net`. The site now works on the CloudFront address.

Then let the app use the database (from the repository root):

```bash
pnpm aws:migrate -- --grant-app-role <ServerRoleArn>
```

This creates the `usba_app` database role (data access only, no schema changes) and maps it to the Lambda's IAM role. Confirm the alert email AWS sends to `USBA_ALERT_EMAIL` ("AWS Notification - Subscription Confirmation").

## 6. Domain (Cloudflare DNS) and HTTPS certificate

1. **Certificate** (CloudFront needs it in `us-east-1`; ACM is allowed there for project accounts):

   ```bash
   aws acm request-certificate --region us-east-1 --domain-name <domain> \
     --subject-alternative-names www.<domain> --validation-method DNS
   aws acm describe-certificate --region us-east-1 --certificate-arn <arn> \
     --query 'Certificate.DomainValidationOptions[].ResourceRecord'
   ```

   Put the ARN in `.env.aws-deploy` as `USBA_CERTIFICATE_ARN`.

2. **Cloudflare**: add the domain on the Free plan. Keep the imported records (the current website) and set them to **DNS only** (grey cloud). Add the two validation records from the step above as CNAMEs, also DNS only. Cloudflare shows two assigned nameservers.

3. **PKNIC**: My Account → My Nameservers → add a nameserver set with Cloudflare's two names, then on the domain page choose Re-Assign to Nameservers and select that set. The old website keeps working, because Cloudflare serves the same records. PKNIC publishes the change within a few hours. Cloudflare then shows the domain as Active, and ACM changes the certificate to `ISSUED`.

4. **Switch the site to the domain**: set `SITE_URL=https://<domain>` and `MEDIA_BASE_URL=https://<domain>/media` in `.env.aws`, then:

   ```bash
   pnpm aws:build
   cd infrastructure/aws/cdk
   USBA_DOMAIN=<domain> npx cdk deploy UsbaApp   # uses USBA_CERTIFICATE_ARN
   ```

5. **Point the domain at CloudFront**: in Cloudflare, replace the apex record and `www` with CNAMEs to `<id>.cloudfront.net`, **DNS only** (Cloudflare flattens the apex CNAME). `www` redirects to the apex.

Keep the records DNS only: CloudFront terminates HTTPS with the ACM certificate, and proxying through Cloudflare as well would double-cache pages and break the instant admin updates.

## 7. Check it works

- `https://<domain>/api/health` returns `{"status":"ok"}`; `https://www.<domain>` redirects to `https://<domain>`.
- `https://<domain>/admin` → sign in with the owner account; change something in Settings and see it on the homepage straight away.
- Upload a product photo in the admin.
- Billing → Budgets shows `usba-zero-spend`; Billing → Bills stays at $0.00 (or a few cents of S3, covered by credits).

## Later deploys

Manual: `pnpm aws:migrate` (if the schema changed), `pnpm aws:build`, then `USBA_DOMAIN=<domain> npx cdk deploy UsbaApp`.

Automatic from GitHub (optional): deploy once with `export USBA_GITHUB_REPO=<owner>/<repo>` to create the `UsbaCi` stack, then in the GitHub repository settings add:

- Variables: `AWS_DEPLOY_ROLE_ARN` (UsbaCi output), `AWS_ACCOUNT_ID`, `DSQL_ENDPOINT`, `S3_BUCKET`, `SITE_URL`, `USBA_DOMAIN`, `USBA_CERTIFICATE_ARN`, `USBA_ALERT_EMAIL`
- Secrets: `ORIGIN_VERIFY_SECRET`, `ANALYTICS_SALT`

Every push to `main` then runs `.github/workflows/deploy-aws.yml` (migrate → build → deploy). It does nothing until `AWS_DEPLOY_ROLE_ARN` is set.

## Staying at $0

The stack only creates free-tier resources. If you change it, avoid: NAT gateways, EC2/load balancers or anything with a public IPv4 address, RDS, Secrets Manager (use SSM Parameter Store), API Gateway, Lambda@Edge, provisioned concurrency, CloudWatch log retention beyond a week, DynamoDB on-demand mode, Route 53 hosted zones ($0.50 a month each), WAF.

## How it fits together

```
visitor ──DNS (Cloudflare, DNS only)──▶ CloudFront (cache, TLS with the ACM certificate)
                    ├─ /_next/*, /brand/*, /media/* ──▶ S3 (private, origin access control)
                    └─ everything else ──x-origin-verify──▶ Lambda Function URL (Next.js via OpenNext)
                                                            ├─ Aurora DSQL (IAM token login)
                                                            ├─ S3 _cache/ + DynamoDB (Next cache)
                                                            └─ SQS ──▶ revalidation Lambda (stale pages)
```

Admin saves refresh Next's cache (`updateTag`) and invalidate CloudFront (`/*`), so changes show immediately. Lambda errors and throttles, revalidation errors and a growing regeneration backlog raise CloudWatch alarms that email `USBA_ALERT_EMAIL`. Details and trade-offs: `docs/architecture/decisions/0014-aws-free-tier-serverless.md`.

## Troubleshooting

- **403 on every page**: `ORIGIN_VERIFY_SECRET` differs between the CloudFront origin header and the Lambda; redeploy `UsbaApp` with one value.
- **500 with "password authentication failed"/"access denied" in the logs**: the `--grant-app-role` step wasn't run for the current `ServerRoleArn`.
- **Admin saves show "Something went wrong"**: check CloudWatch → Log groups → `UsbaApp-ServerLogs…`.
- **CloudFormation "explicit deny … service control policy"**: the project account only allows its own region; check `USBA_REGION` and that the CLI is logged in to `ap-southeast-2`.
- **Certificate stays `PENDING_VALIDATION`**: PKNIC hasn't published the Cloudflare nameservers yet (`nslookup -type=NS <domain> 1.1.1.1`), or a validation CNAME is proxied (orange cloud) instead of DNS only.
- **Test the Lambda bundle locally** (no AWS needed): see `infrastructure/aws/local/` (`harness.mjs` emulates CloudFront + the Function URL; the Playwright suite runs against it with `E2E_PORT`).
