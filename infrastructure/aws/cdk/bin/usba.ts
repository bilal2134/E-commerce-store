/**
 * USBA store on AWS (ADR 0014, docs/deployment/aws.md).
 *
 * Configuration comes from environment variables so secrets never land in git:
 *   USBA_DOMAIN           apex domain, e.g. usba.pk (optional until DNS is ready)
 *   USBA_SITE_URL         public origin when no domain yet (https://<id>.cloudfront.net)
 *   ORIGIN_VERIFY_SECRET  >= 32 chars; CloudFront → Lambda shared secret
 *   ANALYTICS_SALT        secret for visitor hashes and stored IP keys
 *   USBA_ALERT_EMAIL      budget alert recipient (optional)
 *   USBA_GITHUB_REPO      "owner/repo" to create the GitHub Actions deploy role (optional)
 *   USBA_BUNDLE_DIR       OpenNext output (default ../../../dist/aws)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Annotations, App } from "aws-cdk-lib";
import { AppStack } from "../lib/app-stack.js";
import { CiStack } from "../lib/ci-stack.js";
import { DataStack } from "../lib/data-stack.js";
import { EdgeStack } from "../lib/edge-stack.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = new App();
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = "ap-south-1";

const domain = process.env.USBA_DOMAIN?.trim() || undefined;
const siteUrl = domain ? `https://${domain}` : process.env.USBA_SITE_URL?.trim();
const originSecret = process.env.ORIGIN_VERIFY_SECRET ?? "";
const analyticsSalt = process.env.ANALYTICS_SALT ?? "";

function fail(message: string): never {
  console.error(`\n${message}\nSee docs/deployment/aws.md.\n`);
  process.exit(1);
}
if (!siteUrl) fail("Set USBA_DOMAIN, or USBA_SITE_URL for a first deploy without a domain.");
if (originSecret.length < 32)
  fail("Set ORIGIN_VERIFY_SECRET (at least 32 characters, e.g. openssl rand -hex 32).");
if (analyticsSalt.length < 32)
  fail("Set ANALYTICS_SALT (at least 32 characters, e.g. openssl rand -hex 32).");

const edge = domain
  ? new EdgeStack(app, "UsbaEdge", {
      env: { account, region: "us-east-1" },
      crossRegionReferences: true,
      domain,
    })
  : undefined;

const data = new DataStack(app, "UsbaData", { env: { account, region } });

const appStack = new AppStack(app, "UsbaApp", {
  env: { account, region },
  crossRegionReferences: true,
  cluster: data.cluster,
  bucketName: data.bucket.bucketName,
  bucketArn: data.bucket.bucketArn,
  bundleDir: path.resolve(here, process.env.USBA_BUNDLE_DIR ?? "../../../../dist/aws"),
  siteUrl,
  domain,
  hostedZone: edge?.zone,
  certificate: edge?.certificate,
  originSecret,
  analyticsSalt,
  alertEmail: process.env.USBA_ALERT_EMAIL?.trim() || undefined,
});

// Strong cross-region references (the app stack reads the certificate and zone).
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
