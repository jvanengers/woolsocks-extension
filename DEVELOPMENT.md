# Development Guide

This document provides detailed information for developers working on the Woolsocks browser extension.

## 🏗️ Architecture Overview

### Extension Components

#### Background Script (Service Worker)
- **File**: `src/background/index.ts`
- **Purpose**: Core extension logic and coordination
- **Key Functions**:
  - `evaluateTab()`: Determines if a tab is a supported partner
  - `showVoucherOffer()`: Injects voucher dialog into webpage
  - `setIconState()`: Updates extension icon based on state

#### Content Script
- **File**: `src/content/checkout.ts`
- **Purpose**: Detects checkout pages and extracts order data
- **Key Functions**:
  - Partner-specific checkout detection
  - DOM monitoring for dynamic content
  - Order total extraction

#### Popup Interface
- **File**: `src/popup/main.tsx`
- **Purpose**: User interface for extension management
- **Features**: Login, settings, profile access

#### Options Page
- **File**: `src/options/main.tsx`
- **Purpose**: Extension configuration and settings

## 🔧 Development Setup

### Prerequisites
```bash
# Node.js version requirement
node --version  # Should be 20.19+ or 22.12+

# Package manager
npm --version   # or yarn --version
```

### Installation
```bash
# Clone repository
git clone <repository-url>
cd woolsocks-extension

# Install dependencies
npm install

# Build extension
npm run build
```

### Development Workflow

1. **Make Changes**: Edit source files in `src/`
2. **Build**: Run `npm run build`
3. **Test**: Load `dist/` folder in Chrome as unpacked extension
4. **Debug**: Use Chrome DevTools for debugging

## 📁 File Structure Details

```
src/
├── background/
│   └── index.ts              # Main background script
├── content/
│   └── checkout.ts           # Checkout detection logic
├── popup/
│   ├── main.tsx             # Popup React component
│   └── index.html           # Popup HTML template
├── options/
│   ├── main.tsx             # Options React component
│   └── index.html           # Options HTML template
├── shared/
│   ├── partners.ts          # Partner configurations
│   └── types.ts             # TypeScript type definitions
├── integrations/
│   └── supabase/            # Database integration
│       ├── client.ts        # Supabase client setup
│       └── types.ts         # Database types
└── lib/
    └── utils.ts             # Utility functions
```

## 🎯 Adding New Partners

### Step 1: Partner Configuration

Add to `src/shared/partners.ts`:

```typescript
const newPartner = {
  name: 'Partner Name',
  domain: 'partner.com',
  logo: 'partner-logo.png',
  
  // Checkout page detection
  isCheckoutPage: (url: string, document: Document) => {
    // Return true if this is a checkout/cart page
    return url.includes('/checkout') || 
           url.includes('/cart') ||
           document.querySelector('.checkout-container') !== null;
  },
  
  // Extract order total from page
  extractTotal: (document: Document) => {
    const totalElement = document.querySelector('.total-price');
    if (totalElement) {
      const text = totalElement.textContent || '';
      const match = text.match(/€?\s*(\d+[,.]?\d*)/);
      return match ? parseFloat(match[1].replace(',', '.')) : null;
    }
    return null;
  },
  
  // Voucher configuration (optional)
  vouchers: [
    {
      voucherId: 'partner-gift-card',
      name: 'Partner Gift Card',
      cashbackRate: 3,
      minAmount: 1,
      maxAmount: 1000,
      validityDays: 365,
      howToUse: 'Enter code at checkout',
      conditions: 'Valid for all products'
    }
  ]
};
```

### Step 2: Test Implementation

1. Build extension: `npm run build`
2. Load in Chrome
3. Visit partner website
4. Navigate to checkout page
5. Verify dialog appears with correct information

### Step 3: Handle Edge Cases

- Dynamic content loading
- Multiple checkout steps
- Mobile vs desktop layouts
- Different language versions

## 🎨 UI Development

### Voucher Dialog Styling

The voucher dialog uses inline CSS for reliability:

```typescript
const dialogStyles = `
  position: fixed;
  top: 20px;
  right: 20px;
  width: 310px;
  height: 602px;
  background: #FDC408;
  border-radius: 16px;
  box-shadow: -2px 2px 4px rgba(0,0,0,0.08);
  z-index: 10000;
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
`;
```

### Animation Implementation

```typescript
// Appear animation
setTimeout(() => {
  dialog.style.opacity = '1';
  dialog.style.transform = 'scale(1) translateY(0)';
}, 10);

// Hide animation
dialog.style.opacity = '0';
dialog.style.transform = 'scale(0.95) translateY(-10px)';
setTimeout(() => dialog.remove(), 300);
```

## 🔍 Debugging

### Console Logging

Key debug messages to look for:

```javascript
// Background script
console.log('Creating new voucher prompt');
console.log('Close button clicked!');
console.log('Global close function called');

// Content script
console.log('Checking for checkout page');
console.log('Order total extracted:', total);
```

### Chrome DevTools

1. **Background Script**: Go to `chrome://extensions/` → Inspect views → Background page
2. **Content Script**: Right-click on webpage → Inspect → Console tab
3. **Popup**: Right-click extension icon → Inspect popup

### Common Issues

#### Dialog Not Appearing
- Check if partner is in supported list
- Verify checkout detection logic
- Look for JavaScript errors in console

#### Animation Issues
- Ensure CSS transitions are supported
- Check for conflicting styles
. Verify timing functions

#### Performance Problems
- Monitor DOM observation frequency
- Check for memory leaks
- Optimize event listener cleanup

## 🧪 Testing

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Partner websites are detected correctly
- [ ] Checkout pages trigger dialog
- [ ] Dialog animations work smoothly
- [ ] Amount input functions properly
- [ ] Close button works reliably
- [ ] No duplicate dialogs appear
- [ ] Memory usage remains stable

### Test Websites

Use these test scenarios:

1. **Amazon.nl**: Add item to cart → proceed to checkout
2. **Zalando**: Add clothing → go to cart
3. **Bol.com**: Add item → checkout process
4. **MediaMarkt**: Add electronics → cart page

### Automated Testing

Consider implementing:
- Unit tests for partner detection logic
- Integration tests for dialog functionality
- E2E tests for complete user flows

## 🚀 Performance Optimization

### Best Practices

1. **Throttle DOM Observations**:
```typescript
const throttledObserver = throttle(() => {
  // Expensive DOM operations
}, 500);
```

2. **Clean Up Resources**:
```typescript
// Remove event listeners
element.removeEventListener('click', handler);

// Clear intervals/timeouts
clearInterval(intervalId);

// Remove DOM elements
element.remove();
```

3. **Minimize DOM Queries**:
```typescript
// Cache frequently accessed elements
const checkoutContainer = document.querySelector('.checkout');

// Use specific selectors
document.querySelector('.total-price') // Better than document.body
```

### Memory Management

- Remove event listeners when dialogs close
- Clear global variables after use
- Avoid memory leaks in long-running scripts

## 📦 Building & Deployment

### Development Build
```bash
npm run build
```

### Production Build
```bash
npm run build:prod
```

### Chrome Web Store Preparation

1. Build production version
2. Test thoroughly
3. Create ZIP file of `dist/` folder
4. Upload to Chrome Web Store Developer Dashboard

### Releasing Updates

Automatic updates: once a new version is approved in the store, existing users will receive it automatically (usually within hours). Developers can force an immediate update locally via `chrome://extensions` → Developer mode → Update.

#### Where to bump the version
- Update the manifest `version` in `vite.config.ts` (CRXJS builds the manifest from here). Optionally add `version_name` for a human-friendly label.

```ts
// vite.config.ts
const manifest = {
  manifest_version: 3,
  name: 'Woolsocks: Cashback & Vouchers',
  version: '1.0.1',
  // version_name: '1.0.1 (hotfix)'
  // ...
}
```

#### Release steps
1. Update `CHANGELOG.md` (move entries from Unreleased to the new version).
2. Bump `version` in `vite.config.ts`.
3. Build: `npm run build`.
4. Verify `dist/manifest.json` reflects the new version.
5. Zip the `dist/` contents.
6. Upload the ZIP to the Chrome Web Store listing, add concise release notes, submit for review.
7. (Optional) Publish the same build to Microsoft Edge Add-ons if supported.
8. Create a git tag for the version.

#### Gotchas and best practices
- Do not set `update_url` when publishing to Chrome Web Store; the store manages updates.
- Keep the extension ID stable: upload new versions to the same store listing (don’t create a new item).
- Permission changes (`permissions`, `host_permissions`) trigger extra review and may prompt users. Prefer `optional_permissions` and request them at runtime.
- Plan storage/data migrations for updates; avoid breaking existing user data.

#### Optional: update hooks and migrations
Use these events in the background service worker to handle migrations and apply updates immediately when they’re ready:

```ts
chrome.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
  if (reason === 'update') {
    // Run storage/schema migrations here based on previousVersion
    // e.g., migrateUserSettings(previousVersion)

    // Optionally open a one-time "What’s new" page for major releases
    // chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html?whats-new=1') })
  }
})

chrome.runtime.onUpdateAvailable.addListener(() => {
  // Apply the new version immediately instead of waiting for the next restart
  chrome.runtime.reload()
})
```

Keep “What’s new” pages rare (only for major updates) to avoid spamming users.

## 🔒 Security Considerations

### Content Security Policy

The extension uses inline styles and scripts. Ensure:
- No eval() usage
- Sanitize user inputs
- Validate external data

### Permissions

Minimize required permissions:
- Only request necessary host permissions
- Use activeTab when possible
- Avoid broad permissions like `<all_urls>`

### Data Handling

- No sensitive data storage
- Local storage only for preferences
- Secure API communications

## 📚 Resources

### Chrome Extension Documentation
- [Chrome Extensions Developer Guide](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/migrating/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### TypeScript Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Chrome Extension Types](https://www.npmjs.com/package/@types/chrome)

### React Resources
- [React Documentation](https://reactjs.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

