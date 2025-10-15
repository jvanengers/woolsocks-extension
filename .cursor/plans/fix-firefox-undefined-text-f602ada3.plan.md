<!-- f602ada3-5549-4e26-8c92-702a82f5786c 3d7ca8a0-1748-4865-9776-88a6ad435369 -->
# Disable Wallet Fetching on Firefox (MV2)

## Goal
Temporarily disable wallet balance and transactions fetching in Firefox (MV2), while leaving all features intact on Chrome. Show a clear, non-blocking placeholder in Firefox and avoid failing network calls and unused code.

## Approach
- Add a runtime feature flag `isFirefoxLike` (detect via `chrome.runtime.getBrowserInfo` when available, fallback to userAgent check).
- Gate all wallet/profile/transactions loads and UI rendering behind this flag.
- On Firefox: skip background messages that fetch/cached data; show a lightweight placeholder (“Not available on Firefox yet”).
- On Chrome: unchanged behavior (use cached + background refresh path).

## Files to change
- `src/shared/platform.ts` (new): expose `isFirefoxLike()` and `isFirefoxMv2()` helpers.
- `src/options/SettingsPanel.tsx`:
  - Use `isFirefoxLike` to short-circuit `loadProfile`, `loadWalletData`, `loadTransactions`.
  - Render placeholders instead of data sections when disabled.
  - Remove/comment direct fetch helpers to avoid TS6133 and 403 fallbacks.
- `src/options/main.tsx`:
  - Gate the same loads/sections using `isFirefoxLike`.
- `src/popup/main.tsx`:
  - If showing balance header: only call `onBalance` path on Chrome; show "–" placeholder on Firefox.
- `src/background/index.ts`:
  - No functional changes; optionally guard `REFRESH_USER_DATA` work when Firefox sends it (but our UI won’t send it when disabled).

## UX copy (Firefox only)
- Balance area: “Balance not available in Firefox yet”.
- Transactions list: “Transactions not available in Firefox yet”.
- Keep settings toggles and other features operational.

## Verification
- Chrome: All existing data still appears; no regressions.
- Firefox MV2: No network 403 in popup/options; placeholders render; no TS unused warnings.

## Rollback
- Flip the guards to re-enable when background relay is fully robust.


### To-dos

- [ ] Create platform helpers in src/shared/platform.ts for Firefox detection
- [ ] Guard profile/balance/transactions loads in SettingsPanel with isFirefoxLike
- [ ] Render Firefox-specific placeholders for balance and transactions
- [ ] Apply same gating and placeholders in options/main.tsx
- [ ] Guard popup balance header; show placeholder on Firefox
- [ ] Remove or comment direct fetch helpers to avoid TS6133 in SettingsPanel