/**
 * Delete image objects that no database row references (e.g. photos uploaded
 * on an admin form that was never saved). Dry run by default:
 *
 *   pnpm storage:cleanup            # report only
 *   pnpm storage:cleanup --delete   # actually delete
 *
 * Objects younger than 24 h are always kept (an admin may still be editing).
 *
 * Assumes ONE database per bucket (true in production). Locally the dev and
 * test databases share a bucket, so objects seeded for tests look unreferenced
 * from the dev database; that is harmless (tests reseed) but don't point this
 * at a shared bucket in a real environment.
 */
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { sql } from "drizzle-orm";
import { connect, requireEnv } from "./lib/script-db";

const PREFIXES = ["products/", "banners/", "reviews/", "instagram/"];
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

/** Uploads may live under a key prefix (S3_KEY_PREFIX, e.g. "media/" on AWS). */
const KEY_PREFIX = process.env.S3_KEY_PREFIX ?? "";

/** "[media/]products/<uuid>-640.webp" → "products/<uuid>" */
function baseKey(objectKey: string): string {
  return objectKey.slice(KEY_PREFIX.length).replace(/-\d+\.webp$/, "");
}

async function main() {
  const doDelete = process.argv.includes("--delete");
  const bucket = requireEnv("S3_BUCKET");
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : undefined,
  });
  const { sql: pg, db } = connect();
  const rows = await db.execute<{ key: string }>(sql`
    select storage_key as key from product_images
    union select photo_key from reviews where photo_key is not null
    union select hero_image_key from site_settings where hero_image_key is not null
    union select storage_key from instagram_posts
  `);
  const referenced = new Set(rows.map((r) => r.key));
  await pg.end();

  const orphans: string[] = [];
  let scanned = 0;
  for (const prefix of PREFIXES) {
    let token: string | undefined;
    do {
      const page = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: KEY_PREFIX + prefix, ContinuationToken: token }),
      );
      for (const obj of page.Contents ?? []) {
        if (!obj.Key) continue;
        scanned++;
        const old = obj.LastModified ? Date.now() - obj.LastModified.getTime() > MIN_AGE_MS : false;
        if (old && !referenced.has(baseKey(obj.Key))) orphans.push(obj.Key);
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }

  console.log(`Scanned ${scanned} objects; ${orphans.length} unreferenced and older than 24 h.`);
  if (!doDelete) {
    for (const k of orphans.slice(0, 20)) console.log(`  would delete ${k}`);
    if (orphans.length > 20) console.log(`  … and ${orphans.length - 20} more`);
    console.log("Dry run. Re-run with --delete to remove them.");
    return;
  }
  for (let i = 0; i < orphans.length; i += 1000) {
    const chunk = orphans.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
  console.log(`Deleted ${orphans.length} objects.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
