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

Status: Ready for refinement

Goal: Port MV3 functionality to Firefox variants.

- Desktop
  - Validate APIs parity (alarms, storage, webNavigation, cookies). Replace gaps with polyfills/workarounds.
- Android (Firefox Mobile)
  - Optimize for limited APIs; ensure popup/options UI renders and core detection works.
- Packaging
  - WebExtension manifest adjustments; AMO listing and signing.
- Success criteria
  - Feature parity for detection, reminders, voucher panel, and cashback activation on desktop; core flows on mobile.

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

## 8) Explicit auto-activation consent per platform

Status: Ready for refinement

Goal: Define platform-specific rules for auto-activating cashback via redirects, with explicit consent where allowed and compliant fallbacks where not.

### Chrome Web Store (Google) — upfront consent + countdown notification with opt out
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

### Safari (macOS & iOS) — automatic redirects not allowed

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

### Android / Play Store — allowed for native apps (not Chrome extensions)

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

Problem: Deals from outside the user's country are considered and shown today, which can mislead users (e.g., Dutch users seeing Amazon.com vouchers that do not apply in NL).

- Goal
  - Restrict eligibility and presentation of deals to the user's effective country/locale for both vouchers and online cashback.
- Country source of truth
  - Derive from: signed-in profile country; else explicit setting in extension; else browser locale fallback.
  - Persist in storage; allow override via Settings.
- Filtering and matching
  - For vouchers: include only `GIFTCARD` where provider/country matches user country; exclude cross-country products (e.g., amazon.com for NL).
  - For online cashback: include only `CASHBACK` with `usageType ONLINE` and matching `country` and domain/locale mapping.
  - Maintain a domain→country/locale map (per partner) to avoid cross-locale hostnames (e.g., `.com` vs `.nl`).
- UX
  - If a site is detected but only cross-country deals exist, show a neutral message: "No deals available for your country." Optionally offer a country switch entry point.
  - Respect real-time blacklist to suppress prompts on sensitive sites.
- Analytics
  - Emit `deal_country_mismatch` with `domain`, `partner`, `deal_country`, `user_country`, `flow` (voucher/oc).
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

Goal: Remove the `alarms` permission from the extension manifest to pass Chrome Web Store review, while maintaining all current functionality through alternative approaches.

**Reference: Chrome Web Store Rejection (Item ID: fneoceodefiieccfcapkjanllehpogpj)**
> "Requesting but not using the following permission(s): alarms. Remove the unused permission(s) listed above from your manifest file. Request access to the narrowest permissions necessary to implement your Product's features or services. Don't attempt to 'future proof' your Product by requesting a permission that might benefit services or features that have not yet been implemented."

- Current usage of alarms
  - Periodic cleanup tasks (storage, analytics queue, cooldown expiration).
  - Analytics batch flushing and retry mechanisms.
  - Session timeout and cooldown management.
- Alternative approaches
  - Event-driven cleanup: trigger cleanup on storage changes, tab events, or user interactions.
  - Immediate analytics flush: send analytics events immediately instead of batching with periodic flush.
  - Lazy cleanup: perform cleanup operations when extension becomes active or on specific user actions.
  - Use `setTimeout`/`setInterval` in service worker context (limited to service worker lifetime).
- Implementation strategy
  - Audit all current alarm usage and map to event-driven alternatives.
  - Replace periodic analytics flush with immediate sending or event-triggered batching.
  - Use storage change listeners and tab activation events for cleanup triggers.
  - Implement graceful degradation when service worker is inactive.
- Testing requirements
  - Verify all cleanup operations still work without alarms.
  - Test analytics delivery without periodic flushing.
  - Ensure no memory leaks or storage bloat over time.
- Success criteria
  - Extension passes Chrome Web Store review without alarms permission.
  - All current functionality preserved (cleanup, analytics, cooldowns).
  - No performance degradation or reliability issues.

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