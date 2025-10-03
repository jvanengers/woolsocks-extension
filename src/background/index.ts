// Background service worker: URL detection, icon state, messaging
import { getPartnerByHostname, getAllPartners, refreshDeals, initializeScraper, setupScrapingSchedule, getUserLanguage } from './api.ts'
import type { IconState, AnonymousUser, ActivationRecord } from '../shared/types'
import { handleActivateCashback } from './activate-cashback'
import { t, translate, initLanguage, setLanguageFromAPI } from '../shared/i18n'

// --- First-party header injection for woolsocks.eu -------------------------
const WS_ORIGIN = 'https://woolsocks.eu'

async function refreshWsCookies() {}

chrome.runtime.onInstalled.addListener(refreshWsCookies)
// @ts-ignore - onStartup exists in MV3 service workers
chrome.runtime.onStartup?.addListener(refreshWsCookies)
chrome.cookies.onChanged.addListener(({ cookie }) => {
  if (cookie?.domain && cookie.domain.includes('woolsocks.eu')) {
    refreshWsCookies()
  }
})

// Note: MV3 non-enterprise extensions cannot use blocking webRequest listeners.
// We keep a non-blocking observer for diagnostics only and rely on API relays for auth.
try {
  chrome.webRequest.onBeforeSendHeaders.addListener(
    (_details) => undefined,
    { urls: [WS_ORIGIN + '/*'] },
    ['requestHeaders', 'extraHeaders']
  )
} catch {}

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
  const path = ICONS[state] || ICONS.neutral
  const titleMap: Record<IconState, string> = {
    neutral: t().icons.noDeals,
    available: t().icons.cashbackAvailable,
    active: t().icons.cashbackActive,
    voucher: t().icons.voucherAvailable,
    error: t().icons.attentionNeeded,
  }
  // Pass multi-size path map when available; Chrome will pick best size
  chrome.action.setIcon({ path: path as any, tabId })
  chrome.action.setTitle({ title: titleMap[state], tabId })
}

chrome.runtime.onInstalled.addListener(async () => {
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
    },
  }
  chrome.storage.local.set({ user: defaultUser })
  
  // Initialize deals scraper
  await initializeScraper()
  setupScrapingSchedule()
})

// Also fetch language on startup (when browser restarts)
chrome.runtime.onStartup?.addListener(async () => {
  await initLanguage(); __wsLanguageInitialized = true
  const apiLang = await getUserLanguage()
  if (apiLang) {
    const lang = setLanguageFromAPI(apiLang)
    console.log(`[WS] Language refreshed from API on startup: ${lang}`)
  }
})

// Domains where the extension should never trigger
const EXCLUDED_DOMAINS = [
  'woolsocks.eu',
  'scoupy.nl', 
  'scoupy.com',
  'ok.nl',
  'ok.com',
  'shopbuddies.nl',
  'shopbuddies.com'
]

// Check if a hostname should be excluded from extension functionality
function isExcludedDomain(hostname: string): boolean {
  const cleanHostname = hostname.replace(/^www\./, '').toLowerCase()
  return EXCLUDED_DOMAINS.some(domain => 
    cleanHostname === domain || cleanHostname.endsWith('.' + domain)
  )
}

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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    evaluateTab(tabId, changeInfo.url ?? tab.url)
  }
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)
  await evaluateTab(activeInfo.tabId, tab.url)
})

// No cleanup needed - content scripts are managed by manifest

chrome.action.onClicked.addListener(async (tab) => {
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
      chrome.action.openPopup()
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
    handleCheckoutDetected(message.checkoutInfo, _sender.tab?.id)
    sendResponse({ ok: true })
    return false
  } else if (message?.type === 'ACTIVATE_CASHBACK') {
    // coerce to any to satisfy handler signature expecting string; it's safe internally
    handleActivateCashback(message.partner, _sender.tab?.id, setIcon as unknown as (state: string, tabId?: number) => void)
    sendResponse({ ok: true })
    return false
  } else if (message?.type === 'CHECK_MERCHANT_SUPPORT') {
    ;(async () => {
      const partner = await getPartnerByHostname(message.hostname)
      sendResponse({ supported: !!partner, partner })
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
  } else if (message?.type === 'REFRESH_PARTNERS') {
    ;(async () => {
      const deals = await refreshDeals()
      sendResponse({ partners: deals, lastUpdated: new Date() })
    })()
    return true
  }
})

// Removed unused handleShowProfile function

async function handleCheckoutDetected(checkoutInfo: any, tabId?: number) {
  await ensureLanguageInitialized()
  if (!tabId) return
  
  // checkoutInfo.merchant is already a hostname (e.g., "zalando.com")
  console.log('[WS] handleCheckoutDetected called with:', checkoutInfo)
  console.log(translate('debug.checkoutDetected', { merchant: checkoutInfo.merchant }))
  
  // Check user settings first (fast check before API call)
  const result = await chrome.storage.local.get('user')
  const user: AnonymousUser = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
  
  if (!user.settings.showVoucherPrompt) return

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
      wsLogoUrl: asset('public/icons/Woolsocks-logo-large.svg'),
      externalIconUrl: asset('public/icons/External-link.svg'),
      paymentIconUrls: paymentIconFiles.map(asset),
    }

    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (translations) => {
        try { (window as any).__wsTranslations = translations } catch {}
      },
      args: [t().voucher],
    }).then(() => {
      // Then render the voucher panel in MAIN world to avoid isolation issues
      return chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: showVoucherDetailWithUsps,
        args: [bolPartner, checkoutTotal, assets],
      })
    }).catch((e) => {
      console.warn('[WS] Failed to inject/render voucher panel:', e)
    })
    
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
    wsLogoUrl: asset('public/icons/Woolsocks-logo-large.svg'),
    externalIconUrl: asset('public/icons/External-link.svg'),
    paymentIconUrls: paymentIconFiles.map(asset),
  }

  chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (translations) => {
      try { (window as any).__wsTranslations = translations } catch {}
    },
    args: [t().voucher],
  }).then(() => {
    // Then render the voucher panel in MAIN world to avoid isolation issues
    return chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: showVoucherDetailWithUsps,
      args: [partner, checkoutTotal, assets],
    })
  }).catch((e) => {
    console.warn('[WS] Failed to inject/render voucher panel:', e)
  })
}

// MVP: Removed old complex voucher offer function - replaced with simplified version

// Removed showCashbackPrompt function - no longer using automatic cashback prompts

// Removed unused showProfileScreen function

// (Removed old simplified voucher list renderer)

// Removed showCashbackPrompt function - no longer using automatic cashback prompts

// Removed unused showProfileScreen function

function showVoucherDetailWithUsps(partner: any, amount: number, assets?: { uspIconUrl: string; wsLogoUrl: string; externalIconUrl: string; paymentIconUrls: string[] }) {
  // Always reflect the latest detected amount by re-rendering the prompt
  const existing = document.getElementById('woolsocks-voucher-prompt')
  if (existing) {
    try { existing.remove() } catch {}
  }

  // Get translations (injected from background script) with safe fallback.
  // Some builds inject only the voucher object (not wrapped). Normalize shape.
  const injected = (window as any).__wsTranslations
  const fallbackVoucher = {
    title: 'Voucher',
    purchaseAmount: 'Purchase amount',
    cashbackText: "You'll get ",
    cashbackSuffix: ' of cashback',
    viewDetails: 'View voucher details',
    usps: {
      instantDelivery: 'Instant delivery',
      cashbackOnPurchase: '% cashback on purchase',
      useOnlineAtCheckout: 'Use online at checkout',
    },
    instructions: 'Buy the voucher at Woolsocks.eu and put the vouchercode in the field at checkout.',
  }
  const translations = (injected && injected.voucher)
    ? injected
    : { voucher: injected || fallbackVoucher }

  function markVoucherDismissed(ms: number) {
    const host = window.location.hostname
    const until = Date.now() + ms
    try {
      const raw = window.localStorage.getItem('__wsVoucherDismissals')
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {}
      map[host] = until
      window.localStorage.setItem('__wsVoucherDismissals', JSON.stringify(map))
    } catch {
      try { document.documentElement.setAttribute('data-ws-voucher-dismissed-until', String(until)) } catch {}
    }
  }

  type VoucherDeal = { name?: string; cashbackRate?: number; imageUrl?: string; url?: string }
  const collected: VoucherDeal[] = []
  const normalizeImageUrl = (u?: string) => {
    if (!u || typeof u !== 'string') return undefined
    try {
      // Prefer https to avoid mixed-content blocks
      const fixed = u.replace(/^http:/i, 'https:')
      return fixed
    } catch {
      return undefined
    }
  }

  const voucherCategory = Array.isArray(partner.categories)
    ? partner.categories.find((c: any) => /voucher/i.test(String(c?.name || '')))
    : null

  if (voucherCategory && Array.isArray(voucherCategory.deals)) {
    for (const d of voucherCategory.deals) {
      collected.push({ name: d?.name, cashbackRate: typeof d?.rate === 'number' ? d.rate : undefined, imageUrl: normalizeImageUrl(d?.imageUrl), url: d?.dealUrl })
    }
  } else if (Array.isArray(partner.allVouchers)) {
    for (const v of partner.allVouchers) collected.push({ name: v.name, cashbackRate: v.cashbackRate, imageUrl: normalizeImageUrl(v.imageUrl), url: v.url })
  } else if (partner.voucherProductUrl) {
    collected.push({ name: (partner.name || '') + ' Voucher', cashbackRate: partner.cashbackRate, imageUrl: normalizeImageUrl(partner.merchantImageUrl), url: partner.voucherProductUrl })
  }

  const validVouchers = collected
    .filter(v => typeof v.cashbackRate === 'number' && (v.cashbackRate as number) > 0)
    .sort((a, b) => (b.cashbackRate || 0) - (a.cashbackRate || 0))
  
  const best = validVouchers[0]
  const hasMultipleVouchers = validVouchers.length > 1

  const prompt = document.createElement('div')
  prompt.id = 'woolsocks-voucher-prompt'
  prompt.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 380px;
    max-height: 80vh;
    overflow-y: auto;
    border-radius: 16px;
    border: 4px solid var(--brand, #FDC408);
    background: var(--brand, #FDC408);
    box-shadow: -2px 2px 4px rgba(0, 0, 0, 0.08);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    opacity: 0;
    transform: translateY(10px) scale(0.95);
    transition: opacity 0.3s ease, transform 0.3s ease;
    cursor: move;
  `

  let selectedVoucherIndex = 0
  const effectiveRate = typeof (validVouchers[selectedVoucherIndex]?.cashbackRate ?? partner.cashbackRate) === 'number' ? (validVouchers[selectedVoucherIndex]?.cashbackRate ?? partner.cashbackRate) : 0
  const cashbackAmount = (amount * effectiveRate / 100).toFixed(2)

  // USPs with unified checkmark icon
  const uspIconUrl = assets?.uspIconUrl || ''
  const safeUsps = (translations && translations.voucher && translations.voucher.usps) || {
    instantDelivery: 'Instant delivery',
    cashbackOnPurchase: '% cashback on purchase',
    useOnlineAtCheckout: 'Use online at checkout',
  }

  // Domain-specific messaging adjustments
  try {
    const hn = window.location.hostname.toLowerCase()
    if (hn.includes('dille-kamille')) {
      // Dille & Kamille vouchers are in-store only
      safeUsps.useOnlineAtCheckout = 'Voucher only usable in-store (not online)'
      if (translations && translations.voucher) {
        (translations.voucher as any).instructions = 'This voucher can only be used in-store at Dille & Kamille (not online).'
      }
    }
  } catch {}
  const usps: Array<{ text: string }> = [
    { text: safeUsps.instantDelivery },
    ...(Number.isFinite(effectiveRate) && effectiveRate > 0 ? [{ text: `${effectiveRate}${safeUsps.cashbackOnPurchase}` }] : []),
    { text: safeUsps.useOnlineAtCheckout },
  ]

  let image = normalizeImageUrl(best?.imageUrl || partner.merchantImageUrl) || ''
  try {
    const hn = window.location.hostname.toLowerCase()
    if (!image && hn.includes('prenatal.nl')) {
      image = 'https://www.prenatal.nl/favicon.ico'
    }
  } catch {}
  const title = best?.name || partner.name || 'Gift Card'

  // Details (optional): omitted here as they are not available in current partner payload

  // Payment methods row (from extension assets)
  const paymentIconUrls = (assets?.paymentIconUrls || []).filter(Boolean)
  const paymentIconsHtml = paymentIconUrls.map((src) => `
    <div style="flex: 1; display: flex; align-items: center; justify-content: center; min-width: 0;">
      <img src="${src}" alt="payment" style="height: 36px; width: auto; display: block; max-width: 100%; object-fit: contain;" />
    </div>
  `).join('')

  // Woolsocks logo (brand)
  const wsLogoUrl = assets?.wsLogoUrl || ''
  const externalIconUrl = assets?.externalIconUrl || ''

  prompt.innerHTML = `
    <div style="padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #100B1C;">${partner.name}</h3>
        <button id="ws-close" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #0F0B1C; line-height: 1;">×</button>
      </div>

      <div style="border-radius: 16px; background: var(--bg-main, #F5F5F6); padding: 16px;">
        <div style="margin-bottom: 16px; display: flex; flex-direction: column; align-items: center;">
          <div style="color: #100B1C; text-align: center; font-feature-settings: 'liga' off, 'clig' off; font-family: Woolsocks, sans-serif; font-size: 12px; font-style: normal; font-weight: 400; line-height: 145%; letter-spacing: 0.15px;">${translations.voucher.purchaseAmount}</div>
          <div style="color: #100B1C; text-align: center; font-feature-settings: 'liga' off, 'clig' off; font-family: Woolsocks, sans-serif; font-size: 16px; font-style: normal; font-weight: 700; line-height: 145%;">€${amount.toFixed(2)}</div>
        </div>
        ${hasMultipleVouchers ? `
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
          <div id="voucher-carousel" style="display: flex; gap: 8px; overflow-x: hidden; scroll-behavior: smooth; padding: 8px 0;">
            ${validVouchers.map((voucher, index) => `
              <div class="voucher-card" data-index="${index}" style="min-width: 259px; background: white; border-radius: 8px; padding: 16px; display: flex; gap: 16px; align-items: flex-start; cursor: pointer; transition: transform 0.2s ease;">
                <div style="width: 111px; height: 74px; border-radius: 8px; background: #F3F4F6; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                  ${voucher.imageUrl ? `<img src="${voucher.imageUrl}" alt="${voucher.name}" referrerpolicy="no-referrer" decoding="async" loading="eager" onerror="console.warn('[WS] Image failed to load:', '${voucher.imageUrl}'); this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width: 100%; height: 100%; object-fit: contain;"><div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: #F3F4F6; border-radius: 8px; font-size: 12px; color: #666;">Voucher</div>` : `${assets?.wsLogoUrl ? `<img src='${assets.wsLogoUrl}' alt="${voucher.name}" style="width: 100%; height: 100%; object-fit: contain;">` : `<div style=\"font-size: 12px; color: #666;\">Voucher</div>`}`}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; padding: 2px 4px; justify-content: center; align-items: flex-start; gap: 8px; border-radius: 4px; background: #ECEBED; font-size: 13px; color: #6B7280; margin-bottom: 2px; width: fit-content;">${voucher.cashbackRate}% cashback</div>
                  <div style="font-size: 16px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${voucher.name}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <div id="carousel-navigation" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div id="carousel-left-arrow" class="carousel-arrow" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.5;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="#0F0B1C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div id="carousel-indicators" style="display: flex; justify-content: center; gap: 4px;">
              ${validVouchers.map((_, index) => `
                <div class="carousel-dot" data-index="${index}" style="width: 6px; height: 6px; border-radius: ${index === 0 ? '3px' : '50%'}; background: ${index === 0 ? '#0F0B1C' : '#D1D5DB'}; cursor: pointer; transition: all 0.2s ease;"></div>
              `).join('')}
            </div>
            <div id="carousel-right-arrow" class="carousel-arrow" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="#0F0B1C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
        ` : `
        <div style="display: flex; padding: 16px; flex-direction: column; justify-content: center; align-items: flex-start; gap: 16px; border-radius: 8px; background: var(--bg-neutral, #FFF); margin-bottom: 16px;">
          <div style="display: flex; gap: 12px; align-items: center; width: 100%;">
            <div style="width: 72px; height: 48px; border-radius: 8px; background: #F3F4F6; overflow: hidden; display: flex; align-items: center; justify-content: center;">
              ${image ? `<img src="${image}" alt="${title}" referrerpolicy="no-referrer" decoding="async" loading="eager" onerror="console.warn('[WS] Image failed to load:', '${image}'); this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width: 100%; height: 100%; object-fit: contain;"><div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: #F3F4F6; border-radius: 8px; font-size: 12px; color: #666;">Voucher</div>` : `${assets?.wsLogoUrl ? `<img src='${assets.wsLogoUrl}' alt="${title}" style="width: 100%; height: 100%; object-fit: contain;">` : `<div style=\"font-size: 12px; color: #666;\">Voucher</div>`}`}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; padding: 2px 4px; justify-content: center; align-items: flex-start; gap: 8px; border-radius: 4px; background: #ECEBED; font-size: 13px; color: #6B7280; margin-bottom: 2px; width: fit-content;">${effectiveRate}% cashback</div>
              <div style="font-size: 16px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>
            </div>
          </div>
        </div>
        `}

        <div style="display: flex; width: 310px; height: 43px; padding: 8px 16px; justify-content: center; align-items: baseline; gap: 4px; margin-bottom: 16px;">
          <span style="color: #8564FF; text-align: center; font-feature-settings: 'liga' off, 'clig' off; font-family: Woolsocks, sans-serif; font-size: 16px; font-style: normal; font-weight: 400; line-height: 145%;">${translations.voucher.cashbackText}</span>
          <span style="display: flex; padding: 2px 4px; justify-content: center; align-items: center; gap: 8px; border-radius: 6px; background: #8564FF; color: #FFF; text-align: center; font-feature-settings: 'liga' off, 'clig' off; font-family: Woolsocks, sans-serif; font-size: 16px; font-style: normal; font-weight: 400; line-height: 145%;">€${cashbackAmount}</span>
          <span style="color: #8564FF; text-align: center; font-feature-settings: 'liga' off, 'clig' off; font-family: Woolsocks, sans-serif; font-size: 16px; font-style: normal; font-weight: 400; line-height: 145%;">${translations.voucher.cashbackSuffix}</span>
        </div>

        <div style="display: flex; align-items: center;">
          <button id="ws-use-voucher" style="display: flex; width: 100%; height: 48px; padding: 0 16px 0 24px; justify-content: center; align-items: center; gap: 16px; border-radius: 4px; background: var(--action-button-fill-bg-default, #211940); color: var(--action-button-fill-content-default, #FFF); border: none; font-family: Woolsocks, sans-serif; font-size: 16px; font-style: normal; font-weight: 500; line-height: 140%; text-align: center; font-feature-settings: 'liga' off, 'clig' off; cursor: pointer;">
            <span>${translations.voucher.viewDetails}</span>
            ${externalIconUrl ? `<img src="${externalIconUrl}" alt="open" style="width:20px;height:20px;display:block;" />` : ''}
          </button>
        </div>
      </div>


      <div style="display: flex; width: 100%; padding: 16px; box-sizing: border-box; flex-direction: column; justify-content: center; align-items: flex-start; gap: 8px; border-radius: 8px; border: 1px solid var(--semantic-green-75, #B0F6D7); background: rgba(255, 255, 255, 0.50); margin: 12px 0;">
        ${usps.map(u => `
          <div style=\"display: flex; align-items: center; gap: 8px;\">
            ${uspIconUrl ? `<img src=\"${uspIconUrl}\" alt=\"check\" style=\"width:16px;height:16px;display:block;\" />` : ''}
            <span style=\"font-size: 13px; color: #111827;\">${u.text}</span>
          </div>
        `).join('')}
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 6px 0 14px; width: 100%;">
        ${paymentIconsHtml}
      </div>

      <div style="font-size: 13px; color: #3A2B00; opacity: 0.9; text-align: center; line-height: 1.4; margin: 6px 0 10px;">
        ${translations.voucher.instructions}
      </div>

      ${wsLogoUrl ? `
        <div style="display:flex; align-items:center; justify-content:center; padding-top: 8px;">
          <img src="${wsLogoUrl}" alt="Woolsocks" style="height: 36px; width: auto; display: block;" />
        </div>
      ` : ''}
    </div>
  `

  document.body.appendChild(prompt)

  // If user previously minimized on this domain and the cooldown is still active, show the minimized banner immediately
  try {
    const host = window.location.hostname
    const raw = window.localStorage.getItem('__wsMinimizedBannerMap')
    const map = raw ? (JSON.parse(raw) as Record<string, { until: number; cashbackAmount?: string; corner?: string }>) : {}
    const entry = map[host]
    if (entry && typeof entry.until === 'number' && Date.now() < entry.until) {
      // Show minimized banner and position to remembered corner
      showMinimizedBanner()
      try {
        const mb = document.getElementById('woolsocks-voucher-minimized') as HTMLElement | null
        if (mb && entry.corner) {
          mb.style.top = 'auto'
          mb.style.bottom = 'auto'
          mb.style.left = 'auto'
          mb.style.right = 'auto'
          const [v, h] = entry.corner.split('-')
          if (v === 'top') mb.style.top = '20px'; else mb.style.bottom = '20px'
          if (h === 'left') mb.style.left = '20px'; else mb.style.right = '20px'
        }
      } catch {}
      // Hide full prompt immediately
      ;(prompt as HTMLElement).style.display = 'none'
    }
  } catch {}

  // --- Auto-minimize on inactivity -------------------------------------------
  let inactivityTimer: number | undefined
  const INACTIVITY_MS = 30_000

  function scheduleAutoMinimize() {
    if (inactivityTimer) window.clearTimeout(inactivityTimer)
    inactivityTimer = window.setTimeout(() => {
      if (document.body.contains(prompt) && (prompt as HTMLElement).style.display !== 'none') {
        minimizePrompt()
      }
    }, INACTIVITY_MS)
  }

  function resetInactivity() {
    scheduleAutoMinimize()
  }

  // Start inactivity countdown as soon as the widget is shown
  scheduleAutoMinimize()

  // Any interaction with the prompt should reset the inactivity timer
  prompt.addEventListener('click', resetInactivity)
  prompt.addEventListener('pointerdown', resetInactivity)
  prompt.addEventListener('pointermove', resetInactivity)
  prompt.addEventListener('wheel', resetInactivity)

  // --- Carousel functionality -------------------------------------------------
  if (hasMultipleVouchers) {
    const carousel = document.getElementById('voucher-carousel')
    const indicators = document.getElementById('carousel-indicators')
    const leftArrow = document.getElementById('carousel-left-arrow')
    const rightArrow = document.getElementById('carousel-right-arrow')
    const cashbackAmountSpan = prompt.querySelector('span[style*="background: #8564FF"]') as HTMLElement
    
    if (carousel && indicators && leftArrow && rightArrow && cashbackAmountSpan) {
      let currentIndex = 0
      const cardWidth = 259 + 8 // card width + gap
      const totalCards = validVouchers.length
      
      function updateCarousel(index: number) {
        currentIndex = index
        
        // Handle positioning based on number of vouchers
        if (carousel) {
          const containerWidth = carousel.offsetWidth
          let scrollPosition = 0
          
          if (totalCards === 2) {
            // For 2 vouchers: center the selected card
            const centerOffset = (containerWidth - cardWidth) / 2
            scrollPosition = (index * cardWidth) - centerOffset
            scrollPosition = Math.max(0, scrollPosition)
          } else if (totalCards >= 3) {
            // For 3+ vouchers: center the selected card with visible edges of adjacent cards
            const centerOffset = (containerWidth - cardWidth) / 2
            scrollPosition = (index * cardWidth) - centerOffset
            scrollPosition = Math.max(0, scrollPosition)
          }
          
          carousel.scrollLeft = scrollPosition
        }
      }
      
      // Function to detect current position based on scroll position
      function detectCurrentPosition(): number {
        if (!carousel) return currentIndex
        
        const scrollLeft = carousel.scrollLeft
        const containerWidth = carousel.offsetWidth
        
        if (totalCards === 2) {
          // For 2 vouchers: determine position based on centered logic (same as 3+)
          const centerOffset = (containerWidth - cardWidth) / 2
          const adjustedScroll = scrollLeft + centerOffset
          const detectedIndex = Math.round(adjustedScroll / cardWidth)
          const clampedIndex = Math.max(0, Math.min(totalCards - 1, detectedIndex))
          return clampedIndex
        } else if (totalCards >= 3) {
          // For 3+ vouchers: determine position based on centered logic
          const centerOffset = (containerWidth - cardWidth) / 2
          const adjustedScroll = scrollLeft + centerOffset
          const detectedIndex = Math.round(adjustedScroll / cardWidth)
          const clampedIndex = Math.max(0, Math.min(totalCards - 1, detectedIndex))
          return clampedIndex
        }
        
        return currentIndex
      }
      
      // Function to sync position indicator with actual scroll position
      function syncPositionIndicator() {
        const detectedIndex = detectCurrentPosition()
        if (detectedIndex !== currentIndex) {
          currentIndex = detectedIndex
          
          // Update indicators with rounded rectangle for selected
          if (indicators) {
            const dots = indicators.querySelectorAll('.carousel-dot')
            dots.forEach((dot, i) => {
              const dotElement = dot as HTMLElement
              if (i === currentIndex) {
                dotElement.style.background = '#0F0B1C'
                dotElement.style.borderRadius = '3px'
              } else {
                dotElement.style.background = '#D1D5DB'
                dotElement.style.borderRadius = '50%'
              }
            })
          }
          
          // Update arrow visibility
          if (leftArrow) {
            leftArrow.style.opacity = currentIndex === 0 ? '0.5' : '1'
            leftArrow.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto'
          }
          if (rightArrow) {
            rightArrow.style.opacity = currentIndex === totalCards - 1 ? '0.5' : '1'
            rightArrow.style.pointerEvents = currentIndex === totalCards - 1 ? 'none' : 'auto'
          }
          
          // Update cashback amount
          const selectedVoucher = validVouchers[currentIndex]
          if (selectedVoucher && cashbackAmountSpan) {
            const newRate = selectedVoucher.cashbackRate || 0
            const newAmount = (amount * newRate / 100).toFixed(2)
            cashbackAmountSpan.textContent = `€${newAmount}`
          }
        }
      }
      
      // Touch/swipe handling
      let startX = 0
      let startScrollLeft = 0
      let isDragging = false
      
      carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX
        startScrollLeft = carousel?.scrollLeft || 0
        isDragging = true
      })
      
      carousel.addEventListener('touchmove', (e) => {
        if (!isDragging || !carousel) return
        e.preventDefault()
        const currentX = e.touches[0].clientX
        const diff = startX - currentX
        carousel.scrollLeft = startScrollLeft + diff
      })
      
      carousel.addEventListener('touchend', () => {
        if (!isDragging || !carousel) return
        isDragging = false
        
        const threshold = cardWidth / 3
        const diff = startScrollLeft - carousel.scrollLeft
        
        if (Math.abs(diff) > threshold) {
          if (diff > 0 && currentIndex < totalCards - 1) {
            updateCarousel(currentIndex + 1)
          } else if (diff < 0 && currentIndex > 0) {
            updateCarousel(currentIndex - 1)
          } else {
            updateCarousel(currentIndex) // Snap back
          }
        } else {
          updateCarousel(currentIndex) // Snap back
        }
      })
      
      // Add scroll event listener to sync position indicator
      carousel.addEventListener('scroll', () => {
        if (!isDragging) {
          syncPositionIndicator()
        }
        scheduleAutoMinimize()
      })
      
      // Handle window resize to maintain position sync
      window.addEventListener('resize', () => {
        // Recalculate position after resize
        setTimeout(() => {
          syncPositionIndicator()
        }, 100)
      })
      
      // Mouse drag handling
      carousel.addEventListener('mousedown', (e) => {
        startX = e.clientX
        startScrollLeft = carousel?.scrollLeft || 0
        isDragging = true
        if (carousel) carousel.style.cursor = 'grabbing'
      })
      
      carousel.addEventListener('mousemove', (e) => {
        if (!isDragging || !carousel) return
        e.preventDefault()
        const currentX = e.clientX
        const diff = startX - currentX
        carousel.scrollLeft = startScrollLeft + diff
      })
      
      carousel.addEventListener('mouseup', () => {
        if (!isDragging || !carousel) return
        isDragging = false
        carousel.style.cursor = 'grab'
        
        const threshold = cardWidth / 3
        const diff = startScrollLeft - carousel.scrollLeft
        
        if (Math.abs(diff) > threshold) {
          if (diff > 0 && currentIndex < totalCards - 1) {
            updateCarousel(currentIndex + 1)
          } else if (diff < 0 && currentIndex > 0) {
            updateCarousel(currentIndex - 1)
          } else {
            updateCarousel(currentIndex) // Snap back
          }
        } else {
          updateCarousel(currentIndex) // Snap back
        }
      })
      
      carousel.addEventListener('mouseleave', () => {
        if (isDragging && carousel) {
          isDragging = false
          carousel.style.cursor = 'grab'
          updateCarousel(currentIndex) // Snap back
        }
      })
      
      // Arrow click handling
      leftArrow.addEventListener('click', () => {
        if (currentIndex > 0) {
          updateCarousel(currentIndex - 1)
        }
      })
      
      rightArrow.addEventListener('click', () => {
        if (currentIndex < totalCards - 1) {
          updateCarousel(currentIndex + 1)
        }
      })
      
      // Indicator click handling
      indicators.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target.classList.contains('carousel-dot')) {
          const index = parseInt(target.dataset.index || '0')
          updateCarousel(index)
        }
      })
      
      // Voucher card click handling
      carousel.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const card = target.closest('.voucher-card') as HTMLElement
        if (card && !isDragging) {
          const index = parseInt(card.dataset.index || '0')
          updateCarousel(index)
        }
      })
    }
  }

  // --- Minimize/Expand helpers -------------------------------------------------
  let minimizedBanner: HTMLElement | null = null

  function showMinimizedBanner() {
    if (minimizedBanner && document.body.contains(minimizedBanner)) return

    const hostForLabel = ((): string => {
      try { 
        const hostname = window.location.hostname
        return hostname.startsWith('www.') ? hostname.substring(4) : hostname
      } catch { return 'this site' }
    })()

    minimizedBanner = document.createElement('div')
    minimizedBanner.id = 'woolsocks-voucher-minimized'
    minimizedBanner.style.cssText = [
      'position: fixed',
      'top: 20px',
      'right: 20px',
      'z-index: 2147483647',
      'display: flex',
      'min-width: 200px',
      'max-width: 80vw',
      'max-height: 775px',
      'padding: 4px 8px',
      'flex-direction: column',
      'align-items: center',
      'border-radius: 8px',
      'background: var(--brand, #FDC408)',
      'box-shadow: -2px 2px 4px 0 rgba(0, 0, 0, 0.08)',
      'cursor: pointer',
      'color: #0F0B1C',
      'box-sizing: border-box'
    ].join(';') + ';'

    minimizedBanner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding-left: 0; padding-right: 8px; padding-top: 0; padding-bottom: 0; width: 100%; height: 32px;">
        <div style="display: flex; gap: 4px; align-items: center; padding: 0 2px;">
          <div style="display: flex; padding: 2px 4px; justify-content: center; align-items: center; gap: 8px; border-radius: 6px; background: #8564FF; color: #FFF; font-family: Woolsocks, sans-serif; font-size: 16px; font-weight: 400; line-height: 1.45; white-space: nowrap;">€${cashbackAmount}</div>
          <div style="font-family: Woolsocks, sans-serif; font-size: 14px; font-weight: 400; line-height: 1.45; color: #100B1C; letter-spacing: 0.1px; white-space: nowrap;">Savings available at ${hostForLabel}</div>
        </div>
        <div aria-hidden="true" style="display:flex; align-items:center; justify-content:center; width: 32px; height: 32px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M11.9999 13.5858L17.2928 8.29289L18.707 9.70711L12.707 15.7071C12.3165 16.0976 11.6833 16.0976 11.2928 15.7071L5.29282 9.70711L6.70703 8.29289L11.9999 13.5858Z" fill="#0F0B1C"/>
          </svg>
        </div>
      </div>
    `

    // Drag & snap for minimized banner
    let bannerDragging = false
    let bStartX = 0
    let bStartY = 0
    let bInitialX = 0
    let bInitialY = 0
    let moved = false

    minimizedBanner.addEventListener('mousedown', (e: MouseEvent) => {
      bannerDragging = true
      moved = false
      bStartX = e.clientX
      bStartY = e.clientY
      const rect = minimizedBanner!.getBoundingClientRect()
      bInitialX = rect.left
      bInitialY = rect.top
      minimizedBanner!.style.cursor = 'grabbing'
    })

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!bannerDragging) return
      const deltaX = e.clientX - bStartX
      const deltaY = e.clientY - bStartY
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) moved = true
      const newX = bInitialX + deltaX
      const newY = bInitialY + deltaY
      minimizedBanner!.style.top = 'auto'
      minimizedBanner!.style.bottom = 'auto'
      minimizedBanner!.style.left = 'auto'
      minimizedBanner!.style.right = 'auto'
      minimizedBanner!.style.left = newX + 'px'
      minimizedBanner!.style.top = newY + 'px'
    })

    document.addEventListener('mouseup', () => {
      if (!bannerDragging) return
      bannerDragging = false
      minimizedBanner!.style.cursor = 'pointer'

      const rect = minimizedBanner!.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const isLeft = centerX < viewportWidth / 2
      const isTop = centerY < viewportHeight / 2

      minimizedBanner!.style.transition = 'top 0.2s ease, bottom 0.2s ease, left 0.2s ease, right 0.2s ease'
      minimizedBanner!.style.top = 'auto'
      minimizedBanner!.style.bottom = 'auto'
      minimizedBanner!.style.left = 'auto'
      minimizedBanner!.style.right = 'auto'
      if (isTop) minimizedBanner!.style.top = '20px'; else minimizedBanner!.style.bottom = '20px'
      if (isLeft) minimizedBanner!.style.left = '20px'; else minimizedBanner!.style.right = '20px'
      setTimeout(() => { minimizedBanner && (minimizedBanner.style.transition = '') }, 250)
    })

    minimizedBanner.addEventListener('click', () => {
      if (moved) return // treat as drag end, not expand
      
      // Capture banner position before removing it
      const bannerRect = minimizedBanner!.getBoundingClientRect()
      const centerX = bannerRect.left + bannerRect.width / 2
      const centerY = bannerRect.top + bannerRect.height / 2
      const isLeft = centerX < window.innerWidth / 2
      const isTop = centerY < window.innerHeight / 2
      
      try {
        // Remove banner
        if (minimizedBanner && minimizedBanner.parentNode) minimizedBanner.parentNode.removeChild(minimizedBanner)
      } finally {
        minimizedBanner = null
      }

      // Restore main prompt in same corner as banner was
      prompt.style.display = 'block'
      prompt.style.top = 'auto'
      prompt.style.left = 'auto'
      prompt.style.right = 'auto'
      prompt.style.bottom = 'auto'
      if (isTop) { prompt.style.top = '20px' } else { prompt.style.bottom = '20px' }
      if (isLeft) { prompt.style.left = '20px' } else { prompt.style.right = '20px' }
      prompt.style.opacity = '0'
      prompt.style.transform = 'translateY(10px) scale(0.95)'
      requestAnimationFrame(() => {
        prompt.style.opacity = '1'
        prompt.style.transform = 'translateY(0) scale(1)'
      })
    })

    document.body.appendChild(minimizedBanner)
  }

  function minimizePrompt() {
    // Mark as dismissed for a short while, but keep a minimized reminder visible
    const ttl = 5 * 60 * 1000
    markVoucherDismissed(ttl)
    // Persist a light-weight minimized state so the banner can reappear on any page of the same domain
    try {
      const host = window.location.hostname
      const until = Date.now() + ttl
      const raw = window.localStorage.getItem('__wsMinimizedBannerMap')
      const map = raw ? (JSON.parse(raw) as Record<string, any>) : {}
      map[host] = {
        until,
        cashbackAmount: typeof cashbackAmount === 'string' ? cashbackAmount : String(cashbackAmount),
        // best-effort remember corner based on current prompt position
        corner: (() => {
          try {
            const rect = prompt.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2
            const isLeft = centerX < window.innerWidth / 2
            const isTop = centerY < window.innerHeight / 2
            return `${isTop ? 'top' : 'bottom'}-${isLeft ? 'left' : 'right'}`
          } catch { return 'top-right' }
        })()
      }
      window.localStorage.setItem('__wsMinimizedBannerMap', JSON.stringify(map))
    } catch {}

    // Animate out and then hide the full panel
    ;(prompt as HTMLElement).style.opacity = '0'
    ;(prompt as HTMLElement).style.transform = 'translateY(10px) scale(0.95)'
    setTimeout(() => {
      // Determine current corner of the prompt to position minimized banner there
      const rect = prompt.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const isLeft = centerX < window.innerWidth / 2
      const isTop = centerY < window.innerHeight / 2

      ;(prompt as HTMLElement).style.display = 'none'
      showMinimizedBanner()
      // After creation, snap banner to same corner
      if (minimizedBanner) {
        minimizedBanner.style.top = 'auto'
        minimizedBanner.style.bottom = 'auto'
        minimizedBanner.style.left = 'auto'
        minimizedBanner.style.right = 'auto'
        if (isTop) minimizedBanner.style.top = '20px'; else minimizedBanner.style.bottom = '20px'
        if (isLeft) minimizedBanner.style.left = '20px'; else minimizedBanner.style.right = '20px'
      }
    }, 300)
  }

  // Drag and snap functionality
  let isDragging = false
  let startX = 0
  let startY = 0
  let initialX = 0
  let initialY = 0

  prompt.addEventListener('mousedown', (e: MouseEvent) => {
    // Don't drag if clicking on buttons
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.closest('button')) return

    isDragging = true
    startX = e.clientX
    startY = e.clientY

    const rect = prompt.getBoundingClientRect()
    initialX = rect.left
    initialY = rect.top

    prompt.style.transition = 'opacity 0.3s ease'
    prompt.style.cursor = 'grabbing'
  })

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    const newX = initialX + deltaX
    const newY = initialY + deltaY

    // Clear all positioning
    prompt.style.top = 'auto'
    prompt.style.bottom = 'auto'
    prompt.style.left = 'auto'
    prompt.style.right = 'auto'

    // Set absolute position
    prompt.style.left = newX + 'px'
    prompt.style.top = newY + 'px'
  })

  document.addEventListener('mouseup', () => {
    if (!isDragging) return
    isDragging = false
    prompt.style.cursor = 'move'

    // Calculate final position
    const rect = prompt.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Determine which corner is closest
    const isLeft = centerX < viewportWidth / 2
    const isTop = centerY < viewportHeight / 2

    // Snap to corner with smooth transition
    prompt.style.transition = 'top 0.3s ease, bottom 0.3s ease, left 0.3s ease, right 0.3s ease, opacity 0.3s ease, transform 0.3s ease'

    prompt.style.top = 'auto'
    prompt.style.bottom = 'auto'
    prompt.style.left = 'auto'
    prompt.style.right = 'auto'

    if (isTop) {
      prompt.style.top = '20px'
    } else {
      prompt.style.bottom = '20px'
    }

    if (isLeft) {
      prompt.style.left = '20px'
    } else {
      prompt.style.right = '20px'
    }
  })

  setTimeout(() => {
    (prompt as HTMLElement).style.opacity = '1'
    ;(prompt as HTMLElement).style.transform = 'translateY(0) scale(1)'
  }, 100)
  
  // Reset inactivity on drag interactions
  document.addEventListener('mousemove', () => scheduleAutoMinimize(), { passive: true })
  document.addEventListener('mouseup', () => scheduleAutoMinimize(), { passive: true })

  document.getElementById('ws-close')?.addEventListener('click', () => {
    minimizePrompt()
  })

  const cta = document.getElementById('ws-use-voucher')
  cta?.addEventListener('click', () => {
    const voucherUrl = best?.url || partner.voucherProductUrl
    if (!voucherUrl) return
    let dealUrl = voucherUrl
    if (dealUrl.includes('/products/') && !dealUrl.includes('amount=')) {
      const amountInCents = Math.round(amount * 100)
      const separator = dealUrl.includes('?') ? '&' : '?'
      dealUrl = `${dealUrl}${separator}amount=${amountInCents}`
    }
    try {
      // In MAIN world, chrome.runtime is not available. Use page → content bridge.
      window.postMessage({ type: 'WS_OPEN_URL', url: dealUrl }, window.location.origin)
    } catch {}
    markVoucherDismissed(5 * 60 * 1000)
    prompt.remove()
  })

  // Removed fixed 30s minimize; replaced by inactivity timer above
}


