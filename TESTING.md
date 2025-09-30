# Testing Guide (Manual / E2E)

Current scope: NL users, voucher checkout detection.

## Session
1. Open `https://woolsocks.eu/nl/profile` and sign in (cookies must exist)
2. Open the extension Options page and verify it says "Hi {firstname}" and shows a sock value

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
