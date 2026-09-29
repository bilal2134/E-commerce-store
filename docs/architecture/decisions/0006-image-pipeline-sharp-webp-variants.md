# ADR 0006: Server-side sharp pipeline with WebP variants

Status: Accepted (2026-09-30). Quick reference: D6.

## Context

Admin uploads phone photos. We need safe handling (OWASP file upload), fast mobile loading (CS-20), and no dependency on a vendor image optimizer. Next's optimizer has had CVEs (docs/research/security.md section 1).

## Decision

`src/server/images/pipeline.ts`: sniff magic bytes (JPEG/PNG/WebP), 10 MB cap, 40 MP cap, decode with sharp, auto-orient, strip metadata, encode WebP (quality 78) at widths [320, 480, 640, 960, 1280, 1600] (not upscaled) stored as `<key>-<w>.webp`, plus a 16 px blur placeholder. Served via plain `<img srcset sizes>` from `MEDIA_BASE_URL`. `next/image` optimizer and AVIF are not used. The browser pre-resizes uploads, so Server Action bodies stay small (`bodySizeLimit` 12 MB).

## Alternatives considered

- `next/image` optimizer: extra server load and CVE surface, host-specific behaviour.
- Cloudflare Images / Imgix: vendor cost and lock-in.
- Store originals and resize on demand: keeps EXIF/polyglot risk, needs an image service.

## Consequences

- Immutable, CDN-cacheable objects; original never served.

* `sharp` native binary blocks Cloudflare Workers (docs/deployment/cloudflare.md) and needs enough RAM on small hosts.
* No AVIF; slightly larger files than AVIF.
