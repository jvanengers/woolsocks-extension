# Woolsocks Browser Extension

A Chrome extension that provides cashback and voucher offers for Dutch e-commerce websites. The extension automatically detects when you're shopping on partner websites and offers relevant cashback opportunities or gift card vouchers.

## 🚀 Features

- **Automatic Partner Detection**: Detects when you're shopping on supported Dutch e-commerce websites
- **Cashback Offers**: Shows cashback opportunities for online purchases
- **Gift Card Vouchers**: Offers discounted gift cards with cashback
- **Smart Checkout Detection**: Only activates on actual checkout/cart pages
- **Smooth UI**: Beautiful, animated dialogs with professional design
- **Real-time Calculations**: Dynamic cashback calculations based on purchase amount

## 🛍️ Supported Partners

The extension currently supports the following Dutch e-commerce websites:

- **Amazon.nl** - Electronics, books, household items
- **Zalando** - Fashion and lifestyle
- **Bol.com** - General merchandise
- **MediaMarkt** - Electronics and appliances
- **Coolblue** - Electronics and home appliances
- **H&M** - Fashion
- **Wehkamp** - Fashion and lifestyle
- **IKEA** - Furniture and home goods

## 📦 Installation

### For Development

1. Clone the repository:
```bash
git clone https://github.com/your-username/woolsocks-extension.git
cd woolsocks-extension
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### For Production

1. Download the latest release from the GitHub releases page
2. Extract the ZIP file
3. Follow the Chrome extension installation steps above

## 🎯 How to Use

1. **Install the Extension**: Load the extension in Chrome
2. **Visit Partner Websites**: Navigate to any supported e-commerce website
3. **Automatic Detection**: The extension will automatically detect when you're on a checkout page
4. **View Offers**: A dialog will appear with cashback or voucher offers
5. **Make Purchases**: Follow the instructions to get cashback on your purchases

### Example Flow

1. Visit `mediamarkt.nl` and add items to cart
2. Go to checkout page
3. Woolsocks dialog appears with MediaMarkt gift card offer
4. Enter purchase amount to see cashback calculation
5. Click "Continue" to proceed with the offer

## 🏗️ Architecture

### Project Structure

```
woolsocks-extension/
├── src/
│   ├── background/          # Background script (service worker)
│   │   └── index.ts        # Main background logic
│   ├── content/            # Content scripts
│   │   └── checkout.ts     # Checkout page detection
│   ├── popup/              # Extension popup UI
│   │   └── main.tsx        # Popup React component
│   ├── options/            # Extension options page
│   │   └── main.tsx        # Options React component
│   ├── shared/             # Shared utilities
│   │   └── partners.ts     # Partner configurations
│   └── integrations/       # External integrations
│       └── supabase/       # Database integration
├── dist/                   # Built extension files
├── public/                 # Static assets
└── manifest.json          # Extension manifest
```

### Key Components

#### Background Script (`src/background/index.ts`)
- **Purpose**: Main extension logic and coordination
- **Responsibilities**:
  - Tab evaluation and partner detection
  - Voucher dialog injection
  - Icon state management
  - Message handling between components

#### Content Script (`src/content/checkout.ts`)
- **Purpose**: Detects checkout pages and extracts order information
- **Responsibilities**:
  - Partner-specific checkout detection
  - Order total extraction
  - DOM monitoring for dynamic content

#### Partner Configuration (`src/shared/partners.ts`)
- **Purpose**: Defines supported partners and their configurations
- **Contains**:
  - Partner metadata
  - Checkout detection rules
  - Voucher configurations
  - Cashback rates

## 🔧 Development

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm or yarn
- Chrome browser for testing

### Available Scripts

```bash
# Install dependencies
npm install

# Build for development
npm run build

# Build for production
npm run build:prod

# Type checking
npm run type-check

# Linting
npm run lint
```

### Building the Extension

1. Run `npm run build` to create the production build
2. The built files will be in the `dist/` directory
3. Load the `dist/` folder as an unpacked extension in Chrome

### Adding New Partners

1. Add partner configuration to `src/shared/partners.ts`:
```typescript
{
  name: 'Partner Name',
  domain: 'partner.com',
  isCheckoutPage: (url, document) => {
    // Detection logic
  },
  extractTotal: (document) => {
    // Total extraction logic
  }
}
```

2. Add voucher configuration if applicable
3. Test on the partner website

## 🎨 UI Components

### Voucher Dialog
- **Appearance**: Smooth fade-in animation with scale effect
- **Positioning**: Upper-right corner with minimal padding
- **Features**:
  - Amount input with real-time cashback calculation
  - Min/max validation with visual feedback
  - Collapsible sections for terms and conditions
  - Smooth close animation

### Extension Popup
- **Purpose**: User profile and settings access
- **Features**: Login, settings, and quick access to offers

## 🔒 Security & Privacy

- **No Personal Data Collection**: Extension only processes public webpage data
- **Local Storage**: User preferences stored locally in browser
- **Secure Communication**: All API calls use HTTPS
- **Minimal Permissions**: Only requests necessary website access

## 🐛 Troubleshooting

### Common Issues

1. **Extension Not Working on Partner Site**
   - Check if the website is in the supported partners list
   - Ensure you're on a checkout/cart page, not the homepage
   - Try refreshing the page

2. **Dialog Not Appearing**
   - Check browser console for errors
   - Verify extension is enabled
   - Clear browser cache and reload

3. **Amount Input Not Working**
   - Check console for JavaScript errors
   - Try clicking in the input field first
   - Ensure you're entering valid numbers

### Debug Mode

Enable debug mode by opening browser console (F12) and looking for Woolsocks logs:
- `Creating new voucher prompt`
- `Close button clicked!`
- `Setting up amount input`

## 📈 Performance

- **Lightweight**: Minimal impact on page load times
- **Efficient Detection**: Throttled DOM monitoring to prevent performance issues
- **Memory Management**: Proper cleanup of event listeners and DOM elements
- **Optimized Animations**: Hardware-accelerated CSS transitions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Test thoroughly on multiple partner websites
5. Submit a pull request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for complex logic
- Ensure proper error handling

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, feature requests, or bug reports:
- Create an issue on GitHub
- Contact the development team
- Check the troubleshooting section above

## 🔄 Version History

### v1.0.0
- Initial release
- Support for 8 major Dutch e-commerce websites
- Voucher dialog with smooth animations
- Real-time cashback calculations
- Checkout page detection

---

**Made with ❤️ for Dutch online shoppers**