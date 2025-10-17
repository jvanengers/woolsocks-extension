# Woolsocks Extension Roadmap

This roadmap outlines planned enhancements across browsers and mobile companions. It will be maintained in Git and updated as scope clarifies.


### Prioritized backlog (RICE)

Estimated RICE scores (Reach × Impact × Confidence ÷ Effort in person‑weeks). Higher score = higher priority. Estimates are directional and should be refined during planning.

| Rank | Item | R | I | C | Effort (w) | RICE |
|---|---|---:|---:|---:|---:|---:|
| 1 | 16) Post‑installation landing page | 100 | 1.5 | 0.9 | 1 | 135 |
| 2 | 22) Order success detection + orderId capture | 60 | 3.0 | 0.7 | 2 | 63 |
| 3 | 1) Realtime blacklists | 80 | 2.0 | 0.8 | 3 | 42.7 |
| 4 | 21) Migrate to Firebase Analytics | 100 | 1.0 | 0.8 | 2 | 40 |
| 5 | 10) Competitor suggestions when no cashback | 70 | 1.5 | 0.6 | 3 | 21 |
| 6 | 19) In‑extension merchant search | 50 | 1.5 | 0.8 | 3 | 20 |
| 7 | 4) Anonymous clickouts | 60 | 2.0 | 0.6 | 4 | 18 |
| 8 | 18) Autoreward detection & guidance | 25 | 1.5 | 0.6 | 4 | 5.6 |
| 9 | 17) Grocery deals | 40 | 1.0 | 0.6 | 6 | 4 |
| 10 | 5) Safari Extensions (macOS & iOS) | 20 | 2.0 | 0.7 | 8 | 3.5 |
| 11 | 7) Android companion app | 30 | 2.0 | 0.5 | 10 | 3 |
| 12 | 20) AI‑powered price comparison | 40 | 2.0 | 0.4 | 12 | 2.7 |
| 13 | 6b) Firefox support (Mobile) | 10 | 1.0 | 0.8 | 4 | 2 |

Notes:
- Assumes consented users and supported locales. Reach approximates quarterly user/event exposure.
- Effort reflects engineering weeks for extension work (excludes backend where noted); cross‑team dependencies may adjust.
- Re‑score after discovery spikes; especially for items 20 and 7 where uncertainty is higher.

## 1) Realtime blacklists
Status: Ready to refine

Goal: Support realtime blacklists for two flows and provide a fallback experience that avoids proactive reminders while still allowing usage.

- Realtime blacklist types
  - Online cashback
  - Voucher checkout
- Delivery
  - Fetch blacklist config at startup and on interval; accept push/remote overrides.
  - Cache with short TTL; fail-open with last-known good and versioning.
- Behavior
  - When blacklisted, suppress proactive reminders and redirects for the matching flow.
- Analytics
  - Emit `*_blocked` with `reason`, `policy_version`, and `flow`.
- Success criteria
  - Config propagates within 5 minutes; zero proactive prompts on blacklisted sites; manual affordance available and functional.
---

## 4) Anonymous clickouts (no verification required)

Status: Ready to refine
Goal: Allow users to generate tracked clickouts without any account. The extension would be fully functional, and cashback is associated to a temporary "extensionid"? Later the user can signup to claim the cashback.

- Clickout flow (anonymous)
  - Anonymous clickouts.
  - Redirect through affiliate with extensionid-linked click id
  - Persist recent clickouts locally for UX/diagnostics.
- Optional later verification (enhancement)
  - If/when user later verifies email or logs into full account, clicks need to move to this acocunt.
- Fraud/abuse controls
  - Include domain, IP coarse hash, and UA fingerprint hash (privacy-preserving) for dedupe/risk.
  - Rate limit anonymoys clickouts.
- Success criteria
  - Users can perform tracked clickouts immediately; clickouts appear under a created account if users signs up later, without further action.

---

## 5) Safari Extensions (macOS & iOS/iPadOS)

Status: In progress. See branch feature/safari-ios-extension

### iOS/iPadOS (Mobile Safari)

Goal: Bundle a Safari Web Extension inside the Woolsocks app with app group storage and support deep links to in-app voucher checkout.

- App group
  - Share settings/session signals via `App Group` between host app and extension. Extension is authomatically authenticated
- Deep linking
  - From extension UI, open app to voucher checkout via universal link; pass context (partner, product, rate).
- Build & distribution
  - Xcode workspace with extension target; align entitlements and provisioning; TestFlight.
- Update the UX for mobile screens / safari browser
- Success criteria
  - Extension runs on iOS Safari; deep link opens app at voucher checkout; settings sync via app group.

### macOS (Desktop Safari)

Goal: Ship a Safari Web Extension for macOS with parity for detection, reminder UI, voucher panel, and reminders to manual cashback activation (no auto-redirects without a user gesture per Apple policy).

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
  
### 8)Safari (macOS & iOS) — automatic redirects not allowed

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

---

## 6b) Firefox support (Mobile)

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

## 21) Migrate from Google Analytics to Firebase Analytics
Status: Ready for implementation
Goal: Migrate analytics tracking from the current Google Analytics 4 setup to Firebase Analytics SDK for better integration with the Firebase ecosystem and improved analytics capabilities.

- Firebase configuration
  - App ID: `1:569989225682:web:8036c27a88e992c2cd210b`
  - Project: `woolsocks-release`
  - Measurement ID: `G-WK9ZNG07JV`
  - API Key: `AIzaSyBtq8BW-qwWDB8JUbOp_RCrseWKkEoHIec`
  - Auth Domain: `woolsocks-release.firebaseapp.com`
  - Database URL: `https://woolsocks-release.firebaseio.com`
  - Storage Bucket: `woolsocks-release.firebasestorage.app`
  - Messaging Sender ID: `569989225682`
- SDK integration
  - Install Firebase JS SDK (v7.20.0+) via npm: `firebase` package.
  - Initialize Firebase app with provided config in background script/offscreen context.
  - Replace current GA4 Measurement Protocol HTTP calls with Firebase Analytics SDK methods.
  - Use `logEvent()` for custom events instead of direct HTTP POST to GA4 endpoint.
  - Preserve all existing event names and parameters for continuity.
- Event mapping
  - Map all current GA4 custom events to Firebase Analytics events: `voucher_detected`, `voucher_click`, `voucher_used`, `cashback_activated`, etc.
  - Preserve custom parameters: `domain`, `partner_name`, `deal_id`, `amount_type`, `rate`, `country`, `provider`, `link_host`, `reason`, `ext_version`, `click_id`.
  - Use standard Firebase fields for currency and user properties.
  - Ensure key events remain designated: `voucher_click`, `voucher_used`, `cashback_activated`.
- User identification
  - Set user ID with `setUserId()` when user logs in (use stable `userId` from backend).
  - Set user properties with `setUserProperties()`: country, user_type (logged_in/anonymous), account_age.
  - Clear user ID on logout.
- Platform compatibility
  - Chrome: Full Firebase SDK support; initialize in background service worker or offscreen document.
  - Firefox: Verify Firebase SDK compatibility with MV3 service workers; use offscreen/tab-based relay if needed.
  - Safari: Test Firebase SDK in Safari Web Extension context; consider native Firebase SDK integration in host app for iOS/macOS.
- Privacy and consent
  - Maintain existing analytics consent flow: no tracking until user accepts.
  - Set Firebase Analytics `analytics_storage` consent based on user preferences.
  - Update privacy policy to reflect Firebase Analytics usage.
  - Ensure compliance with GDPR/CCPA: anonymize IP, respect DNT if applicable.
- Migration strategy
  - Phase 1: Add Firebase Analytics alongside current GA4 (dual tracking for validation).
  - Phase 2: Monitor parity between GA4 and Firebase events for 1-2 weeks.
  - Phase 3: Remove GA4 Measurement Protocol code once Firebase is validated.
  - Phase 4: Update documentation and monitoring dashboards to use Firebase console.
- BigQuery integration
  - Enable Firebase Analytics → BigQuery export for BI dashboards (completes Roadmap Item 2 dependency).
  - Configure daily export schedule and schema mapping.
  - Update existing dashboards to query BigQuery tables instead of GA4 export.
- Testing and validation
  - Verify event delivery in Firebase Console DebugView during development.
  - Compare event counts between GA4 and Firebase during dual tracking phase.
  - Test user ID and user properties propagation.
  - Validate offline event queuing and retry logic.
  - Test across all platforms: Chrome, Firefox, Safari (desktop and mobile).
- Performance considerations
  - Firebase SDK is heavier than direct HTTP calls; measure impact on service worker memory/startup.
  - Consider lazy loading Firebase SDK only when analytics consent is granted.
  - Set appropriate event batch size and upload interval.
- Analytics
  - Track migration itself: `analytics_migrated_to_firebase` with `previous_system=ga4`, `migration_date`, `ext_version`.
  - Monitor Firebase event delivery rates and compare with GA4 baseline.
- Success criteria
  - Firebase Analytics receives all events with <5% discrepancy vs. GA4 during dual tracking; BigQuery export enabled and validated; GA4 code removed; dashboards updated; performance impact <10% increase in service worker memory; compliant with privacy policies.

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

## 22) Order success page detection and order ID capture

Status: Ready for refinement

Goal: Detect e‑commerce "thank you"/order success pages, extract the merchant order ID, and send it to the backend together with the previously generated `clickId` so the backend can file online cashback claims automatically with networks (actual claim submission is out of scope here).

- Detection
  - Recognize post‑checkout success states using layered heuristics:
    - URL patterns: `/thank-you`, `/order-confirmation`, `/order/success`, `/checkout/complete`, `?success=true` (per‑merchant allowlist rules preferred over generic).
    - DOM signals: presence of phrases (localized) like "Thank you for your order", "Order number", "Bestellnummer", and structured containers that often hold order summaries.
    - Structured data and analytics: read `window.dataLayer` (GA/GTM `ecommerce.purchase`, `transaction_id`), JSON‑LD `Order`/`Invoice`, and meta tags where available.
    - Debounce and idempotency: ensure detection only fires once per order (persist last seen `domain+orderId` with TTL to avoid duplicates).
- Extraction
  - Attempt in priority order:
    1) `dataLayer` purchase payloads: `transaction_id`/`order_id`, `value`, `currency`.
    2) JSON‑LD `Order` schema: `orderNumber`, `price`, `priceCurrency`.
    3) DOM regex around labeled fields: `Order (ID|No|Number)` and common localizations.
  - Normalize `orderId` (trim whitespace, strip prefixes like `#`).
  - Optionally capture `amount` and `currency` when present (best effort, never block on these).
- Correlation with clickouts
  - Retrieve most recent `clickId` for the same eTLD+1 within a short window (default 24h; configurable 6–48h) from extension storage.
  - Prefer clickouts that occurred before the order time and after the first visit in the current session; pick most recent eligible.
  - Store lightweight evidence for debugging: `clickedAt`, `activated`, `domain`.
- Backend integration
  - Send a POST to backend endpoint (to be defined by backend team), e.g. `/api/v0/orders/confirm` with payload:
    - `domain`: merchant eTLD+1 (e.g., `nike.com`)
    - `orderId`: normalized string
    - `clickId`: string (from extension tracked clickout)
    - `amount` (optional): number
    - `currency` (optional): ISO 4217 code
    - `extVersion`: extension version, `platform`
  - Retries with backoff on transient errors; queue offline and flush when online.
  - Strict dedupe: backend should treat `(domain, orderId)` as idempotent key.
- Privacy & policy
  - Feature respects existing analytics/tracking consent; do not run without consent.
  - Capture only order metadata needed for attribution (no item‑level PII, no names/addresses).
  - Apply real‑time blacklist to disable on sensitive sites.
- UX considerations
  - Silent background capture; no intrusive UI on success pages.
  - Optional subtle toast: "Order detected. We’ll process your cashback automatically." (A/B and locale aware; off by default.)
- Analytics
  - Emit `order_success_detected` with `domain`, `source` (url|dom|dataLayer|jsonld), `has_amount`, `has_currency`.
  - Emit `order_capture_sent`/`order_capture_failed` with reason and HTTP status, and `click_correlation_status` (matched|none|ambiguous).
- Success criteria
  - >95% of supported merchants’ success pages detected; duplicate submissions <0.5%; correlation finds a `clickId` in >80% of genuine orders within 24h window; negligible user‑visible impact; fully compliant with consent and blacklist rules.

---

## 23) Support fixed-amount cashback (online cashback)

Status: Ready for refinement

Goal: Add support for online cashback rates that are fixed amounts (e.g., €5 back) in addition to percentage-based rates, driven by an explicit API property so the extension can display and handle both types correctly.

- API model (to be aligned with backend)
  - Add/confirm property on deal/rate entity: `amountType: "PERCENTAGE" | "FIXED"`.
  - When `amountType == "PERCENTAGE"`: use existing `rate` (e.g., `0.05` → 5%).
  - When `amountType == "FIXED"`: provide `amount` (number) and `currency` (ISO 4217), and ignore percentage `rate`.
  - Ensure responses include per‑country values consistent with existing country scoping (see item 11).
- Detection and filtering
  - No change to merchant detection; applies to online cashback (`usageType ONLINE`).
  - Respect real‑time blacklists (item 1) and existing eligibility checks.
- UX and formatting
  - Display percentages as today (e.g., “Up to 5%”).
  - Display fixed amounts as currency (e.g., “Get €5 back”).
  - For mixed offers (if present), prefer the highest expected value for messaging; consider a secondary line for the alternate type.
  - Localize currency formatting and symbol placement per locale.
- Analytics
  - Add parameter `amount_type` = `percentage|fixed` to relevant events (`cashback_detected`, `cashback_activated`, etc.).
  - For fixed amounts, include `amount` and `currency` parameters where available.
- Edge cases
  - Tiered or category‑specific fixed amounts: show a conservative summary (e.g., “Up to €X back”) and details in panel.
  - Currency mismatches: only show fixed amounts in the user’s country currency or clearly label currency if cross‑border.
- Success criteria
  - Fixed‑amount deals render correctly with proper currency formatting across supported locales; analytics capture `amount_type` reliably; no regressions for percentage deals; compliant with blacklist and consent rules.

---



# Small bugs/fixes (ongoing)

Status: Backlog (triage weekly)

- Onboarding: Step indicator not visible in popup (investigate stacking/margin overlap; ensure z-index/margins; add tests)
- Onboarding: Progress ring approach caused render abort on some pages (keep text-only until robust)
- Countdown UI: Ensure consistent spacing and cancel alignment across sites
- Popup/options: Ensure language fallback uses browser locale when not logged in (done; monitor)
- Asset usage: Use correct illustration `Chillin girl.png` in activation card (done)
- Lokalise: Spanish (es) translation upload fails with 403 permission error (investigate Lokalise permissions; translations work correctly in extension builds)
- Firefox popup: First name greeting not shown (shows "Hi there,")
  - Context: On Firefox MV2 we hide balance; header should show "Hi {firstName},". API sometimes returns 304 from `user-info` via site proxy; cached profile not surfaced to popup, leaving empty firstName.
  - Likely cause: Cached profile retrieval race and 304 handling between background cached-api and popup request; missing refresh/write before read.
  - Fix proposal:
    - Ensure background `fetchUserProfileCached()` writes cache on 200 and returns existing cache on 304/empty body (implemented), then expose `GET_CACHED_USER_DATA.profile` consistently.
    - In popup, call `GET_CACHED_USER_DATA` first; if no `profile`, await `REFRESH_USER_DATA_PROFILE_ONLY` and retry read once with short delay.
    - Add debug logs + unit test for 304 fallback path in `cached-api.ts`.
  - Success criteria: On Firefox, header reliably shows "Hi {firstName}," within 1s when logged in; no relay tabs created; no regressions on Chrome.

### Firefox AMO automated review follow‑ups

Status: Backlog (AMO compliance)

Source: Firefox automated tests flagged warnings during XPI upload. Address the following to reduce review friction and future rejections.

1) Remove stray platform files (.DS_Store)
   - Problem: `.DS_Store` found in package (root and public/).
   - Action: Exclude on packaging (zip) and Vite copy step; add to `.gitignore`.
   - Success: XPI contains no `.DS_Store` files.

2) Unsafe assignment to innerHTML (content/oc-panel.js)
   - Problem: Multiple `innerHTML` writes with dynamic content.
   - Action A (preferred): Replace with DOM building (`createElement`, `textContent`).
   - Action B: If HTML is required, sanitize allowlisted tags/attrs (tiny sanitizer or DOMPurify) before assignment.
   - Success: No unsanitized `innerHTML` writes; AMO warning disappears.

3) action.* API not supported on Firefox MV2
   - Problem: Usage of `chrome.action.setIcon/setTitle/onClicked/openPopup` flagged as unsupported.
   - Action: Introduce adapter `const actionApi = chrome.action || chrome.browserAction;` and guard `openPopup` (fallback to setPopup + user gesture).
   - Success: No AMO warnings; functionality preserved across Chrome/Firefox.

4) Unsafe assignment to innerHTML (assets/OnboardingComponent-*.js)
   - Problem: `dangerouslySetInnerHTML`/`innerHTML` in onboarding copy.
   - Action: Render copy with JSX elements (no HTML strings) or sanitize specific allowed tags (links, bold) before render.
   - Success: Onboarding renders identical UI without unsanitized HTML.

5) Manifest: missing data_collection_permissions (Gecko)
   - Problem: `browser_specific_settings.gecko.data_collection_permissions` missing; will be required.
   - Action: Add the section reflecting real data collection. Example:
     - `collects_browsing_data: false`
     - `collects_personal_data: false`
     - `collects_telemetry: true`
     - `description: "Anonymous usage analytics to improve the extension. No browsing history or personal data collected."`
   - Success: AMO info notice resolved; manifest future‑proofed.

6) Packaging hygiene
   - Problem: Non‑code assets included unnecessarily inflate size and trigger flags.
   - Action: Ensure packaging excludes maps, hidden files, and editor temp files; keep public assets minimal.
   - Success: Smaller XPI; fewer automated notices.

Rollout plan:
 - Implement 2 and 4 in source (TypeScript/React), not in built JS, to keep diffs reviewable.
 - Add adapter for 3 in `src/shared/actionApi.ts` and refactor background to import it.
 - Update manifest template for 5 only in Firefox build.
 - Update packaging script for 1 and 6.
 - Verify via AMO preliminary upload; iterate if new warnings appear.

Success criteria
- All onboarding screens render consistently in popup dimensions
- No regressions in countdown visibility/cancel interaction
- Assets and locale fallback behave as expected across browsers

---

SOLUTION NOTES: 


---

# Completed

## 11) Enforce country-scoped deals (vouchers and online cashback)

Status: Completed — 2025-10-13 (see Completed items)

Problem: Deals from outside the visited site's country are considered and shown today, which can mislead users (e.g., Dutch users seeing Amazon.com vouchers that do not apply in NL).

- Goal
  - Apply country-scoping rules aligned with product constraints:
    - Vouchers: restricted by the visited domain’s country.
    - Online cashback: restricted by the user account’s country (service rule).
- Country source of truth (runtime)
  - Vouchers (per-visit): derive country from the visited URL/domain using domain/locale parsing (e.g., TLD `.nl`, path `/nl/`, brand-specific patterns).
  - Online cashback (per-user): use signed-in profile country as the authoritative source; fall back to language-derived default only when user country is unknown.
  - Persist last derived values in storage for diagnostics; allow override via Settings for debugging.
- Filtering and matching
  - Vouchers (`GIFTCARD`): include only when the voucher's canonical product URL locale segment matches the visited domain country (e.g., product URL path `/nl-NL/giftcards-shop/...` → NL). Do not rely on a query parameter; country is conveyed via the locale path segment.
  - Online cashback (`CASHBACK` with `usageType ONLINE`): include only when the deal's `country` matches the user's account country.
  - Maintain and use a domain→country/locale map (per partner) for voucher scoping to avoid cross-locale hostnames (e.g., `.com` vs `.nl`) and to correctly interpret path-based locales (e.g., `nike.com/nl/en`).
- UX
  - If a site is detected but only cross-country deals exist, show a neutral message: "No deals available for your country." Optionally offer a country switch entry point.
  - Respect real-time blacklist to suppress prompts on sensitive sites.
- Analytics
  - Emit `deal_country_mismatch` with `domain`, `partner`, `deal_country`, `visited_country` (voucher) or `user_country` (online cashback), `flow` (voucher/oc).
- Success criteria
  - Cross-country deals no longer appear; reduced misclicks/complaints; country match rate > 99% across top domains.

---

## 13) Anonymous API calls to reduce tab flashing
Status: Completed

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
---

### COMPLETED: Chrome Web Store (Google) — upfront consent + countdown notification with opt out
We should adapt the automatic redirection pattern so it follows these guidelines:
    1.    During onboarding, ask explicitly:
“Do you want Woolsocks to auto-activate cashback (redirect via affiliate link) when you visit partner stores?”
→ Options: Enable auto mode / Ask me each time
    2.    If user enables auto mode, you remember their preference, but you do not silently redirect.
    3.    At each partner store load, show a small but obvious UI element (banner, toast, modal) saying:
“Auto-activating cashback in 3…2…1 — click here to cancel”
Or
“Activate cashback now → [button]”
    4.    If needed, you can implement a countdown (3→2→1) before redirect, as long as the countdown is visible, counts down in the UI, and the user can cancel or see that it’s happening.
    5.    Always let the user opt-out later (in settings or toggle) and make the auto behavior reversible.
    6.    In your extension listing/privacy docs, clearly disclose the affiliate monetization and redirection behavior.
Don’t do background tabs that user doesn’t see. Don’t silently override cookies. Everything must be traceable and visible.
    3.    Respect existing affiliate attribution
Don’t override someone’s affiliate tags or tracking codes already present (unless you’re absolutely sure it’s expired or invalid).
    5.    Always let user opt out or revoke
User can disable auto activation. All activity should be transparent.

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
### 11) Enforce country-scoped deals (vouchers and online cashback)

Completed: 2025-10-13 — commit `ea32a5d`

- Vouchers: filtered by visited domain country; voucher product URLs localized via `getVoucherLocaleForCountry()`.
- Online cashback: filtered by user account country (from `user-info`), not visited domain country.
- Added analytics for mismatches and voucher filters: `deal_country_mismatch`, `voucher_country_filtered_out`.
- Updated roadmap to reflect service rule: online cashback by user country.

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


## 6a) Firefox support (desktop )

Status: MVP Done. 

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
#### Offscreen relay (eliminate visible woolsocks.eu tab flashes)

Completed: 2025-10-09 — commit `7b6800a` (feat(relay): add Chrome offscreen relay with hidden iframe, prefer offscreen over tab relay; manifest updates; content relay postMessage; refs roadmap #9)

- Implemented Chrome MV3 offscreen document with hidden iframe to `woolsocks.eu`
- Added platform guards: Chrome uses offscreen relay, Firefox/Safari reuse existing tabs only
- Added analytics events: `relay_attempt_offscreen`, `relay_offscreen_success|fail`, `relay_attempt_tab`, `relay_tab_result`
- Updated permissions documentation and QA testing guide
- Success criteria met: no user-visible `woolsocks.eu` tab opens/closes on Chrome; >95% reduction in tab flashes

## 14) Comprehensive caching for performance optimization
Status: Completed

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
