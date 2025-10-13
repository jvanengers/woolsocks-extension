## Woolsocks Extension Roadmap

This roadmap outlines planned enhancements across browsers and mobile companions. It will be maintained in Git and updated as scope clarifies.

### Guiding principles
- Privacy-first, minimal data collection; clear user consent.
- Operate gracefully without a logged-in session; unlock more when signed in.
- Consistent UX across Chrome, Safari (desktop/mobile), Firefox, and Android companion.
- Resilient affiliate tracking with idempotency and explicit user feedback.

---

## 1) Realtime blacklists and alternative UX

Status: Blocked, Waiting for Firebase setup

Goal: Support realtime blacklists for two flows and provide a fallback experience that avoids proactive reminders while still allowing usage.

- Realtime blacklist types
  - Online cashback
  - Voucher checkout
- Delivery
  - Fetch blacklist config at startup and on interval; accept push/remote overrides.
  - Cache with short TTL; fail-open with last-known good and versioning.
- Behavior
  - When blacklisted, suppress proactive reminders and redirects for the matching flow.
  - Show alternative UI: inline, unobtrusive “Try cashback” or “See vouchers” affordance the user can pull, without auto prompts.
  - Log reasons (e.g., domain rule, partner rule, policy) for audit.
- Analytics
  - Emit `*_blocked` with `reason`, `policy_version`, and `flow`.
- Success criteria
  - Config propagates within 5 minutes; zero proactive prompts on blacklisted sites; manual affordance available and functional.

---

## 2) Voucher analytics and BI integration

Status: Blocked, Waiting for BI integratiom details

Goal: Deliver BI export and reporting for voucher funnel metrics using a data warehouse (e.g., BigQuery) and dashboards.

- Data export
  - Define export path (GA4 → BigQuery export or server-side relay).
  - Confirm schemas, retention, PII policy, and event sampling constraints.
- Reporting
  - Build dashboards for impressions → clicks → usage; define KPIs and filters by domain/partner/country.
- Validation
  - Reconcile event counts between GA and warehouse; document known gaps and sampling.

---

## 4) Anonymous online cashback clickouts and claim-after-login

Status: Blocked, Waiting for backend changes

Goal: Allow clickouts when anonymous and let users claim cashback later.

- Clickout flow (anonymous)
  - Generate ephemeral click/session id client-side; store locally with timestamp and domain.
  - Redirect through affiliate with id embedded (or mapped server-side via relay endpoint if required).
- Claim flow
  - On later login, reconcile recent anonymous clicks (time/windowed) with cookie-authorized session; attach to user.
- Fraud/abuse controls
  - Include domain, IP coarse hash, and UA fingerprint hash (privacy-preserving) for dedupe/risk.
- Success criteria
  - Anonymous click leads to tracked activation; upon login within window, click is associated and visible in account.

---

## 5) Safari Extensions (macOS & iOS/iPadOS)

Status: In progress. See branch feature/safari-ios-extension

### iOS/iPadOS (Mobile Safari)

Goal: Bundle a Safari Web Extension inside the Woolsocks app with app group storage and deep links to in-app voucher checkout.

- App group
  - Share settings/session signals via `App Group` between host app and extension.
- Deep linking
  - From extension UI, open app to voucher checkout via universal link; pass context (partner, product, rate).
- Build & distribution
  - Xcode workspace with extension target; align entitlements and provisioning; TestFlight.
- Success criteria
  - Extension runs on iOS Safari; deep link opens app at voucher checkout; settings sync via app group.

### macOS (Desktop Safari)

Goal: Ship a Safari Web Extension for macOS with parity for detection, reminder UI, voucher panel, and manual cashback activation (no auto-redirects without a user gesture per Apple policy).

- Packaging
  - macOS app container with a Safari Web Extension target; signed and notarized via Developer ID; distributed via Mac App Store or direct (if applicable).
- Entitlements & storage
  - Configure required entitlements; use shared container or app group if pairing with a macOS host app; persist settings in extension storage.
- UX constraints
  - Activation must be user-initiated (click/tap). Provide clear “Activate cashback” controls in popup or page UI; visible feedback after activation.
- Testing
  - Validate on latest macOS/Safari versions; cover permission prompts, content injection, and gesture-gated redirects.
- Success criteria
  - Extension installs and runs on Desktop Safari; partner detection, reminders, voucher panel work; activation adheres to Apple review guidelines.

---

## 6) Firefox support (desktop and mobile)

Status: Ready for implementation

Goal: Port MV3 functionality to Firefox variants with full feature parity and AMO distribution.

### Desktop Firefox

**API Compatibility Assessment:**
- ✅ **Storage API**: Full compatibility with `chrome.storage.local` and `chrome.storage.sync`
- ✅ **Tabs API**: Full compatibility with `chrome.tabs` for tab management and URL updates
- ✅ **WebNavigation API**: Full compatibility for navigation event detection
- ✅ **Cookies API**: Full compatibility for session cookie observation
- ✅ **Scripting API**: Full compatibility for content script injection
- ✅ **Notifications API**: Full compatibility for user feedback
- ❌ **Offscreen API**: Not supported in Firefox; use tab-based relay fallback
- ✅ **Background Scripts**: Service worker support available (MV3 compatible)

**Implementation Requirements:**
- **Manifest adjustments**: Remove `offscreen` permission, ensure MV3 compatibility
- **Relay system**: Use existing tab-based relay (already implemented with platform guards)
- **Platform detection**: Leverage existing `getPlatform()` function (already detects Firefox)
- **Auto-activation**: Firefox supports auto-redirects with user consent (already configured)
- **Build system**: Use existing `webextension-polyfill` dependency for cross-browser compatibility

**Technical Implementation:**
```typescript
// Platform guards already implemented in src/shared/platform.ts
export function getPlatform(): Platform {
  if (userAgent.includes('firefox')) return 'firefox'
  // ... other platforms
}

// API compatibility already handled in src/background/api.ts
function canCreateRelayTab(): boolean {
  // Chrome only - Firefox uses tab-based relay
  try { return !!(chrome as any).offscreen && typeof (chrome as any).offscreen.createDocument === 'function' } catch { return false }
}
```

### Android Firefox (Mobile)

**API Limitations:**
- ✅ **Core APIs**: Storage, tabs, webNavigation, cookies, scripting all supported
- ✅ **Popup UI**: Full support for extension popup and options pages
- ✅ **Content Scripts**: Full support for checkout detection and voucher panels
- ⚠️ **Performance**: Optimize for mobile constraints (memory, battery)
- ⚠️ **UI Adaptation**: Ensure popup renders correctly on mobile screens

**Mobile Optimizations:**
- Reduce memory footprint for background scripts
- Optimize content script injection timing
- Ensure popup dimensions work on mobile screens
- Test voucher panel positioning on mobile viewports

### Packaging and Distribution

**AMO (Add-ons.mozilla.org) Requirements:**
- **Manifest V3**: Firefox supports MV3 extensions (no conversion needed)
- **Code Review**: Submit for AMO review and signing
- **Privacy Policy**: Required for extensions with data collection
- **Permissions Justification**: Document all permission usage (already documented in README.md)
- **Source Code**: May be required for review (consider open-sourcing)

**Build Process:**
- Use existing Vite build system with `@crxjs/vite-plugin`
- Generate Firefox-compatible manifest (remove `offscreen` permission)
- Package as `.xpi` file for AMO submission
- Test on Firefox Developer Edition and stable releases

### Implementation Plan

**Phase 1: Desktop Firefox (2-3 weeks)**
1. **Week 1**: 
   - Create Firefox-specific build configuration
   - Remove `offscreen` permission from Firefox manifest
   - Test all core functionality (detection, reminders, voucher panel, cashback activation)
   - Verify platform guards work correctly

2. **Week 2**:
   - Comprehensive testing on Firefox Developer Edition
   - Performance testing and optimization
   - Fix any Firefox-specific issues
   - Prepare AMO submission package

3. **Week 3**:
   - Submit to AMO for review
   - Address any review feedback
   - Prepare documentation and support materials

**Phase 2: Mobile Firefox (1-2 weeks)**
1. **Week 1**:
   - Test on Firefox Mobile (Android)
   - Optimize for mobile performance
   - Ensure UI renders correctly on mobile screens
   - Test core flows (detection, voucher panel, manual activation)

2. **Week 2**:
   - Performance optimization for mobile constraints
   - Final testing and bug fixes
   - Prepare mobile-specific documentation

### Success Criteria

**Desktop Firefox:**
- ✅ Feature parity with Chrome: detection, reminders, voucher panel, cashback activation
- ✅ No user-visible tab flashing (uses tab-based relay instead of offscreen)
- ✅ Passes AMO review and gets published
- ✅ All existing platform guards work correctly
- ✅ Performance comparable to Chrome version

**Mobile Firefox:**
- ✅ Core flows work: detection, voucher panel, manual activation
- ✅ Popup and options UI render correctly on mobile
- ✅ Performance optimized for mobile constraints
- ✅ No memory leaks or excessive battery usage

**Distribution:**
- ✅ Successfully published on AMO
- ✅ Users can install and use without issues
- ✅ Support documentation updated for Firefox users
- ✅ Analytics track Firefox usage separately

### Technical Notes

**Existing Compatibility:**
- Platform detection already implemented (`src/shared/platform.ts`)
- Firefox auto-activation already configured (`allowsAutoRedirect()` returns true for Firefox)
- Tab-based relay already implemented as fallback for non-Chrome browsers
- `webextension-polyfill` already included in dependencies
- All core APIs already compatible with Firefox

**No Code Changes Required:**
- Platform guards already handle Firefox detection
- Relay system already falls back to tab-based for Firefox
- Auto-activation already enabled for Firefox
- All permissions already Firefox-compatible (except `offscreen`)

**Build Configuration:**
```typescript
// vite.config.ts - add Firefox build target
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest, ...chromeConfig }),
    // Add Firefox-specific build
    crx({ manifest: firefoxManifest, ...firefoxConfig })
  ]
})
```

**Risk Mitigation:**
- Low risk: Most functionality already Firefox-compatible
- Existing platform guards prevent Chrome-specific code from running on Firefox
- Tab-based relay already tested and working
- `webextension-polyfill` provides additional compatibility layer

---

## 7) Android companion app (VPN-based reminders)

Status: Ready for refinement

Goal: Provide cross-browser reminders on Android using a local VPN service to observe domains. No checkout detection.

- Network observation
  - Local VPN captures outbound domains (never payload); maintain in-memory recent domain ring.
- Reminder engine
  - When visiting a supported domain, trigger a system notification offering vouchers/cashback; open deep link to web or app.
- Privacy & controls
  - On-device only; explicit opt-in; clear pause/disable and data deletion.
- Success criteria
  - Works across all Android browsers; low battery impact; no content inspection; user can deep link to web/app flows.

## 8) Disable auto-activation on Safari

Status: Ready for refinement

Goal: Define platform-specific rules for auto-activating cashback via redirects, with explicit consent where allowed and compliant fallbacks where not.

### COMPLETED: Chrome Web Store (Google) — upfront consent + countdown notification with opt out
We should adapt the automatic redirection pattern so it follows these guidelines:
	1.	During onboarding, ask explicitly:
“Do you want Woolsocks to auto-activate cashback (redirect via affiliate link) when you visit partner stores?”
→ Options: Enable auto mode / Ask me each time
	2.	If user enables auto mode, you remember their preference, but you do not silently redirect.
	3.	At each partner store load, show a small but obvious UI element (banner, toast, modal) saying:
“Auto-activating cashback in 3…2…1 — click here to cancel”
Or
“Activate cashback now → [button]”
	4.	If needed, you can implement a countdown (3→2→1) before redirect, as long as the countdown is visible, counts down in the UI, and the user can cancel or see that it’s happening.
	5.	Always let the user opt-out later (in settings or toggle) and make the auto behavior reversible.
	6.	In your extension listing/privacy docs, clearly disclose the affiliate monetization and redirection behavior.
Don’t do background tabs that user doesn’t see. Don’t silently override cookies. Everything must be traceable and visible.
	3.	Respect existing affiliate attribution
Don’t override someone’s affiliate tags or tracking codes already present (unless you’re absolutely sure it’s expired or invalid).
	5.	Always let user opt out or revoke
User can disable auto activation. All activity should be transparent.

### TO DO: Safari (macOS & iOS) — automatic redirects not allowed

- Policy
  - Apple reviewers reject automatic redirects that are not triggered by explicit user action at that moment.
  - Prior consent does not suffice; each redirect must be user-initiated (click/tap).
- UX pattern
  - Always present an explicit action: “Activate cashback” button in popup, page action, or inline panel.
  - No background auto-redirects; show state after user taps: “Cashback activated for {domain}”.
- Implementation
  - Ensure redirect occurs strictly from a user gesture handler.
  - Keep settings to remember preference for showing prompts, but never bypass the click requirement.
- Success criteria
  - All activations require a user gesture; passes App Store/Safari Extension review.

### TO DO: Android / Play Store — allowed for native apps (not Chrome extensions)

- Policy
  - Native apps may perform auto-activation if clearly explained during onboarding and togglable later.
  - Chrome-based extensions follow Chrome Web Store rules (see Chrome section).
- Recommended UX (native app)
  - Onboarding prompt:
    - “Enable automatic cashback activation when you open partner stores?”
    - [Yes, activate automatically] / [No, remind me first]
- Implementation
  - Store consent in app settings; provide toggle to change later.
  - Show notification/toast upon activation for transparency.
- Success criteria
  - Clear opt-in, revocable; transparent activation feedback; compliant with Play policies.

---

## 10) Competitor suggestions when no cashback is available

Status: Ready for refinement

Goal: When a user visits a site without an available Woolsocks cashback/voucher deal, provide an unobtrusive suggestion to use an alternative partner where we do offer cashback (e.g., visiting `booking.com` → suggest `expedia.com`).

- Detection
  - If current domain is not eligible for any active deal in the user’s locale, and not blacklisted, trigger competitor suggestion logic.
  - Use a curated mapping from domain → alternative partners, with country-aware fallbacks and A/B variants.
- UX
  - Show a subtle, dismissible prompt (popup panel or page badge) with: “No cashback here. Try Expedia for cashback.” and an action button.
  - Never block the user’s current flow; easy dismiss; respect cooldown per domain.
  - Honor real-time blacklist to suppress suggestions on sensitive sites.
- Attribution and routing
  - Clicking the suggestion opens the partner via our standard tracked clickout flow (subject to consent/policy per platform).
  - Do not auto-redirect; always user-initiated.
- Policy & ethics
  - Avoid misleading claims; clearly label as partner suggestion with potential cashback.
  - Respect competing affiliate tags on the current site; do not interfere.
  - Platform rules apply (e.g., Safari requires explicit user action for redirects).
- Analytics
  - Emit `comp_suggested`, `comp_view`, `comp_click` with `source_domain`, `suggested_partner`, `country`, `reason`.
- Success criteria
  - Meaningful CTR without elevated dismiss/complaint rates; measurable lift in total cashback activations; compliant with platform policies.

---

## 11) Enforce country-scoped deals (vouchers and online cashback)

Problem: Deals from outside the visited site's country are considered and shown today, which can mislead users (e.g., Dutch users seeing Amazon.com vouchers that do not apply in NL).

- Goal
  - Restrict eligibility and presentation of deals so that the visited domain's country matches the offer's country for both vouchers and online cashback.
- Country source of truth (runtime)
  - Primary: derive country from the visited URL/domain using domain/locale parsing (e.g., TLD `.nl`, path `/nl/`, brand-specific patterns).
  - Secondary fallback (only when domain cannot be resolved): signed-in profile country; else explicit extension setting; else browser locale.
  - Persist last derived country in storage for diagnostics; allow override via Settings for debugging.
- Filtering and matching
  - Vouchers (`GIFTCARD`): include only when the voucher's canonical product URL locale segment matches the visited domain country (e.g., product URL path `/nl-NL/giftcards-shop/...` → NL). Do not rely on a query parameter; country is conveyed via the locale path segment.
  - Online cashback (`CASHBACK` with `usageType ONLINE`): include only when the deal's `country` matches the visited domain country (from domain/locale mapping).
  - Maintain and use a domain→country/locale map (per partner) to avoid cross-locale hostnames (e.g., `.com` vs `.nl`) and to correctly interpret path-based locales (e.g., `nike.com/nl/en`).
- UX
  - If a site is detected but only cross-country deals exist, show a neutral message: "No deals available for your country." Optionally offer a country switch entry point.
  - Respect real-time blacklist to suppress prompts on sensitive sites.
- Analytics
  - Emit `deal_country_mismatch` with `domain`, `partner`, `deal_country`, `visited_country`, `flow` (voucher/oc).
- Success criteria
  - Cross-country deals no longer appear; reduced misclicks/complaints; country match rate > 99% across top domains.

---

## 12) Local email storage for session recovery and verification

Goal: Store user email locally after login to enable direct verification email triggers from the extension, eliminating the need for redirects to `woolsocks.eu` for session recovery.

- Email storage
  - Store email address in extension storage (encrypted) after successful login detection.
  - Include timestamp and session metadata for validation.
  - Clear on explicit logout or after extended inactivity.
- Verification flow
  - When session is lost, show "Resend verification" option in popup/settings.
  - Call verification API directly from extension background script with stored email.
  - Provide clear feedback: "Verification email sent to {email}" with resend cooldown.
- Security & privacy
  - Encrypt stored email using extension storage encryption or browser keyring.
  - Add "forget me" button for email storage in settings.
  - Audit log email access and verification attempts.
- Fallback
  - If email storage fails or is disabled, fall back to current `woolsocks.eu` redirect flow.
- Analytics
  - Track `session_recovery_email_stored`, `verification_email_triggered`, `verification_email_success|fail`.
- Success criteria
  - Users can recover sessions without leaving current tab; reduced `woolsocks.eu` redirects; >90% verification email delivery rate.

---

## 13) Anonymous API calls to reduce tab flashing

Goal: Use anonymous/unauthenticated API calls wherever possible to fetch deal and voucher details, further reducing the need for authenticated relay tabs and minimizing background tab flashing.

- Anonymous endpoints
  - Identify which deal/voucher APIs can work without authentication (public deals, partner info, basic eligibility).
  - Create anonymous API client that bypasses cookie-based authentication entirely.
  - Use anonymous calls for initial deal detection, partner lookup, and basic voucher information.
- Authentication fallback
  - Only use authenticated calls when absolutely necessary (user-specific deals, personalized rates, account-specific vouchers).
  - Implement graceful degradation: show anonymous deals first, then enhance with authenticated data when available.
- Implementation
  - Add anonymous API client alongside existing authenticated client.
  - Route calls based on data requirements: anonymous for public data, authenticated for user-specific data.
  - Cache anonymous responses with appropriate TTL to reduce API load.
- Benefits
  - Eliminates most background tab opens for deal detection and basic voucher info.
  - Faster initial load times for popup and content scripts.
  - Reduced user-visible tab flashing during normal browsing.
- Analytics
  - Track `api_call_anonymous`, `api_call_authenticated`, `api_call_fallback` with endpoint and success/failure.
- Success criteria
  - >80% of deal/voucher API calls use anonymous endpoints; <5% of user sessions trigger authenticated relay tabs; faster popup load times.

---

## 14) Comprehensive caching for performance optimization

Goal: Implement intelligent caching for cashback balance, transactions, deal information, and other frequently accessed data to reduce API calls and improve perceived loading speed.

- Cache targets
  - Cashback balance and recent transactions (user-specific, TTL: 5-15 minutes).
  - Deal information per merchant/domain (public data, TTL: 30-60 minutes).
  - Partner configuration and eligibility rules (rarely changing, TTL: 24 hours).
  - User preferences and settings (local storage, persistent).
- Cache strategy
  - Multi-tier caching: memory cache (fastest), extension storage (persistent), background refresh.
  - Cache invalidation: time-based TTL, event-based (user actions, session changes), manual refresh.
  - Cache warming: preload popular merchants and user's frequent sites.
- Implementation
  - Add cache layer to API client with configurable TTL per endpoint.
  - Implement cache-first strategy with background refresh for stale data.
  - Add cache status indicators in UI (fresh/stale/loading states).
- Performance benefits
  - Instant popup loading for cached data (balance, recent deals).
  - Reduced API load and faster merchant detection.
  - Offline-capable for basic functionality (show cached deals, last known balance).
- Cache management
  - Add cache size limits and LRU eviction for memory cache.
  - Provide cache clear option in settings for troubleshooting.
  - Analytics for cache hit rates and performance metrics.
- Success criteria
  - >90% cache hit rate for balance/transactions; <200ms popup load time; 50% reduction in API calls during normal usage.

---

## 15) Remove alarms permission and find alternatives

Status: Completed — 2025-01-27

Goal: Remove the `alarms` permission from the extension manifest to pass Chrome Web Store review, while maintaining all current functionality through alternative approaches.

**Reference: Chrome Web Store Rejection (Item ID: fneoceodefiieccfcapkjanllehpogpj)**
> "Requesting but not using the following permission(s): alarms. Remove the unused permission(s) listed above from your manifest file. Request access to the narrowest permissions necessary to implement your Product's features or services. Don't attempt to 'future proof' your Product by requesting a permission that might benefit services or features that have not yet been implemented."

### Implementation Details

Completed: 2025-01-27 — commit `[TBD]` (feat: remove alarms permission and replace with event-driven alternatives)

### Additional Permission Cleanup

Completed: 2025-10-10 — commit `[TBD]` (feat: remove unused webRequest permission for Chrome Web Store compliance)

- **Replaced alarm-based cache cleanup** with event-driven triggers:
  - Cache cleanup now runs on service worker startup, tab activation, and navigation events
  - Throttled to run at most once per hour to prevent excessive execution
  - Uses `cleanupIfNeeded()` wrapper with 24-hour throttling for actual cleanup operations
- **Replaced alarm-based cache preload** with activity-based preloading:
  - Preload runs on service worker startup and install
  - Popup can trigger preload via `CACHE_PRELOAD_REQUEST` message
  - Popular merchants are preloaded for improved performance
- **Removed HTML scraper entirely** (deals-scraper.ts):
  - Eliminated 1,330+ lines of unused HTML scraping code
  - Merchant discovery now uses only fast API endpoints
  - Fixed function name conflicts and performance issues
  - No more tab flashing or continuous tab creation/removal
- **Analytics system unchanged**: Already used `setInterval` instead of alarms
- **Removed alarms permission** from manifest and updated documentation
- **All functionality preserved**: Cache cleanup, preload, and analytics work identically to before

### Success Criteria Met
- ✅ Extension no longer requests alarms permission
- ✅ All cache cleanup operations work via event-driven triggers
- ✅ Cache preload maintains performance benefits
- ✅ Analytics delivery unchanged (already event-driven)
- ✅ No performance degradation or reliability issues

## 16) Post-installation landing page

Status: Ready for implementation

Goal: Automatically open a welcome/landing page when users first install the extension to guide them through setup, explain features, and improve onboarding experience.

- Trigger
  - Use `chrome.runtime.onInstalled` event with `reason: "install"` to detect first-time installations.
  - Differentiate from updates (`reason: "update"`) to avoid reopening on each update.
- Landing page
  - Open a dedicated page (e.g., `woolsocks.eu/welcome` or extension's options page with welcome flow).
  - Include: feature overview, permissions explanation, setup instructions, login/signup prompt.
  - Consider deep linking to specific sections based on installation context (e.g., user country, referral source).
- UX considerations
  - Open in new tab automatically after installation completes.
  - Provide clear "Skip" or "Get started" options for user control.
  - Track page views and interactions to measure onboarding effectiveness.
- Platform differences
  - Chrome: Full support for `onInstalled` event.
  - Firefox: Full support for `onInstalled` event.
  - Safari: Limited support; may require alternative approach (e.g., first popup open detection).
- Analytics
  - Track `extension_installed`, `landing_page_opened`, `landing_page_skipped`, `landing_page_completed` with platform, version, country.
- Success criteria
  - Landing page opens automatically on first install for Chrome/Firefox; alternative detection for Safari; >80% of new users see landing page; improved conversion to login/setup.

---

## 17) Grocery deals (supermarkets and drugstores)

Status: Ready for refinement

Goal: Show relevant grocery deals when users visit supported supermarket and drugstore websites, enabling them to discover in-store promotions and special offers for products they're interested in.

- Merchant detection
  - Detect visits to supported grocery merchants: supermarkets (e.g., Albert Heijn, Jumbo, Plus) and drugstores (e.g., Etos, Kruidvat, DA).
  - Maintain a curated list of supported grocery domains per country.
  - Use existing domain detection infrastructure with grocery-specific merchant classification.
- Deal fetching and filtering
  - Fetch grocery deals (`GROCERY` deal type) from API for detected merchant.
  - Filter by user's country and merchant/partner match.
  - Include deal metadata: product name, description, discount/offer details, validity period, images.
  - Respect real-time blacklist to suppress prompts on sensitive pages.
- UX presentation
  - Show deals in extension popup or content panel when visiting supported grocery site.
  - Display deal cards with: product image, title, discount info (e.g., "2 for €5", "30% off"), expiration date.
  - Provide clear visual distinction from online cashback and voucher deals.
  - Sort by relevance: expiration date, discount percentage, popularity.
- Navigation and deep linking
  - Clicking a deal opens `woolsocks.eu/deals/{dealId}` in new tab to view full details.
  - Pass context parameters: `merchant`, `country`, `deal_type=grocery`, `source=extension`.
  - Landing page shows full deal description, terms, availability, related products.
- Deal categories and search
  - Optionally support category filtering (e.g., dairy, snacks, personal care) if API provides categories.
  - Consider keyword search or product name filtering for large deal sets.
- Privacy and consent
  - No tracking of specific products viewed or purchased in-store.
  - Only track deal impressions and clicks at aggregate level.
  - Respect platform policies for content injection and navigation.
- Analytics
  - Track `grocery_merchant_detected`, `grocery_deals_shown`, `grocery_deal_view`, `grocery_deal_click` with `domain`, `partner_name`, `deal_id`, `country`, `category`, `ext_version`.
- Success criteria
  - Grocery deals display on supported merchants; >70% of users interact with at least one grocery deal within first month; clear differentiation from other deal types; compliant with platform policies.

---

## 18) Autoreward detection and bank connection guidance

Status: Ready for refinement

Goal: Detect when users visit merchants that support autorewards (automatic cashback via connected bank accounts) and provide contextual guidance based on their bank connection status.

- Merchant detection
  - Detect visits to merchants offering autoreward deals (identified by `AUTOREWARD` deal type).
  - Fetch autoreward availability from API based on domain and user's country.
  - Include partner info: supported banks, reward rates, terms, minimum purchase requirements.
  - Respect real-time blacklist to suppress prompts on sensitive pages.
- Bank connection status check
  - Query user's bank connection status from backend API (requires authentication).
  - Retrieve connected bank details: bank name, account number (last 3-4 digits), connection validity.
  - Cache connection status locally with short TTL (5-15 minutes) for performance.
- UX flow: Not connected
  - Show reminder panel or popup notification when visiting autoreward merchant.
  - Message: "Earn automatic cashback here! Download the Woolsocks app and connect your bank to get started."
  - Primary action: Deep link to app download (App Store/Play Store) or direct app open if installed.
  - Secondary action: "Learn more" → opens `woolsocks.eu/autorewards` explaining the feature.
  - Include visual: bank connection illustration, reward rate preview.
- UX flow: Connected
  - Show guidance panel with activation instructions when visiting autoreward merchant.
  - Message: "Earn [X]% cashback automatically! Pay with your connected [Bank Name] account ending in ...123 to activate."
  - Include: merchant logo, reward rate, purchase requirements (if any), expected reward timeframe.
  - Optional action: "View details" → opens `woolsocks.eu/autorewards/{dealId}` with full terms.
  - Show success state if recent purchase detected (if API provides confirmation).
- Deep linking and app integration
  - Link to app with context: `woolsocks://autorewards/connect?merchant={merchantId}&source=extension`.
  - On mobile browsers, use universal links for seamless app opening.
  - On desktop, show QR code or SMS link to continue on mobile device.
- Platform considerations
  - Desktop: Show QR code or app download link for mobile app connection flow.
  - Mobile web: Direct deep link to app with fallback to app store.
  - App group/shared storage: Sync connection status between app and extension (iOS/Safari).
- Privacy and security
  - Never expose full account numbers; only show last 3-4 digits for verification.
  - Bank connection managed exclusively by app backend; extension only displays status.
  - Clear messaging about data usage and PSD2/Open Banking compliance.
  - Provide "disconnect bank" option in app settings with clear consequences.
- Multiple bank accounts
  - If user has multiple connected banks, show applicable ones for current merchant.
  - Allow selection if merchant supports multiple banks: "Pay with [Bank A ...123] or [Bank B ...456]".
- Analytics
  - Track `autoreward_detected`, `autoreward_not_connected_shown`, `autoreward_connected_shown`, `autoreward_app_link_clicked`, `autoreward_detail_view` with `domain`, `partner_name`, `deal_id`, `bank_status`, `bank_name`, `country`, `ext_version`.
- Success criteria
  - Autoreward merchants detected reliably; bank connection status accurate with <5s latency; clear differentiation between connected/not-connected UX; >40% conversion from "not connected" prompt to app download/open; compliant with banking regulations and platform policies.

---

## 19) In-extension merchant search and navigation

Status: Ready for implementation

Goal: Allow users to search for merchants directly within the extension popup and navigate to their websites with a single click, enabling proactive discovery of cashback opportunities.

- Search interface
  - Add search input field in extension popup (prominent placement, e.g., top of popup).
  - Support real-time search with debounced input (300ms delay to reduce API calls).
  - Display search results as a list below the input field.
  - Show "no results" state with suggestions or popular merchants when query yields nothing.
- Merchant search API
  - Query merchant/partner search endpoint with user's search term and country.
  - Filter results by user's country to show only eligible merchants.
  - Return merchant metadata: name, logo, domain, available deal types (cashback/voucher/grocery/autoreward), rates.
  - Support fuzzy matching and autocomplete suggestions for better UX.
  - Cache popular/recent searches locally for instant results.
- Search result display
  - Show merchant cards with: logo, name, cashback rate (e.g., "Up to 5% cashback"), deal types (icons/badges).
  - Indicate deal availability: "Online cashback", "Vouchers", "Grocery deals", "Autorewards".
  - Highlight best rate or special promotion if applicable (e.g., "Increased rate: 10%!").
  - Sort results by relevance: exact name match first, then by popularity/rate.
- Navigation and activation
  - Clicking a merchant card opens the merchant's website in current or new tab.
  - If online cashback is available and auto-activation is enabled, trigger activation flow.
  - If vouchers are available, optionally show voucher panel after navigation.
  - Pass tracking parameters for attribution: `utm_source=woolsocks_extension&utm_medium=merchant_search`.
- Search features
  - Recent searches: Show last 3-5 searched merchants for quick access.
  - Popular merchants: Display top merchants by country when search is empty.
  - Category filters: Optionally filter by category (e.g., fashion, electronics, travel, grocery).
  - Favorites/bookmarks: Allow users to star favorite merchants for quick access.
- UX considerations
  - Keyboard navigation: arrow keys to navigate results, Enter to open selected merchant.
  - Clear search button: quick way to reset and start new search.
  - Loading states: show skeleton/spinner while fetching results.
  - Error handling: graceful fallback if API fails (show cached/popular merchants).
- Platform consistency
  - Works identically on Chrome, Firefox, Safari extensions.
  - Mobile-optimized for Firefox Mobile and Safari iOS (touch-friendly).
- Privacy
  - Search queries not logged server-side unless explicitly stated for analytics.
  - Clear opt-in for search history/suggestions.
  - Provide "Clear search history" option in settings.
- Analytics
  - Track `merchant_search_query`, `merchant_search_results`, `merchant_search_click`, `merchant_search_no_results` with `query`, `result_count`, `merchant_name`, `position`, `deal_types`, `country`, `ext_version`.
- Success criteria
  - Search responds within <500ms for most queries; >60% of searches result in merchant click; keyboard navigation works smoothly; feature used by >30% of active users within first month; compliant with platform policies.

---

## 20) AI-powered price comparison on product pages

Status: Ready for refinement

Goal: When users visit e-commerce product pages, automatically detect the product and show alternative prices at other stores, including cashback opportunities, to help users find the best total deal.

- Product page detection
  - Detect when user is on a product detail page (vs. category/listing/homepage).
  - Use heuristics: URL patterns (`/product/`, `/p/`, `/item/`), structured data (JSON-LD, microdata), page layout signals.
  - Maintain per-merchant detection rules for major retailers to improve accuracy.
  - Respect real-time blacklist to suppress price comparison on sensitive pages.
- Product information extraction
  - Extract product details from page: title, brand, model number, SKU, EAN/UPC/GTIN, price, images.
  - Parse structured data: Schema.org Product markup, Open Graph tags, merchant-specific meta tags.
  - Use AI/ML for fallback extraction when structured data unavailable: title from H1/product name element, price from price element, attributes from description.
  - Normalize product names and remove merchant-specific formatting.
- AI-powered product matching
  - Send extracted product data to backend AI service for cross-store matching.
  - Use embeddings/semantic search to find identical or highly similar products across partner stores.
  - Match on multiple signals: exact EAN/GTIN match (highest confidence), brand + model number, normalized title similarity, image similarity, attribute matching.
  - Filter by product category to reduce false positives (e.g., don't match clothing with electronics).
  - Return confidence scores for each match (high/medium/low).
- Price comparison API
  - Query backend API with product identifiers and user's country.
  - Fetch prices from partner stores for matched products.
  - Include: store name, product URL, current price, original price (if on sale), stock availability, shipping costs (if available).
  - Integrate cashback/voucher data: cashback rate, available vouchers, net price after cashback.
  - Return results sorted by best total value (price - cashback).
- UX presentation
  - Show price comparison panel/card in popup or injected content panel on page.
  - Display comparison table/cards with: store logo, product name, price, cashback rate, total cost after cashback.
  - Highlight best deal: "Best price" or "Best value with cashback" badge.
  - Show price difference: "€5 cheaper" or "Same price + 3% cashback".
  - Include product image thumbnail for visual confirmation of match.
  - Sort options: lowest price, best value (price - cashback), highest cashback.
- Navigation and activation
  - Clicking an alternative store opens product page in new tab.
  - If cashback is available and auto-activation enabled, trigger activation flow.
  - Pass tracking parameters: `utm_source=woolsocks_extension&utm_medium=price_comparison&utm_campaign=product_match`.
- Match confidence and user feedback
  - Show confidence indicator for matches: "Exact match", "Very similar", "Similar product".
  - Allow user to report incorrect matches: "Not the same product" feedback button.
  - Use feedback to improve AI matching model over time.
  - Option to manually search for product if auto-match fails.
- Performance and efficiency
  - Cache product matches for 24 hours (product IDs → match results).
  - Only trigger price check when user shows interest: hover over extension icon, open popup, or after 5s dwell time on page.
  - Debounce repeated checks on same product page (single check per session).
  - Set timeout for AI matching (3-5 seconds); show partial results if available.
- Merchant coverage
  - Start with major e-commerce partners where product data is structured and reliable.
  - Gradually expand to smaller merchants as detection/extraction improves.
  - Maintain merchant-specific extractors for popular stores with unique markup.
- Privacy and consent
  - Clear opt-in during onboarding: "Help me find better prices with AI-powered comparison".
  - Product data sent to backend only for matching; not stored permanently or shared.
  - Option to disable price comparison per site or globally in settings.
  - Transparent about AI usage and data handling in privacy policy.
- Edge cases and limitations
  - Handle products with variants (size, color): try to match exact variant or show closest match with variant notice.
  - Handle region-specific products: only compare within user's country/region.
  - Handle marketplace listings: aggregate prices or show primary seller.
  - Show "No alternatives found" state gracefully with option to search manually.
- Platform considerations
  - Chrome/Firefox: Full functionality with content scripts and AI backend.
  - Safari: Comply with App Store review guidelines; ensure no automatic data collection without consent.
  - Mobile: Optimize UI for smaller screens; consider simplified comparison view.
- Backend AI service
  - Product matching model: fine-tuned transformer or embedding model for product similarity.
  - Training data: historical product catalogs, EAN/GTIN databases, user feedback on matches.
  - API design: `/api/v0/price-comparison/match` with product data → returns matched products + prices.
  - Scalability: caching, rate limiting per user, fallback to simpler matching if AI service unavailable.
- Analytics
  - Track `price_comparison_triggered`, `price_comparison_shown`, `price_comparison_alternative_click`, `price_comparison_best_deal_click`, `price_comparison_feedback` with `source_merchant`, `source_price`, `target_merchant`, `target_price`, `cashback_rate`, `price_difference`, `match_confidence`, `country`, `ext_version`.
- Success criteria
  - Product detection accuracy >85% on supported merchants; AI matching precision >90% for "exact match" confidence; >50% of comparisons show at least 2 alternatives; >30% of users click alternative store from comparison; <3s avg response time for price check; compliant with platform policies and privacy regulations.

---

## Completed items

### 2) Voucher analytics (events only)

Completed: 2025-10-09 — commit `6bb5ac3` (feat(analytics): add voucher events; GA guidance)

- Implemented events (GA4 Measurement Protocol)
  - `voucher_detected`, `voucher_panel_shown`, `voucher_view`, `voucher_click`, `voucher_used`
  - Key parameters: `domain`, `partner_name`, `provider_reference_id`, `rate`, `country`, `ext_version`
- Key events designated: `voucher_click`, `voucher_used`
- BI export and dashboards remain pending (tracked in active item 2)
### 3) Anonymous (not logged in) behaviors

Status: Completed — 2025-01-27

Goal: Ensure utility without a session.

- Popup
  - When not logged in, tapping the icon should still show eligible deals for the current site.
- Reminders
  - Checkout reminder and cashback activation reminder should trigger based on detection rules, gated by blacklist and user settings.
- Success criteria
  - Anonymous users see deals and prompts (unless blacklisted); no errors requiring login.

#### Implementation Details

Completed: 2025-01-27 — commit `21d0ef3` (feat(anonymous): enable anonymous user behaviors for popup and reminders)

- Removed session guard from popup deal loading to allow anonymous users to view deals
- Added analytics tracking for anonymous user interactions (`anonymous_deals_viewed`, `anonymous_login_clicked`)
- Added `ANALYTICS_TRACK` message handler in background script
- Reduced popup vertical padding by 50% for improved UX
- Verified reminder systems already work for anonymous users (checkout detection, cashback reminders)
- Anonymous users can now see deals in popup, receive reminders, and interact with extension without authentication
- Foundation ready for blacklist integration (Roadmap Item 1) and anonymous clickouts (Roadmap Item 4)

---
## Small bugs/fixes (ongoing)

Status: Backlog (triage weekly)

- Onboarding: Step indicator not visible in popup (investigate stacking/margin overlap; ensure z-index/margins; add tests)
- Onboarding: Progress ring approach caused render abort on some pages (keep text-only until robust)
- Countdown UI: Ensure consistent spacing and cancel alignment across sites
- Popup/options: Ensure language fallback uses browser locale when not logged in (done; monitor)
- Asset usage: Use correct illustration `Chillin girl.png` in activation card (done)
- Lokalise: Spanish (es) translation upload fails with 403 permission error (investigate Lokalise permissions; translations work correctly in extension builds)

Success criteria
- All onboarding screens render consistently in popup dimensions
- No regressions in countdown visibility/cancel interaction
- Assets and locale fallback behave as expected across browsers

---
### 9) Investigate visible woolsocks.eu tabs (open/close) and alternatives

Status: Completed — 2025-10-09

Goal: Understand why visible `woolsocks.eu` tabs are created/closed during flows (e.g., relay, cookie-first proxying, activation confirmation) and determine if we can eliminate or hide them while preserving all functionality and policy compliance.

- Background
  - The extension may open a `woolsocks.eu` tab to relay authenticated API requests or confirm activation when background contexts lack cookie access.
  - Users can observe brief tab flashes, which is undesirable UX.
- Investigation
  - Map every code path that opens a `woolsocks.eu` tab: purpose, triggering event, required cookies/headers, lifetime, and close conditions.
  - Measure frequency, duration, and user-visible impact across key sites and flows.
  - Review browser policies for hidden/offscreen contexts per platform.
- Alternatives to evaluate
  - Background fetch with credentials via site-proxy where allowed; re-check MV3 constraints.
  - Offscreen documents (Chrome MV3) for fetch/UI-less work; lifecycle and permission review.
  - Extension `cookies` permission with first-party partitioned cookies where applicable.
  - Content-script relay on an existing `woolsocks.eu` tab (only when user has it open), avoiding programmatic opens.
  - Using `declarativeNetRequest` or `webRequest` alternatives for redirect confirmation without a visible tab (policy constraints permitting).
  - For Safari: evaluate app group messaging and XPC to avoid tab opens; for Firefox: equivalent background capabilities.
- Risks & constraints
  - Some flows may require a foreground browsing context for cookie inclusion or redirect completion, depending on browser.
  - Offscreen or hidden contexts differ by browser and review policies.
- Success criteria
  - No user-visible `woolsocks.eu` tab opens/closes during standard flows on supported browsers, or tab flashes reduced by >95% with no loss of functionality.
  - All changes remain compliant with Chrome Web Store, App Store (Safari), and AMO policies.

SOLUTION NOTES: 
#### Offscreen relay (eliminate visible woolsocks.eu tab flashes)

Completed: 2025-10-09 — commit `7b6800a` (feat(relay): add Chrome offscreen relay with hidden iframe, prefer offscreen over tab relay; manifest updates; content relay postMessage; refs roadmap #9)

- Implemented Chrome MV3 offscreen document with hidden iframe to `woolsocks.eu`
- Added platform guards: Chrome uses offscreen relay, Firefox/Safari reuse existing tabs only
- Added analytics events: `relay_attempt_offscreen`, `relay_offscreen_success|fail`, `relay_attempt_tab`, `relay_tab_result`
- Updated permissions documentation and QA testing guide
- Success criteria met: no user-visible `woolsocks.eu` tab opens/closes on Chrome; >95% reduction in tab flashes

---