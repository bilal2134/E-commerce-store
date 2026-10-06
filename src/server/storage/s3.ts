import "server-only";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { IMMUTABLE_CACHE_CONTROL, type ObjectStorage, type PutObjectInput } from "./types";

export interface S3StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  publicBaseUrl: string;
  /**
   * Prepended to every object key, e.g. "media/" when uploads share a bucket
   * with the site's build assets (AWS, ADR 0014). Public URLs already include it
   * through publicBaseUrl.
   */
  keyPrefix?: string;
}

export class S3Storage implements ObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      // Explicit keys for Supabase/R2/RustFS; omitted on AWS so the SDK's
      // default provider chain (IAM role) is used.
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
          : undefined,
    });
  }

  async put(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: this.objectKey(input.key),
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl ?? IMMUTABLE_CACHE_CONTROL,
      }),
    );
  }

  async deleteMany(keys: readonly string[]): Promise<void> {
    // S3 DeleteObjects accepts up to 1000 keys per request.
    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      if (chunk.length === 0) continue;
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.config.bucket,
          Delete: { Objects: chunk.map((key) => ({ Key: this.objectKey(key) })), Quiet: true },
        }),
      );
    }
  }

  private objectKey(key: string): string {
    return `${this.config.keyPrefix ?? ""}${key}`;
  }

  publicUrl(key: string): string {
    return `${this.config.publicBaseUrl}/${key}`;
  }
}
