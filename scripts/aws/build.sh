#!/usr/bin/env bash
# Builds the Lambda bundle (dist/aws) on any OS via Docker (ADR 0014).
#
#   pnpm aws:build            # uses .env.aws
#
# Pages are prerendered from the production Aurora DSQL database, which needs
# AWS credentials to sign a login token. Temporary credentials from the AWS
# CLI's current profile are passed to the build as a BuildKit secret together
# with .env.aws; they never reach an image layer or the output.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"
env_file="${1:-.env.aws}"
[ -f "$env_file" ] || { echo "Missing $env_file (copy infrastructure/aws/env.aws.example)"; exit 1; }

secret="$(mktemp)"
trap 'rm -f "$secret"' EXIT
cat "$env_file" > "$secret"
echo >> "$secret"
aws configure export-credentials --format env-no-export >> "$secret"
echo "AWS_REGION=ap-south-1" >> "$secret"

rm -rf dist/aws
DOCKER_BUILDKIT=1 docker build \
  -f infrastructure/aws/opennext.Dockerfile \
  --secret id=buildenv,src="$secret" \
  --target export -o dist/aws .
ls -la dist/aws
