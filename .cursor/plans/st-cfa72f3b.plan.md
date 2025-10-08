<!-- cfa72f3b-a16a-4fb5-bc6f-0cc43cc3125f 18d4dc5e-bb87-45ff-b697-f05e3647cb1f -->
# Server-confirmed Activation via Recent Clicks

### Goals

- Keep icon green and panels active across affiliate hops and deep-link restoration.
- Prevent state drops when navigating within the same domain.
- Eliminate races between background, content, and popup.

### Key Changes

- Centralize activation state per domain with a single source of truth in background storage (session-level) and explicit TTL.
- Idempotent eventing: only transition to active once per (tabId, domain) and ignore later duplicate or conflicting updates.
- Robust re-emit hooks on navigation completion and history changes to refresh UI when content script loads late.
- Improve icon state logic to prioritize active domain status over partner re-evaluation.

### Implementation Outline

- Central state
- Add `ActivationRegistry` in `src/background/online-cashback.ts` maintaining Map: key `${domain}` → `{ active: true, clickId?, at, tabIds: Set }` with TTL 10 minutes and cleanup.
- Persist mirror in `chrome.storage.session.__wsOcActiveByDomain` for cross-script reads; include timestamp.

- Background flow adjustments
- On successful redirect landing (current behavior at lines around 150-193 in `src/background/online-cashback.ts`), write to ActivationRegistry and storage, record `tabId`, and set icon green without re-checking partner.
- On `onCommitted` and `onCompleted` events, before any partner lookup, check ActivationRegistry for the domain; if active, set icon green and re-emit `{ kind: 'oc_activated' }` to content (debounced) and skip deactivating.
- When restoring deep link: after `chrome.tabs.update`, pre-mark domain active so the subsequent navigation shows green immediately.
- When tab navigates to a different domain: remove that `tabId` from the domain entry; if no tabIds remain, keep the domain entry (so other tabs remain green) until TTL expiry.

- Content script (`src/content/oc-panel.ts`)
- On receipt of `oc_activated`, cache domain in session storage and display minimized pill immediately (already present) but also listen for `visibilitychange` and `pagehide` to re-request state from background when needed.
- Add a `REQUEST_ACTIVATION_STATE` message handler to allow content to pull state on load; background responds with `{ active, deals?, clickId? }`.

- Popup (`src/popup/main.tsx`)
- When opened, query active tab URL; ask background `GET_DOMAIN_STATE` for activation status and balance; render green/active strip and recent activation data even if partner lookup says "no deals".

- Icon logic (`src/background/index.ts` and `online-cashback.ts`)
- Before calling `getPartnerByHostname`, check ActivationRegistry; if active, set green and short-circuit.
- Only downgrade to yellow when explicitly clearing activation for that domain (e.g., TTL expiry or explicit block reasons).

- Races & debounces
- Add per-(tabId, domain) debounce on re-emits (e.g., 1s) to avoid flooding messages.
- Ensure `tabRedirectState` is cleared on domain change (already added) and that ActivationRegistry is independent of it.

- Telemetry
- Add events: `oc_state_mark_active`, `oc_state_reemit`, `oc_state_query`, `oc_state_cleanup` for debugging.

### Touch Points

- `src/background/online-cashback.ts`: introduce ActivationRegistry, write/read hooks, re-emit and icon priority.
- `src/background/index.ts`: consult ActivationRegistry in `evaluateTab` and icon setting.
- `src/content/oc-panel.ts`: add state request on load and on `visibilitychange`.
- `src/popup/main.tsx`: surface activation from background, not only deals.

### Testing

- Manual: go to merchant → activate → affiliate hop → land → deep-link restore; verify green icon and panels persist; navigate to subpages on same domain—state remains active; change to a new domain—state resets.
- Edge cases: late content load, page reload, SPA navigations (`history.pushState`)—re-emit maintains UI.

### To-dos

- [ ] Add ActivationRegistry with TTL and storage mirror in online-cashback.ts
- [ ] Mark domain active on landing/restore; record tabId; set icon green
- [ ] On navigation events, short-circuit using ActivationRegistry and re-emit oc_activated
- [ ] Add REQUEST_ACTIVATION_STATE handler in content; render pill on initial load
- [ ] Popup queries GET_DOMAIN_STATE to show active status and recent activation details
- [ ] Prioritize active state over partner checks; avoid downgrading to yellow within TTL
- [ ] Cleanup tabId references on domain change; TTL expiration task
- [ ] Add analytics breadcrumbs for state writes/re-emits/cleanup