# AWS migration target

Source: docs/research/hosting.md section 8 (checked 2026-09-30). Prices were not retrieved; estimate before committing.

## Target architecture

| Component      | Service                                                                     | Notes                                                                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Image registry | ECR                                                                         | Same Docker image as today                                                                                                                                                                       |
| Compute        | ECS Express Mode on Fargate (creates service, ALB, autoscaling, networking) | `aws ecs create-express-gateway-service`; provisioning 3-5 min; custom HTTPS domain needs an ACM certificate. App Runner is closed to new customers; Amplify Hosting supports Next only up to 15 |
| Database       | RDS for PostgreSQL 17 (Single-AZ to start)                                  | Private subnet; security group allows only the ECS tasks                                                                                                                                         |
| Media          | S3 bucket + CloudFront                                                      | Leave `S3_ENDPOINT` empty for AWS; `MEDIA_BASE_URL` = CloudFront domain; use Origin Access Control and keep the bucket private if possible (CloudFront reads)                                    |
| Secrets        | Secrets Manager or SSM Parameter Store                                      | Inject as ECS task secrets (`DATABASE_URL`, `S3_*`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`)                                                                                                        |
| Logs           | CloudWatch Logs (stdout JSON)                                               | Metric filters on `"level":"error"`                                                                                                                                                              |
| DNS            | Route 53 (weighted records for cutover)                                     |                                                                                                                                                                                                  |

Note: with S3 private behind CloudFront, uploads still work (server writes with IAM credentials). Prefer an IAM task role instead of static keys: this needs a small change in `src/server/storage/s3.ts` (make credentials optional so the SDK default provider chain is used). Currently `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` are required by `env.ts`.

## Migration steps

1. Build/push: `docker build` with build args (build needs DB and S3/MEDIA vars: build in CI with network access to the staging DB or restore the DB to RDS first), push to ECR.
2. Create RDS Postgres; restore: `pg_dump -Fc "$OLD" | pg_restore --no-owner --no-acl -d "$RDS_URL"` (portability.md). Keep `DATABASE_SSL=require`.
3. Create the S3 bucket and CloudFront; `rclone copy r2:usba-media s3:usba-media` (keys unchanged); set `MEDIA_BASE_URL` to the CloudFront domain.
4. Create the ECS Express Mode service with the image, task role, env and secrets; health check path `/api/health`. Run `node scripts/migrate.mjs` as a one-off task (`aws ecs run-task` with a command override) before switching traffic.
5. Smoke test on the ALB URL (admin login, upload, order link).
6. Cutover: lower DNS TTL, freeze admin edits, final `pg_dump`/restore delta (or accept a short read-only window), shift Route 53 weighted records old -> new (10/90/100).
7. If running more than one task: shared cache handler (Redis/ElastiCache or S3) and a fixed `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`; set `CLIENT_IP_HEADER=x-forwarded-for` and confirm ALB behaviour (scaling.md).

## Rollback

- Keep the old host and database untouched for at least a week; DNS weighted records let you send 100% back in minutes.
- Media is immutable and additive, so both stacks can point at their own bucket during the overlap; do not delete the old bucket until the old stack is decommissioned.
- If new admin data was written on AWS during the overlap, dump it back (`pg_dump`) before reverting.
- ECS: roll back with the previous task definition revision.
