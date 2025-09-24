# Changelog

All notable changes to the Woolsocks Browser Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation suite
- Development guide for contributors
- Contributing guidelines
- Changelog tracking

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
