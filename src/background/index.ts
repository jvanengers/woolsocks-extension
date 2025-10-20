// Background service worker: URL detection, icon state, messaging
import { getPartnerByHostname, getAllPartners, refreshDeals, initializeScraper, setupScrapingSchedule, getUserLanguage, hasActiveSession, resetCachedUserId } from './api.ts'
import { getCountryForDomain, getVoucherLocaleForCountry } from './partners-config'
import type { IconState, AnonymousUser, ActivationRecord } from '../shared/types'
import { handleActivateCashback } from './activate-cashback'
import { t, translate, initLanguage, setLanguageFromAPI } from '../shared/i18n'
import { track, initAnalytics, setUserId, setUserProperties } from '../shared/analytics-dual'
import { setupOnlineCashbackFlow, getDomainActivationState, removeTabFromOtherDomains } from './online-cashback'
import { fetchWalletDataCached, fetchTransactionsCached, fetchUserProfileCached } from '../shared/cached-api'
import { getStats, restoreFromPersistent, CACHE_NAMESPACES } from '../shared/cache'

// --- First-party header injection for woolsocks.eu -------------------------

async function refreshWsCookies() {}

chrome.runtime.onInstalled.addListener(refreshWsCookies)
// @ts-ignore - onStartup exists in MV3 service workers
chrome.runtime.onStartup?.addListener(refreshWsCookies)
let __wsSessionDebounce = 0
chrome.cookies.onChanged.addListener(({ cookie }) => {
  try {
    if (cookie?.domain && cookie.domain.includes('woolsocks.eu')) {
      if (__wsSessionDebounce) clearTimeout(__wsSessionDebounce)
      __wsSessionDebounce = setTimeout(async () => {
        try {
          resetCachedUserId()
          const active = await hasActiveSession()
          
          // Update Firebase Analytics user ID based on session state
          try {
            if (active) {
              // User logged in - set user ID and properties
              const profile = await fetchUserProfileCached()
              if (profile?.id) {
                await setUserId(profile.id)
                await setUserProperties({
                  country: profile.country,
                  user_type: 'logged_in'
                })
              }
            } else {
              // User logged out - clear user ID
              await setUserId(null)
              await setUserProperties({
                user_type: 'anonymous'
              })
            }
          } catch (error) {
            console.error('[WS] Failed to update Firebase user ID:', error)
          }
          
          if (active) {
            chrome.runtime.sendMessage({ type: 'SESSION_UPDATED', active: true })
          } else {
          }
        } catch {}
        try { refreshWsCookies() } catch {}
      }, 500) as unknown as number
    }
  } catch {}
})


let tokenSavedOnce = false

// Ensure language is loaded from storage when the service worker wakes
let __wsLanguageInitialized = false
async function ensureLanguageInitialized() {
  if (!__wsLanguageInitialized) {
    try { await initLanguage() } catch {}
    __wsLanguageInitialized = true
  }
}

type IconPaths = string | { 16: string; 32: string; 48: string }

// Map states to your provided multi-resolution icons
const ICONS: Record<IconState, IconPaths> = {
  neutral: { 16: 'icons/icon-grey-16.png', 32: 'icons/icon-grey-32.png', 48: 'icons/icon-grey-48.png' },
  available: { 16: 'icons/icon-yellow-16.png', 32: 'icons/icon-yellow-32.png', 48: 'icons/icon-yellow-48.png' },
  active: { 16: 'icons/icon-green-16.png', 32: 'icons/icon-green-32.png', 48: 'icons/icon-green-48.png' },
  // We no longer use a distinct voucher icon; treat as available (yellow)
  voucher: { 16: 'icons/icon-yellow-16.png', 32: 'icons/icon-yellow-32.png', 48: 'icons/icon-yellow-48.png' },
  // Fallback error icon (single size asset available)
  error: 'icons/state-error-48.png',
}

function setIcon(state: IconState, tabId?: number) {
  try {
    console.log(`[WS Icon] setIcon called with state=${state}, tabId=${tabId}`)
    
    const path = ICONS[state] || ICONS.neutral
    console.log(`[WS Icon] Icon path resolved:`, path)
    
    let titleMap: Record<IconState, string>
    try {
      titleMap = {
        neutral: t().icons.noDeals,
        available: t().icons.cashbackAvailable,
        active: t().icons.cashbackActive,
        voucher: t().icons.voucherAvailable,
        error: t().icons.attentionNeeded,
      }
    } catch (err) {
      console.warn(`[WS Icon] Failed to get translated titles, using fallbacks:`, err)
      titleMap = {
        neutral: 'No deals',
        available: 'Cashback available',
        active: 'Cashback active',
        voucher: 'Voucher available',
        error: 'Attention needed',
      }
    }
    
    console.log(`[WS Icon] Setting icon to ${state} for tab ${tabId || 'all'}`)
    
    // Resolve action API across browsers
    const actionApi: any = (chrome as any).action || (chrome as any).browserAction
    // Firefox MV2 browserAction.setIcon() returns a Promise, not a callback
    // Chrome action.setIcon() supports both callback and Promise
    try {
      const result = actionApi.setIcon({ path: path as any, tabId })
      if (result && typeof result.then === 'function') {
        // Promise-based (Firefox)
        result.then(() => {
          console.log(`[WS Icon] Successfully set icon to ${state} (Promise)`)
        }).catch((err: any) => {
          console.error(`[WS Icon] Failed to set icon to ${state} (Promise):`, err)
        })
      } else {
        // Callback-based (Chrome) - callback already provided above
        console.log(`[WS Icon] Icon set call completed (callback-based)`)
      }
    } catch (err) {
      console.error(`[WS Icon] Exception calling setIcon:`, err)
    }
    
    try {
      actionApi.setTitle({ title: titleMap[state], tabId })
    } catch (err) {
      console.error(`[WS Icon] Exception calling setTitle:`, err)
    }
  } catch (err) {
    console.error(`[WS Icon] Exception in setIcon:`, err)
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  // Initialize dual analytics system (GA4 + Firebase)
  try {
    await initAnalytics()
    console.log('[WS] Dual analytics initialized')
  } catch (err) {
    console.error('[WS] Analytics initialization failed:', err)
  }
  
  // Initialize language from storage (fallback)
  await initLanguage(); __wsLanguageInitialized = true
  
  // Fetch user's language from API and apply it
  const apiLang = await getUserLanguage()
  if (apiLang) {
    const lang = setLanguageFromAPI(apiLang)
    console.log(`[WS] Language set from API: ${lang}`)
  } else {
    console.log('[WS] Using cached/default language')
  }
  
  // Initialize defaults
  const defaultUser: AnonymousUser = {
    totalEarnings: 0,
    activationHistory: [],
    settings: {
      showCashbackPrompt: true,
      showVoucherPrompt: true,
      autoActivateOnlineCashback: true,
    },
  }
  chrome.storage.local.set({ user: defaultUser })
  
  // Initialize deals scraper
  await initializeScraper()
  setupScrapingSchedule()
  // Enable online cashback navigation flow
  setupOnlineCashbackFlow(setIcon)
})

// Also fetch language on startup (when browser restarts)
chrome.runtime.onStartup?.addListener(async () => {
  await initLanguage(); __wsLanguageInitialized = true
  const apiLang = await getUserLanguage()
  if (apiLang) {
    const lang = setLanguageFromAPI(apiLang)
    console.log(`[WS] Language refreshed from API on startup: ${lang}`)
  }
  // Ensure online cashback flow is active when service worker wakes up
  try { setupOnlineCashbackFlow(setIcon) } catch {}
  
  // Store current active tab for popup (Firefox workaround)
  try {
    const tabs = await chrome.tabs.query({ active: true })
    if (tabs && tabs.length > 0) {
      await storeCurrentTabInfo(tabs[0])
    }
  } catch (err) {
    console.error('[WS] Failed to store active tab on startup:', err)
  }
})

// Ensure the online cashback flow is registered even if neither onInstalled nor onStartup fire
// (e.g., during dev reloads or SW restarts). Guard to avoid double registration.
let __wsOcFlowRegistered = false
function ensureOcFlowRegistered() {
  if (__wsOcFlowRegistered) return
  try { setupOnlineCashbackFlow(setIcon); __wsOcFlowRegistered = true } catch {}
}
// Call immediately at top-level so webNavigation listeners are attached as soon as the SW starts
ensureOcFlowRegistered()

// Also store the current active tab immediately on load (Firefox workaround)
;(async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true })
    if (tabs && tabs.length > 0) {
      await storeCurrentTabInfo(tabs[0])
    }
  } catch {}
})()

// Domains where the extension should never trigger
const EXCLUDED_DOMAINS = [
  'woolsocks.eu',
  'scoupy.nl', 
  'scoupy.com',
  'ok.nl',
  'ok.com',
  'shopbuddies.nl',
  'shopbuddies.com',
  'praxis.nl'
]

// Check if a hostname should be excluded from extension functionality
function isExcludedDomain(hostname: string): boolean {
  const cleanHostname = hostname.replace(/^www\./, '').toLowerCase()
  return EXCLUDED_DOMAINS.some(domain => 
    cleanHostname === domain || cleanHostname.endsWith('.' + domain)
  )
}

// Debounce evaluateTab per (tabId, host) to avoid repeated partner lookups on noisy events
const __wsEvalDebounce = new Map<string, number>() // key: `${tabId}:${host}`
const EVALUATE_DEBOUNCE_MS = 2000

async function evaluateTab(tabId: number, url?: string | null) {
  await ensureLanguageInitialized()
  if (!url) {
    setIcon('neutral', tabId)
    return
  }
  
  try {
    const u = new URL(url)
    
    // Skip browser internal pages
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') || 
        url.startsWith('brave://') || 
        url.startsWith('edge://') || 
        url.startsWith('firefox://') || 
        url.startsWith('moz-extension://') || 
        url.startsWith('about:') || 
        url.startsWith('file://')) {
      setIcon('neutral', tabId)
      return
    }
    
    // Check if this domain should be excluded
    if (isExcludedDomain(u.hostname)) {
      setIcon('neutral', tabId)
      return
    }
    
    // Content script is auto-injected via manifest.json on all pages
    // No manual injection needed - it runs automatically
    
    // If domain already marked active (within TTL), prioritize green icon and short-circuit
    try {
      const active = getDomainActivationState(u.hostname)
      if (active.active) {
        setIcon('active', tabId)
        // Short-circuit: don't let later partner evaluation downgrade the icon
        return
      }
    } catch {}

    // Debounce same tab+host within short window to avoid duplicate API calls
    const hostKey = `${tabId}:${u.hostname.replace(/^www\./, '').toLowerCase()}`
    const lastRun = __wsEvalDebounce.get(hostKey) || 0
    if (Date.now() - lastRun < EVALUATE_DEBOUNCE_MS) {
      return
    }
    __wsEvalDebounce.set(hostKey, Date.now())

    // Maintain per-tab domain linkage for ActivationRegistry
    try { removeTabFromOtherDomains(tabId, u.hostname) } catch {}

    // Check if this merchant is supported via API (async, non-blocking)
    // The checkout detector will handle the actual voucher display if needed
    const partner = await getPartnerByHostname(u.hostname)

    if (partner) {
      // Check if cashback is already active
      const result = await chrome.storage.local.get('user')
      const user: AnonymousUser = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
      
      const activeActivation = user.activationHistory.find(
        (activation: ActivationRecord) => activation.partner === partner.name && activation.status === 'active'
      )
      
      if (activeActivation) {
        setIcon('active', tabId)
      } else if (partner.voucherAvailable && u.pathname.includes('checkout')) {
        setIcon('available', tabId)
      } else {
        setIcon('available', tabId)
      }
    } else {
      // No partner found - icon stays neutral, but checkout detection still works
      setIcon('neutral', tabId)
    }
  } catch {
    setIcon('neutral', tabId)
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    // Store current tab info for popup (Firefox workaround)
    if (tab.active) {
      await storeCurrentTabInfo(tab)
    }
    evaluateTab(tabId, changeInfo.url ?? tab.url)
  }
})

// Helper to store current tab info
async function storeCurrentTabInfo(tab: chrome.tabs.Tab) {
  if (tab.url && !tab.url.startsWith('moz-extension://') && !tab.url.startsWith('chrome-extension://')) {
    try {
      await chrome.storage.local.set({ 
        __wsCurrentTabUrl: tab.url,
        __wsCurrentTabId: tab.id,
        __wsCurrentTabUpdated: Date.now()
      })
      console.log('[WS] Stored current tab:', tab.url)
    } catch (err) {
      console.error('[WS] Failed to store tab info:', err)
    }
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)
  await storeCurrentTabInfo(tab)
  await evaluateTab(activeInfo.tabId, tab.url)
})

// No cleanup needed - content scripts are managed by manifest

;(chrome as any).action?.onClicked?.addListener(async (tab: any) => {
  if (!tab.id || !tab.url) return
  
  try {
    const u = new URL(tab.url)
    
    // Skip browser internal pages
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('brave://') || 
        tab.url.startsWith('edge://') || 
        tab.url.startsWith('firefox://') || 
        tab.url.startsWith('moz-extension://') || 
        tab.url.startsWith('about:') || 
        tab.url.startsWith('file://')) {
      setIcon('neutral', tab.id)
      return
    }
    
    // Check if this domain should be excluded
    if (isExcludedDomain(u.hostname)) {
      setIcon('neutral', tab.id)
      return
    }
    
    const partner = await getPartnerByHostname(u.hostname)
    
    if (!partner) {
      setIcon('neutral', tab.id)
      return
    }
    
    // Get current user state
    const result = await chrome.storage.local.get('user')
    const user: AnonymousUser = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
    
    // Check if already active
    const activeActivation = user.activationHistory.find(
      (activation: ActivationRecord) => activation.partner === partner.name && activation.status === 'active'
    )
    
    if (activeActivation) {
      // Already active, show popup with status
      ;(chrome as any).action?.openPopup?.()
    } else {
      // Activate cashback
      const newActivation: ActivationRecord = {
        partner: partner.name,
        timestamp: Date.now(),
        cashbackRate: partner.cashbackRate,
        estimatedEarnings: 0, // Will be updated when purchase is made
        status: 'active'
      }
      
      user.activationHistory.push(newActivation)
      await chrome.storage.local.set({ user })
      
      setIcon('active', tab.id)
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: t().notifications.cashbackActivated,
        message: translate('notifications.cashbackActivatedMessage', { 
          rate: String(partner.cashbackRate), 
          partner: partner.name 
        })
      })

      // Voucher offers will be shown automatically when checkout is detected
      // No need for fallback logic here - let the checkout detection handle it
    }
  } catch (error) {
    console.error('Error activating cashback:', error)
    setIcon('error', tab.id)
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'WS_CAPTURE_TOKEN' && typeof message.token === 'string' && message.token.length > 10) {
    (async () => {
      await chrome.storage.local.set({ apiToken: message.token })
      if (!tokenSavedOnce) {
        tokenSavedOnce = true
        console.log('[WS] Captured and stored API token')
      }
      sendResponse({ ok: true })
    })()
    return true
  } else if (message?.type === 'SET_ICON' && typeof message.state === 'string') {
    setIcon(message.state as IconState)
    sendResponse({ ok: true })
    return false
  } else if (message?.type === 'CHECKOUT_DETECTED') {
    console.log('[WS] CHECKOUT_DETECTED message received:', message.checkoutInfo, 'from tab:', _sender.tab?.id)
    handleCheckoutDetected(message.checkoutInfo, _sender.tab?.id)
    sendResponse({ ok: true })
    return false
  } else if (message?.type === 'ACTIVATE_CASHBACK') {
    // coerce to any to satisfy handler signature expecting string; it's safe internally
    handleActivateCashback(message.partner, _sender.tab?.id, setIcon as unknown as (state: string, tabId?: number) => void)
    sendResponse({ ok: true })
    return false
  } else if (message?.type === 'CHECK_MERCHANT_SUPPORT') {
    console.log('[WS] CHECK_MERCHANT_SUPPORT request for:', message.hostname)
    ;(async () => {
      try {
        const partner = await getPartnerByHostname(message.hostname)
        console.log('[WS] Partner found:', partner ? partner.name : 'none')
        if (partner) {
          console.log('[WS] Partner categories:', partner.categories?.map(c => c.name))
        }
        const result = { supported: !!partner, partner }
        // Store for Firefox MV2 workaround
        await chrome.storage.local.set({ 
          __wsMerchantSupport: result,
          __wsMerchantSupportHostname: message.hostname,
          __wsMerchantSupportUpdated: Date.now()
        })
        sendResponse(result)
        console.log('[WS] Merchant support response sent')
      } catch (err) {
        console.error('[WS] Error checking merchant support:', err)
        sendResponse({ supported: false, partner: null })
      }
    })()
    return true
  } else if (message?.type === 'CHECK_CASHBACK_STATUS') {
    ;(async () => {
      const result = await chrome.storage.local.get('user')
      const user: AnonymousUser = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
      const activeActivation = user.activationHistory.find(
        (activation: ActivationRecord) => activation.partner === message.partnerName && activation.status === 'active'
      )
      sendResponse({ active: !!activeActivation })
    })()
    return true
  } else if (message?.type === 'OPEN_VOUCHER_PRODUCT') {
    const { url } = message
    if (url && typeof url === 'string') {
      chrome.tabs.create({ url })
      sendResponse({ ok: true })
    } else {
      sendResponse({ ok: false, error: 'Missing URL' })
    }
    return false
  } else if (message?.type === 'ANALYTICS_TRACK') {
    try {
      track(message.event, message.params)
      sendResponse({ ok: true })
    } catch (error: any) {
      sendResponse({ ok: false, error: error?.message })
    }
    return false
  } else if (message?.type === 'VOUCHER_CLICK') {
    try {
      const payload = message?.payload || {}
      const domain = String(payload.domain || '').replace(/^www\./, '').toLowerCase()
      track('voucher_click', {
        domain,
        partner_name: payload.partner_name,
        provider_reference_id: payload.provider_reference_id,
        rate: payload.rate
      })
    } catch {}
    sendResponse({ ok: true })
    return false
  } else if (message?.type === 'VOUCHER_PANEL_SHOWN') {
    try {
      const payload = message?.payload || {}
      const domain = String(payload.domain || '').replace(/^www\./, '').toLowerCase()
      track('voucher_panel_shown', {
        domain,
        partner_name: payload.partner_name,
        top_rate: payload.top_rate
      })
    } catch {}
    sendResponse({ ok: true })
    return false
  } else if (message?.type === 'VOUCHER_VIEW') {
    try {
      const payload = message?.payload || {}
      const domain = String(payload.domain || '').replace(/^www\./, '').toLowerCase()
      track('voucher_view', {
        domain,
        partner_name: payload.partner_name,
        provider_reference_id: payload.provider_reference_id,
        rate: payload.rate
      })
    } catch {}
    sendResponse({ ok: true })
    return false
  } else if (message?.type === 'VOUCHER_USED') {
    try {
      const payload = message?.payload || {}
      const domain = String(payload.domain || '').replace(/^www\./, '').toLowerCase()
      track('voucher_used', {
        domain,
        partner_name: payload.partner_name,
        provider_reference_id: payload.provider_reference_id,
        rate: payload.rate
      })
    } catch {}
    sendResponse({ ok: true })
    return false
  } else if (message?.type === 'OPEN_URL') {
    const { url } = message
    if (url && typeof url === 'string') {
      chrome.tabs.create({ url })
      sendResponse({ ok: true })
    } else {
      sendResponse({ ok: false, error: 'Missing URL' })
    }
    return false
  } else if (message?.type === 'GET_ALL_PARTNERS') {
    ;(async () => {
      const data = await getAllPartners()
      sendResponse(data)
    })()
    return true
  } else if (message?.type === 'GET_CURRENT_TAB') {
    // Firefox MV2 workaround: popup can't reliably query tabs, so background does it
    console.log('[WS] GET_CURRENT_TAB request received')
    ;(async () => {
      try {
        let tabs = await chrome.tabs.query({ active: true })
        console.log('[WS] Query result:', tabs ? `${tabs.length} tabs` : 'undefined')
        
        // Firefox may return undefined, try to get all tabs and filter
        if (!tabs || !Array.isArray(tabs) || tabs.length === 0) {
          console.log('[WS] No tabs from active:true, trying to get all tabs...')
          const allTabs = await chrome.tabs.query({})
          console.log('[WS] All tabs found:', allTabs ? allTabs.length : 'undefined')
          if (allTabs && Array.isArray(allTabs)) {
            console.log('[WS] All tab URLs:', allTabs.map(t => ({ id: t.id, url: t.url, active: t.active })))
          }
          tabs = (allTabs && Array.isArray(allTabs)) ? allTabs.filter(t => t.active) : []
          console.log('[WS] Found', tabs.length, 'active tabs from all tabs')
        }
        
        console.log('[WS] Tabs before filtering:', tabs ? tabs.map(t => ({ id: t.id, url: t.url, active: t.active })) : 'undefined')
        
        const activeTab = tabs && Array.isArray(tabs) 
          ? tabs.find(t => t.url && !t.url.startsWith('moz-extension://') && !t.url.startsWith('chrome-extension://'))
          : null
          
        console.log('[WS] Active tab after filtering:', activeTab ? { id: activeTab.id, url: activeTab.url } : 'null')
          
        if (activeTab) {
          console.log('[WS] Found active tab:', activeTab.url)
          await storeCurrentTabInfo(activeTab)
          sendResponse({ url: activeTab.url, id: activeTab.id })
        } else {
          console.warn('[WS] No active tab found via query, falling back to stored tab info')
          // Fallback: return stored tab info if query fails
          const stored = await chrome.storage.local.get(['__wsCurrentTabUrl', '__wsCurrentTabId', '__wsCurrentTabUpdated'])
          if (stored.__wsCurrentTabUrl && stored.__wsCurrentTabUpdated) {
            const age = Date.now() - stored.__wsCurrentTabUpdated
            if (age < 300000) { // Use if less than 5 minutes old
              console.log('[WS] Using stored tab info:', stored.__wsCurrentTabUrl, `(${Math.round(age)}ms old)`)
              sendResponse({ url: stored.__wsCurrentTabUrl, id: stored.__wsCurrentTabId })
            } else {
              console.warn('[WS] Stored tab info too old:', age / 1000, 'seconds')
              sendResponse({ url: null, id: null })
            }
          } else {
            console.warn('[WS] No stored tab info available')
            sendResponse({ url: null, id: null })
          }
        }
      } catch (err) {
        console.error('[WS] Error getting current tab:', err)
        // Fallback: return stored tab info on error
        try {
          const stored = await chrome.storage.local.get(['__wsCurrentTabUrl', '__wsCurrentTabId', '__wsCurrentTabUpdated'])
          if (stored.__wsCurrentTabUrl && stored.__wsCurrentTabUpdated) {
            const age = Date.now() - stored.__wsCurrentTabUpdated
            if (age < 300000) { // Use if less than 5 minutes old
              console.log('[WS] Using stored tab info after error:', stored.__wsCurrentTabUrl)
              sendResponse({ url: stored.__wsCurrentTabUrl, id: stored.__wsCurrentTabId })
            } else {
              sendResponse({ url: null, id: null })
            }
          } else {
            sendResponse({ url: null, id: null })
          }
        } catch {
          sendResponse({ url: null, id: null })
        }
      }
    })()
    return true
  } else if (message?.type === 'CHECK_ACTIVE_SESSION') {
    // Check session asynchronously
    // Firefox MV2 has issues with sendResponse() in async handlers,
    // so we store the result and let the popup read it
    console.log('[WS] CHECK_ACTIVE_SESSION request received')
    ;(async () => {
      try {
        const active = await hasActiveSession()
        console.log('[WS] hasActiveSession result:', active)
        // Store session state for popup to read
        await chrome.storage.local.set({ __wsSessionActive: active, __wsSessionCheckedAt: Date.now() })
        sendResponse({ active })
        console.log('[WS] Response sent successfully')
      } catch (err) {
        console.error('[WS] hasActiveSession error:', err)
        await chrome.storage.local.set({ __wsSessionActive: false, __wsSessionCheckedAt: Date.now() })
        sendResponse({ active: false })
      }
    })()
    return true // Keep message channel open for async response
  } else if (message?.type === 'REQUEST_ACTIVATION_STATE') {
    try {
      const { domain } = message
      const state = getDomainActivationState(domain || '')
      try { track('oc_state_query', { domain: (domain || '').replace(/^www\./, '').toLowerCase(), active: !!state.active }) } catch {}
      sendResponse(state)
    } catch {
      sendResponse({ active: false })
    }
    return true
  } else if (message?.type === 'REQUEST_VISITED_COUNTRY') {
    ;(async () => {
      try {
        const { domain } = message
        const country = await getCountryForDomain(domain || '')
        sendResponse({ country })
      } catch (e) {
        sendResponse({ country: null })
      }
    })()
    return true
  } else if (message?.type === 'REFRESH_PARTNERS') {
    ;(async () => {
      const deals = await refreshDeals()
      sendResponse({ partners: deals, lastUpdated: new Date() })
    })()
    return true
  } else if (message?.type === 'REFRESH_USER_DATA') {
    ;(async () => {
      try {
        // Refresh user data in background
        await Promise.all([
          fetchWalletDataCached(),
          fetchTransactionsCached(),
          fetchUserProfileCached(),
        ])
        sendResponse({ ok: true })
      } catch (error) {
        console.warn('[Background] Error refreshing user data:', error)
        sendResponse({ ok: false, error: (error as Error)?.message })
      }
    })()
    return true
  } else if (message?.type === 'CACHE_STATS') {
    ;(async () => {
      try {
        const stats = await getStats()
        sendResponse(stats)
      } catch (error) {
        sendResponse({ error: (error as Error)?.message })
      }
    })()
    return true
  } else if (message?.type === 'CACHE_INVALIDATE') {
    ;(async () => {
      try {
        const { namespace, key } = message
        if (namespace && key) {
          // Invalidate specific cache entry
          const { invalidate } = await import('../shared/cache')
          await invalidate(namespace, key)
        } else if (namespace) {
          // Invalidate entire namespace
          const { invalidateNamespace } = await import('../shared/cache')
          await invalidateNamespace(namespace)
        } else {
          // Clear all caches
          const { clearAll } = await import('../shared/cache')
          await clearAll()
        }
        sendResponse({ ok: true })
      } catch (error: any) {
        sendResponse({ ok: false, error: error?.message || 'Unknown error' })
      }
    })()
    return true
  } else if (message?.type === 'GET_USER_ID') {
    ;(async () => {
      try {
        const userId = await hasActiveSession()
        sendResponse({ userId: userId ? 'authenticated' : null })
      } catch {
        sendResponse({ userId: null })
      }
    })()
    return true
  } else if (message?.type === 'GET_CACHED_BALANCE') {
    ;(async () => {
      try {
        const { getCachedBalance } = await import('../shared/cached-api')
        const balance = await getCachedBalance()
        sendResponse({ balance })
      } catch (error) {
        console.warn('[Background] Error getting cached balance:', error)
        sendResponse({ balance: 0, error: (error as Error)?.message })
      }
    })()
    return true
  } else if (message?.type === 'GET_CACHED_TRANSACTIONS') {
    ;(async () => {
      try {
        const { getCachedTransactions } = await import('../shared/cached-api')
        const transactions = await getCachedTransactions()
        sendResponse({ transactions })
      } catch (error) {
        console.warn('[Background] Error getting cached transactions:', error)
        sendResponse({ transactions: [], error: (error as Error)?.message })
      }
    })()
    return true
  } else if (message?.type === 'REFRESH_USER_DATA_PROFILE_ONLY') {
    ;(async () => {
      try {
        const { fetchUserProfileCached } = await import('../shared/cached-api')
        const profile = await fetchUserProfileCached()
        sendResponse({ profile })
      } catch (error) {
        console.warn('[Background] Error refreshing user profile:', error)
        sendResponse({ profile: null, error: (error as Error)?.message })
      }
    })()
    return true
  } else if (message?.type === 'GET_CACHED_USER_DATA') {
    ;(async () => {
      try {
        const { getCachedBalance, getCachedTransactions, getCachedUserProfile } = await import('../shared/cached-api')
        const [balance, transactions, profile] = await Promise.all([
          getCachedBalance(),
          getCachedTransactions(),
          getCachedUserProfile()
        ])
        sendResponse({ balance, transactions, profile })
      } catch (error) {
        console.warn('[Background] Error getting cached user data:', error)
        sendResponse({ balance: 0, transactions: [], profile: null, error: (error as Error)?.message })
      }
    })()
    return true
  } else if (message?.type === 'CACHE_PRELOAD_REQUEST') {
    // Cache preload removed - causes unnecessary API calls
    ;(async () => {
      sendResponse({ success: true, message: 'Preload disabled to prevent unnecessary API calls' })
    })()
    return true
  } else if (message?.type === 'REQUEST_USER_LANGUAGE') {
    ;(async () => {
      try {
        const lang = await getUserLanguage()
        sendResponse(lang)
      } catch {
        sendResponse('nl-NL')
      }
    })()
    return true
  }
})

// --- Cache Management and Background Refresh --------------------------------

// Event-driven cache cleanup and preload (replaces chrome.alarms)
let cleanupThrottle = 0
const CLEANUP_THROTTLE_MS = 60 * 60 * 1000 // 1 hour

/**
 * Trigger cache cleanup if needed (throttled to once per hour)
 */
async function triggerCleanupIfNeeded() {
  const now = Date.now()
  if (now - cleanupThrottle < CLEANUP_THROTTLE_MS) return
  
  cleanupThrottle = now
  try {
    // Cleanup main cache
    const { cleanupIfNeeded } = await import('../shared/cache')
    await cleanupIfNeeded()
    
    // Scraper cache cleanup removed - using API-based merchant discovery only
  } catch (error) {
    console.warn('[Cache] Event-driven cleanup failed:', error)
  }
}

// Popular merchants preloading removed - causes unnecessary API calls and tab flashing

// Event-driven cleanup triggers
chrome.tabs.onActivated.addListener(() => triggerCleanupIfNeeded())
chrome.webNavigation.onCompleted.addListener(() => triggerCleanupIfNeeded())

// Initialize cache on startup
chrome.runtime.onStartup?.addListener(async () => {
  try {
    // Restore cache from persistent storage
    await restoreFromPersistent([
      CACHE_NAMESPACES.PARTNER_INFO,
      CACHE_NAMESPACES.MERCHANT_SEARCH,
      CACHE_NAMESPACES.PARTNER_CONFIG,
    ])
    console.log('[Cache] Restored from persistent storage on startup')
    
    // Trigger cleanup on startup (preload removed)
    await triggerCleanupIfNeeded()
  } catch (error) {
    console.warn('[Cache] Error during startup initialization:', error)
  }
})

// Preload on install removed - causes unnecessary API calls

// Removed unused handleShowProfile function

async function handleCheckoutDetected(checkoutInfo: any, tabId?: number) {
  console.log('[WS] handleCheckoutDetected ENTRY - checkoutInfo:', checkoutInfo, 'tabId:', tabId)
  await ensureLanguageInitialized()
  if (!tabId) {
    console.log('[WS] handleCheckoutDetected EXIT - no tabId')
    return
  }
  
  // checkoutInfo.merchant is already a hostname (e.g., "zalando.com")
  console.log('[WS] handleCheckoutDetected called with:', checkoutInfo)
  console.log(translate('debug.checkoutDetected', { merchant: checkoutInfo.merchant }))
  
  // Check user settings first (fast check before API call)
  const result = await chrome.storage.local.get('user')
  const user: AnonymousUser = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
  
  if (!user.settings.showVoucherPrompt) return

  // Track voucher detection as soon as we enter handler
  try { track('voucher_detected', { domain: String(checkoutInfo.merchant || '').replace(/^www\./, '').toLowerCase() }) } catch {}

  // Special case: bol.com always returns Woolsocks All-in-One voucher (bypass API entirely)
  if (checkoutInfo.merchant.includes('bol.com')) {
    console.log('[WS] Special case: bol.com detected, showing Woolsocks All-in-One voucher')
    const bolPartner = {
      name: 'Woolsocks All-in-One',
      cashbackRate: 4,
      voucherAvailable: true,
      voucherProductUrl: 'https://woolsocks.eu/nl-NL/giftcards-shop/products/3bb42619-ac4c-4934-a5c2-eec7a7530afe',
      merchantImageUrl: '',
      categories: [{
        name: 'Vouchers',
        deals: [{
          name: 'Woolsocks All-in-One',
          rate: 4,
          description: '1 voucher, vele merken',
          imageUrl: '',
          dealUrl: 'https://woolsocks.eu/nl-NL/giftcards-shop/products/3bb42619-ac4c-4934-a5c2-eec7a7530afe'
        }],
        maxRate: 4
      }]
    }
    
    // Use a default amount if total is 0 or invalid
    const checkoutTotal = checkoutInfo.total > 0 ? checkoutInfo.total : 50
    console.log('[WS] Using checkout total:', checkoutTotal, '(original was:', checkoutInfo.total, ')')
    
    console.log(translate('debug.showingOffer', { name: bolPartner.name, rate: String(bolPartner.cashbackRate) }))
    
    // Inject translations into page context first (MAIN world)
    const asset = (p: string) => chrome.runtime.getURL(p)
    const paymentIconFiles = [
      'public/icons/Payment method icon_VISA.png',
      'public/icons/Payment method icon_mastercard.png',
      'public/icons/Payment method icon_IDEAL.png',
      'public/icons/Payment method icon_APPLEPAY.png',
      'public/icons/Payment method icon_GPAY.png',
    ]
    const assets = {
      uspIconUrl: asset('public/icons/Circle checkmark.svg'),
      wsLogoUrl: asset('public/icons/Woolsocks-logo-large.png'),
      externalIconUrl: asset('public/icons/External-link.svg'),
      paymentIconUrls: paymentIconFiles.map(asset),
    }

    await injectVoucherInPage(tabId, bolPartner, checkoutTotal, assets)
    
    return
  }

  // Add extra delay for slow-loading sites like Thuisbezorgd
  if (checkoutInfo.merchant.includes('thuisbezorgd')) {
    console.log('[WS] Adding extra delay for Thuisbezorgd to ensure page is fully loaded')
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Search for merchant via API (works for any merchant)
  const partner = await getPartnerByHostname(checkoutInfo.merchant)
  console.log(t().debug.partnerData, partner)
  
  if (!partner) {
    console.log(translate('debug.noMerchant', { merchant: checkoutInfo.merchant }))
    return
  }
  
  // Check if vouchers are available for this merchant
  if (!partner.voucherAvailable) {
    console.log(translate('debug.noVouchers', { name: partner.name }))
    return
  }

  const checkoutTotal = checkoutInfo.total
  
  console.log(translate('debug.showingOffer', { name: partner.name, rate: String(partner.cashbackRate) }))

  // --- Country-scoped voucher filtering and locale-aware URL building -------
  try {
    const visitedCountry = await getCountryForDomain(checkoutInfo.merchant)
    const userLang = (await getUserLanguage().catch(() => 'nl-NL')) || 'nl-NL'
    const locale = getVoucherLocaleForCountry(visitedCountry, userLang)
    const voucherCat = Array.isArray(partner.categories)
      ? partner.categories.find((c: any) => /voucher/i.test(String(c?.name || '')))
      : null
    if (voucherCat && Array.isArray(voucherCat.deals)) {
      const beforeCount = voucherCat.deals.length
      const filtered = voucherCat.deals.filter((d: any) => {
        const dc = String((d as any).voucherCountry || d.country || '').toUpperCase()
        if (!dc) return false
        const match = dc === String(visitedCountry).toUpperCase()
        if (!match) {
          try { track('voucher_country_filtered_out', { domain: checkoutInfo.merchant, visited_country: visitedCountry, deal_country: dc }) } catch {}
        }
        return match
      })
      // Update dealUrl with correct locale
      const withUrls = filtered.map((d: any) => {
        try {
          const pid = d?.providerReferenceId || d?.productId || d?.id
          if (pid) d.dealUrl = `https://woolsocks.eu/${locale}/giftcards-shop/products/${encodeURIComponent(String(pid))}`
          else if (typeof d?.dealUrl === 'string') {
            const m = String(d.dealUrl).match(/products\/([A-Za-z0-9-]{8,})/)
            if (m && m[1]) d.dealUrl = `https://woolsocks.eu/${locale}/giftcards-shop/products/${m[1]}`
          }
        } catch {}
        return d
      })
      ;(voucherCat as any).deals = withUrls
      if (beforeCount && withUrls.length === 0) {
        try { track('deal_country_mismatch', { domain: checkoutInfo.merchant, visited_country: visitedCountry, flow: 'voucher' }) } catch {}
      }
    }
  } catch {}
  
  // Inject translations into page context first (MAIN world)
  const asset = (p: string) => chrome.runtime.getURL(p)
  const paymentIconFiles = [
    'public/icons/Payment method icon_VISA.png',
    'public/icons/Payment method icon_mastercard.png',
    'public/icons/Payment method icon_IDEAL.png',
    'public/icons/Payment method icon_APPLEPAY.png',
    'public/icons/Payment method icon_GPAY.png',
  ]
  const assets = {
    uspIconUrl: asset('public/icons/Circle checkmark.svg'),
    wsLogoUrl: asset('public/icons/Woolsocks-logo-large.png'),
    externalIconUrl: asset('public/icons/External-link.svg'),
    paymentIconUrls: paymentIconFiles.map(asset),
  }

  await injectVoucherInPage(tabId, partner, checkoutTotal, assets)
}

// Firefox MV2 compatible injection helper: inject voucher UI into MAIN world.
// Uses content script messaging for Chrome MV3 (reliable) and Firefox MV2 fallback
async function injectVoucherInPage(
  tabId: number,
  partner: any,
  checkoutTotal: number,
  assets: { uspIconUrl: string; wsLogoUrl: string; externalIconUrl: string; paymentIconUrls: string[] }
) {
  console.log('[WS] injectVoucherInPage called with:', { tabId, partner: partner.name, checkoutTotal, assets })
  
  // Get translations
  const translations = (t() as any).voucher
  console.log('[WS] Translations object:', translations)
  
  // Use content script messaging approach for Chrome MV3 (reliable)
  // Skip the problematic direct MV3 injection
  console.log('[WS] Using content script messaging approach (reliable)')
  try {
    const config = { partner, checkoutTotal, assets, translations }
    console.log('[WS] Sending ws/inject-voucher-popup message')
    await new Promise<void>((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: 'ws/inject-voucher-popup', config }, () => {
        if (chrome.runtime.lastError) {
          console.error('[WS] sendMessage failed:', chrome.runtime.lastError)
        } else {
          console.log('[WS] sendMessage dispatched successfully')
        }
        resolve()
      })
    })
  } catch (e) {
    console.warn('[WS] message-based injection failed:', e)
  }
}

// MVP: Removed old complex voucher offer function - replaced with simplified version

// Removed showCashbackPrompt function - no longer using automatic cashback prompts

// Removed unused showProfileScreen function

// (Removed old simplified voucher list renderer)

// Removed showCashbackPrompt function - no longer using automatic cashback prompts

// Removed unused showProfileScreen function

// Removed showVoucherDetailWithUsps function - replaced with simplified inline script injection
