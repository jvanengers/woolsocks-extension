# Testing Guide (Manual / E2E)

Current scope: NL users, voucher checkout detection, anonymous user behaviors, auto-activation consent flows, interactive deals, and updated UI components.

## Session
1. Open `https://woolsocks.eu/nl/profile` and sign in (cookies must exist)
2. Open the extension Options page and verify it says "Hi {firstname}" and shows a sock value

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
