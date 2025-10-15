<!-- 7de70a8e-2d04-421c-bea2-ae7ec831496d df909cc9-7453-4410-ac69-0c5ddc0e1ece -->
# Fix Firefox OC UI rendering (countdown/active)

## Goals
- Identify and fix root cause why OC popups (countdown/active) don’t render on Firefox MV2.
- Add robust diagnostics to confirm content script presence and message delivery per tab.
- Harden message delivery so UI renders even under race conditions.

## Hypothesis
- Intermittent failure stems from content script (src/content/oc-panel.ts) not being ready/loaded on some navigations, or messages arriving too early; or content script injection/matching/CSP issues on some sites.

## Plan

### 1) Add end-to-end diagnostics (lightweight, removable)
- Background (src/background/online-cashback.ts):
  - On each navigational evaluation, send a ‘WS_PING’ to the tab; log success/failure; if fail, note “content_not_ready”.
  - When sending `oc_deals_found`, `oc_countdown_start`, `oc_activated`, log attempt number and result; include tabId, host.
  - Add webNavigation.onDOMContentLoaded and onCompleted hooks to retry `oc_deals_found`/`oc_countdown_start` if earlier attempts failed.
- Content (src/content/oc-panel.ts):
  - Log boot line with version/hash and host.
  - Respond to ‘WS_PING’ with a simple ACK.
  - On DOMContentLoaded, set `__wsOcBoot:{ host, ts }` in `chrome.storage.session`.

### 2) Verify content script injection and matches
- Inspect generated `dist-firefox-mv2/manifest.json`:
  - Confirm `content_scripts` includes: assets/i18n-*.js BEFORE content/oc-panel.js; `run_at: document_start` for oc-panel.
  - Matches: `<all_urls>`, excludes `*.woolsocks.eu`.
- If missing, update the custom Vite plugin in `vite.firefox-mv2.config.ts` to force inclusion order (we already do this; re-validate).

### 3) Strengthen message delivery
- Background: Refactor `sendCountdownWithRetry()` to additionally:
  - gate countdown sending until ping succeeds OR (fallback) DOMContentLoaded.
  - if `WS_PING` fails >N times, store `__wsOcPendingUi` (already added) and schedule a retry on onCompleted.
- Content: On DOMContentLoaded, besides reading `__wsOcPendingUi`, also:
  - read `__wsOcActiveByDomain` (already used) to render active pill if background marked active.
  - send a ‘WS_READY’ one-shot so background can immediately send any pending event.

### 4) Prevent premature hiding and loops
- Ensure ordering: send `oc_countdown_start` BEFORE any `oc_redirect_requested` hide request.
- Only send `oc_redirect_requested` at the moment we actually navigate (after countdown completion), not earlier. (Chrome tolerates either; Firefox needs stricter order.)
- Keep the 10‑minute cooldown on ‘not logged in’ and fetch failures to prevent loops.

### 5) Firefox‑specific checks
- Confirm `chrome.action` polyfill is in place (already in vite.firefox-mv2.config.ts) and working (logs show success now).
- Confirm `chrome.storage.local.get` shim (Promise wrapper) is applied in all contexts.
- Validate `chrome.tabs.query` fallbacks (already added); continue to prefer storage-based current tab when queries fail.

### 6) Manual verification checklist
- Sites: hema.nl, mediamarkt.nl, vidaxl.nl, bever.nl
- Expected background logs per site:
  - WS_PING ok, ‘Initiating auto-activation countdown…’, ‘Successfully sent countdown…’ OR ‘stored __wsOcPendingUi’
- Page result:
  - Countdown banner visible or appears after first DOM load (fallback), then redirect.
  - On return, green pill renders; icon set to green.

## Targeted Edits
- src/background/online-cashback.ts: add ping + retries across onCommitted/onDOMContentLoaded/onCompleted; enforce ordering; improved logs.
- src/content/oc-panel.ts: add boot log, ping responder, WS_READY emit; strengthen DOMContentLoaded fallback.
- vite.firefox-mv2.config.ts: re-validate injection order; adjust if needed.

## Notes
- Avoid reintroducing tab relay creation; keep `getUserId()` relay-tab removal.
- All diagnostics will be guarded with OC_DEBUG to minimize noise and removable post‑fix.


### To-dos

- [ ] Add WS_PING + send logs/retries in online-cashback background
- [ ] Add boot log, WS_PING responder, WS_READY emit in oc-panel
- [ ] Retry on DOMContentLoaded/Completed for countdown/activated
- [ ] Send countdown before hide; delay oc_redirect_requested until navigation
- [ ] Re-validate Firefox MV2 content_scripts order matches/i18n before oc-panel
- [ ] Manual test on hema/mediamarkt/vidaxl/bever and capture logs