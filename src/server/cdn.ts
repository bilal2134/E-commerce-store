import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "./config/env";
import { logger } from "./logger";

/**
 * Drops CloudFront's copy of every page after an admin save (AWS deployment,
 * ADR 0014). Next's own cache is already refreshed by updateTag(); this makes
 * the CDN fetch the new version too, so changes stay "live immediately".
 *
 * One `/*` path per save: CloudFront's first 1,000 invalidation paths each month
 * are free, far above how often the owner saves. No-op unless a distribution is
 * configured. Never throws: a failed invalidation only delays the change until
 * the CDN copy expires.
 */
let distributionIdFromParameter: Promise<string> | undefined;

async function distributionId(): Promise<string> {
  const { CDN_DISTRIBUTION_ID, CDN_DISTRIBUTION_ID_PARAMETER } = env();
  if (CDN_DISTRIBUTION_ID || !CDN_DISTRIBUTION_ID_PARAMETER) return CDN_DISTRIBUTION_ID;
  distributionIdFromParameter ??= (async () => {
    const { SSMClient, GetParameterCommand } = await import("@aws-sdk/client-ssm");
    const out = await new SSMClient({}).send(
      new GetParameterCommand({ Name: CDN_DISTRIBUTION_ID_PARAMETER }),
    );
    return out.Parameter?.Value ?? "";
  })().catch((err: unknown) => {
    distributionIdFromParameter = undefined;
    throw err;
  });
  return distributionIdFromParameter;
}

export async function invalidateCdn(): Promise<void> {
  try {
    const id = await distributionId();
    if (!id) return;
    const { CloudFrontClient, CreateInvalidationCommand } = await import("@aws-sdk/client-cloudfront");
    await new CloudFrontClient({ region: "us-east-1" }).send(
      new CreateInvalidationCommand({
        DistributionId: id,
        InvalidationBatch: { CallerReference: randomUUID(), Paths: { Quantity: 1, Items: ["/*"] } },
      }),
    );
  } catch (err) {
    logger.error("CDN invalidation failed", { err });
  }
}
