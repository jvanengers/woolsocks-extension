# Testing Guide (Manual / E2E)

Current scope: NL users, voucher checkout detection, anonymous user behaviors.

## Session
1. Open `https://woolsocks.eu/nl/profile` and sign in (cookies must exist)
2. Open the extension Options page and verify it says "Hi {firstname}" and shows a sock value

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

## Troubleshooting
- If the panel does not appear, verify checkout URL and session
- If links 404, confirm `providerReferenceId` exists in RAW deals and matches the product URL
- If amounts show €0.00 initially, wait a moment; the detector re-checks as the page renders
 - If offscreen relay fails on Chrome, check `chrome.offscreen` API availability and reload the extension
 - If analytics do not show relay events, verify background initialized analytics and network access is allowed
