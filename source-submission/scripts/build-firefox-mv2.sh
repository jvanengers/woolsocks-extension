#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV=production
export TZ=UTC
export LANG=C
# Optional: help reproducibility
export SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-1731628800} # 2024-11-15T00:00:00Z

# Clean environment
rm -rf node_modules dist dist-firefox dist-firefox-mv2 || true

# Install exact dependencies
npm ci --no-fund --no-audit

# Build Firefox MV2 target (uses vite.firefox-mv2.config.ts)
npm run build:firefox

# Record build metadata for reviewers
{
  echo "gitCommit=$(git rev-parse --short HEAD 2>/dev/null || echo 'n/a')"
  echo "nodeVersion=$(node -v)"
  echo "npmVersion=$(npm -v)"
  echo "buildTimeUTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > dist-firefox-mv2/BUILD_INFO.txt

# Optional: list checksums for diffing (deterministic ordering)
CHKTOOL=$(command -v sha256sum || command -v shasum)
if [ "${CHKTOOL##*/}" = "shasum" ]; then ARGS="-a 256"; else ARGS=""; fi
( cd dist-firefox-mv2 && find . -type f -print0 | sort -z | xargs -0 ${CHKTOOL} ${ARGS} ) > dist-firefox-mv2.SHA256

echo "✅ Firefox MV2 build completed at dist-firefox-mv2/"
