# Deploying on Vercel (alternative, not the default)

Source: docs/research/hosting.md section 2 (checked 2026-09-30).

## Licensing

Vercel Hobby is restricted to non-commercial personal use; any site that advertises or sells products, or where anyone is paid to build/host it, requires Pro or Enterprise. USBA is a commercial shop, so **Pro ($20/mo platform fee, 1 seat, $20 usage credit) is required**.

## Fit

| Topic                    | Detail                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request body limit       | 4.5 MB for functions. Our uploads go through Server Actions, but the browser pre-resizes photos (~0.3-2 MB), so this is fine. `bodySizeLimit: 12mb` in next.config.ts does not raise the platform limit                         |
| `sharp`                  | Works but not officially documented in what we fetched; the native binary must match Linux x64. Verify with a real upload                                                                                                       |
| `@node-rs/argon2`        | Native binary; listed in `serverExternalPackages`; verify on first deploy                                                                                                                                                       |
| Build needs the database | Cache Components prerenders at build time: `DATABASE_URL` and S3/MEDIA vars must be set for the **Build** environment in Vercel, and the DB must accept connections from Vercel's build machines                                |
| Cache                    | Vercel provides the shared cache/CDN; multi-instance concerns are handled by the platform                                                                                                                                       |
| Connection pooling       | Serverless: use a pooled connection string (Neon pooled or Supabase :6543 with `DATABASE_PREPARE=false`) and a small `DATABASE_POOL_MAX` (1-3)                                                                                  |
| Output mode              | `output: "standalone"` is ignored by Vercel; no code change needed                                                                                                                                                              |
| Migrations               | No pre-deploy hook equivalent; run `pnpm db:migrate` in CI or from a machine before deploying, or use a build command `pnpm db:migrate && pnpm build` (needs `tsx` in build env, which is a devDependency present during build) |
| Image optimization       | Not used (ADR 0006), so no per-transformation charges                                                                                                                                                                           |
| Client IP                | Set `CLIENT_IP_HEADER=x-forwarded-for` or `x-real-ip` (verify Vercel's behaviour)                                                                                                                                               |

## Steps

1. Import the repo, framework preset Next.js, install command `pnpm install --frozen-lockfile`.
2. Add all env vars (current.md) for Production/Preview with Build access.
3. Deploy; check `/api/health`; upload a test product photo.
4. Add domain; set `SITE_URL` to it and redeploy.

Not recommended over Render mainly for cost and the coupling to Vercel's function model.
