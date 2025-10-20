#!/bin/bash
# Firefox Build Validation Script
# Validates that the Firefox MV2 build has all required dependencies and correct structure

set -euo pipefail

DIST_PATH="dist-firefox-mv2"
MANIFEST_PATH="$DIST_PATH/manifest.json"
POPUP_PATH="$DIST_PATH/src/popup/index.html"
OPTIONS_PATH="$DIST_PATH/src/options/index.html"
ASSETS_PATH="$DIST_PATH/assets"

echo "🔍 Validating Firefox build..."

# Check if dist directory exists
if [ ! -d "$DIST_PATH" ]; then
    echo "❌ Firefox build directory not found: $DIST_PATH"
    echo "   Run 'npm run build:firefox' first"
    exit 1
fi

# Validate manifest structure
echo "📋 Checking manifest.json..."
if [ ! -f "$MANIFEST_PATH" ]; then
    echo "❌ Manifest file not found: $MANIFEST_PATH"
    exit 1
fi

# Check manifest JSON structure
if ! jq -e '.background.scripts | length > 1' "$MANIFEST_PATH" > /dev/null; then
    echo "❌ Background scripts missing dependencies"
    echo "   Expected: multiple scripts, got: $(jq -r '.background.scripts | length' "$MANIFEST_PATH")"
    exit 1
fi

# Check manifest version
MANIFEST_VERSION=$(jq -r '.manifest_version' "$MANIFEST_PATH")
if [ "$MANIFEST_VERSION" != "2" ]; then
    echo "❌ Wrong manifest version: $MANIFEST_VERSION (expected: 2)"
    exit 1
fi

# Check background scripts contain required dependencies
BACKGROUND_SCRIPTS=$(jq -r '.background.scripts[]' "$MANIFEST_PATH")
if ! echo "$BACKGROUND_SCRIPTS" | grep -q "partners-config"; then
    echo "❌ Missing partners-config in background scripts"
    exit 1
fi

if ! echo "$BACKGROUND_SCRIPTS" | grep -q "i18n"; then
    echo "❌ Missing i18n in background scripts"
    exit 1
fi

if ! echo "$BACKGROUND_SCRIPTS" | grep -q "platform"; then
    echo "❌ Missing platform in background scripts"
    exit 1
fi

if ! echo "$BACKGROUND_SCRIPTS" | grep -q "background.js"; then
    echo "❌ Missing background.js in background scripts"
    exit 1
fi

# Check script loading order (dependencies before background.js)
BACKGROUND_INDEX=$(echo "$BACKGROUND_SCRIPTS" | grep -n "background.js" | cut -d: -f1)
PARTNERS_INDEX=$(echo "$BACKGROUND_SCRIPTS" | grep -n "partners-config" | cut -d: -f1)

if [ "$PARTNERS_INDEX" -ge "$BACKGROUND_INDEX" ]; then
    echo "❌ Incorrect script loading order: partners-config should load before background.js"
    exit 1
fi

# Validate popup HTML
echo "🖥️  Checking popup HTML..."
if [ ! -f "$POPUP_PATH" ]; then
    echo "❌ Popup HTML not found: $POPUP_PATH"
    exit 1
fi

# Check for format chunk in popup HTML
if ! grep -q "assets/format-" "$POPUP_PATH"; then
    echo "❌ Format chunk missing from popup HTML"
    exit 1
fi

# Check for required dependency scripts in popup
REQUIRED_POPUP_SCRIPTS=("platform" "i18n" "format" "OnboardingComponent" "popup")
for script in "${REQUIRED_POPUP_SCRIPTS[@]}"; do
    if ! grep -q "assets/$script-" "$POPUP_PATH"; then
        echo "❌ Missing $script chunk in popup HTML"
        exit 1
    fi
done

# Check that scripts use defer attribute
SCRIPT_LINES=$(grep '<script' "$POPUP_PATH" | wc -l)
DEFER_LINES=$(grep '<script.*defer' "$POPUP_PATH" | wc -l)

if [ "$SCRIPT_LINES" -ne "$DEFER_LINES" ]; then
    echo "❌ Not all scripts use defer attribute in popup HTML"
    exit 1
fi

# Validate options HTML
echo "⚙️  Checking options HTML..."
if [ ! -f "$OPTIONS_PATH" ]; then
    echo "❌ Options HTML not found: $OPTIONS_PATH"
    exit 1
fi

# Check for required scripts in options
REQUIRED_OPTIONS_SCRIPTS=("platform" "i18n" "OnboardingComponent" "options")
for script in "${REQUIRED_OPTIONS_SCRIPTS[@]}"; do
    if ! grep -q "assets/$script-" "$OPTIONS_PATH"; then
        echo "❌ Missing $script chunk in options HTML"
        exit 1
    fi
done

# Validate asset files
echo "📦 Checking asset files..."
if [ ! -d "$ASSETS_PATH" ]; then
    echo "❌ Assets directory not found: $ASSETS_PATH"
    exit 1
fi

# Check for required chunks
REQUIRED_ASSETS=("partners-config" "i18n" "platform" "format" "OnboardingComponent" "popup" "options")
for asset in "${REQUIRED_ASSETS[@]}"; do
    if ! ls "$ASSETS_PATH"/*"$asset"*.js > /dev/null 2>&1; then
        echo "❌ Missing asset: $asset"
        exit 1
    fi
done

# Check background.js exists
if [ ! -f "$DIST_PATH/background.js" ]; then
    echo "❌ Background script not found: $DIST_PATH/background.js"
    exit 1
fi

# Check content scripts exist
CONTENT_PATH="$DIST_PATH/content"
if [ ! -d "$CONTENT_PATH" ]; then
    echo "❌ Content scripts directory not found: $CONTENT_PATH"
    exit 1
fi

REQUIRED_CONTENT_SCRIPTS=("checkout.js" "entrance.js" "injector.js" "oc-panel.js" "relay.js")
for script in "${REQUIRED_CONTENT_SCRIPTS[@]}"; do
    if [ ! -f "$CONTENT_PATH/$script" ]; then
        echo "❌ Missing content script: $script"
        exit 1
    fi
done

# Check file sizes are reasonable
BACKGROUND_SIZE=$(stat -f%z "$DIST_PATH/background.js" 2>/dev/null || stat -c%s "$DIST_PATH/background.js" 2>/dev/null)
if [ "$BACKGROUND_SIZE" -lt 100000 ]; then
    echo "❌ Background script too small: ${BACKGROUND_SIZE} bytes (expected > 100KB)"
    exit 1
fi

if [ "$BACKGROUND_SIZE" -gt 2000000 ]; then
    echo "❌ Background script too large: ${BACKGROUND_SIZE} bytes (expected < 2MB)"
    exit 1
fi

# Check for potential issues in built files
echo "🔍 Checking for potential issues..."

# Check for undefined function references
if grep -r "is not a function" "$DIST_PATH" > /dev/null 2>&1; then
    echo "⚠️  Warning: Found 'is not a function' references in build files"
fi

# Check for missing module references
if grep -r "Cannot find module" "$DIST_PATH" > /dev/null 2>&1; then
    echo "⚠️  Warning: Found 'Cannot find module' references in build files"
fi

echo "✅ Firefox build validation passed"
echo "   - Manifest structure: OK"
echo "   - Popup HTML: OK"
echo "   - Options HTML: OK"
echo "   - Asset files: OK"
echo "   - Content scripts: OK"
echo "   - File sizes: OK"
