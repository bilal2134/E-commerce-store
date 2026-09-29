# ADR 0005: S3-compatible storage behind a port

Status: Accepted (2026-09-30). Quick reference: D5.

## Context

Media (product, banner, review photos) needs cheap durable storage and a CDN-friendly public URL. Candidate hosts: Cloudflare R2, Supabase Storage, AWS S3, RustFS locally.

## Decision

Interface `ObjectStorage { put, deleteMany, publicUrl }` (`src/server/storage/types.ts`). Adapters: `s3.ts` (AWS SDK v3, works with any S3 API via `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`) and `memory.ts` (tests). The DB stores object keys, never URLs; `MEDIA_BASE_URL` builds public URLs. The AWS SDK is imported only in the adapter.

## Alternatives considered

- Supabase Storage SDK / Vercel Blob: lock-in, different APIs.
- Local disk: no durability on container hosts, blocks scaling.
- Presigned direct browser uploads: needs the image pipeline to run server-side after upload; not needed since the browser pre-resizes.

## Consequences

- Provider changes are env changes plus `rclone copy` (portability.md).

* The port is deliberately small; features like signed URLs or ACLs would extend it.
* Public read is configured out-of-band in the provider console.
