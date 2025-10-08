# Safari iOS Extension Setup Guide

This guide explains how to set up the Safari iOS extension for integration with your React Native app.

## Overview

The Safari extension enables checkout detection and voucher reminders on iOS Safari, communicating with your React Native app via App Groups.

## Build System

The project now supports building for both Chrome desktop and Safari iOS from the same codebase:

```bash
# Build Chrome version (desktop)
npm run build:chrome

# Build Safari version (iOS)
npm run build:safari

# Build Safari Xcode project
npm run build:safari-xcode

# Build both versions
npm run build:all
```

## Safari Extension Setup

### 1. Build the Safari Extension

```bash
npm run build:safari-xcode
```

This creates a complete Safari extension project in `safari-extension/` with:
- Xcode project file
- App target (container)
- Extension target (your web extension)
- Proper Info.plist files
- App Transport Security configuration

### 2. Configure App Groups

**In Apple Developer Portal:**
1. Go to Certificates, Identifiers & Profiles
2. Create a new App Group: `group.com.woolsocks.shared`
3. Add both your main app and extension to this group

**In Xcode:**
1. Open `safari-extension/Woolsocks.xcodeproj`
2. Select the main app target → Signing & Capabilities → + Capability → App Groups
3. Check `group.com.woolsocks.shared`
4. Select the extension target → Signing & Capabilities → + Capability → App Groups
5. Check `group.com.woolsocks.shared`

### 3. Bundle Identifiers

Update bundle identifiers in Xcode:
- Main app: `com.woolsocks.app`
- Extension: `com.woolsocks.app.extension`

### 4. Integration with React Native App

Copy the native module files to your React Native project:

```bash
# Copy to your React Native project
cp ios/WoolsocksAppGroups.swift /path/to/your/rn-project/ios/
cp ios/WoolsocksAppGroups.m /path/to/your/rn-project/ios/
cp ios/WoolsocksAppGroups.js /path/to/your/rn-project/
```

Add to your React Native app's Xcode project:
1. Drag the Swift and Objective-C files into your iOS project
2. Add the JavaScript file to your React Native bundle
3. Configure App Groups for your main app target

### 5. React Native Integration

In your React Native app:

```javascript
import WoolsocksAppGroups from './WoolsocksAppGroups';

// Poll for checkout events
setInterval(async () => {
  try {
    const checkoutData = await WoolsocksAppGroups.readCheckoutData();
    if (checkoutData.merchant) {
      showVoucherReminder(checkoutData.merchant, checkoutData.cartValue);
    }
  } catch (error) {
    console.log('Error reading checkout data:', error);
  }
}, 2000);

// Write user token to App Groups
WoolsocksAppGroups.writeUserToken(userAuthToken);
```

## App Groups Communication

The extension automatically writes to App Groups when:
- Checkout is detected (`checkout_detected` key)
- Cashback deals are found (`cashback_event` key)
- Cashback is activated (`cashback_event` with `activated: true`)

Your React Native app can read this data and show appropriate UI.

## Testing

### iOS Simulator
1. Build and run the Safari extension in Xcode
2. Open Safari on simulator
3. Go to Settings → Safari → Extensions → Enable Woolsocks
4. Navigate to a partner merchant
5. Verify checkout detection works
6. Switch to your React Native app and verify data appears

### Physical Device
1. Connect iPhone via USB
2. Build to device (requires Apple Developer account)
3. Enable extension in Settings → Safari → Extensions
4. Test real merchant checkouts

## App Store Submission

### Privacy Requirements
- Add privacy manifest explaining extension permissions
- Provide privacy policy URL
- Explain why you need `<all_urls>` permission (checkout detection)

### App Review Notes
Include in your App Store submission:
- Extension detects checkouts to remind users about vouchers
- Requires Safari extension permission (user must enable in Settings)
- Demo video showing extension in action

### Bundle Structure
Your final app bundle will contain:
```
Woolsocks.app/
├── Woolsocks (main React Native app)
├── PlugIns/
│   └── WoolsocksExtension.appex (Safari extension)
└── Frameworks/
```

## Troubleshooting

### Extension Not Appearing
- Check bundle identifiers match
- Verify App Groups are configured
- Ensure extension target is included in main app

### App Groups Not Working
- Verify App Group ID matches exactly: `group.com.woolsocks.shared`
- Check both targets have App Groups capability
- Ensure Apple Developer account has App Groups enabled

### Build Errors
- Clean build folder in Xcode
- Check deployment target is iOS 15.0+
- Verify all required files are included in targets

## File Structure

```
woolsocks-extension/
├── manifests/
│   ├── chrome.json          # Chrome manifest
│   └── safari.json          # Safari manifest (no webRequest)
├── vite.chrome.config.ts    # Chrome build config
├── vite.safari.config.ts    # Safari build config
├── safari-extension/        # Generated Safari Xcode project
├── ios/                     # React Native native modules
└── scripts/
    └── build-safari.sh      # Safari build script
```

## Key Differences: Chrome vs Safari

| Feature | Chrome | Safari |
|---------|--------|--------|
| webRequest | ✅ Full support | ❌ Limited (removed from manifest) |
| App Groups | ❌ Not available | ✅ Full support |
| Background | Service Worker | Service Worker (limited) |
| Permissions | Full MV3 | MV3 with restrictions |
| Distribution | Chrome Web Store | App Store (bundled) |
