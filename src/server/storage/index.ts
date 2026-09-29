import "server-only";
import { env } from "../config/env";
import { S3Storage } from "./s3";
import type { ObjectStorage } from "./types";

let instance: ObjectStorage | undefined;

export function storage(): ObjectStorage {
  if (!instance) {
    const e = env();
    instance = new S3Storage({
      endpoint: e.S3_ENDPOINT,
      region: e.S3_REGION,
      bucket: e.S3_BUCKET,
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
      publicBaseUrl: e.MEDIA_BASE_URL,
    });
  }
  return instance;
}

/** Test hook: swap the adapter (e.g. MemoryStorage). */
export function setStorageForTesting(s: ObjectStorage | undefined): void {
  instance = s;
}

/** Public base URL for a stored image (without the -<width>.webp suffix). */
export function mediaBaseUrl(storageKey: string): string {
  return storage().publicUrl(storageKey);
}

export type { ObjectStorage } from "./types";
