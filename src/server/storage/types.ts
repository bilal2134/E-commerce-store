/**
 * Storage port. The application only needs these operations; everything
 * vendor-specific lives in an adapter (S3-compatible today, which covers
 * Supabase Storage, Cloudflare R2, AWS S3 and RustFS/MinIO locally).
 */
export interface PutObjectInput {
  key: string;
  body: Uint8Array;
  contentType: string;
  /** Defaults to immutable long-lived caching; keys are content-unique. */
  cacheControl?: string;
}

export interface ObjectStorage {
  put(input: PutObjectInput): Promise<void>;
  /** Deletes keys; missing keys are ignored. */
  deleteMany(keys: readonly string[]): Promise<void>;
  /** Public URL for a key (CDN / public bucket). */
  publicUrl(key: string): string;
}

export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
