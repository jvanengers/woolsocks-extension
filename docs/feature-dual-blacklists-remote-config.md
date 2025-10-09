<!-- 4b450f78-6709-4cf7-8cb3-918829ef9f42 728db36a-cd4e-4b1b-ae4a-f7b67090dfea -->
# Dual Blacklists with Firebase Remote Config

### Scope

- Two domain-based blacklists (eTLD+1 + subdomains):
  - OC blacklist: disables online cashback auto-activation and any passive reminders. Manual activation remains via popup.
  - Voucher blacklist: disables voucher checkout prompt injection. Vouchers still visible in popup.
- Remote-managed via Firebase Remote Config with safe local caching and periodic refresh.

### Data Model (Remote Config)

- Key `blacklist_oc`: string JSON array of domains, e.g., `["zalando.com", "nike.com"]`.
- Key `blacklist_voucher`: string JSON array of domains.
- Optional `blacklist_refresh_seconds`: number, default 900 (15m).

### Domain Matching

- Match on eTLD+1 and all subdomains. Implement `matchesDomain(hostname, domain)`.

### Files to Add

- `src/background/remote-config.ts`
  - Initialize Firebase app + Remote Config (modular v9 SDK).
  - Functions: `initRemoteConfig()`, `getBlacklists()`, `isOcBlacklisted(host)`, `isVoucherBlacklisted(host)`.
  - Cache last fetched values in `chrome.storage.local` with `{ fetchedAt, oc: string[], voucher: string[] }`.
  - Schedule refresh timer and expose `refreshBlacklists()`.

### Integrations

- `src/background/index.ts`
  - On install/startup: call `initRemoteConfig()` and initial `refreshBlacklists()`; set interval based on `blacklist_refresh_seconds`.
  - On `chrome.action.onClicked`: keep opening popup; no change.

- `src/background/online-cashback.ts`
  - Early in `onCommitted` listener: if `isOcBlacklisted(cleanHost)` → skip auto-activation, skip partner lookup and any notifications; set icon to `available` if partner exists, else leave neutral. Track event `oc_blocked_blacklist`.
  - Add handler `manualActivateCashback(tabId, url)` that mirrors existing redirect logic using `requestRedirectUrl` and sets active state, but only when user explicitly triggers.

- `src/background/index.ts`
  - Add runtime message handler: `{ type: 'OC_MANUAL_ACTIVATE' }` → calls `manualActivateCashback`.

- `src/background/index.ts` (checkout handler)
  - In `handleCheckoutDetected`: before any UI injection, if `isVoucherBlacklisted(checkoutInfo.merchant)` → `return` early (no panel injection). Track `voucher_blocked_blacklist`.

- `src/popup/main.tsx`
  - On load, query active tab hostname + partner via background.
  - If on partner domain and `isOcBlacklisted(host)` and not already active → show CTA button "Activate cashback now" instead of passive/auto states.
  - On click, post runtime message `OC_MANUAL_ACTIVATE`.
  - Ensure vouchers list remains accessible regardless of voucher blacklist.

### Config & Secrets

- Add Firebase SDK to project deps (`firebase` v10+). Initialize with keys provided via a new config source (one of):
  - `src/shared/firebase-config.ts` with placeholder values to be filled locally; or
  - Use existing `public/api-token.txt` pattern to load config JSON. We will implement `readFirebaseConfig()` to read from extension assets.
- Ensure network permissions already cover Firebase domains; if not, extend `host_permissions` in `manifests/*.json` as needed.

### Telemetry

- Add analytics events:
  - `oc_blocked_blacklist` with `{ domain }`.
  - `voucher_blocked_blacklist` with `{ domain }`.
  - `blacklist_refreshed` with counts.
  - `blacklist_refresh_failed` with reason.

### Edge Cases

- Offline or RC failure: fall back to last cached lists; default to empty lists if none.
- Hostname parsing failures: guard with try/catch and use `new URL(url).hostname` fallback.
- Safari iOS: ensure Firebase initialization runs in background context only; avoid content-script usage.

### Minimal Code Changes (illustrative snippets)

- Early gate in online cashback flow:
```23:60:src/background/online-cashback.ts
// inside onCommitted listener, after deriving clean hostname
if (await isOcBlacklisted(clean)) {
  track('oc_blocked_blacklist', { domain: clean })
  // Optionally set icon to 'available' if partner exists
  return
}
```

- Voucher gate:
```408:421:src/background/index.ts
// inside handleCheckoutDetected before partner lookup/UI
if (await isVoucherBlacklisted(checkoutInfo.merchant)) {
  track('voucher_blocked_blacklist', { domain: checkoutInfo.merchant })
  return
}
```

- Popup CTA triggers manual activation:
```17:44:src/popup/main.tsx
// on click
chrome.runtime.sendMessage({ type: 'OC_MANUAL_ACTIVATE' })
```


### Testing

- Unit test domain matching util given variants like `www.zalando.com`, `de.zalando.com`.
- Manual test flows on a test domain added to each blacklist.
- Verify popup CTA performs redirect and sets icon to active.

### Rollout

- Ship with empty blacklists by default.
- Prepare Firebase RC defaults and conditional updates by country if needed later.

### To-dos

- [ ] Add Firebase SDK and init config loader for extension
- [ ] Create remote-config.ts to fetch/cache blacklists
- [ ] Initialize and periodically refresh blacklists on startup
- [ ] Gate auto-activation in online-cashback.ts via OC blacklist
- [ ] Gate voucher checkout prompt via voucher blacklist
- [ ] Add popup CTA to manually activate cashback when OC blacklisted
- [ ] Add background handler to perform manual redirect activation
- [ ] Add analytics events for blacklist blocks/refresh
- [ ] Ensure manifest host permissions allow Firebase RC
- [ ] Document Firebase RC setup and blacklist management


