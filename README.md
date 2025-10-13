# Woolsocks Browser Extension (MV3)

A cross-browser MV3 extension that shows Woolsocks voucher offers and automatically enables online cashback on supported merchant sites. Supports Chrome, Firefox (desktop and mobile), and other Chromium-based browsers.

## Current scope and constraints

- Works with your existing session at `woolsocks.eu` (cookie-based; no token UI)
- Country: NL default; online cashback filters to your country based on API language/locale
- Vouchers: shown at checkout/cart/order pages with enhanced detection for 25+ merchants
- Online cashback: auto-activates on entry of supported sites (10 min cooldown per apex domain)
- Server‑confirmed activation: if a recent click (≤10 min) exists for the site, we mark active and skip redirect
- Links for vouchers open canonical product pages like:
  `https://woolsocks.eu/nl-NL/giftcards-shop/products/{providerReferenceId}`

More capabilities (full merchant browse/search, popup lists, non-NL locales) will come soon.

## How it works

- Voucher flow: when you reach checkout, a small panel lists applicable voucher deals with name, rate, image and a "Use" button.
- Online cashback flow (multi-path activation):
  - On navigation, we look up the merchant and fetch deals.
  - Before redirecting, we query `GET /cashback/api/v1/cashback/clicks` via the site proxy with headers `x-application-name: WOOLSOCKS_WEB` and a real `x-user-id`.
  - If a recent click (≤10 min) matches the site/merchant, we mark active immediately, set cooldown, and skip redirect.
  - Otherwise we request a tracked redirect URL for the best deal and redirect once; on landing we mark active.
  - We maintain a short TTL domain‑pending state to recognize landings that open in a new tab.
- **Session recovery flow**: When you lose your session but have previously logged in, the extension stores your email locally and can send verification emails directly without redirecting to woolsocks.eu. This provides seamless session recovery while keeping you in the extension.
- The background service worker fetches via the site-proxy at `https://woolsocks.eu/api/wsProxy/...` with credentials and relay fallback.
- For voucher links we rely on `providerReferenceId` from the deals response to build the canonical product URL (fallbacks: `productId`, `id`, or UUID in `links.webLink`).

## Architecture (simplified)

```
src/
  background/
    index.ts       # service worker: API calls, message handling, voucher panel
    online-cashback.ts # navigation listener and auto-activation flow
    api.ts         # API client (site-proxy, relay fallback, mapping to PartnerLite)
    analytics.ts   # GA4 Measurement Protocol client
  content/
    checkout.ts    # checkout detection for many sites (incl. Airbnb)
    relay.ts       # content script on woolsocks.eu used for cookie-first relay
  options/
    main.tsx       # simplified settings page (session-aware)
  shared/
    email-storage.ts # email storage utilities for session recovery
    time-utils.ts    # time formatting utilities
    VerificationEmailScreen.tsx # verification email UI component
```

Key points:
- **Public API calls** (merchant discovery) go to `https://woolsocks.eu/api/wsProxy/...` without credentials
- **Authenticated API calls** (user actions) use credentials with relay fallback
- We set required headers: `x-application-name: WOOLSOCKS_WEB`, stable `x-user-id`
- Relay tabs only used for user-specific actions (activation, balance, clicks) to minimize tab flashing
- **Merchant discovery** uses fast API endpoints (`/merchants-overview/api/v0.0.1/merchants` and `/merchants-overview/api/v0.0.1/v2/deals`) without authentication
- **No HTML scraping** - removed legacy scraper that was causing performance issues and tab flashing

## Development

### Prerequisites
- Node.js 20.19+ or 22.12+
- Chrome/Chromium or Firefox

### Install & build

#### Chrome Build
```bash
npm install
npm run build:chrome
```
Load the `dist/` folder in `chrome://extensions` (Developer mode → Load unpacked).

#### Firefox Build
```bash
npm install
npm run build:firefox
```
Load the `dist-firefox/` folder in Firefox at `about:debugging` (This Firefox → Load Temporary Add-on).

#### Build Both
```bash
npm run build:all
```

#### Package for Distribution
```bash
npm run package
```
Creates `.zip` (Chrome) and `.xpi` (Firefox) files for store submission.

### Translation Management
The extension supports multiple languages through Lokalise integration. Use these commands to sync translations:

```bash
# Push local translations to Lokalise
npm run sync-push

# Pull latest translations from Lokalise
npm run sync-pull
```

**Translation Workflow:**
- **Push (`sync-push`)**: Uploads new/updated keys from your local `i18n.ts` to Lokalise
  - ✅ **Preserves translator edits** - Existing translations modified by translators are NOT overwritten
  - ✅ **Adds new keys** - New translation keys from your code are added to Lokalise
  - ✅ **Updates unmodified keys** - Only updates keys that haven't been changed by translators
- **Pull (`sync-pull`)**: Downloads the latest translations from Lokalise and updates your local `i18n.ts` file
  - ✅ **Includes translator edits** - Your local file gets updated with translator improvements
  - ✅ **Maintains code structure** - Preserves the TypeScript format and structure

**Note:** The sync commands require a valid Lokalise API token and project ID configured in the scripts.

### Session
- Open `https://woolsocks.eu/nl/profile` and sign in once; the extension will detect the session and use your cookies

### Testing quick checks
- Voucher: Go to a supported partner checkout (e.g., Zalando cart)
  - The panel should show vouchers with non‑zero rates; "Use" opens a `nl-NL/giftcards-shop/products/{...}` URL
- Online cashback: Navigate to a supported partner homepage
  - Expect one redirect to an affiliate link and return; icon turns green; popup shows "Cashback tracking enabled" with rate/title and a re-activate button.

See [TESTING.md](TESTING.md) for a short manual test matrix.

## Permissions
- `tabs` — read current tab URL for domain detection and update the URL on affiliate redirect.
- `scripting` — inject minimal UI for vouchers and the activation pill.
- `storage` — store user settings, per-domain cooldowns, activation registry, analytics queue.
- `notifications` — user feedback when cashback activates.
- `cookies` — observe Woolsocks session changes to ensure site-proxy API calls succeed.
- `webNavigation` — detect top-level navigations to trigger cashback flow and re-emit activation.
- `offscreen` — host a Chrome MV3 offscreen document with a hidden iframe to `woolsocks.eu` to perform credentialed API calls without opening a visible tab (prevents user-visible tab flashes; used only on Chrome where supported; Firefox uses tab-based relay fallback).
- Host permissions: `https://woolsocks.eu/*`, `https://api.woolsocks.eu/*`, and general `https?://*/*` for detection and eligibility checks.

### Permission justifications

#### Core Functionality Permissions
- **`tabs`** — We must detect merchant domains (tabs/webNavigation) and update the URL on affiliate redirect to enable cashback tracking.
- **`webNavigation`** — Detect top-level navigations to trigger cashback flow and re-emit activation when users return from affiliate redirects.
- **`cookies`** — Observe Woolsocks session changes to ensure site-proxy API calls succeed with proper authentication.
- **`storage`** — Store user settings, per-domain cooldowns, activation registry, analytics queue, and cached data for reliable operation.
- **`scripting`** — Inject minimal UI components (voucher panels, activation pills) only on detected merchant sites; never injects into sensitive origins.
- **`notifications`** — Provide clear user feedback when cashback activates successfully.
- **`offscreen`** — Host a Chrome MV3 offscreen document with a hidden iframe to `woolsocks.eu` to perform credentialed API calls without opening visible tabs (prevents user-visible tab flashes; used only on Chrome where supported; Firefox uses tab-based relay fallback).

#### Host Permission Justifications

**`https://woolsocks.eu/*` and `https://api.woolsocks.eu/*`**
- **Authentication**: Required to access user's Woolsocks account and session cookies for authenticated API calls
- **API Communication**: Make requests to Woolsocks APIs for deal information, cashback activation, and user data
- **Relay Fallback**: When offscreen context fails, reuse existing Woolsocks tabs for API calls
- **Session Management**: Monitor session state changes and handle login/logout events
- **Verification Emails**: Send verification emails directly via API for session recovery

**`https?://*/*` (All HTTP/HTTPS sites)**
- **Universal Merchant Detection**: The extension works with ANY merchant that Woolsocks supports, not just a predefined list
- **Checkout Detection**: Analyze page content to detect checkout/cart pages across all e-commerce sites
- **Deal Eligibility**: Query Woolsocks API to check if any visited merchant has available deals
- **Content Analysis**: Parse page content to extract order totals and merchant information
- **Affiliate Redirects**: Redirect users through tracked affiliate links to enable cashback
- **UI Injection**: Display voucher panels and activation notifications only on detected merchant sites
- **No Data Collection**: We do not collect, store, or transmit any personal data from visited sites

**Security and Privacy Safeguards**
- **Minimal Data Access**: Only reads public page content (order totals, merchant names) necessary for deal detection
- **No Sensitive Data**: Never accesses passwords, payment information, or personal details
- **Local Processing**: All content analysis happens locally in the browser
- **Transparent Operation**: Users can see exactly what the extension does through visible UI elements
- **User Control**: All automatic behaviors can be disabled via settings
- **Affiliate Disclosure**: Clear disclosure that the extension uses affiliate links for monetization

## UI notes
- Active state uses brand green background/border `#00C275`.
- Tracking badge: background `#ECFDF5`, text/icon `#268E60`.
- Header shows balance on the left and hostname on the right.
- Footer logo uses `Woolsocks-logo-large.png` (transparent background) for consistent rendering.

## Settings
- Popup/Options → "Auto-activate online cashback" toggle (default ON). When OFF, the flow does not auto-redirect; manual re-activate remains available.

## Session Recovery
The extension automatically stores your email locally after successful login to enable seamless session recovery:

- **Automatic email storage**: When you log in successfully, your email is stored securely in the browser's local storage
- **Verification flow**: If you lose your session, clicking "Login" shows a verification screen instead of redirecting to woolsocks.eu
- **Direct email sending**: The extension sends verification emails directly via the API without leaving the extension
- **Smart fallback**: If no email is stored, it falls back to the original woolsocks.eu redirect flow
- **Balance caching**: Your cashback balance remains visible with a "last updated" timestamp even after session loss
- **Privacy controls**: You can clear your stored email anytime via the "Forget Me" button in settings

### Session Recovery Flow
1. User clicks "Login" → Extension checks for stored email
2. If email exists → Shows verification screen with masked email
3. Verification email sent automatically → User checks email and clicks link
4. Session restored → User continues seamlessly in extension
5. If no email stored → Falls back to woolsocks.eu redirect

## Analytics (GA4)
- Events sent via Measurement Protocol: `oc_partner_detected`, `oc_eligible`, `oc_blocked`, `oc_redirect_requested`, `oc_redirect_issued`, `oc_redirect_navigated`, `oc_activated`, `oc_manual_reactivate`, `oc_conditions_loaded`.
- **Session recovery events**: `session_recovery_email_stored`, `session_recovery_email_cleared`, `verification_email_triggered`, `verification_email_success`, `verification_email_fail`, `verification_screen_shown`, `verification_resend_clicked`.
- Key parameters: `domain`, `partner_name`, `deal_id`, `amount_type`, `rate`, `country`, `provider`, `link_host`, `reason`, `click_id`, `ext_version`, `email_domain`.
- Recommended GA setup: create event-scoped custom dimensions for the parameters above (currency is standard). Mark `oc_activated` as a Key event.

## Notes for contributors
- Voucher filtering: include only `GIFTCARD`; exclude `GIFTCARD_PAY_LATER`
- Online cashback filtering: include only `CASHBACK` with `usageType ONLINE` and matching `country`.
- Voucher URL: prefer `providerReferenceId`
- Entrance banner is disabled; voucher panel is shown only at checkout



See the full roadmap in [docs/ROADMAP.md](docs/ROADMAP.md).
See the implementation plan for Dual Blacklists in [docs/feature-dual-blacklists-remote-config.md](docs/feature-dual-blacklists-remote-config.md).

## License
MIT