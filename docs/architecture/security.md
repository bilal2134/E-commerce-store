# Security

Facts and sources: docs/research/security.md (section numbers below) and docs/research/stack.md.

## Threat model summary

| Asset                                     | Threat                                                | Control                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Admin panel (catalogue, orders, settings) | Credential stuffing, session theft, CSRF, auth bypass | Argon2id, opaque DB-backed sessions, rate limits, `requireAdmin()` everywhere, SameSite=Lax, Origin check |
| Storefront visitors                       | XSS, clickjacking, malicious redirects/links          | React escaping, CSP, frame-ancestors none, URL validation for admin-entered links                         |
| Uploads                                   | Malware/polyglots, decompression bombs, EXIF/GPS leak | Magic-byte sniff, 10 MB / 40 MP caps, re-encode to WebP, metadata stripped                                |
| Database                                  | SQL injection, direct exposure via provider API       | Drizzle parameterisation; Supabase Data API off or RLS on                                                 |
| Secrets                                   | Leak via git, logs, client bundle                     | `.env*` ignored, gitleaks in CI, no `NEXT_PUBLIC_*`, logger redaction                                     |
| Availability                              | Brute force / spam                                    | Postgres fixed-window rate limits; host/CDN-level DDoS protection (not in-app)                            |
| Supply chain                              | Vulnerable Next/React/deps                            | Pinned versions, Dependabot, osv-scanner                                                                  |

## Authentication and authorization (D7; `src/server/auth/*`)

- Password hashing: Argon2id via `@node-rs/argon2` defaults, which match OWASP parameters (research §3). Minimum password length 12 (`admin:create`).
- Session token: 256-bit random opaque token (`tokens.ts`); only `SHA-256(token)` is stored in `admin_sessions.id`, so a DB leak does not yield usable tokens (research §4).
- Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` on HTTPS, named `__Host-usba_admin` on HTTPS (no Domain, pinned to origin) or `usba_admin` on http (local dev only).
- Lifetime: 24 h absolute (never extended) and 8 h idle (`last_seen_at`, written at most every 5 min). The 8 h idle timeout is an addition to the requirement (ASSUMPTIONS A-24).
- Logout deletes the session row and the cookie, so a copied cookie stops working (AS-20). `pruneSessions()` removes expired/idle rows (called opportunistically from login).
- Authorization: `requireAdmin()` is called in every admin page and every admin Server Action (Server Actions are directly reachable POST endpoints). `proxy.ts` only does an optimistic redirect when the cookie is absent and is never trusted (proxy/middleware bypass CVEs, research §1-2).
- Single owner: no roles. If more admins are added, add roles before exposing anything else.

## CSRF

Server Actions compare `Origin` with `Host`/`X-Forwarded-Host` (Next built-in); the session cookie is `SameSite=Lax`, so cross-site POSTs do not carry it. Do not add state-changing GET routes. Behind a proxy make sure `Host`/`X-Forwarded-Host` reach the app unchanged, or configure `serverActions.allowedOrigins`.

## XSS

React escapes all rendered data. `dangerouslySetInnerHTML` is used only for JSON-LD, where `<` is escaped to `<` so data cannot close the script tag. No user-provided HTML is rendered. Admin-entered URLs (social links, banner CTA) must be parsed with `new URL()`, `https:` only, no credentials, length-capped (research §8).

## CSP and headers (`next.config.ts`, D14)

Static CSP: `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (Next's inline bootstrap; a nonce CSP would force dynamic rendering of the whole storefront, which is why it is not used; `'unsafe-eval'` only in dev); `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob:` + `MEDIA_BASE_URL` origin; `connect-src 'self'` (+ analytics origin if enabled); `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests` on https. Other headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo/payment/usb off), `Cross-Origin-Opener-Policy: same-origin`, HSTS (2 years, includeSubDomains) when `SITE_URL` is https. `/admin/*`: `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`. Consequence: `'unsafe-inline'` weakens XSS mitigation; the primary defence is escaping.

## Uploads (`src/server/images/pipeline.ts`, D6)

Type detected by magic bytes (JPEG/PNG/WebP only), not filename or client MIME; 10 MB cap; 40 MP pixel cap; decode with sharp, auto-rotate, drop all metadata, re-encode to WebP variants; the original is never stored. Object keys are server-generated (`randomUUID`), never derived from filenames. Bucket is public-read for objects only; write credentials are server-side only (research §6).

## Rate limiting

Postgres fixed-window counters (`rate_limits`), 15-minute windows. Login: 20 attempts per client IP, 8 **failed** attempts per account+IP, 100 failed attempts per account from anywhere. Successful logins never consume the failure budget, so an attacker cannot lock the owner out from a different IP. The IP comes from `CLIENT_IP_HEADER`, read `CLIENT_IP_TRUSTED_HOPS` entries from the **right** (`src/server/client-ip.ts`), so client-supplied `X-Forwarded-For` prefixes are ignored. Without the header, per-IP login limits are skipped (to avoid a shared lockout bucket), reviews share one 30/hour bucket, and the server warns at startup in production (`src/instrumentation.ts`). Reviews: 3 per IP per hour, honeypot, moderation. Expired sessions and stale counters are pruned opportunistically (~1 in 50 logins/review submissions). No Redis.

## Analytics privacy (AS-19; `src/app/api/events/route.ts`, `src/server/analytics/*`)

First-party and cookie-free. `analytics_events` stores only: event type, optional product id, optional category slug, a `visitor_day_hash` and a timestamp. The hash is `sha256(HMAC(ANALYTICS_SALT, UTC date) + ipKey + userAgent + host)` truncated to 32 hex chars; the raw IP and user agent are never stored, and because the salt rotates daily a visitor cannot be linked across days. If `ANALYTICS_SALT` is empty a random per-process secret is used, so unique counts reset on restart. Events older than 180 days are deleted opportunistically (~1 in 500 requests). The browser skips sending when Do Not Track or Global Privacy Control is on. The collector always answers 204 and ignores bot user agents and bodies over 2 KB. Its `Sec-Fetch-Site`/`Origin` check only drops cross-site _browser_ requests; a script can omit those headers, so it is a courtesy filter, not a control. Abuse is bounded by: a per-IP limit (120 per 10 minutes, only when the client IP is known), an always-on global cap of 20,000 accepted events per rolling day, and a unique index that stores at most one row per event type, target and visitor hash per UTC day (`NULLS NOT DISTINCT`, Postgres 15+), so repeats never grow the table. Rate-limit rows are pruned with the events. IP keys used for rate limits (login, reviews, analytics) are `HMAC-SHA256(ANALYTICS_SALT, ip)` truncated to 32 hex chars, IPv6 reduced to its /64 so one host can't rotate through its prefix; without `ANALYTICS_SALT` they fall back to a plain SHA-256 so limits stay consistent across instances (production logs a warning). Search text is never collected.

## Secrets

Server-only typed `env()`; no `NEXT_PUBLIC_*`; `.env*` in `.gitignore` (only `.env.example` is committed); `.dockerignore` excludes `.env*`. The Docker build receives its environment as a BuildKit secret mount (never an ARG/ENV, never in a layer); the Next standalone copy of `.env` is deleted in the same RUN step, verified by inspecting the image (no `.env`, no credential strings under `/app`). Use provider secret stores and rotate on suspicion. Logger redacts keys matching `pass|secret|token|authorization|cookie|session|key`. If a secret is committed, rotate it immediately.

## SQL injection

All queries go through Drizzle (parameterised). Raw `sql` templates are used only for constants/expressions with bound parameters. Enumerations are enforced by CHECK constraints from `src/domain`.

## Supabase Data API

If Supabase hosts Postgres, either disable the Data API (Dashboard -> Integrations -> Data API) or enable RLS with no policies on every public table (`admin_users`, `admin_sessions`, `rate_limits`, `orders`, `reviews`, ...) and revoke grants from `anon`/`authenticated` (research §10). The app connects as `postgres`, which bypasses RLS. Never ship anon/service keys or `supabase-js`. Not yet enforced in migrations (open item).

## Dependency and secret scanning

CI runs gitleaks (Docker image, not the licensed Action) and osv-scanner >= v2.6 against `pnpm-lock.yaml`; Dependabot weekly for npm and GitHub Actions (research §9). `pnpm audit` may be broken by npm's retired audit endpoints (research §9), so it is not used in CI. Consider pre-commit gitleaks and GitHub secret scanning + push protection.

## Next.js advisory policy

- Pin `next` and `react` exactly (currently next 16.3.7, react 19.2.8; must stay at or above the patched versions listed in docs/research/stack.md and research/security.md §1).
- A 16.3.8 security release is expected 2026-09-30: upgrade as soon as it is published, then run `pnpm verify` and redeploy.
- Watch the Next.js blog / GitHub advisories; treat any RSC/Server Action advisory as same-day.
- Do not use `next/image` optimizer (avoids image-optimizer CVEs; D6).

## Open items

- Enforce RLS/deny in a migration for Supabase deployments (or document that the Data API is off).
- Periodic cleanup job for `admin_sessions` and `rate_limits`.
- Rate limit + moderation for customer-submitted reviews when enabled.
- Confirm the client-IP header on the chosen host before trusting per-IP limits.
- Add CSP report-only endpoint or nonce-based CSP if the site ever moves to fully dynamic rendering.
- Error tracker (Sentry-like) wiring.
- Verify Origin/Host handling behind the chosen proxy.
