# Woolsocks Browser Extension (MV3)

A Chrome MV3 extension that shows Woolsocks voucher offers and automatically enables online cashback on supported merchant sites.

## Current scope and constraints

- Works with your existing session at `woolsocks.eu` (cookie-based; no token UI)
- Country: NL default; online cashback filters to your country based on API language/locale
- Vouchers: shown at checkout/cart/order pages
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
```

Key points:
- API calls go to `https://woolsocks.eu/api/wsProxy/...` (credentials: 'include')
- We set required headers: `x-application-name: WOOLSOCKS_WEB`, stable `x-user-id`
- If the background cannot reach the API directly with cookies, it relays via an inactive `woolsocks.eu` tab (content script `relay.ts`)

## Development

### Prerequisites
- Node.js 20.19+ or 22.12+
- Chrome/Chromium

### Install & build
```
npm install
npm run build
```
Load the `dist/` folder in `chrome://extensions` (Developer mode → Load unpacked).

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
- `alarms` — periodic cleanup and analytics flush.
- `notifications` — user feedback when cashback activates.
- `cookies` — observe Woolsocks session changes to ensure site-proxy API calls succeed.
- `webRequest` — non-blocking observation (diagnostics) while relying on site-proxy for headers.
- `webNavigation` — detect top-level navigations to trigger cashback flow and re-emit activation.
- Host permissions: `https://woolsocks.eu/*`, `https://api.woolsocks.eu/*`, and general `https?://*/*` for detection and eligibility checks.

### Permission justifications
- We must detect merchant domains (tabs/webNavigation) and redirect once to a tracked affiliate URL to enable cashback.
- We call Woolsocks APIs via the site proxy; `cookies/webRequest` are required so the browser includes first‑party cookies for authenticated requests.
- `storage/alarms` support reliable operation (cooldowns, session activation state, analytics retries).
- `scripting` is limited to minimal UI components, never injecting into sensitive origins.
- `notifications` provide clear user feedback on activation.

## UI notes
- Active state uses brand green background/border `#00C275`.
- Tracking badge: background `#ECFDF5`, text/icon `#268E60`.
- Header shows balance on the left and hostname on the right.
- Footer logo uses `Woolsocks-logo-large.png` (transparent background) for consistent rendering.

## Settings
- Popup/Options → "Auto-activate online cashback" toggle (default ON). When OFF, the flow does not auto-redirect; manual re-activate remains available.

## Analytics (GA4)
- Events sent via Measurement Protocol: `oc_partner_detected`, `oc_eligible`, `oc_blocked`, `oc_redirect_requested`, `oc_redirect_issued`, `oc_redirect_navigated`, `oc_activated`, `oc_manual_reactivate`, `oc_conditions_loaded`.
- Key parameters: `domain`, `partner_name`, `deal_id`, `amount_type`, `rate`, `country`, `provider`, `link_host`, `reason`, `click_id`, `ext_version`.
- Recommended GA setup: create event-scoped custom dimensions for the parameters above (currency is standard). Mark `oc_activated` as a Key event.

## Notes for contributors
- Voucher filtering: include only `GIFTCARD`; exclude `GIFTCARD_PAY_LATER`
- Online cashback filtering: include only `CASHBACK` with `usageType ONLINE` and matching `country`.
- Voucher URL: prefer `providerReferenceId`
- Entrance banner is disabled; voucher panel is shown only at checkout

## Roadmap (short)
- Locale support beyond NL
- Popup browse/search of partners
- Broader cashback metrics and user controls

## License
MIT