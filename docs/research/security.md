# Security research: Next.js e-commerce site (admin panel, uploads, public reviews)

Research date: 2026-09-30. All sources "checked 2026-09-30". Secondary (vendor-blog) sources are flagged. Items I could not verify are marked UNVERIFIED.

---
## 1. Next.js / React advisories 2025-2026 and minimum safe versions

| Date | ID | What | Fixed in |
|---|---|---|---|
| Mar 2025 | CVE-2025-29927 | Middleware authz bypass via forged `x-middleware-subrequest` header | next 15.2.3, 14.2.25, 13.5.9, 12.3.5 |
| Dec 2025 | CVE-2025-55182 (React) / CVE-2025-66478 (Next) "React2Shell" | Unauthenticated RCE in RSC/Server Function deserialization, CVSS 10, public exploits from 2025-12-04 | react-server-dom-* 19.0.1 / 19.1.2 / 19.2.1; next 15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7, 16.0.7 |
| Dec 2025 | CVE-2025-55184, CVE-2025-67779, CVE-2025-55183 | Pre-auth DoS (67779 = incomplete fix), server-function source-code exposure | 19.0.3 / 19.1.4 / 19.2.3 (DoS fix still incomplete, see next row) |
| May 2026 | CVE-2026-23870 + 12 more (13 total) | RSC DoS (CVSS 7.5); middleware/proxy auth bypass via segment-prefetch URL and Pages i18n default-locale path; SSRF (WebSocket upgrade); cache poisoning; XSS in CSP nonce handling | react-server-dom 19.0.6 / 19.1.7 / 19.2.6; next 15.5.18, 16.2.6 |
| Jul 2026 | CVE-2026-64641..64649 (9) | DoS via Server Actions; **middleware/proxy bypass (Turbopack + single i18n locale)**; SSRF in rewrites and in Server Actions (Host-header driven); server action / `use cache` ID disclosure; fetch cache confusion | next 15.5.21, 16.2.11 |
| Aug 25 2026 | GHSA-2xp9-vwfh-vxw4 (libheif); CVE-2026-75604 | Unauthenticated RCE via **AVIF** in image optimizer (libheif in sharp); RCE on **Windows-hosted** servers | next 15.5.24, 16.3.3 (AVIF optimization disabled until upstream fix) |
| Sep 22 2026 | GHSA-vcvr-r3jv-pc5j | RCE in Node `ImageResponse` (`next/og`, Satori), affects >=16.2.0 <16.3.6 | next 16.3.6, 15.5.26 (hardening only for 15.x) |
| **Sep 30 2026 (today, pre-announced)** | 9 vulns: 1 critical, 2 high, 5 medium, 1 low | Details not public at check time | **next 16.3.8 / 15.5.27** (16.3.7 of Sep 29 does NOT contain them) |

**Recommendation**
- Pin `next@16.3.8` (or newest 16.3.x) as soon as it is on npm; check https://nextjs.org/blog first. Until then, minimum is `next@16.3.6`. npm `latest` at check time was 16.3.7, `react` latest 19.3.0. If staying on 15.x: `15.5.27` (minimum `15.5.26`).
- Keep `react` / `react-dom` on the latest patch (npm latest 19.3.0). App Router bundles its own RSC runtime inside `next`, so upgrading `next` is what fixes react-server-dom issues; still keep react/react-dom current.
- Next.js now uses a pre-announced security release model. Watch the blog RSS and enable Dependabot security updates.
- Do not use `next/og` `ImageResponse` (Node) or the AVIF format unless patched. Do not add `image/avif` to `images.formats`.
- If any host machine is Windows: CVE-2026-75604 affects Windows-hosted servers only (Pages+App Router mix). Deploy on Linux (Docker/Vercel).
- **Lesson**: middleware/proxy bypass recurred in 2025-03, 2026-05 and 2026-07. Never make `proxy.ts` the only authz layer. Enforce in the DAL and in every Server Action / Route Handler (section 2). Optionally add a reverse-proxy rule dropping inbound `x-middleware-subrequest` headers (defense in depth for CVE-2025-29927-class bugs).

Sources:
- https://nextjs.org/blog/august-2026-security-release
- https://nextjs.org/blog/july-2026-security-release
- https://nextjs.org/blog/nextjs-security-update-september-22-2026
- https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026
- https://vercel.com/changelog/next-js-may-2026-security-release
- https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4
- https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components
- https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components
- https://github.com/advisories/GHSA-fv66-9v8q-g76r
- https://vercel.com/kb/bulletin/react2shell
- CVE-2025-29927 fixed versions and header workaround come from secondary sources (Datadog Security Labs, Picus, Zscaler), which agree: https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/
- Patched React2Shell versions from Tenable/Bitsight (secondary): https://www.tenable.com/blog/react2shell-cve-2025-55182-react-server-components-rce
- CVE-2026-23870 details from secondary sources (SentinelOne, GitLab advisory DB): https://advisories.gitlab.com/npm/react-server-dom-parcel/CVE-2026-23870/

---
## 2. Official Next.js guidance: auth and data security

Verified in Next docs v16.3.7 (lastUpdated Aug-Sep 2026).
- **Server Actions are public POST endpoints.** Reachable by direct POST even if unused in UI. "Verify authentication and authorization inside each one." A page-level auth check does NOT cover actions defined in it. Check ownership/permission as well (IDOR).
- Action arguments are hostile: validate with zod/valibot inside the action. TypeScript types are not enforced at runtime.
- Return only DTOs from actions. Never return raw DB rows.
- **Built-in CSRF**: actions are POST-only; Next compares the `Origin` host with `Host` / `X-Forwarded-Host` and rejects mismatch. A request with no `Origin` header is allowed with a warning. Extra hosts: `experimental.serverActions.allowedOrigins` (hosts only; `*.x.com` = one label, `**.x.com` = 1+). Behind a reverse proxy, forward the public host in `x-forwarded-host` (otherwise add the public host to allowedOrigins). No CSRF tokens are used. Route Handlers (`route.ts`) get NO built-in CSRF protection (check Origin manually for state-changing handlers).
- `serverActions.bodySizeLimit` default is **1 MB** (raw request body incl. multipart overhead; add 10-20 KB). Raise only if uploads go through an action, e.g. `'6mb'`.
- **Data Access Layer (DAL)** is the recommended pattern for new projects: one `server-only` module that verifies the session (`cache(async () => ...)` for per-render memoization), does authz, returns minimal DTOs. Only the DAL reads secrets from `process.env` and imports the DB. Keep `"use server"` files thin: they call DAL functions that authenticate inside.
- Do NOT put auth checks only in layouts (partial rendering: layouts do not re-render on navigation). Check next to the data.
- `import 'server-only'` in DAL/db/session modules: build error if imported into a Client Component.
- **Taint APIs** (`experimental_taintObjectReference`, `experimental_taintUniqueValue`, needs `experimental.taint: true`) are experimental and an additional layer only; they do not block derived values. Prefer DTOs.
- Never mutate in render (no logout via searchParams GET). Cookies can only be set in Server Actions / Route Handlers.
- Closed-over variables in inline actions are encrypted per build; `.bind()` args are NOT. For multi-instance Docker set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (base64 of 16/24/32 bytes, `openssl rand -base64 32`) so all instances share it.
- Run production mode only (dev sends unmasked server errors).
- Docs recommend rate limiting expensive actions (section 5).
- **`proxy.ts`**: verified. In Next 16.0.0 the `middleware` file convention was deprecated and renamed `proxy` (export `proxy` or default), runs on the **Node.js runtime** by default (`runtime` config not allowed). Codemod: `npx @next/codemod@canary middleware-to-proxy .`. Docs say use it as a last resort, for optimistic checks only (cookie presence, no DB), and: "Server Functions are not separate routes... a Proxy matcher that excludes a path will also skip Server Function calls on that path... Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone." Proxy still runs for `/_next/data` even if excluded by the matcher.
- Docs' DB-session example stores an encrypted session id in the cookie; an opaque random token with hashed DB lookup (section 4) is simpler and equally strong.

Sources: https://nextjs.org/docs/app/guides/authentication , https://nextjs.org/docs/app/guides/data-security , https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions , https://nextjs.org/docs/app/api-reference/file-conventions/proxy , https://nextjs.org/blog/security-nextjs-server-components-actions

---
## 3. Password hashing

OWASP Password Storage cheat sheet (https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html):

| Algo | Minimum params (equivalent options) |
|---|---|
| **Argon2id** (first choice) | m=19456 KiB (19 MiB), t=2, p=1. Equivalents: m=47104 (46 MiB) t=1 p=1; m=12288 t=3 p=1 |
| scrypt | N=2^17, r=8, p=1 |
| bcrypt (legacy) | cost >= 10, 72-byte input limit; do not pre-hash without HMAC+base64 |
| PBKDF2 (FIPS) | HMAC-SHA-256, >= 600,000 iterations |

Password policy (OWASP Authentication cheat sheet, https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): min 15 chars without MFA (8 with MFA); allow >= 64 chars (cap at e.g. 128 to avoid DoS); allow all Unicode/spaces; no composition rules; check against breached-password lists (HIBP k-anonymity) if practical. The Next docs example (min 8 + composition regex, bcrypt cost 10) is educational, not OWASP-current.

Libraries (npm registry, checked 2026-09-30):

| Lib | Version | Notes |
|---|---|---|
| **@node-rs/argon2** | 2.2.1 | Rust/napi-rs, prebuilt binaries via optionalDependencies: Windows x64/ia32/arm64, Linux x64/arm64 (glibc AND musl), macOS, wasm fallback. No node-gyp/compiler. Defaults = Argon2id, m=19456, t=2, p=1, 32-byte output (matches OWASP min). API: `hash(pw, opts)`, `verify(hash, pw)`, `parseOptions` (for rehash-on-login). **Recommended.** |
| argon2 (node-argon2) | 0.45.1 | Prebuilt via node-gyp-build, node >=16.17; larger install (~3.7 MB); fine alternative |
| node:crypto `argon2()` | Node >= 24.7.0 (added 2025-08-27) | Built-in, no dependency, but you must do your own PHC string encoding/parsing and constant-time verify; stability level not confirmed |
| bcryptjs | - | pure JS, slow, 72-byte limit; fallback only |

Recommendation: `@node-rs/argon2` with `{ memoryCost: 19456, timeCost: 2, parallelism: 1 }` (Argon2id is the default; use 47104/1/1 if RAM allows). Store the full PHC string in one column. On login success, if `parseOptions(hash)` differs from current params, rehash. Hash a dummy value when the email is unknown (timing parity). If bundling errors appear add `serverExternalPackages: ['@node-rs/argon2', 'sharp']` (UNVERIFIED whether already in Next's default list).

---
## 4. Session management (opaque token, DB-backed)

OWASP Session Management cheat sheet (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): >= 64 bits entropy, CSPRNG, meaningless ID, generic cookie name, `Secure` + `HttpOnly` + `SameSite=Strict|Lax`, `__Host-` prefix recommended, no `Domain`, regenerate ID on privilege change (login), server-side destroy on logout/timeout, accept only server-issued IDs, log with hashed IDs. OWASP suggests idle 15-30 min (2-5 for high value) and absolute 4-8 h for office apps; the project's 24 h requirement is longer than that guidance, so add an idle timeout and keep the absolute expiry non-sliding.

Concrete design:
- Token: `crypto.randomBytes(32).toString('base64url')` (256 bits; OWASP min is 64).
- DB `admin_sessions`: `id_hash text PK` = hex `sha256(token)` (a fast hash is fine because the token is high-entropy; no salt needed), `user_id`, `created_at`, `expires_at = created_at + 24h`, `last_seen_at`, optional `ip_hash`, `user_agent`. A DB leak then yields no usable tokens.
- Cookie: name `__Host-session` in prod (plain `session` in dev over http; Safari rejects Secure cookies on http localhost). Attributes: `HttpOnly; Secure; SameSite=Lax` (`Strict` is fine for an admin-only site if inbound cross-site admin links are not needed); `Path=/` (required by `__Host-`); no `Domain`; `Max-Age=86400`.
- Validation on every request in the DAL (`verifySession`, `cache()`d): look up `sha256(cookie)`, require `expires_at > now()` AND `last_seen_at > now() - idle` (recommend idle = 2 h; throttle `last_seen_at` writes to once per 5 min). Never extend `expires_at` (absolute 24 h). If invalid, delete the row and clear the cookie.
- Rotation: create a brand-new token at login; delete all previous sessions for the user (single owner). Never accept a pre-set token. Rotate again after password change.
- Logout: Server Action (POST) that deletes the DB row, then `cookies().delete()` with the same name/path, then `redirect('/admin/login')`. Never a GET.
- Cleanup: `DELETE FROM admin_sessions WHERE expires_at < now()` on each login (or cron).
- Set cookies only in a Server Action / Route Handler. Send `Cache-Control: no-store` on `/admin/*`.
- Proxy: only an optimistic redirect when the cookie is absent. No DB call, not trusted.
- Log session lifecycle events with a hash of the token, never the raw value.

---
## 5. Login brute-force and review-spam protection (no Redis)

OWASP Authentication cheat sheet: generic error ("Invalid email or password") for every failure, uniform response time, associate lockout/throttling with the account (IP-only limits are bypassed by distributed attacks), log failures, consider CAPTCHA after failures.

Postgres fixed-window counter (atomic, no race):
```sql
CREATE TABLE rate_limits (
  key text NOT NULL, window_start timestamptz NOT NULL, count int NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start));
-- per attempt ($2 = window seconds):
INSERT INTO rate_limits(key, window_start)
VALUES ($1, to_timestamp(floor(extract(epoch from now())/$2)*$2))
ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
RETURNING count;
```
Purge rows older than 1 day opportunistically (e.g. 1% of requests) or by cron.

| Endpoint | Key | Limit |
|---|---|---|
| Admin login | `login:ip:<ip>` | 10 attempts / 15 min |
| Admin login | `login:acct:<sha256(lower(email))>` | 5 failed / 15 min, then exponential delay (not permanent lock) |
| Admin login | global `login:all` | e.g. 100 / 15 min, alert |
| Review submit | `review:ip:<ip>` | 3 / hour and 10 / day |
| Review submit | `review:product:<id>:ip` | 1 / 10 min |

Rules:
- Check limits BEFORE running the password hash (prevents CPU DoS via argon2). Count only failures for the account key; reset on success.
- Lockout trade-off: hard lockout lets an attacker lock out the sole owner (DoS). Use per-account throttling with exponentially growing delay (1, 2, 4 ... up to 15 min) plus notification email; keep the IP limit as a second layer. Keep a recovery path (CLI script / env-based reset).
- Timing: if the user is not found, still run `verify()` against a fixed dummy Argon2id hash. Compare any secrets with `crypto.timingSafeEqual` (equal-length buffers) or via a DB lookup of a SHA-256 hash.
- Client IP: only trust the header set by your own edge (Vercel: `x-vercel-forwarded-for` / `x-real-ip`; other proxies: your proxy's configured header, or the right-most `x-forwarded-for` entry appended by your trusted proxy). Raw client-supplied `x-forwarded-for` is spoofable. Fall back to a coarse global bucket if the IP is unknown.
- Reviews: validate with zod (length caps, rating 1-5), honeypot field + minimum time-to-submit, store as `pending` (moderated), escape on output (React does; never `dangerouslySetInnerHTML`), optional Turnstile/hCaptcha if spam appears. Server Actions are public endpoints: rate limit inside the action.
- Next docs mention rate limiting: https://nextjs.org/docs/app/guides/backend-for-frontend#rate-limiting

---
## 6. File upload security (admin product images)

OWASP File Upload cheat sheet (https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): extension allowlist, MIME allowlist (spoofable, not sufficient), verify magic bytes, random server-generated names (UUID), size limits, store outside web root / on a separate host, rewrite/re-encode images to destroy embedded payloads, authz on the upload endpoint.

Pipeline:
1. Auth first (`verifySession()`), then `file.size <= 5 MB` BEFORE reading into memory. Also set `serverActions.bodySizeLimit` accordingly (default 1 MB).
2. Allowlist input formats **JPEG, PNG, WebP only**. Check magic bytes: JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `52 49 46 46 .. .. .. .. 57 45 42 50`. **Reject SVG, AVIF, HEIC/HEIF, GIF, TIFF, PDF.** (AVIF/HEIF = libheif RCE, Aug 2026; SVG = script/XXE/SSRF/DoS.)
3. Re-encode with sharp (npm latest 0.35.5, node >= 20.9; keep updated):
```ts
const out = await sharp(buf, { limitInputPixels: 40_000_000, failOn: 'error', animated: false })
  .rotate()                                   // apply EXIF orientation first
  .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 80 })                      // EXIF/GPS metadata is dropped by default
  .toBuffer();
```
   sharp defaults: `limitInputPixels` = 268,402,689 (about 16383x16383); lower it to about 40M px (decompression-bomb guard). `limitInputChannels` default 5. Never set `unlimited: true`. Also read `metadata()` and confirm `format` is in the allowlist and width/height are sane before the pipeline. Catch errors and return a generic message. Optionally `sharp.concurrency(1..2)` on small hosts. (Source: https://sharp.pixelplumbing.com/api-constructor/)
4. Object key: `products/${crypto.randomUUID()}.webp`. Never use the user filename or path. Keep alt text in the DB.
5. S3 put: `ContentType: 'image/webp'`, `CacheControl: 'public, max-age=31536000, immutable'`; `X-Content-Type-Options: nosniff` at CDN/bucket. Bucket: no public listing, no public write; credentials scoped to `PutObject`/`DeleteObject` on `products/*`; keys only in server env (never `NEXT_PUBLIC_`).
6. Serve from a separate origin (S3/CDN domain), not the app origin; only re-encoded WebP is ever produced, so nothing executable is served. Add that host to `images.remotePatterns` (exact hostname + pathname) and CSP `img-src`.
7. Delete DB rows and objects together; validate client-submitted image keys against `^products/[0-9a-f-]{36}\.webp$`.
8. `next/image`: keep `remotePatterns` tight (CVE-2026-64644 SVG DoS via remote images; AVIF RCE); leave `dangerouslyAllowSVG` false (default).

---
## 7. Security headers and CSP

Facts (https://nextjs.org/docs/app/guides/content-security-policy):
- Nonce CSP requires **dynamic rendering of every page** (proxy generates the nonce; static/ISR/CDN caching disabled; PPR incompatible). The May 2026 release fixed an XSS bug in nonce handling, so patch level matters.
- Without nonces: `script-src 'self' 'unsafe-inline'` set via `next.config` `headers()`. Weaker XSS protection (inline scripts allowed) but Next's inline bootstrap/RSC flight scripts work on static pages.
- Alternative: experimental SRI (`experimental.sri.algorithm: 'sha256'`), App Router only, hash-based, keeps static generation; experimental, so test on your exact Next version before relying on it (UNVERIFIED for 16.3 + Turbopack).
- `'unsafe-eval'` is only needed in dev.

**Recommended pragmatic setup for a mostly static site**
- Public pages: static-friendly CSP with `'unsafe-inline'` (below). Real XSS defense comes from React escaping, no `dangerouslySetInnerHTML`, validated reviews, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
- `/admin/*` (dynamic anyway, high value): nonce + `'strict-dynamic'` CSP from `proxy.ts` with matcher `/admin/:path*`. Exclude `/admin` from the global header rule (source `/((?!admin).*)`) so two CSP headers are not both enforced (multiple CSP headers are intersected).

Public CSP (adapt hosts):
```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://<bucket-or-cdn-host>; font-src 'self'; connect-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```
Roll out with `Content-Security-Policy-Report-Only` first if you add third-party scripts (analytics/maps need explicit hosts).

Other headers (global, `headers()` in next.config):

| Header | Value |
|---|---|
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` (add `preload` only once all subdomains are HTTPS) |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| X-Frame-Options | `DENY` (legacy; CSP `frame-ancestors 'none'` is the modern control) |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` (keep only what you need) |
| Cross-Origin-Opener-Policy | `same-origin` |
| Cache-Control on `/admin/*` | `no-store` |

Also `poweredByHeader: false` in next.config. Values above are standard OWASP Secure Headers recommendations (not re-fetched this session).

---
## 8. Open redirect and URL safety

- Best fix for a single-owner admin: **do not accept a `next` param**; always redirect to `/admin` after login.
- If needed: accept only same-site relative paths. Rules: string starts with `/`, second char is not `/` or `\`, no control chars; then `const u = new URL(next, 'https://x.invalid'); u.origin === 'https://x.invalid'` and re-emit `u.pathname + u.search`. Or map to an allowlist of keys (`?next=orders` -> `/admin/orders`). OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html (not re-fetched).
- Next-specific: July 2026 CVE-2026-64645 (open redirect/SSRF when `rewrites()`/`redirects()` build hostnames from request input). Never build destination hostnames from request data in next.config.
- **wa.me**: `https://wa.me/<digits>?text=<encoded>`; number in international format, digits only, no `+`, dashes or leading zeros (WhatsApp Click to Chat FAQ; page only partly retrievable). Build server-side from a stored number validated by `/^[1-9]\d{7,14}$/` (E.164 max 15 digits) and `encodeURIComponent(message)`. Never take the number from a query param. Use `rel="noopener noreferrer"` with `target="_blank"`.
- **Admin-entered URLs** (social links etc.): parse with `new URL(s)`; require `protocol === 'https:'`; reject `username`/`password` in the URL and `javascript:`, `data:`, `http:`; optional hostname allowlist; length cap 2048; store normalized `u.href`. Re-validate on render. Never use in `dangerouslySetInnerHTML`, `<iframe src>`, or server-side `fetch` (SSRF).

---
## 9. Dependency and secret scanning (CI)

- **Caveat (2026)**: npm retired the legacy Quick Audit endpoints (`/-/npm/v1/security/audits[/quick]`, HTTP 410, fully retired after about 2026-07-15). **pnpm and Yarn audit broke**; npm CLI (bulk advisory endpoint) was unaffected. Confirm your pnpm version's `pnpm audit` works before relying on it (fix status not verified). Source: https://github.com/orgs/community/discussions/192768
- **OSV-Scanner v2** (google/osv-scanner): reads `pnpm-lock.yaml` directly; use **>= v2.6.0** (earlier versions read only the first YAML document of pnpm 12's two-document lockfile and missed deps). CI: `osv-scanner scan --lockfile pnpm-lock.yaml`, or the official GitHub Action on PR + weekly schedule. https://github.com/google/osv-scanner/releases
- **GitHub Dependabot**: enable alerts + security updates + version updates (`.github/dependabot.yml`, ecosystem `npm`, weekly, group minor/patch; keep `next`/`react` updates separate and fast given the security cadence). Works with pnpm lockfiles.
- `pnpm audit signatures` (pnpm >= 11.1) verifies registry ECDSA signatures of installed packages. https://pnpm.io/blog/releases/11.1
- CI hygiene: `pnpm install --frozen-lockfile`; commit the lockfile; pin `next` exactly.
- **Secrets**: run the open-source gitleaks CLI in CI (`gitleaks git --redact` / `gitleaks dir`) plus a pre-commit hook. `gitleaks/gitleaks-action` v2+ is under an EULA and needs a license for repos in an organization (free for personal accounts; v1 was MIT), so calling the binary/Docker image directly avoids that. Also enable GitHub secret scanning + push protection. https://github.com/gitleaks/gitleaks-action
- If any key (S3, DB URL, encryption secret) is ever committed, rotate it immediately. Keep `.env*` in `.gitignore`; commit a value-less `.env.example`.

---
## 10. Supabase used only as plain Postgres (server-side connection)

Verified from Supabase docs:
- The Data API (PostgREST/GraphQL over exposed `public` schema, anon key) is separate from direct Postgres connections. "A table in an exposed schema without RLS is readable and writable by any role with a grant on it. Enable RLS on every table in an exposed schema." With RLS on and no policies nothing is accessible through the API to anon/authenticated. https://supabase.com/docs/guides/database/postgres/row-level-security
- `service_role` / `postgres` have `BYPASSRLS`, so an app connecting as `postgres` (Drizzle) is unaffected by RLS.
- **Best: disable the Data API entirely** (Dashboard: Integrations -> Data API -> "Enable Data API" off, or create the project Postgres-only). No REST/GraphQL endpoints respond regardless of grants/RLS; use the DB like standard Postgres via direct or pooler connection. https://supabase.com/docs/guides/api/securing-your-api
- If the Data API stays on (or as defense in depth): `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;` on **every** public table (especially admin users, `admin_sessions`, `rate_limits`, reviews, orders) with NO policies; plus `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;` and `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;`. In Drizzle use `.enableRLS()` on `pgTable` if your drizzle-orm version supports it (UNVERIFIED), else a raw SQL migration. Alternative: keep tables in a non-exposed schema.
- Platform change: from 2026-05-30 new projects no longer auto-grant new public tables to Data API roles; **existing projects switch on 2026-10-30**. Direct Postgres connections are unaffected. Do not rely on this alone. https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- Never ship anon/service keys; no supabase-js client-side; DB URL only in server env (`server-only` db module). With the transaction pooler (port 6543) and postgres-js set `prepare: false`.
- Caveat: if you connect with a custom non-owner, non-BYPASSRLS role, RLS with no policies would block your own app; then add explicit policies for that role.
