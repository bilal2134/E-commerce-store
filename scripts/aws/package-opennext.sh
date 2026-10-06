#!/usr/bin/env bash
# Packages OpenNext's .open-next/ into <out dir> (default dist/aws) for the CDK
# stack in infrastructure/aws/cdk (ADR 0014). Run on Linux x86_64 after
# `pnpm exec open-next build` (CI) or inside infrastructure/aws/opennext.Dockerfile.
#
# - Repoints Turbopack's hashed sharp alias at the Lambda build of sharp that
#   open-next.config.ts installs (OpenNext leaves pnpm's copy out), then loads
#   it so a broken link fails here instead of on the first upload.
# - Zips each function inside Linux so pnpm's symlinks survive.
set -euo pipefail
out="$(realpath -m "${1:-dist/aws}")"
root="$(cd "$(dirname "$0")/../.." && pwd)"
fn="$root/.open-next/server-functions/default"

cd "$fn/.next/node_modules"
for link in sharp-*; do
  [ -L "$link" ] && ln -sfn ../../node_modules/sharp "$link"
done
node -e "for (const l of require('fs').readdirSync('.').filter((n) => n.startsWith('sharp-'))) require(require('path').resolve(l))"

find "$root/.open-next" -name ".env*" -type f -delete
mkdir -p "$out"
rm -f "$out"/*.zip
(cd "$fn" && zip -qry "$out/server-function.zip" .)
(cd "$root/.open-next/revalidation-function" && zip -qry "$out/revalidation-function.zip" .)
rm -rf "$out/assets" "$out/cache"
cp -r "$root/.open-next/assets" "$out/assets"
cp -r "$root/.open-next/cache" "$out/cache"
cp "$root/.open-next/open-next.output.json" "$out/"
du -sh "$out"/*.zip
