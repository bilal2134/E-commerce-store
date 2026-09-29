# Cloudflare (Workers + OpenNext): not recommended now

Source: docs/research/hosting.md section 3 (checked 2026-09-30).

## Why not

`@opennextjs/cloudflare` 1.20.x supports Next 16 SSG/ISR/PPR, but Workers cannot load native `.node` addons. This app relies on native modules:

- `sharp` (image pipeline): not supported on Workers (OpenNext build fails on sharp's binaries; workaround is stubbing it).
- `@node-rs/argon2` (admin password hashing): also a native addon; would need a WASM/JS Argon2 or scrypt via Web Crypto.
- `postgres.js` would need Hyperdrive and `nodejs_compat`.

## What would have to change (the exact seam)

| Concern        | Seam                                                          | Replacement                                                                                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image resizing | `src/server/images/pipeline.ts` (only file importing `sharp`) | Introduce an `ImageProcessor` interface (`process(bytes) -> {variants, width, height, blur}`) with a Cloudflare Images (or external Node service) implementation. Keep magic-byte and size checks in front of it. Variant naming `<key>-<w>.webp` must stay so `src/domain/images.ts` still works |
| Password hash  | `src/server/auth/password.ts`                                 | WASM Argon2 or another OWASP-approved KDF; existing hashes keep working if the algorithm stays Argon2id                                                                                                                                                                                           |
| Storage        | `src/server/storage/s3.ts`                                    | R2 works via S3 API today (no change) or an R2 binding adapter                                                                                                                                                                                                                                    |
| Database       | `DATABASE_URL`                                                | Hyperdrive connection string; `DATABASE_PREPARE=false` may be needed                                                                                                                                                                                                                              |
| Cache          | `next.config.ts`                                              | OpenNext incremental cache on R2/KV; `updateTag` behaviour needs testing                                                                                                                                                                                                                          |
| Build          | CI                                                            | `opennextjs-cloudflare build`, `wrangler deploy`; env at build time is still required                                                                                                                                                                                                             |

Worker size limits conflict between Cloudflare's page (64 MiB uncompressed) and OpenNext's (3/10 MiB gzip); re-check before attempting.

## Recommendation

Keep Cloudflare for R2 (storage) and DNS/CDN only. Revisit Workers only if the image and hashing seams are replaced.
