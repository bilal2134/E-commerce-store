/**
 * USBA store on AWS (ADR 0014, docs/deployment/aws.md).
 *
 * Configuration comes from environment variables so secrets never land in git:
 *   USBA_REGION           region for everything regional (default ap-southeast-2: AWS
 *                         "project" accounts for Pakistan are locked to Sydney)
 *   USBA_DOMAIN           apex domain, e.g. usba.pk (optional until DNS is ready)
 *   USBA_SITE_URL         public origin when no domain yet (https://<id>.cloudfront.net)
 *   USBA_CERTIFICATE_ARN  ACM certificate in us-east-1 for USBA_DOMAIN and www.
 *                         (requested with the AWS CLI; DNS stays outside AWS)
 *   USBA_ROUTE53=1        instead create a Route 53 zone + certificate in a us-east-1
 *                         stack (standard accounts only; projects can't deploy there)
 *   ORIGIN_VERIFY_SECRET  >= 32 chars; CloudFront → Lambda shared secret
 *   ANALYTICS_SALT        secret for visitor hashes and stored IP keys
 *   USBA_ALERT_EMAIL      budget alert recipient (optional)
 *   USBA_GITHUB_REPO      "owner/repo" to create the GitHub Actions deploy role (optional)
 *   USBA_BUNDLE_DIR       OpenNext output (default <repo>/dist/aws)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Annotations, App, Tags } from "aws-cdk-lib";
import { AppStack } from "../lib/app-stack.js";
import { CiStack } from "../lib/ci-stack.js";
import { DataStack } from "../lib/data-stack.js";
import { EdgeStack } from "../lib/edge-stack.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = new App();
// Cost allocation and ownership on every resource.
Tags.of(app).add("Project", "usba-store");
Tags.of(app).add("Environment", "production");
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.USBA_REGION?.trim() || "ap-southeast-2";

const domain = process.env.USBA_DOMAIN?.trim() || undefined;
const siteUrl = domain ? `https://${domain}` : process.env.USBA_SITE_URL?.trim();
const certificateArn = process.env.USBA_CERTIFICATE_ARN?.trim() || undefined;
const useRoute53 = process.env.USBA_ROUTE53 === "1";
const originSecret = process.env.ORIGIN_VERIFY_SECRET ?? "";
const analyticsSalt = process.env.ANALYTICS_SALT ?? "";

function fail(message: string): never {
  console.error(`\n${message}\nSee docs/deployment/aws.md.\n`);
  process.exit(1);
}
if (!siteUrl) fail("Set USBA_DOMAIN, or USBA_SITE_URL for a first deploy without a domain.");
if (domain && !certificateArn && !useRoute53)
  fail("With USBA_DOMAIN set, also set USBA_CERTIFICATE_ARN (or USBA_ROUTE53=1 on a standard account).");
if (originSecret.length < 32)
  fail("Set ORIGIN_VERIFY_SECRET (at least 32 characters, e.g. openssl rand -hex 32).");
if (analyticsSalt.length < 32)
  fail("Set ANALYTICS_SALT (at least 32 characters, e.g. openssl rand -hex 32).");

const edge =
  domain && useRoute53
    ? new EdgeStack(app, "UsbaEdge", {
        env: { account, region: "us-east-1" },
        crossRegionReferences: true,
        domain,
      })
    : undefined;

const data = new DataStack(app, "UsbaData", { env: { account, region } });

const appStack = new AppStack(app, "UsbaApp", {
  env: { account, region },
  crossRegionReferences: Boolean(edge),
  cluster: data.cluster,
  bucketName: data.bucket.bucketName,
  bucketArn: data.bucket.bucketArn,
  bundleDir: path.resolve(here, process.env.USBA_BUNDLE_DIR ?? "../../../../dist/aws"),
  siteUrl,
  domain,
  hostedZone: edge?.zone,
  certificateArn,
  certificate: edge?.certificate,
  originSecret,
  analyticsSalt,
  alertEmail: process.env.USBA_ALERT_EMAIL?.trim() || undefined,
});

// Strong cross-stack references (the app stack reads the database, bucket and,
// with Route 53, the certificate and zone): producers can't drop what's in use.
Annotations.of(appStack).acknowledgeWarning("@aws-cdk/core:crossStackReferencesDefaultStrong");
// The bucket is imported; DataStack's policy already grants CloudFront read access.
Annotations.of(appStack).acknowledgeWarning("@aws-cdk/aws-cloudfront-origins:updateImportedBucketPolicyOac");

const githubRepo = process.env.USBA_GITHUB_REPO?.trim();
if (githubRepo) {
  new CiStack(app, "UsbaCi", {
    env: { account, region },
    githubRepo,
    clusterArn: data.cluster.attrResourceArn,
  });
}
