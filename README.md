# Woolsocks Browser Extension (MV3)

A Chrome MV3 extension that shows Woolsocks voucher offers (and, where available, cashback) on partner sites at the moment you are about to pay.

## Current scope and constraints

- Works with your existing session at `woolsocks.eu` (cookie-based; no token UI)
- Country: NL only (we call the API with `country=NL` and open Dutch voucher product pages)
- Trigger: checkout/cart/order pages (voucher first). Cashback-only flows will be expanded later
- Links for vouchers open canonical product pages like:
  `https://woolsocks.eu/nl-NL/giftcards-shop/products/{providerReferenceId}`

More capabilities (full merchant browse/search, popup lists, non-NL locales) will come soon.

## How it works

- When you visit a partner and reach checkout, a small panel lists applicable voucher deals with name, rate, image and a "Use" button
- The background service worker fetches partner/deals via the Woolsocks API, using first‑party cookies (same origin) relayed through `woolsocks.eu`
- For voucher links we rely on `providerReferenceId` from the deals response to build the canonical product URL (fallbacks: `productId`, `id`, or UUID in `links.webLink`)

## Architecture (simplified)

```
src/
  background/
    index.ts       # service worker: API calls, message handling, voucher panel
    api.ts         # API client (site-proxy, relay fallback, mapping to PartnerLite)
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
- Go to a supported partner checkout (e.g., Zalando cart, Airbnb booking)
- The panel should show vouchers with non‑zero rates; "Use" opens a `nl-NL/giftcards-shop/products/{...}` URL

See [TESTING.md](TESTING.md) for a short manual test matrix.

## Permissions
- `cookies`, `webRequest`, `webRequestBlocking` (to inject Cookie/CSRF/Origin/Referer on site-proxy calls)
- Host permissions: `https://woolsocks.eu/*`, `https://api.woolsocks.eu/*`, and general `https?://*/*` for detection

## Notes for contributors
- Deal filtering: include only `GIFTCARD`; exclude `GIFTCARD_PAY_LATER`
- Voucher URL: prefer `providerReferenceId`
- Entrance banner is disabled; voucher panel is shown only at checkout

## Roadmap (short)
- Locale support beyond NL
- Popup browse/search of partners
- Broader cashback handling and auto activation UX

## License
MIT