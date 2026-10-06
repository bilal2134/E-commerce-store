import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as dsql from "aws-cdk-lib/aws-dsql";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

/**
 * Stateful resources, deployed first (docs/deployment/aws.md): the database
 * must exist before the site can be built, because pages are prerendered from
 * it. Both are retained if the stack is ever deleted, the cluster has deletion
 * protection and the stack has termination protection.
 */
export class DataStack extends Stack {
  readonly cluster: dsql.CfnCluster;
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, { terminationProtection: true, ...props });

    // Aurora DSQL: PostgreSQL-compatible, serverless, always-free tier of
    // 100k DPUs + 1 GB per month (ADR 0014).
    this.cluster = new dsql.CfnCluster(this, "Database", { deletionProtectionEnabled: true });
    this.cluster.applyRemovalPolicy(RemovalPolicy.RETAIN);

    // One private bucket: _assets/ (build assets), _cache/ (prerendered pages),
    // media/ (owner uploads). Only CloudFront reads it (origin access control).
    this.bucket = new s3.Bucket(this, "Site", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // Versioning keeps an overwritten or deleted photo recoverable for 30 days.
      versioned: true,
      lifecycleRules: [
        { id: "expire-old-versions", noncurrentVersionExpiration: Duration.days(30) },
        { id: "clean-failed-uploads", abortIncompleteMultipartUploadAfter: Duration.days(7) },
        { id: "remove-expired-delete-markers", expiredObjectDeleteMarker: true },
      ],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // CloudFront (origin access control) may read objects. Scoped to this
    // account's distributions rather than one ID, so this stack doesn't depend
    // on the app stack (which depends on this one).
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [this.bucket.arnForObjects("*")],
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        conditions: {
          StringLike: { "AWS:SourceArn": `arn:${this.partition}:cloudfront::${this.account}:distribution/*` },
        },
      }),
    );

    new CfnOutput(this, "DatabaseEndpoint", { value: this.cluster.attrEndpoint });
    new CfnOutput(this, "DatabaseArn", { value: this.cluster.attrResourceArn });
    new CfnOutput(this, "BucketName", { value: this.bucket.bucketName });
  }
}
