# Safari iOS Extension Testing Guide

## 🧪 **Standalone Testing (Without App Groups)**

This guide shows how to test the Safari extension in isolation before integrating with your React Native app.

### **Step 1: Open Xcode Project**

```bash
cd /Users/jochem/woolsocks-extension
open safari-extension/WoolsocksExtension.xcodeproj
```

### **Step 2: Configure Signing**

1. Select the **WoolsocksExtension** project in Xcode
2. Select the **WoolsocksExtension** target (main app)
3. Go to **Signing & Capabilities**
4. Set your **Team** (Apple Developer account)
5. Change **Bundle Identifier** to something unique like `com.yourname.woolsocks.extension.test`

6. Select the **WoolsocksExtension** target (extension)
7. Go to **Signing & Capabilities** 
8. Set your **Team** (same as above)
9. Change **Bundle Identifier** to `com.yourname.woolsocks.extension.test.extension`

### **Step 3: Build and Run**

1. Select **iOS Simulator** as target device
2. Press **Cmd+R** to build and run
3. The app will install and show a simple screen with instructions

### **Step 4: Enable Extension in Safari**

1. Open **Safari** on the simulator
2. Go to **Settings** → **Safari** → **Extensions**
3. Find **"Woolsocks Extension"** and toggle it **ON**
4. Grant permissions when prompted

### **Step 5: Test Extension Functionality**

#### **Test Checkout Detection:**
1. Open Safari and visit: `https://www.amazon.com`
2. Add items to cart and go to checkout
3. The extension should detect the checkout and show UI overlays
4. Check browser console for debug messages

#### **Test Cashback Activation:**
1. Visit a partner merchant site (e.g., `https://www.bol.com`)
2. The extension should show cashback activation UI
3. Try clicking buttons and interacting with the UI

#### **Test UI Components:**
- **Shadow DOM**: UI should be isolated from page styles
- **Positioning**: Panels should appear in corners and be draggable
- **Responsive**: UI should adapt to mobile viewport
- **Touch**: Buttons should be touch-friendly

### **Step 6: Debug and Monitor**

#### **Safari Web Inspector:**
1. On Mac: **Safari** → **Develop** → **[Simulator]** → **Web Inspector**
2. Check **Console** for extension messages
3. Look for `[Woolsocks]` prefixed debug messages

#### **Xcode Console:**
1. In Xcode, go to **Window** → **Devices and Simulators**
2. Select your simulator
3. Click **Open Console** to see system logs

### **Expected Behavior**

✅ **Working Features:**
- Extension loads without errors
- Content scripts inject into pages
- Checkout detection works on major sites
- Cashback UI appears on partner sites
- Shadow DOM styling is isolated
- Touch interactions work smoothly

⚠️ **Known Limitations (Without App Groups):**
- No data sharing with React Native app
- Voucher URLs point to woolsocks.eu (not app deeplinks)
- No user authentication state sharing
- No persistent data between extension and app

### **Troubleshooting**

#### **Extension Not Loading:**
- Check bundle identifiers are unique
- Verify signing certificates
- Restart Safari and re-enable extension

#### **Content Scripts Not Injecting:**
- Check manifest.json permissions
- Verify target URLs in content_scripts
- Look for CSP (Content Security Policy) errors

#### **UI Not Appearing:**
- Check Shadow DOM support
- Verify CSS is loading correctly
- Look for JavaScript errors in console

#### **Touch Issues:**
- Test on physical device (simulator touch can be flaky)
- Check button sizes (should be 44pt+ for touch)
- Verify event listeners are attached

### **Next Steps**

Once standalone testing works:

1. **Add App Groups Integration**
   - Create App Group in Apple Developer Portal
   - Add entitlements to both targets
   - Test data sharing between extension and app

2. **Replace Voucher URLs with Deeplinks**
   - Update voucher URLs to use `woolsocks://` scheme
   - Handle deeplink routing in React Native app
   - Test voucher purchase flow

3. **Integrate with React Native App**
   - Add extension target to existing Xcode project
   - Test full integration on device
   - Prepare for App Store submission

### **Testing Checklist**

- [ ] Extension builds without errors
- [ ] Extension appears in Safari Settings
- [ ] Extension can be enabled/disabled
- [ ] Content scripts inject on target sites
- [ ] Checkout detection works on major merchants
- [ ] Cashback UI appears on partner sites
- [ ] UI is touch-friendly and responsive
- [ ] Shadow DOM styling is isolated
- [ ] No JavaScript errors in console
- [ ] Extension works on both simulator and device

### **Performance Notes**

- **Memory**: Extension should use minimal memory
- **Battery**: Background scripts should be efficient
- **Network**: API calls should be optimized
- **UI**: Animations should be smooth (60fps)

---

**Ready for App Groups integration?** Once standalone testing is successful, we can proceed with the full React Native integration! 🚀
