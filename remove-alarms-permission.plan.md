# Remove alarms Permission and Find Alternatives

## Context

Chrome Web Store has rejected the extension (Item ID: fneoceodefiieccfcapkjanllehpogpj) because it requests but doesn't use the `alarms` permission. The actual issue is that we DO use alarms, but need to demonstrate that functionality to the reviewers OR remove it entirely. The safest path is to eliminate alarms completely and use alternative approaches.

**Current Status**: Extension version 0.91.0 with comprehensive caching system implemented (commits 9f42076, e5685f2, 15f6e11, 070887c, 536e436, ec06720). The caching system is now mature and ready for alarms removal.

## Current Alarm Usage

The extension currently uses `chrome.alarms` in three places:

### 1. Cache cleanup (background/index.ts)
- **Alarm**: `cache-cleanup` - runs every 24 hours
- **Function**: Calls `cleanupExpired()` from shared/cache.ts
- **Purpose**: Removes expired cache entries from persistent storage

### 2. Cache preload (background/index.ts)
- **Alarm**: `cache-preload` - runs every 30 minutes
- **Function**: Pre-warms cache for popular merchants (bol.com, zalando.nl, etc.)
- **Purpose**: Improves performance by keeping frequently accessed merchant data cached

### 3. Deals scraper cleanup (background/deals-scraper.ts)
- **Alarm**: `cache-cleanup` - runs every 24 hours (note: same name as #1, potential conflict)
- **Function**: Calls `cleanupOldCacheEntries()` to remove merchant search cache entries older than 7 days
- **Purpose**: Prevents storage bloat from stale merchant search results

### 4. Analytics periodic flush (background/analytics.ts)
- **Not using alarms**: Currently uses `setInterval(() => flush(), 60_000)` which is already event-driven
- **No changes needed**: This already works without alarms

## Replacement Strategy

### A. Cache Cleanup → Event-Driven + Lazy Execution

**Approach**: Trigger cleanup during natural extension activity instead of on a schedule.

**Triggers**:
1. **Service worker startup** (`chrome.runtime.onStartup`)
2. **Tab activation** (`chrome.tabs.onActivated`) - throttled to once per hour
3. **Navigation events** (`chrome.webNavigation.onCompleted`) - throttled to once per hour
4. **Storage writes** - trigger cleanup check when cache is modified (piggyback on writes)

**Implementation** (`src/shared/cache.ts` + `src/background/index.ts`):
- Add `cleanupIfNeeded()` function that checks last cleanup timestamp
- Only run cleanup if >24 hours since last execution
- Store `lastCleanupTimestamp` in chrome.storage.local
- Call from multiple event listeners with throttling

### B. Cache Preload → Startup + Activity-Based Preloading

**Approach**: Preload cache at strategic moments rather than periodically.

**Triggers**:
1. **Service worker startup** (`chrome.runtime.onStartup` + `chrome.runtime.onInstalled`)
2. **First popup open** - preload when user first interacts with extension
3. **Domain visit triggers** - when user visits a top merchant, preload similar merchants
4. **Background refresh on cache access** - already supported via `refreshOnAccess` config

**Implementation** (`src/background/index.ts`):
- Move preload logic to `preloadPopularMerchants()` function
- Call on startup events
- Add message handler for `POPUP_OPENED` to trigger preload on first use
- Remove periodic 30-minute alarm

### C. Deals Scraper Cleanup → Storage Event-Driven

**Approach**: Same as cache cleanup - trigger during natural activity.

**Implementation** (`src/background/deals-scraper.ts`):
- Replace `setupScrapingSchedule()` with `scheduleCleanupIfNeeded()`
- Track last cleanup timestamp in storage
- Trigger from tab/navigation events (shared with main cache cleanup)
- Remove alarm setup and listener

### D. Service Worker Lifecycle Considerations

**Challenge**: Chrome MV3 service workers can terminate after inactivity (30-60 seconds). `setInterval` only works while service worker is active.

**Solution**:
- **Analytics flush**: Already using `setInterval` which is acceptable since analytics are batched and flushed immediately when queue reaches 10 items. The 60-second interval is a safety net.
- **Cache operations**: Don't need continuous execution - event-driven triggers are sufficient
- **No long-running timers needed**: All cleanup/preload operations are infrequent and can piggyback on user activity

## Implementation Steps

### 1. Update cache.ts with event-driven cleanup
- Add `lastCleanupTimestamp` tracking
- Add `cleanupIfNeeded()` wrapper with 24-hour throttle
- Keep existing `cleanupExpired()` function unchanged

### 2. Update background/index.ts
- Remove `chrome.alarms.create('cache-cleanup')` and `chrome.alarms.create('cache-preload')`
- Remove `chrome.alarms.onAlarm.addListener()`
- Add `preloadPopularMerchants()` function
- Call preload on `chrome.runtime.onStartup` and `chrome.runtime.onInstalled`
- Add throttled cleanup triggers on `chrome.tabs.onActivated` and `chrome.webNavigation.onCompleted`
- Add message handler for `CACHE_PRELOAD_REQUEST` from popup

### 3. Update background/deals-scraper.ts
- Remove `setupScrapingSchedule()` function (or convert to no-op)
- Add `cleanupCacheIfNeeded()` with timestamp throttling
- Call cleanup from the same shared event handlers in background/index.ts
- Store `lastScraperCleanupTimestamp` separately

### 4. Update popup/main.tsx
- Send `CACHE_PRELOAD_REQUEST` message when popup first opens (once per session)

### 5. Update manifest files
- Remove `alarms` from permissions in `vite.config.ts` (line 34)
- Remove `alarms` from `dist/manifest.json` (line 33) - will be auto-regenerated
- Verify build generates correct manifest

### 6. Update documentation
- Update `README.md` to remove alarms permission justification (line 78, 89)
- Update `docs/ROADMAP.md` to mark item 15 as completed
- Add migration notes to `CHANGELOG.md`

## Testing Requirements

### Functional Testing
1. **Cache cleanup works without alarms**
   - Verify cleanup runs on startup
   - Verify cleanup removes expired entries
   - Verify cleanup throttling (doesn't run more than once per 24 hours)

2. **Cache preload works without alarms**
   - Verify popular merchants are preloaded on startup
   - Verify preload on first popup open
   - Verify cache hit rates remain high (>90%)

3. **Analytics continue to work**
   - Verify events are queued and flushed
   - Verify batch flushing at 10 items
   - Verify periodic flush still works while service worker is active

4. **No storage bloat**
   - Monitor storage size over 24-48 hours
   - Verify old entries are eventually cleaned up
   - Verify no memory leaks in service worker

### Performance Testing
- Popup load time remains <200ms with cache
- No observable degradation in partner detection speed
- Cache hit rates remain >90% for balance/transactions

### Edge Cases
- Service worker termination and restart
- Multiple rapid tab navigations (throttling works)
- Extension disable/enable cycle
- Browser restart
- Clean install (no existing cache)

## Success Criteria

1. ✅ Extension passes Chrome Web Store review without alarms permission
2. ✅ All current functionality preserved:
   - Cache cleanup removes expired entries within 48 hours of expiration
   - Popular merchants remain preloaded for fast access
   - Analytics delivery maintains >95% success rate
3. ✅ No performance degradation:
   - Cache hit rates remain >90%
   - Popup load time remains <200ms
   - No storage bloat (stable size over time)
4. ✅ No reliability issues:
   - Cleanup executes successfully on startup and during activity
   - No memory leaks or service worker crashes
   - Graceful handling of service worker termination

## Files to Modify

1. `src/shared/cache.ts` - Add cleanup throttling logic
2. `src/background/index.ts` - Replace alarms with event-driven triggers
3. `src/background/deals-scraper.ts` - Replace alarm-based cleanup
4. `src/popup/main.tsx` - Add preload trigger on open
5. `vite.config.ts` - Remove alarms permission
6. `README.md` - Update permission documentation
7. `docs/ROADMAP.md` - Mark item 15 complete
8. `CHANGELOG.md` - Document changes

## Risks and Mitigations

**Risk**: Cache cleanup doesn't run if user doesn't use extension for days
**Mitigation**: Cleanup runs on any startup, tab activation, or navigation - even rare users will trigger it eventually

**Risk**: Preload doesn't happen frequently enough, cache goes stale
**Mitigation**: Cache TTLs are appropriate (30-60 minutes), and `refreshOnAccess` config already handles background refresh for active merchants

**Risk**: Service worker terminates before setInterval completes analytics flush
**Mitigation**: Analytics already batch at 10 items (immediate flush) and persist queue to storage. The 60-second interval is a safety net, not critical path.

**Risk**: Throttling logic has bugs causing too-frequent or no cleanup
**Mitigation**: Use simple timestamp comparison with clear logging, thorough testing with various scenarios

## Updated Implementation Details

### Key Changes Since Original Plan

1. **Comprehensive Caching System**: The recent commits (ec06720, 15f6e11, 070887c) have implemented a robust caching system with:
   - Multi-tier caching (memory + persistent storage)
   - Configurable TTL per namespace
   - Cache statistics and analytics
   - Background refresh capabilities

2. **Enhanced Cache Management**: The new system includes:
   - `CACHE_NAMESPACES` for organized cache management
   - `DEFAULT_CONFIGS` with appropriate TTLs
   - `cachedFetch()` wrapper for automatic cache management
   - `cleanupExpired()` function already implemented

3. **Cached API Layer**: New `cached-api.ts` provides:
   - Cached wallet data, transactions, and user profile
   - Automatic background refresh
   - Consistent UI data structure

### Specific Implementation Notes

**Cache Cleanup Throttling**:
```typescript
// Add to src/shared/cache.ts
const LAST_CLEANUP_KEY = '__ws_last_cleanup_timestamp'
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

export async function cleanupIfNeeded(): Promise<number> {
  const stored = await chrome.storage.local.get(LAST_CLEANUP_KEY)
  const lastCleanup = stored[LAST_CLEANUP_KEY] || 0
  const now = Date.now()
  
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return 0 // Skip cleanup
  }
  
  const removed = await cleanupExpired()
  await chrome.storage.local.set({ [LAST_CLEANUP_KEY]: now })
  return removed
}
```

**Event-Driven Triggers**:
```typescript
// Add to src/background/index.ts
let cleanupThrottle = 0
const CLEANUP_THROTTLE_MS = 60 * 60 * 1000 // 1 hour

async function triggerCleanupIfNeeded() {
  const now = Date.now()
  if (now - cleanupThrottle < CLEANUP_THROTTLE_MS) return
  
  cleanupThrottle = now
  const { cleanupIfNeeded } = await import('../shared/cache')
  const removed = await cleanupIfNeeded()
  if (removed > 0) {
    console.log(`[Cache] Event-driven cleanup removed ${removed} expired entries`)
  }
}

// Add event listeners
chrome.tabs.onActivated.addListener(() => triggerCleanupIfNeeded())
chrome.webNavigation.onCompleted.addListener(() => triggerCleanupIfNeeded())
```

**Preload Function**:
```typescript
// Add to src/background/index.ts
async function preloadPopularMerchants() {
  const popularMerchants = ['bol.com', 'zalando.nl', 'coolblue.nl', 'wehkamp.nl', 'mediamarkt.nl', 'ikea.nl', 'hema.nl']
  const { getPartnerByHostname } = await import('./partners-config')
  
  for (const merchant of popularMerchants) {
    try {
      await getPartnerByHostname(merchant)
    } catch (error) {
      console.warn(`[Cache] Failed to preload ${merchant}:`, error)
    }
  }
}

// Call on startup
chrome.runtime.onStartup?.addListener(preloadPopularMerchants)
chrome.runtime.onInstalled.addListener(preloadPopularMerchants)
```

### To-dos

- [ ] Add lastCleanupTimestamp tracking and cleanupIfNeeded() wrapper to src/shared/cache.ts
- [ ] Remove chrome.alarms usage from src/background/index.ts and add event-driven cleanup triggers
- [ ] Convert cache preload from periodic alarm to startup + activity-based in src/background/index.ts
- [ ] Replace alarm-based cleanup with event-driven approach in src/background/deals-scraper.ts
- [ ] Add cache preload trigger when popup opens in src/popup/main.tsx
- [ ] Remove alarms from permissions in vite.config.ts and verify manifest.json regeneration
- [ ] Update README.md, ROADMAP.md, and CHANGELOG.md to reflect alarms removal
- [ ] Test cache cleanup, preload, and analytics work correctly without alarms
- [ ] Verify no performance degradation in cache hit rates and popup load times
- [ ] Test service worker termination, rapid navigations, and clean install scenarios
