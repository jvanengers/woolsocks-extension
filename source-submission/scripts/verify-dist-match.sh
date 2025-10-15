#!/usr/bin/env bash
set -euo pipefail

XPI_PATH=${1:?-"Usage: $0 path/to/submitted.xpi"}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

unzip -qq "$XPI_PATH" -d "$TMP/xpi"

# Compute ordered SHA256 for XPI contents
( cd "$TMP/xpi" && find . -type f -print0 | sort -z | xargs -0 shasum -a 256 ) > "$TMP/xpi.SHA256"

# Compute ordered SHA256 for local build
( cd dist-firefox-mv2 && find . -type f -print0 | sort -z | xargs -0 shasum -a 256 ) > "$TMP/dist.SHA256"

diff -u "$TMP/xpi.SHA256" "$TMP/dist.SHA256"
echo "✅ Checksums match"

