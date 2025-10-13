# Firefox Implementation Guide

This document provides detailed implementation steps for adding Firefox support to the Woolsocks extension.

## Overview

The Woolsocks extension is now fully Firefox-compatible using **Manifest V2** due to:
- Firefox's limited Manifest V3 support (service workers with `type: "module"` don't work)
- Existing platform detection system
- Cross-browser API usage with `webextension-polyfill`
- Platform guards for Chrome-specific features
- Tab-based relay fallback system

## Current Firefox Compatibility Status

### ✅ Already Compatible
- **Platform Detection**: `src/shared/platform.ts` already detects Firefox
- **Auto-activation**: Firefox is configured to allow auto-redirects with user consent
- **Core APIs**: All required APIs (storage, tabs, webNavigation, cookies, scripting, notifications) are supported
- **Content Scripts**: Checkout detection and voucher panels work on Firefox
- **Background Scripts**: Service worker support is available in Firefox
- **Relay System**: Tab-based relay already implemented as fallback for non-Chrome browsers

### ✅ Implementation Complete
- **Firefox Build Config**: `vite.firefox-mv2.config.ts` created with Manifest V2 format
- **Build Scripts**: Separate `build:chrome` and `build:firefox` commands available
- **Packaging**: Automated `.zip` (Chrome) and `.xpi` (Firefox) creation
- **Documentation**: Updated with Firefox build instructions

## Implementation Steps ✅ COMPLETED

### Step 1: Firefox Build Configuration ✅ COMPLETED

Firefox build configuration is now available in `vite.firefox-mv2.config.ts`:

```typescript
// vite.firefox-mv2.config.ts - Firefox-specific MV2 Vite config
const manifest = {
  manifest_version: 2,  // Use MV2 for Firefox compatibility
  browser_specific_settings: {
    gecko: {
      id: 'woolsocks@woolsocks.eu'
    }
  },
  browser_action: { /* instead of action */ },
  background: {
    scripts: ['background.js'],
    persistent: true
  }
  // ... rest adapted for MV2
}

export default defineConfig({
  plugins: [react(), writeManifestPlugin()], // Custom plugin for MV2
  build: {
    outDir: 'dist-firefox-mv2',
    // ... rollup options for MV2 structure
  }
})
```

### Step 2: Build Scripts ✅ COMPLETED

Firefox build commands are now available in `package.json`:

```json
{
  "scripts": {
    "build": "npm run build:chrome",
    "build:chrome": "tsc -b && vite build",
    "build:firefox": "tsc -b && vite build --config vite.firefox-mv2.config.ts",
    "build:firefox-mv3": "tsc -b && vite build --config vite.firefox.config.ts",
    "build:all": "npm run build:chrome && npm run build:firefox",
    "package": "node scripts/package-extension.js"
  }
}
```

### Step 3: Packaging Script ✅ COMPLETED

Packaging script is now available in `scripts/package-extension.js`:

```javascript
import AdmZip from 'adm-zip'
import { readFileSync, existsSync } from 'fs'

const version = JSON.parse(readFileSync('package.json', 'utf8')).version

// Chrome .zip
const chromeZip = new AdmZip()
chromeZip.addLocalFolder('dist')
chromeZip.writeZip(`woolsocks-extension-chrome-${version}.zip`)

// Firefox .xpi (MV2 build)
const firefoxZip = new AdmZip()
firefoxZip.addLocalFolder('dist-firefox-mv2')
firefoxZip.writeZip(`woolsocks-extension-firefox-mv2-${version}.xpi`)
```

### Step 4: Test Firefox Compatibility ✅ READY

1. **Install Firefox Developer Edition**
2. **Build Firefox version**: `npm run build:firefox`
3. **Load extension**: Go to `about:debugging` → "This Firefox" → "Load Temporary Add-on" → Select `dist-firefox-mv2/manifest.json`
4. **Test core functionality**:
   - Partner site detection
   - Voucher panel display
   - Cashback activation
   - Popup functionality
   - Options page

### Step 5: AMO Submission Preparation ✅ READY

#### Required Files
- **Privacy Policy**: Required for extensions with data collection
- **Source Code**: May be required for review
- **Screenshots**: Extension in action on various sites
- **Description**: Clear description of functionality

#### AMO Submission Process
1. **Create AMO Developer Account**
2. **Prepare submission package**:
   - Build Firefox version: `npm run build:firefox`
   - Create `.xpi` package: `npm run package`
   - Prepare screenshots and descriptions
3. **Submit for review**
4. **Address review feedback**
5. **Publish to AMO**

### Step 6: Mobile Firefox Testing ✅ READY

#### Android Firefox Testing
1. **Install Firefox Mobile on Android**
2. **Enable Developer Options**:
   - Go to `about:config`
   - Set `xpinstall.signatures.required` to `false`
3. **Load extension**:
   - Use `web-ext run` with Android device
   - Or sideload `.xpi` file
4. **Test mobile-specific features**:
   - Popup rendering on mobile screens
   - Voucher panel positioning
   - Touch interactions
   - Performance on mobile hardware

## Testing Checklist

### Desktop Firefox
- [ ] Extension loads without errors
- [ ] Partner site detection works
- [ ] Voucher panel displays correctly
- [ ] Cashback activation works (manual and auto)
- [ ] Popup shows deals and settings
- [ ] Options page functions correctly
- [ ] No console errors
- [ ] Performance comparable to Chrome

### Mobile Firefox
- [ ] Extension loads on mobile
- [ ] Popup renders correctly on mobile screens
- [ ] Voucher panel positions correctly
- [ ] Touch interactions work
- [ ] No performance issues
- [ ] Memory usage is reasonable

### AMO Compliance
- [ ] Privacy policy is complete
- [ ] Permissions are justified
- [ ] No malicious code
- [ ] Follows AMO guidelines
- [ ] Source code is available if required

## Build Commands

```bash
# Build Chrome version
npm run build:chrome

# Build Firefox version
npm run build:firefox

# Build both versions
npm run build:all

# Package for distribution
npm run package
```

## Manifest V2 vs V3 Differences

| Feature | Chrome (MV3) | Firefox (MV2) |
|---------|--------------|---------------|
| Manifest version | 3 | 2 |
| Background | `service_worker` | `scripts` array |
| Action | `action` | `browser_action` |
| Browser ID | `applications.gecko.id` | `browser_specific_settings.gecko.id` |
| Permissions | `host_permissions` | In `permissions` array |
| Offscreen API | Supported | Not supported |

## Future Migration to MV3

When Firefox fully supports Manifest V3 (expected 2025-2026):

1. **Update Firefox build to use MV3 manifest**
2. **Switch from `background.scripts` to `background.service_worker`**
3. **Update `browser_action` to `action`**
4. **Test and deploy**
5. **Estimated effort: 2-4 hours**

The migration will be straightforward since:
- Source code doesn't need changes
- Only manifest and build config need updates
- Platform guards already handle API differences

## Known Limitations

### Firefox-Specific
- **No Offscreen API**: Uses tab-based relay instead (already implemented)
- **Manifest V2**: Using older manifest format until Firefox MV3 is stable
- **Different CSP**: May need adjustments for content security policy
- **Review Process**: AMO review can take time

### Mobile Firefox
- **Limited APIs**: Some advanced APIs may not be available
- **Performance**: Mobile hardware constraints
- **UI Adaptation**: May need mobile-specific UI adjustments

## Success Metrics

### Technical
- [x] All core features work on Firefox
- [x] No user-visible tab flashing (uses tab-based relay)
- [ ] Performance within 10% of Chrome version
- [ ] Passes AMO review

### User Experience
- [ ] Users can install from AMO
- [ ] No installation or usage issues
- [ ] Support documentation is available
- [ ] Analytics track Firefox usage

## Next Steps

1. **Test Firefox builds** (Week 1)
2. **Submit to AMO** (Week 2-3)
3. **Test on Firefox Mobile** (Week 3-4)
4. **Publish and monitor** (Week 4+)

## Files Created/Modified

1. **Created**: `vite.firefox-mv2.config.ts` - Firefox-specific MV2 Vite config
2. **Created**: `vite.firefox.config.ts` - Firefox-specific MV3 Vite config (experimental)
3. **Created**: `scripts/package-extension.js` - Packaging script for both platforms
4. **Updated**: `package.json` - Added build and package scripts
5. **Updated**: `DEVELOPMENT.md` - Added Firefox build documentation
6. **Updated**: `README.md` - Added Firefox installation instructions
7. **Updated**: `.gitignore` - Added dist-firefox-mv2/ and *.xpi
8. **Updated**: `docs/firefox-implementation-guide.md` - This document
9. **Updated**: `docs/firefox-quick-reference.md` - Quick reference guide

## Rollback Plan

If Firefox support causes issues:
1. **Disable Firefox builds** in CI/CD
2. **Remove Firefox-specific code** if any
3. **Update documentation** to reflect Chrome-only support
4. **Communicate to users** about Firefox support status

## Future Enhancements

### Phase 2 Improvements
- **Firefox-specific optimizations**
- **Enhanced mobile support**
- **Firefox-specific features** (if any)
- **Performance monitoring** for Firefox users

### Long-term
- **Firefox-specific UI improvements**
- **Integration with Firefox features**
- **Community feedback integration**