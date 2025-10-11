# Testing Guide (Manual / E2E)

Current scope: NL users, voucher checkout detection, anonymous user behaviors, auto-activation consent flows, interactive deals, and updated UI components.

## Session
1. Open `https://woolsocks.eu/nl/profile` and sign in (cookies must exist)
2. Open the extension Options page and verify it says "Hi {firstname}" and shows a sock value

## Session Recovery (roadmap #12)
1. **Email storage verification**:
   - Login to woolsocks.eu and open extension popup
   - Verify email is automatically stored (check `chrome.storage.local` for `__wsUserEmail`)
   - Verify analytics event: `session_recovery_email_stored`
2. **Verification flow testing**:
   - Clear woolsocks.eu cookies (simulate session loss)
   - Open extension popup and click "Login"
   - Verify verification screen appears with masked email (e.g., "jv***@apcreation.nl")
   - Verify verification email is sent automatically
   - Verify analytics events: `verification_screen_shown`, `verification_email_triggered`
3. **Resend functionality**:
   - Click "Resend link" button
   - Verify 60-second cooldown is enforced
   - Verify cooldown countdown displays correctly
   - Verify analytics event: `verification_resend_clicked`
4. **Balance timestamp display**:
   - After session loss, verify cached balance shows "Last updated: X minutes ago"
   - Verify timestamp updates when fresh data is loaded
   - Test in both popup and options page
5. **Fallback behavior**:
   - Clear stored email via settings "Forget Me" button
   - Click "Login" → verify redirects to woolsocks.eu
   - Verify analytics event: `session_recovery_email_cleared`
6. **Settings integration**:
   - In options page, verify "Stored Email" section appears when email is stored
   - Verify "Clear Email" button with confirmation dialog
   - Verify email masking in settings display
7. **Session restoration**:
   - Complete verification flow by clicking email link
   - Verify session is restored and popup shows authenticated state
   - Verify balance updates to current value

## Cache Performance (roadmap #14)
1. **Cache functionality**:
   - Login to woolsocks.eu and open extension popup
   - Note the time it takes to load balance (should be instant on subsequent opens)
   - Open extension options page and verify balance loads instantly
   - Verify transactions load instantly in options page
2. **Cache refresh behavior**:
   - Open popup multiple times quickly - should show cached data instantly
   - Wait 10+ minutes, open popup - should trigger background refresh
   - Verify balance updates after background refresh completes
3. **Cache management UI**:
   - In options page, find "Cache Management" section
   - Click "Refresh Data" - verify data reloads and shows fresh information
   - Click "Clear Cache" - verify cache is cleared and data reloads
4. **Cache persistence**:
   - Close browser completely and reopen
   - Open extension popup - should still show cached balance instantly
   - Verify cache survives browser restart
5. **Cache analytics**:
   - Open service worker console (chrome://extensions → Inspect service worker)
   - Interact with popup and options page multiple times
   - Verify cache hit/miss events are tracked in analytics
6. **Anonymous user cache**:
   - Log out of woolsocks.eu
   - Open popup on partner site - should work without cache errors
   - Verify anonymous users don't trigger balance/transaction cache calls

## Country-scoped deals (roadmap #11)
1. **Voucher country matching**:
   - Visit `https://www.ikea.nl/` and proceed to checkout
   - Verify voucher panel shows Dutch IKEA vouchers (country=NL)
   - Visit `https://www.ikea.de/` and proceed to checkout  
   - Verify voucher panel shows German IKEA vouchers (country=DE)
   - Verify vouchers have correct currency (EUR for both, but different rates)
2. **Online cashback country matching**:
   - As authenticated user, visit `https://www.zalando.nl/`
   - Verify online cashback shows Dutch Zalando rates
   - Visit `https://www.zalando.de/`
   - Verify online cashback shows German Zalando rates
   - Verify rates match domain country, not just user country
3. **Multi-country merchant testing**:
   - Test with merchants in different countries: amazon.com (US), amazon.nl (NL), amazon.de (DE)
   - Verify each domain returns country-specific deals
   - Check service worker console for API calls with correct `country` parameter
4. **Complex URL pattern testing**:
   - Test path-based localization: `ikea.com/nl/nl/` → NL, `ikea.com/de/de/` → DE
   - Test Nike pattern: `nike.com/nl/en/` → NL, `nike.com/de/en/` → DE
   - Test AliExpress gateway: `aliexpress.com/?gatewayAdapt=glo2nld` → NL
   - Test AliExpress subdomains: `nl.aliexpress.com` → NL, `de.aliexpress.com` → DE, `ru.aliexpress.com` → RU
   - Test extended AliExpress gateways: `aliexpress.com/?gatewayAdapt=glo2rus` → RU, `aliexpress.com/?gatewayAdapt=glo2pol` → PL
   - Test generic parameters: `example.com/?country=DE` → DE, `example.com/?locale=FR` → FR
   - Verify mixed patterns: `ikea.com/nl/nl/products?category=kitchen` → NL
5. **Top merchant testing**:
   - Test Amazon variants: `amazon.com` → US, `amazon.nl` → NL, `amazon.de` → DE, `amazon.fr` → FR
   - Test food delivery: `thuisbezorgd.nl` → NL, `thuisbezorgd.de` → DE, `takeaway.com` → NL
   - Test fashion retailers: `zalando.nl` → NL, `zalando.de` → DE, `aboutyou.de` → DE, `shein.com` → US
   - Test electronics: `mediamarkt.nl` → NL, `mediamarkt.de` → DE, `saturn.de` → DE
   - Test Dutch retailers: `bol.com` → NL, `hema.nl` → NL, `action.nl` → NL, `intertoys.nl` → NL
   - Test pet & health: `zooplus.nl` → NL, `zooplus.de` → DE, `bodyandfit.nl` → NL
   - Test sports: `nike.com` → US, `adidas.de` → DE, `jd-sports.nl` → NL
   - Test services: `lidl.nl` → NL, `lidl.de` → DE, `greetz.nl` → NL, `staatsloterij.nl` → NL
6. **Additional merchants from chart**:
   - Test Carrefour: `carrefour.fr` → FR, `carrefour.be` → BE, `carrefour.it` → IT, `carrefour.es` → ES
   - Test Decathlon: `decathlon.nl` → NL, `decathlon.de` → DE, `decathlon.fr` → FR, `decathlon.be` → BE
   - Test De Bijenkorf: `debijenkorf.nl` → NL, `debijenkorf.be` → BE
   - Test Douglas: `douglas.nl` → NL, `douglas.de` → DE, `douglas.fr` → FR, `douglas.be` → BE
   - Test Primark: `primark.com` → IE, `primark.de` → DE, `primark.fr` → FR, `primark.nl` → NL
   - Test Rituals: `rituals.com` → NL, `rituals.de` → DE, `rituals.fr` → FR, `rituals.be` → BE
   - Test Auchan: `auchan.fr` → FR, `auchan.it` → IT, `auchan.es` → ES
   - Test Airbnb: `airbnb.nl` → NL, `airbnb.de` → DE, `airbnb.fr` → FR, `airbnb.be` → BE
   - Test Gall & Gall: `gall.nl` → NL, `gall.be` → BE
   - Test Gamma: `gamma.nl` → NL, `gamma.be` → BE, `gamma.fr` → FR
   - Test Holland & Barrett: `hollandandbarrett.nl` → NL, `hollandandbarrett.de` → DE, `hollandandbarrett.fr` → FR
   - Test Primera: `primera.nl` → NL, `primera.be` → BE
   - Test Ticketmaster: `ticketmaster.nl` → NL, `ticketmaster.de` → DE, `ticketmaster.fr` → FR, `ticketmaster.be` → BE
7. **Cache isolation verification**:
   - Visit `ikea.nl` → check cache stores with country key
   - Visit `ikea.de` → verify separate cache entry created
   - Visit `ikea.nl` again → verify cached NL data returned (not DE data)
   - Open dev tools → Application → IndexedDB/Local Storage → verify cache keys include country codes
7. **Fallback behavior**:
   - Visit unknown/unsupported domain
   - Verify falls back to `country=NL` default
   - Verify no errors in console
8. **Analytics verification**:
   - Monitor for `deal_country_mismatch` events (should be minimal after fix)
   - Verify voucher and cashback events include correct `country` parameter

## Anonymous user behaviors (roadmap #3)
1. **Setup**: Ensure you're NOT logged in to woolsocks.eu (clear cookies or use incognito)
2. **Popup functionality**:
   - Visit a supported partner site (e.g., `https://www.zalando.nl/`, `https://www.hema.nl/`)
   - Click the extension icon
   - Verify popup shows available deals with correct rates
   - Verify "Login" button is visible instead of balance
   - Click login button - should open `https://woolsocks.eu/nl/profile`
3. **Online cashback reminder**:
   - As anonymous user, navigate to partner homepage
   - Verify cashback reminder pill appears with "Login" button
   - Verify correct cashback rate is displayed
   - Verify pill has reduced vertical padding (more compact)
4. **Checkout detection**:
   - As anonymous user, add items to cart on supported site
   - Proceed to checkout page
   - Verify voucher panel appears (if vouchers available)
   - Verify vouchers are clickable and work without authentication
5. **Analytics verification**:
   - Open service worker console (chrome://extensions → Inspect service worker)
   - As anonymous user, interact with popup and reminders
   - Verify `anonymous_deals_viewed` and `anonymous_login_clicked` events are tracked
6. **Session transition**:
   - Start as anonymous user viewing deals in popup
   - Login to woolsocks.eu in another tab
   - Return to extension popup and refresh
   - Verify UI updates to show balance and authenticated state

## Offscreen relay (roadmap #9) — Chrome
1. Ensure the extension is built and loaded (unpacked) in Chrome.
2. Open Chrome extension service worker console (chrome://extensions → Inspect service worker).
3. Visit a supported merchant homepage (e.g., `https://www.zalando.nl/`).
4. Verify no visible `woolsocks.eu` tab opens/closes during background API calls.
5. In the SW console, confirm analytics events appear over time:
   - `relay_attempt_offscreen`, `relay_offscreen_success` (status 200)
   - No frequent `relay_offscreen_fail` for common endpoints
6. Trigger a cashback redirect from popup and confirm no `woolsocks.eu` flashes occur.

## Relay behavior — Firefox/Safari
1. Load the extension build in Firefox or Safari.
2. Visit a supported merchant.
3. Confirm no programmatic `woolsocks.eu` tab creation occurs; if a `woolsocks.eu` tab is already open, relay may reuse it.
4. Basic flows (popup session check, voucher fetch) should still work; if a call requires cookies and reuse is unavailable, expect graceful fallback without tab flashes.

## Voucher panel
1. Visit a supported partner checkout/cart page (examples)
   - Zalando: `https://www.zalando.nl/cart/`
   - HEMA: `https://www.hema.nl/cart`
   - MediaMarkt: `https://www.mediamarkt.nl/nl/checkout`
   - Airbnb: a booking URL `airbnb.nl/book/...`
2. Expect a small panel with voucher deals:
   - Each voucher appears once (deduped)
   - 0% vouchers (GIFTCARD_PAY_LATER) are hidden
   - Clicking "Use" opens a voucher product URL:
     `https://woolsocks.eu/nl-NL/giftcards-shop/products/{providerReferenceId}`

## Public API (No Relay) - Roadmap #13
1. **Clear extension storage and restart**:
   - Clear all extension data: `chrome.storage.local.clear()`
   - Reload extension in `chrome://extensions`
2. **Navigate to partner sites without logging in**:
   - Visit: `https://www.bol.com/`, `https://www.zalando.nl/`, `https://www.hema.nl/`, `https://www.coolblue.nl/`, `https://www.mediamarkt.nl/`
   - Verify merchant detection works instantly
   - Verify NO relay tabs are created (no `woolsocks.eu` tab flashing)
3. **Monitor analytics in service worker console**:
   - Open `chrome://extensions` → Inspect service worker
   - Look for `api_public_success` events (should see these)
   - Verify NO `relay_attempt_offscreen` or `relay_attempt_tab` events during navigation
   - Verify merchant detection completes without any relay
4. **Test activation flow**:
   - On a partner site, click "Activate cashback" manually
   - Expect: **one** `relay_attempt_*` event for `requestRedirectUrl` (user-specific)
   - After landing back on merchant: icon turns green, no additional relay calls
5. **Verify cache effectiveness**:
   - Navigate to same sites again quickly
   - Verify instant detection (cached data)
   - Verify no additional API calls in console

## API sanity
Open the service worker console (chrome://extensions → Inspect service worker) and run:
```
(async () => {
  const base = 'https://woolsocks.eu/api/wsProxy';
  const headers = { 'x-application-name': 'WOOLSOCKS_WEB', 'x-user-id': crypto.randomUUID() };
  const j = async (u) => fetch(u, { headers, credentials:'include' }).then(r => r.json());
  const name = 'zalando', country = 'NL';
  const search = await j(`${base}/merchants-overview/api/v0.0.1/merchants?name=${encodeURIComponent(name)}&country=${country}`);
  const merchantId = search?.data?.merchants?.[0]?.data?.id;
  const deals = await j(`${base}/merchants-overview/api/v0.0.1/v2/deals?merchantId=${merchantId}&country=${country}`);
  console.log('RAW merchants search:', search);
  console.log('RAW deals:', deals);
})();
```

## Auto-Activation Consent Flows (roadmap #8)

### Prerequisites
1. **Fresh install testing**: Clear extension data or use a new browser profile
2. **Platform testing**: Test on Chrome, Firefox, and Safari (if available)
3. **Service worker console**: Open `chrome://extensions` → Inspect service worker for analytics
4. **Language testing**: Test with different browser languages (EN, NL, DE, FR, IT, ES)

### 1. Onboarding Consent Flow

#### Chrome/Firefox Testing
1. **Fresh install**:
   - Install extension (unpacked build)
   - Open extension popup or options page
   - Verify onboarding includes "Cashback Activation" step
   - Verify three options are presented:
     - "Automatic with countdown" (default selected)
     - "Ask me each time" 
     - "Don't remind me"

2. **Option selection testing**:
   - Select "Automatic" → verify both settings enabled
   - Select "Ask me each time" → verify `autoActivateOnlineCashback: false`
   - Select "Don't remind me" → verify `showCashbackReminders: false`

3. **UI elements verification**:
   - Verify "Chillin girl.png" image appears on first option card
   - Verify "Makkelijkst!" (or translated equivalent) tag appears on first option
   - Verify tag positioning and styling matches design
   - Verify step indicator dots are visible and functional

4. **Analytics verification**:
   - In service worker console, verify events:
     - `consent_shown` when step appears
     - `consent_accepted` with `option_id` when user selects auto/manual
     - `consent_declined` when user selects "Don't remind me"

#### Safari Testing (if available)
1. **Fresh install**:
   - Install extension in Safari
   - Verify onboarding shows only two options:
     - "Ask me each time" (default)
     - "Don't remind me"
   - Verify "Automatic" option is NOT shown

### 2. Updated Popup UI Testing

#### Header and Navigation
1. **Settings icon**:
   - Verify settings icon (gear) appears in top-right corner for both authenticated and unauthenticated users
   - Verify icon size is 40x40px
   - Click settings icon → verify opens consent screen with back button
   - Verify back button is positioned in top-left corner

2. **Hostname removal**:
   - Verify hostname no longer appears in top-right corner
   - Verify section headers include hostname: "Earn online cashback at {domain}" and "Pay with vouchers at {domain}"

#### Interactive Deals
1. **Online cashback deals**:
   - Verify each deal has a right arrow icon (Chevron forward.png)
   - Verify deals are clickable with hover states:
     - Background: `#E5F3FF` (light blue)
     - Border: `#0084FF` (blue)
     - Border radius: 8px
   - Click a deal → verify manual redirection occurs
   - Verify "Cashback actief" popup appears after redirection

2. **Voucher deals**:
   - Verify vouchers have same hover states as online deals
   - Verify right arrow icons for clickable vouchers
   - Verify 8px horizontal padding matches online deals
   - Verify consistent spacing and styling

3. **Deal styling**:
   - Verify deal titles use specified font styling:
     - Color: `#100B1C`
     - Font: Woolsocks
     - Size: 16px
     - Weight: 400
     - Line height: 145%
   - Verify percentage badges have `#FFF9E6` background
   - Verify proper spacing between elements

#### Settings Integration
1. **Consent screen access**:
   - Click settings icon in popup
   - Verify shows cashback activation choice screen
   - Verify back button returns to main popup
   - Verify white background with no yellow/green colors
   - Verify current preference is preselected

2. **Voucher suppression**:
   - Set "Don't remind me" in consent screen
   - Return to popup
   - Verify vouchers section is hidden when `showCashbackReminders: false`

### 3. Settings Panel Testing

#### Settings UI Verification
1. **Open settings**:
   - Go to extension options page
   - Verify two separate toggles exist:
     - "Show cashback reminders" (top toggle)
     - "Auto-activate online cashback" (bottom toggle, only visible when reminders enabled)

2. **Toggle behavior**:
   - Turn OFF "Show cashback reminders" → verify "Auto-activate" toggle disappears
   - Turn ON "Show cashback reminders" → verify "Auto-activate" toggle reappears
   - Verify clear descriptions and affiliate disclosure text

3. **Platform-specific notes**:
   - On Safari: verify "Auto-activate" toggle shows Safari-specific description
   - On Chrome/Firefox: verify countdown explanation is shown

### 4. Auto-Activation Mode Testing (Chrome/Firefox)

#### Countdown Banner Testing
1. **Setup**: Ensure `showCashbackReminders: true` and `autoActivateOnlineCashback: true`
2. **Visit partner site**:
   - Navigate to `https://www.zalando.nl/` or `https://www.hema.nl/`
   - Verify countdown banner appears with:
     - "Cashback actief in {seconds}..." text with live countdown (3 → 2 → 1)
     - "Cancel" button aligned to the right
     - Correct cashback rate and domain name
     - No orange circle or progress bar (removed per design updates)

3. **Countdown completion**:
   - Let countdown complete without clicking cancel
   - Verify redirect occurs to affiliate URL
   - Verify analytics event: `oc_countdown_completed`

4. **Countdown cancellation**:
   - Click "Cancel" button during countdown
   - Verify countdown stops and banner disappears
   - Verify no redirect occurs
   - Verify analytics event: `oc_countdown_cancelled`
   - Verify temporary cooldown (5 minutes) prevents immediate re-prompting

5. **Analytics verification**:
   - Verify `oc_countdown_shown` event with platform info
   - Verify all countdown events include `domain` and `deal_id`

### 5. Manual Activation Mode Testing (All Platforms)

#### Manual Button Testing
1. **Setup**: Ensure `showCashbackReminders: true` and `autoActivateOnlineCashback: false`
2. **Visit partner site**:
   - Navigate to supported partner homepage
   - Verify manual activation banner appears with:
     - "Krijg nu {rate} terug" title (single line)
     - "Cashback op {host}" description (single line)
     - "Activeer" button
     - Enlarged Woolsocks "W" icon (40x40px)
     - Blue border with shadow styling
     - Dynamic width to prevent text truncation

3. **Button interaction**:
   - Click "Activeer" button
   - Verify redirect occurs to affiliate URL
   - Verify "Cashback actief" confirmation popup appears
   - Verify analytics event: `oc_manual_activation_clicked`

4. **Dismissal testing**:
   - Click close/dismiss button
   - Verify banner disappears
   - Verify no redirect occurs

5. **Analytics verification**:
   - Verify `oc_manual_activation_shown` event
   - Verify manual activation events include platform info

### 6. Reminders OFF Mode Testing

#### Silent Mode Testing
1. **Setup**: Ensure `showCashbackReminders: false`
2. **Visit partner sites**:
   - Navigate to multiple supported partners
   - Verify NO banners, countdowns, or UI elements appear
   - Verify completely silent behavior

3. **Analytics verification**:
   - Verify `oc_blocked` event with `reason: 'reminders_disabled'`
   - Verify no other cashback UI events are triggered

### 7. Platform-Specific Behavior Testing

#### Chrome Testing
1. **Auto-activation available**:
   - Verify countdown banner works correctly
   - Verify auto-redirect after countdown
   - Verify cancel functionality

#### Firefox Testing
1. **Same as Chrome**:
   - Verify identical behavior to Chrome
   - Verify countdown and auto-redirect work

#### Safari Testing (if available)
1. **Manual activation only**:
   - Verify NO countdown banners ever appear
   - Verify only manual activation buttons shown
   - Verify all redirects require user gesture
   - Verify onboarding doesn't offer auto-activation option

### 8. Settings Persistence Testing

#### Settings Storage
1. **Change settings**:
   - Modify both toggles in settings
   - Refresh extension or restart browser
   - Verify settings persist correctly

2. **Cross-session testing**:
   - Close browser completely
   - Reopen and verify settings maintained
   - Test behavior matches saved preferences

### 9. Edge Cases and Error Handling

#### Network Issues
1. **API failures**:
   - Simulate network issues during redirect
   - Verify graceful fallback behavior
   - Verify no broken states

#### Multiple Tabs
1. **Concurrent activations**:
   - Open multiple partner sites in different tabs
   - Verify each tab handles activation independently
   - Verify no cross-tab interference

#### Rapid Navigation
1. **Quick page changes**:
   - Navigate quickly between partner sites
   - Verify timers and state are properly cleaned up
   - Verify no memory leaks or stuck UI elements

### 10. Analytics and Monitoring

#### Event Tracking Verification
1. **Service worker console**:
   - Monitor all new events: `consent_*`, `oc_countdown_*`, `oc_manual_activation_*`
   - Verify platform information in all events
   - Verify proper event parameters

2. **Event completeness**:
   - Ensure all user interactions are tracked
   - Verify no missing events in user flows
   - Verify event parameters are consistent

### 11. Internationalization Testing

#### Language Support
1. **Supported languages**:
   - Test with browser language set to: EN, NL, DE, FR, IT, ES
   - Verify all UI text appears in correct language
   - Verify no mixed languages in same interface

2. **Translation accuracy**:
   - Verify "Automatic" (not "Automatic with countdown")
   - Verify "Easiest!" tag (not "Recommended")
   - Verify all onboarding text is properly translated
   - Verify countdown and activation popup text is translated

3. **Fallback behavior**:
   - Test with unsupported language
   - Verify falls back to English
   - Verify no broken text or missing translations

### 12. User Experience Validation

#### Visual Design
1. **Banner appearance**:
   - Verify professional, non-intrusive design
   - Verify proper contrast and readability
   - Verify responsive behavior on different screen sizes

2. **Accessibility**:
   - Verify keyboard navigation works
   - Verify screen reader compatibility
   - Verify proper focus management

#### Performance
1. **Page load impact**:
   - Verify minimal impact on page load times
   - Verify smooth animations and transitions
   - Verify no layout shifts or visual glitches

## Persistent Pill Dismissal Testing

### Prerequisites
1. **Authenticated user**: Ensure you're logged in to woolsocks.eu
2. **Service worker console**: Open `chrome://extensions` → Inspect service worker for debugging
3. **Partner site**: Use a supported merchant like `https://www.zalando.nl/` or `https://www.hema.nl/`

### 1. Basic Dismissal Persistence
1. **Activate cashback**:
   - Navigate to a supported partner homepage
   - Activate cashback (either via auto-activation or manual activation)
   - Verify "Cashback active" pill appears with green checkmark

2. **Dismiss the pill**:
   - Click the close (X) button on the "Cashback active" pill
   - Verify pill disappears immediately

3. **Navigate within domain**:
   - Navigate to different pages on the same domain (e.g., from homepage to product pages, cart, etc.)
   - Verify the "Cashback active" pill does NOT reappear on any page
   - Verify this persists across multiple page navigations

4. **Storage verification**:
   - Open browser dev tools → Application → Storage → Session Storage
   - Look for key `__wsOcPillDismissedByDomain`
   - Verify it contains the domain with a timestamp ~10 minutes in the future

### 2. Cross-Domain Behavior
1. **Different domain**:
   - Navigate to a different supported partner site
   - Verify "Cashback active" pill appears normally (dismissal is domain-specific)
   - Dismiss the pill on this new domain
   - Verify dismissal only affects this domain

2. **Return to original domain**:
   - Navigate back to the first domain where you dismissed the pill
   - Verify pill remains dismissed (doesn't reappear)

### 3. Fresh Activation Behavior
1. **Wait for expiration OR clear storage**:
   - Either wait 10+ minutes for dismissal to expire
   - OR clear session storage: `chrome.storage.session.clear()`

2. **Activate cashback again**:
   - Navigate to the same domain
   - Activate cashback again (fresh activation)
   - Verify "Cashback active" pill appears normally
   - Verify any previous dismissal is cleared

### 4. Multiple Dismissal Types
1. **Test different pill types**:
   - Dismiss "Cashback active" pill (authenticated state)
   - Dismiss minimized pill with "Login" button (unauthenticated state)
   - Dismiss manual activation banner
   - Verify all dismissals persist across page navigation

### 5. Edge Cases
1. **Page reload**:
   - Dismiss pill, then reload the page (F5)
   - Verify pill doesn't reappear after reload

2. **Browser tab switching**:
   - Dismiss pill, switch to another tab, then return
   - Verify pill doesn't reappear when tab becomes visible again

3. **Multiple tabs same domain**:
   - Open multiple tabs of the same domain
   - Dismiss pill in one tab
   - Verify other tabs are not affected (dismissal is per-tab/page)

4. **Session storage persistence**:
   - Dismiss pill, close browser completely, reopen
   - Navigate to same domain
   - Verify pill reappears (session storage is cleared on browser close)

### 6. Storage Structure Verification
1. **Check storage format**:
   - Open dev tools → Application → Storage → Session Storage
   - Verify `__wsOcPillDismissedByDomain` structure:
     ```json
     {
       "zalando.nl": 1703123456789,
       "hema.nl": 1703123456790
     }
     ```
   - Verify timestamps are ~10 minutes in the future

2. **TTL expiration**:
   - Manually set a past timestamp in storage
   - Navigate to the domain
   - Verify pill appears normally (dismissal expired)

### 7. Analytics Verification
1. **Service worker console**:
   - Monitor for any new analytics events related to dismissal
   - Verify no errors in console during dismissal operations
   - Verify normal activation events still fire correctly

### 8. Performance Testing
1. **Rapid navigation**:
   - Dismiss pill, then navigate quickly between pages
   - Verify no performance issues or memory leaks
   - Verify dismissal checks don't slow down page loads

2. **Storage operations**:
   - Monitor storage read/write operations
   - Verify efficient storage usage (no excessive writes)

## Troubleshooting
- If the panel does not appear, verify checkout URL and session
- If links 404, confirm `providerReferenceId` exists in RAW deals and matches the product URL
- If amounts show €0.00 initially, wait a moment; the detector re-checks as the page renders
 - If offscreen relay fails on Chrome, check `chrome.offscreen` API availability and reload the extension
 - If analytics do not show relay events, verify background initialized analytics and network access is allowed
- **Auto-activation issues**: Check user settings in `chrome.storage.local` → `user.settings`
- **Countdown not working**: Verify platform detection and `allowsAutoRedirect()` function
- **Manual activation not working**: Check `requiresUserGesture()` and Safari-specific logic
- **Settings not persisting**: Verify `chrome.storage.local` permissions and error handling
- **Onboarding not showing**: Check `hasCompletedOnboarding()` and clear localStorage if needed
- **Settings icon missing**: Verify both authenticated and unauthenticated users see the icon
- **Interactive deals not working**: Check `OC_MANUAL_ACTIVATE_DEAL` message handling in background script
- **"Cashback actief" popup missing**: Verify `oc_activated` message retry logic and session storage
- **Translation issues**: Check `initLanguage()` fallback and verify all translation keys exist
- **Voucher reminders not suppressed**: Verify `showCashbackReminders` setting affects checkout detection
- **Hover states not working**: Check CSS transitions and event handlers in popup component
- **Pill dismissal not persisting**: Check `__wsOcPillDismissedByDomain` in session storage and verify `isPillDismissed()` function
- **Pill reappearing after dismissal**: Verify all automatic triggers (DOMContentLoaded, visibilitychange, oc_activated) check dismissal state
- **Fresh activation not clearing dismissal**: Verify `setPillDismissed(domain, false)` is called in oc_activated handler
