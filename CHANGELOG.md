# Changelog

All notable changes to the Woolsocks Browser Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased
- Online cashback auto-activation on merchant visit (1h per-domain cooldown)
- Country-aware CASHBACK deal filtering (`usageType=ONLINE`)
- Redirect URL via `/rewards/api/v0/rewards/{id}/redirection` (captures `linkUrl` and `clickId`)
- Popup shows "Cashback tracking enabled" with rate, title, and re-activate button
- Settings toggle: Auto-activate online cashback (default ON)
- GA4 analytics via Measurement Protocol with click_id; `oc_activated` recommended as Key event
- Permission update: `webNavigation` added; permission justifications documented in README
- Voucher URLs continue to use `providerReferenceId` (fallbacks: `productId`, `id`, UUID in `links.webLink`)
- **BREAKING**: Removed `alarms` permission and replaced with event-driven cache management
  - Cache cleanup now triggered by tab activation and navigation events (throttled to 1 hour)
  - Cache preload triggered on startup, install, and popup open
  - All functionality preserved while eliminating Chrome Web Store review blocker

## [1.0.0] - 2024-01-XX

### Added
- Initial release of Woolsocks Browser Extension
- Support for 8 major Dutch e-commerce websites:
  - Amazon.nl
  - Zalando
  - Bol.com
  - MediaMarkt
  - Coolblue
  - H&M
  - Wehkamp
  - IKEA
- Voucher dialog with smooth animations
- Real-time cashback calculations
- Smart checkout page detection
- Amount input with validation
- Close button functionality
- Professional UI design
- Extension popup interface
- Options page for configuration

### Features
- **Automatic Partner Detection**: Detects supported e-commerce websites
- **Cashback Offers**: Shows cashback opportunities for purchases
- **Gift Card Vouchers**: Offers discounted gift cards with cashback
- **Smart UI**: Smooth fade-in/fade-out animations
- **Input Validation**: Min/max amount validation with visual feedback
- **Responsive Design**: Works on desktop and mobile layouts
- **Memory Management**: Proper cleanup to prevent memory leaks

### Technical Implementation
- **Background Script**: Core extension logic and coordination
- **Content Script**: Checkout page detection and data extraction
- **React Components**: Popup and options interfaces
- **TypeScript**: Full type safety and better development experience
- **Vite Build System**: Fast development and optimized builds
- **Chrome Extension Manifest V3**: Latest extension standards

### Performance
- **Lightweight**: Minimal impact on page load times
- **Efficient Detection**: Throttled DOM monitoring
- **Optimized Animations**: Hardware-accelerated CSS transitions
- **Memory Efficient**: Proper resource cleanup

### Security
- **No Personal Data Collection**: Only processes public webpage data
- **Local Storage**: User preferences stored locally
- **Secure Communication**: HTTPS for all API calls
- **Minimal Permissions**: Only necessary website access

## [0.9.0] - 2024-01-XX (Development)

### Added
- Basic extension structure
- Initial partner configurations
- Voucher dialog prototype
- Background script implementation
- Content script for checkout detection

### Changed
- Multiple iterations of dialog positioning
- Various animation implementations
- Input validation improvements

### Fixed
- Dialog reappearing after close
- Amount input functionality
- Multiple dialog instances
- Memory leaks in DOM observation
- Performance issues with MutationObserver

### Technical Debt
- Refactored MutationObserver usage
- Improved event listener cleanup
- Enhanced error handling
- Better state management

## [0.8.0] - 2024-01-XX (Alpha)

### Added
- First working prototype
- Basic voucher dialog
- Partner detection logic
- Chrome extension manifest

### Known Issues
- Dialog would reappear after closing
- Amount input was not functional
- Multiple dialog instances could appear
- Performance issues on some websites

## [0.1.0] - 2024-01-XX (Initial)

### Added
- Project initialization
- Basic Chrome extension structure
- Initial development setup
- TypeScript configuration
- Build system setup

## [2025.10.08] - Green UI + Server-click activation

### Added
- Server-confirmed activation via `GET /cashback/api/v1/cashback/clicks` (site-proxy)
  - Marks active and skips redirect when a matching click ≤10 minutes exists
  - Sets apex-domain cooldown and activation pill session flag on hit
- Domain-fallback landing recognition for affiliate flows that open new tabs
- Popup auth fallback: respects background session check when cookie name varies

### Changed
- Active theme: container background/border `#00C275`
- Tracking badge: background `#ECFDF5`, text/icon `#268E60`
- Header layout: balance left, hostname right
- Footer logo switched to transparent PNG for reliable rendering
- Icon logic short-circuits when active to avoid downgrade flicker

### Permissions
- No new permissions required; README updated with justifications and server-click details

---

## Version History Summary

### Major Milestones

- **v0.1.0**: Project setup and basic structure
- **v0.8.0**: First working prototype with known issues
- **v0.9.0**: Development version with major fixes
- **v1.0.0**: Stable release with all core features

### Key Improvements Over Time

1. **Dialog Stability**: Fixed reappearing and multiple instance issues
2. **User Experience**: Added smooth animations and better positioning
3. **Functionality**: Made amount input fully functional
4. **Performance**: Optimized DOM observation and memory usage
5. **Reliability**: Improved error handling and cleanup
6. **Documentation**: Comprehensive guides for users and developers

### Future Roadmap

- **v1.1.0**: Additional partner websites
- **v1.2.0**: Enhanced UI features
- **v1.3.0**: Advanced cashback options
- **v2.0.0**: Major feature additions (TBD)

---

## Breaking Changes

### v1.0.0
- Initial stable release - no breaking changes from previous versions

### Migration Guide

#### From Development Versions
- Clear browser cache and reload extension
- Update to latest build from repository
- Re-enable extension in Chrome

#### Browser Compatibility
- **Chrome**: Version 88+ (Manifest V3 support)
- **Edge**: Version 88+ (Chromium-based)
- **Firefox**: Not currently supported (different extension format)

---

## Support

For support with version updates or migration:
- Check the [README.md](README.md) for installation instructions
- Review [DEVELOPMENT.md](DEVELOPMENT.md) for technical details
- Open an issue on GitHub for bugs or questions

---

*This changelog is maintained by the Woolsocks development team. For the most up-to-date information, always refer to the latest release notes on GitHub.*

