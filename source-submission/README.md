# Woolsocks Browser Extension

[![Version](https://img.shields.io/badge/version-0.10.0-blue.svg)](https://github.com/amsterdam-platform-creation/browser-extensions)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://github.com/amsterdam-platform-creation/browser-extensions/workflows/Build%20and%20Test/badge.svg)](https://github.com/amsterdam-platform-creation/browser-extensions/actions)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue.svg)](https://chrome.google.com/webstore)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox%20Add--ons-Install-orange.svg)](https://addons.mozilla.org)

> Automatically earn cashback and discover voucher deals while shopping online. Works seamlessly across Chrome, Firefox, and other browsers.

## ✨ Features

- 🎯 **Automatic Cashback Activation** - Earn cashback on 100+ merchants with one-click activation
- 🎁 **Smart Voucher Discovery** - Find gift card deals automatically at checkout
- 🔒 **Privacy-First** - Local processing, minimal data collection, transparent permissions
- 🌍 **Multi-Browser Support** - Chrome, Firefox, Edge, Brave, and more
- 📱 **Cross-Platform** - Desktop and mobile (Firefox Android)
- 🚀 **Zero Configuration** - Works immediately after install
- 🔄 **Session Recovery** - Seamless login with email verification
- 🌐 **Multi-Country Support** - Works in NL, DE, BE, FR, IT, ES, IE with localized deals

## 🚀 Quick Start

### For Users
1. Install from [Chrome Web Store](#) or [Firefox Add-ons](#)
2. Visit any supported merchant website (e.g., Zalando, Amazon, Bol.com)
3. Extension automatically activates cashback or shows vouchers at checkout

### For Developers
```bash
npm install
npm run build:chrome  # or build:firefox
# Load dist/ folder in chrome://extensions
```

## 📦 Installation

### Chrome / Edge / Brave
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue.svg)](https://chrome.google.com/webstore)

### Firefox
[![Firefox Add-ons](https://img.shields.io/badge/Firefox%20Add--ons-Install-orange.svg)](https://addons.mozilla.org)

### Manual Installation (Development)
1. Clone this repository: `git clone https://github.com/amsterdam-platform-creation/browser-extensions.git`
2. Install dependencies: `npm install`
3. Build the extension: `npm run build:chrome` or `npm run build:firefox`
4. Load the `dist/` folder in your browser:
   - **Chrome**: Go to `chrome://extensions`, enable "Developer mode", click "Load unpacked"
   - **Firefox**: Go to `about:debugging`, click "This Firefox", click "Load Temporary Add-on"

## 🎯 How It Works

1. **Merchant Detection** - Automatically recognizes 100+ supported stores as you browse
2. **Cashback Activation** - One-click activation with visible confirmation and countdown
3. **Voucher Discovery** - Shows available gift card deals when you reach checkout
4. **Session Recovery** - Seamless login with email verification (no redirects needed)

## 🌐 Browser Support

| Browser | Status | Version | Notes |
|---------|--------|---------|-------|
| Chrome | ✅ Supported | 88+ | Manifest V3 |
| Firefox | ✅ Supported | 109+ | Manifest V2 |
| Edge | ✅ Supported | 88+ | Chromium-based |
| Safari | 🚧 In Progress | - | See [roadmap](docs/ROADMAP.md) |
| Brave | ✅ Supported | Latest | Chromium-based |

## 📸 Screenshots

*Screenshots coming soon - showing extension popup, voucher panel, and cashback activation*

## 🔧 Development

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn

### Build Commands
```bash
npm run build:chrome      # Chrome/Edge build
npm run build:firefox     # Firefox build
npm run build:all         # Both platforms
npm run package           # Create distribution packages
```

### Project Structure
```
src/
├── background/          # Service worker & core logic
│   ├── index.ts         # Main background script
│   ├── api.ts           # API client with site-proxy
│   ├── analytics.ts     # GA4 Measurement Protocol
│   └── online-cashback.ts # Cashback activation flow
├── content/             # Page interaction scripts
│   ├── checkout.ts      # Checkout detection
│   └── relay.ts         # Woolsocks.eu relay
├── popup/               # Extension popup UI
├── options/             # Settings page
└── shared/              # Shared utilities
    ├── i18n.ts          # Internationalization
    ├── types.ts         # TypeScript definitions
    └── cache.ts         # Caching system
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development documentation.

## 🧪 Testing

See [TESTING.md](TESTING.md) for comprehensive testing guide.

### Quick Smoke Test
1. Visit [Zalando.nl](https://zalando.nl) and add items to cart
2. Navigate to checkout - voucher panel should appear
3. Visit [Amazon.nl](https://amazon.nl) homepage - cashback should activate

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Contribution Guide
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Submit a pull request

## 📋 Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed roadmap.

**Coming Soon:**
- Safari desktop & iOS support
- Email-only accounts for quick signup
- Enhanced analytics dashboard
- Additional country support
- Real-time blacklists and alternative UX

## 🔐 Privacy & Security

- **No sensitive data collection** - Only public page content analysis for merchant detection
- **Local processing** - All detection happens in your browser, not on our servers
- **Transparent permissions** - Clear justification for each permission (see below)
- **User control** - Disable auto-activation anytime in settings
- **Minimal data** - Only stores necessary user preferences and session info locally

### Permission Justifications

#### Core Functionality Permissions
- **`tabs`** — Detect merchant domains and update URLs on affiliate redirects
- **`webNavigation`** — Detect top-level navigations to trigger cashback flow
- **`cookies`** — Observe Woolsocks session changes for authenticated API calls
- **`storage`** — Store user settings, cooldowns, and cached data locally
- **`scripting`** — Inject minimal UI components only on detected merchant sites
- **`notifications`** — Provide user feedback when cashback activates
- **`offscreen`** — Perform authenticated API calls without visible tab flashes (Chrome only)

#### Host Permissions
- **`https://woolsocks.eu/*`** — Authentication, API communication, session management
- **`https?://*/*`** — Universal merchant detection across all supported sites

*No personal data is collected from visited sites. Only public page content is analyzed locally to detect checkout pages and merchant eligibility.*

## ❓ FAQ

**Q: Does this extension collect my browsing history?**
A: No. We only analyze pages to detect supported merchants. No browsing history is stored or transmitted.

**Q: Why does it need access to all websites?**
A: To detect any merchant that Woolsocks supports (100+ sites). We only activate on supported merchants, never on personal or sensitive sites.

**Q: Can I use it without logging in?**
A: Yes! Browse deals anonymously. Login is only needed to track your earnings and access your balance.

**Q: Which countries are supported?**
A: We support 7 countries: Netherlands (NL), Germany (DE), Belgium (BE), France (FR), Italy (IT), Spain (ES), and Ireland (IE). The extension automatically detects your location and shows relevant deals.

**Q: How does the cashback activation work?**
A: When you visit a supported merchant, the extension shows a visible prompt with countdown. You can cancel anytime. If you proceed, it redirects through an affiliate link to enable cashback tracking.

**Q: What if I don't want automatic activation?**
A: You can disable auto-activation in settings and use manual reminders only, or turn off all prompts entirely.

## 🐛 Troubleshooting

**Extension not detecting merchant:**
- Ensure you're on a supported merchant site
- Check that auto-activation is enabled in settings
- Try refreshing the page
- Check browser console for errors

**Vouchers not showing at checkout:**
- Clear browser cache and reload
- Verify you're on the checkout/cart page (not product page)
- Check that the merchant is supported
- Try disabling other extensions temporarily

**Cashback not activating:**
- Ensure you're logged in to woolsocks.eu
- Check your internet connection
- Verify the merchant is eligible for cashback
- Try the manual activation button in the popup

**Session issues:**
- Clear browser cookies for woolsocks.eu and reload
- Use the session recovery feature in the popup
- Check that cookies are enabled in your browser

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- Built with React, TypeScript, and Vite
- Translations powered by Lokalise
- Icons and assets by Woolsocks design team

## 📞 Support

- 🐛 [Report a bug](https://github.com/amsterdam-platform-creation/browser-extensions/issues)
- 💡 [Request a feature](https://github.com/amsterdam-platform-creation/browser-extensions/issues)
- 📧 [Contact support](mailto:support@woolsocks.eu)
- 📚 [Documentation](docs/)

---

Made with ❤️ by the Woolsocks team