/**
 * Local/CI only: create the media bucket on the S3-compatible dev server and
 * allow anonymous GET on its objects. For Supabase Storage / R2 / S3, create a
 * public bucket (or CDN custom domain) in the provider console instead —
 * see docs/deployment/.
 */
import { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, S3Client } from "@aws-sdk/client-s3";
import { requireEnv } from "./lib/script-db";

async function main() {
  const bucket = requireEnv("S3_BUCKET");
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`Bucket ${bucket} exists.`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Bucket ${bucket} created.`);
  }
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      }),
    }),
  );
  console.log("Public-read policy applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
