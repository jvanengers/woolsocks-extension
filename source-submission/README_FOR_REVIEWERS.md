# Firefox MV2 Source Code — Reviewer Build Guide

This package provides the full human-readable sources and deterministic build instructions to reproduce the Firefox MV2 build located at `dist-firefox-mv2` exactly.

Reference: Source Code Submission – Extension Workshop
https://extensionworkshop.com/documentation/publish/source-code-submission/?utm_source=addons.mozilla.org&utm_medium=devhub&utm_content=submission-flow

## Build environment requirements
- OS: Ubuntu 24.04 LTS (default reviewer env, ARM64) or macOS 14/15
- CPU/Memory/Disk: ≥6 vCPU, ≥10GB RAM, ≥35GB free disk
- Node.js: 22.x LTS, npm: 10.x (must match lockfile)
- Network: access to `registry.npmjs.org` for `npm ci`
- All tools are open‑source and run locally; no web‑based build steps

### Installation instructions (Ubuntu 24.04 LTS)
```bash
# Install NVM (or use system Node 22 if preferred)
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22
node -v   # v22.x
npm -v    # 10.x
```

### Installation instructions (macOS 14/15)
```bash
# Using Homebrew
brew install node@22
brew link --overwrite node@22
node -v   # v22.x
npm -v    # 10.x
```

## Declared build tools (disclosure)
- Bundler: Vite 7 (Rollup) with custom MV2 output in `vite.firefox-mv2.config.ts`
- Transpiler/Minifier: esbuild (via Vite) targeting `es2017`
- Language tooling: TypeScript 5
- CSS tooling: TailwindCSS 4, PostCSS + Autoprefixer
- Custom Vite plugins (in `vite.firefox-mv2.config.ts`) to write MV2 `manifest.json`, wrap output for CommonJS, and adjust HTML
- No obfuscators. Minification is size-only and allowed per Mozilla policy.

## Third‑party libraries (primary)
- React, ReactDOM — https://react.dev/
- Vite — https://vitejs.dev/
- esbuild — https://esbuild.github.io/
- Rollup — https://rollupjs.org/
- TypeScript — https://www.typescriptlang.org/
- Tailwind CSS — https://tailwindcss.com/
- PostCSS — https://postcss.org/
- Autoprefixer — https://github.com/postcss/autoprefixer
- webextension‑polyfill — https://github.com/mozilla/webextension-polyfill
- @crxjs/vite-plugin — https://github.com/crxjs/chrome-extension-tools
(Full list in `package.json`)

## Reproducible build (single command)
Preferred: run the provided script which encapsulates all steps and produces metadata/checksums.

```bash
bash scripts/build-firefox-mv2.sh
```

## Manual build instructions (equivalent to the script)
```bash
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

# Expected output
#   dist-firefox-mv2/
#     manifest.json
#     background.js
#     content/*.js
#     assets/*.js
#     src/popup/index.html, src/options/index.html (rewritten by plugin)
#     BUILD_INFO.txt

# Optional: list checksums for diffing (deterministic ordering)
CHKTOOL=$(command -v sha256sum || command -v shasum)
if [ "${CHKTOOL##*/}" = "shasum" ]; then ARGS="-a 256"; else ARGS=""; fi
( cd dist-firefox-mv2 && find . -type f -print0 | sort -z | xargs -0 ${CHKTOOL} ${ARGS} ) > dist-firefox-mv2.SHA256
```

## Optional verification against submitted XPI
Use the helper script to compare the freshly built output with your submitted `.xpi`:

```bash
bash scripts/verify-dist-match.sh /path/to/submitted.xpi
```

This extracts the XPI, generates ordered SHA256 sums, and diffs against the local `dist-firefox-mv2` output. No differences should be observed.

## Notes for reviewers
- The Firefox MV2 build is driven by `vite.firefox-mv2.config.ts` and emits CommonJS output tailored for MV2.
- Custom plugins in that file post-process the bundle to write `manifest.json`, wrap JS files for MV2 compatibility, and update HTML script tags.
- The resulting `dist-firefox-mv2` contents should match the submitted add-on exactly when compared with a binary diff.


