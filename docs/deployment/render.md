# Deploying on Render

Source: docs/research/hosting.md section 4 (checked 2026-09-30). The Starter price (~$7/mo, 0.5 vCPU, 512 MB) comes from secondary sources; confirm in the Render dashboard.

## Plan

- Free instances spin down after 15 minutes and Free Postgres expires after 30 days: not for production.
- Use Starter (always on). Single instance only (see scaling.md).
- 512 MB RAM is tight for `sharp` uploads; the browser pre-resizes photos and the server caps uploads at 10 MB / 40 MP. If you see OOM restarts, move to the next plan.

## Steps

1. Push the repo to GitHub/GitLab.
2. Render Dashboard -> New -> Blueprint -> select the repo; it reads `render.yaml`.
3. Fill in every `sync: false` variable (`SITE_URL`, `DATABASE_URL`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `MEDIA_BASE_URL`). See current.md for the table.
4. Docker builds receive service environment variables as build args; the Dockerfile declares an `ARG` for each variable needed at build time (SITE_URL, DATABASE_URL, S3_*, MEDIA_BASE_URL, ...). Confirm in the first build log that `next build` prerendered pages without env errors. (Verify against Render's current Docker build-arg behaviour if the build reports missing variables.)
5. Before the first deploy, run migrations once from your machine (`DATABASE_URL=... pnpm db:migrate`) because the build prerenders against the DB and runs before `preDeployCommand`. After that, `preDeployCommand: node scripts/migrate.mjs` applies new migrations on every deploy, before the new instance receives traffic.
6. Add the custom domain in Render (managed TLS), then set `SITE_URL` to it and redeploy.
7. Health check path is `/api/health`.
8. Set `CLIENT_IP_HEADER` only after confirming which header Render's proxy overwrites (`x-forwarded-for` is set in `render.yaml` as a starting point; the first entry can be client-supplied, so verify).

## Notes

- Render provides `PORT`; the image binds `0.0.0.0:$PORT` (`render.yaml` sets 3000; Render's default is 10000).
- Logs: JSON lines on stdout appear in the Render log stream.
- Rollback: redeploy the previous successful deploy from the dashboard; migrations are forward-only, so write backward-compatible migrations (expand, then contract).
- `scripts/migrate.mjs` is in the image with its own `scripts/node_modules` (drizzle-orm, postgres). This Docker build has not been verified end to end yet.
