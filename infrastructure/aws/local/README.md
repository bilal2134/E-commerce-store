# Local Lambda emulation

Runs the real OpenNext server function (the code that will run on AWS Lambda)
behind `harness.mjs`, which stands in for CloudFront and the Lambda Function URL:
S3 paths are served from the build's assets, everything else goes through the
streaming handler with the headers CloudFront adds (`x-forwarded-host`,
`cloudfront-viewer-address`, `x-origin-verify`). No AWS account needed.

```bash
# 1. Seed the e2e database (the build prerenders from it)
DATABASE_URL=postgres://usba:usba_dev_password@localhost:54329/usba_test \
  ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD=local-dev-password-123 \
  SEED_WHATSAPP_NUMBER=923001234567 SITE_URL=http://localhost:3300 \
  S3_ENDPOINT=http://localhost:9100 S3_BUCKET=usba-media S3_ACCESS_KEY_ID=usba_dev_access \
  S3_SECRET_ACCESS_KEY=usba_dev_secret_key S3_FORCE_PATH_STYLE=true \
  MEDIA_BASE_URL=http://localhost:9100/usba-media pnpm e2e:prepare

# 2. Build the local-test variant (file-system caches instead of S3/DynamoDB/SQS).
#    <env file>: the same values as above, with host.docker.internal instead of
#    localhost for DATABASE_URL and S3_ENDPOINT, plus CLIENT_IP_HEADER=cloudfront-viewer-address
docker build -f infrastructure/aws/opennext.Dockerfile --build-arg OPEN_NEXT_LOCAL=1 \
  --secret id=buildenv,src=<env file> --target export -o dist/aws-local .

# 3. Run it on :3300 with the origin lock on
docker build -f infrastructure/aws/local/Dockerfile -t usba-lambda-local .
docker run --rm -p 3300:3300 --env-file <env file> \
  -e ORIGIN_VERIFY_SECRET=local-origin-secret-0123456789abcdef usba-lambda-local

# 4. Run the end-to-end suite against it
E2E_PORT=3300 pnpm exec playwright test
```

`curl -H "x-harness-direct: 1" http://localhost:3300/` simulates calling the
Function URL directly (without CloudFront) and must return 403.
