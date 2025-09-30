// Background service worker: URL detection, icon state, messaging
import { getPartnerByHostname, getAllPartners, refreshDeals, initializeScraper, setupScrapingSchedule } from './api.ts'
import type { IconState, AnonymousUser, ActivationRecord } from '../shared/types'
import { handleActivateCashback } from './activate-cashback'

// --- First-party header injection for woolsocks.eu -------------------------
const WS_ORIGIN = 'https://woolsocks.eu'
let wsCookieHeader = ''
let wsXsrfToken: string | null = null

async function refreshWsCookies() {
  try {
    const all = await chrome.cookies.getAll({ domain: 'woolsocks.eu', secure: true })
    wsCookieHeader = all.map(c => `${c.name}=${c.value}`).join('; ')
    wsXsrfToken =
      all.find(c => c.name === 'XSRF-TOKEN')?.value ??
      all.find(c => c.name === 'csrfToken')?.value ??
      null
  } catch {}
}

chrome.runtime.onInstalled.addListener(refreshWsCookies)
// @ts-ignore - onStartup exists in MV3 service workers
chrome.runtime.onStartup?.addListener(refreshWsCookies)
chrome.cookies.onChanged.addListener(({ cookie }) => {
  if (cookie?.domain && cookie.domain.includes('woolsocks.eu')) {
    refreshWsCookies()
  }
})

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!details.url.startsWith(WS_ORIGIN)) return undefined

    const headers = details.requestHeaders ? [...details.requestHeaders] : []
    const lower = (name: string) => name.toLowerCase()

    // Cookie
    if (wsCookieHeader) {
      const i = headers.findIndex(h => lower(h.name) === 'cookie')
      if (i >= 0) headers[i].value = wsCookieHeader
      else headers.push({ name: 'Cookie', value: wsCookieHeader })
    }

    // CSRF header if present in cookies
    if (wsXsrfToken && !headers.some(h => lower(h.name) === 'x-xsrf-token')) {
      headers.push({ name: 'x-xsrf-token', value: wsXsrfToken })
    }

    // Same-origin hints
    if (!headers.some(h => lower(h.name) === 'origin')) headers.push({ name: 'Origin', value: WS_ORIGIN })
    if (!headers.some(h => lower(h.name) === 'referer')) headers.push({ name: 'Referer', value: WS_ORIGIN + '/' })

    // Accept JSON by default
    if (!headers.some(h => lower(h.name) === 'accept')) headers.push({ name: 'Accept', value: 'application/json, */*;q=0.8' })

    return { requestHeaders: headers }
  },
  { urls: [WS_ORIGIN + '/*'] },
  ['blocking', 'requestHeaders', 'extraHeaders']
)

let tokenSavedOnce = false

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
    neutral: 'No deals on this site',
    available: 'Cashback available — click to activate',
    active: 'Cashback activated',
    voucher: 'Voucher deal available',
    error: 'Attention needed',
  }
  // Pass multi-size path map when available; Chrome will pick best size
  chrome.action.setIcon({ path: path as any, tabId })
  chrome.action.setTitle({ title: titleMap[state], tabId })
}

chrome.runtime.onInstalled.addListener(async () => {
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

// Track injected scripts to prevent duplicates
const injectedScripts = new Set<number>()

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
  if (!url) {
    setIcon('neutral', tabId)
    return
  }
  
  try {
    const u = new URL(url)
    
    // Check if this domain should be excluded
    if (isExcludedDomain(u.hostname)) {
      setIcon('neutral', tabId)
      return
    }
    
    const partner = await getPartnerByHostname(u.hostname)
    
    if (partner) {
      // Only inject script if not already injected for this tab
      if (!injectedScripts.has(tabId)) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content/checkout.js']
        })
          injectedScripts.add(tabId)
          console.log(`Checkout script injected for tab ${tabId}`)
      } catch (error) {
        // Script might already be injected, ignore
        console.log('Script injection skipped:', error)
        }
      }
      
      // Check if cashback is already active (no automatic prompts)
      const result = await chrome.storage.local.get('user')
      const user: AnonymousUser = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
      
      const activeActivation = user.activationHistory.find(
        (activation: ActivationRecord) => activation.partner === partner.name && activation.status === 'active'
      )
      
      if (activeActivation) {
        setIcon('active', tabId)
  } else if (partner.voucherAvailable && u.pathname.includes('checkout')) {
        // Keep icon as 'available' (yellow) at checkout until voucher is actually purchased
        setIcon('available', tabId)
      } else {
        setIcon('available', tabId)
      }
    } else {
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

// Clean up injected scripts when tabs are removed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedScripts.delete(tabId)
  console.log(`Cleaned up script tracking for tab ${tabId}`)
})

// Clean up when extension is disabled/uninstalled
chrome.runtime.onSuspend.addListener(() => {
  injectedScripts.clear()
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return
  
  try {
    const u = new URL(tab.url)
    
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
        title: 'Cashback Activated!',
        message: `You'll earn ${partner.cashbackRate}% cashback on ${partner.name} purchases`
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
  if (!tabId) return
  
  // checkoutInfo.merchant is already a hostname (e.g., "zalando.com"),
  // so we should not wrap it in new URL(...)
  console.log(`[DEBUG] Checkout detected for merchant: ${checkoutInfo.merchant}`)
  const partner = await getPartnerByHostname(checkoutInfo.merchant)
  console.log(`[DEBUG] Partner data:`, partner)
  
  if (!partner) {
    console.log(`[DEBUG] No partner found for merchant:`, checkoutInfo.merchant)
    return
  }
  
  // Check if vouchers are available for this merchant
  if (!partner.voucherAvailable) {
    console.log(`[DEBUG] No vouchers available for partner:`, partner.name)
    return
  }
  
  // Check user settings
  const result = await chrome.storage.local.get('user')
          const user: AnonymousUser = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
  
  if (!user.settings.showVoucherPrompt) return

  const checkoutTotal = checkoutInfo.total
  
  console.log(`[DEBUG] Showing voucher offer for ${partner.name} with ${partner.cashbackRate}% cashback`)
  
  // Render single voucher view with USPs
  chrome.scripting.executeScript({
    target: { tabId },
    func: showVoucherDetailWithUsps,
    args: [partner, checkoutTotal]
  })
}

// MVP: Removed old complex voucher offer function - replaced with simplified version

// Removed showCashbackPrompt function - no longer using automatic cashback prompts

// Removed unused showProfileScreen function

// (Removed old simplified voucher list renderer)

// Removed showCashbackPrompt function - no longer using automatic cashback prompts

// Removed unused showProfileScreen function

function showVoucherDetailWithUsps(partner: any, amount: number) {
  // Prevent multiple instances
  const existing = document.getElementById('woolsocks-voucher-prompt')
  if (existing) return

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
  const voucherCategory = Array.isArray(partner.categories)
    ? partner.categories.find((c: any) => /voucher/i.test(String(c?.name || '')))
    : null

  if (voucherCategory && Array.isArray(voucherCategory.deals)) {
    for (const d of voucherCategory.deals) {
      collected.push({ name: d?.name, cashbackRate: typeof d?.rate === 'number' ? d.rate : undefined, imageUrl: d?.imageUrl, url: d?.dealUrl })
    }
  } else if (Array.isArray(partner.allVouchers)) {
    for (const v of partner.allVouchers) collected.push({ name: v.name, cashbackRate: v.cashbackRate, imageUrl: v.imageUrl, url: v.url })
  } else if (partner.voucherProductUrl) {
    collected.push({ name: (partner.name || '') + ' Voucher', cashbackRate: partner.cashbackRate, imageUrl: partner.merchantImageUrl, url: partner.voucherProductUrl })
  }

  const best = collected
    .filter(v => typeof v.cashbackRate === 'number' && (v.cashbackRate as number) > 0)
    .sort((a, b) => (b.cashbackRate || 0) - (a.cashbackRate || 0))[0]

  const prompt = document.createElement('div')
  prompt.id = 'woolsocks-voucher-prompt'
  prompt.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 380px;
    max-height: 80vh;
    overflow-y: auto;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
    transition: opacity 0.3s ease, transform 0.3s ease;
  `

  const effectiveRate = typeof (best?.cashbackRate ?? partner.cashbackRate) === 'number' ? (best?.cashbackRate ?? partner.cashbackRate) : 0
  const cashbackAmount = (amount * effectiveRate / 100).toFixed(2)

  const usps: Array<{ icon: string; text: string }> = [
    { icon: '✅', text: 'Instant delivery' },
    ...(Number.isFinite(effectiveRate) && effectiveRate > 0 ? [{ icon: '💶', text: `${effectiveRate}% cashback on purchase` }] : []),
    { icon: '🛍️', text: 'Use online at checkout' },
  ]

  const image = best?.imageUrl || partner.merchantImageUrl || ''
  const title = best?.name || partner.name || 'Gift Card'
  const rateBadge = typeof effectiveRate === 'number' && effectiveRate > 0 ? `${effectiveRate.toFixed(0)}%` : ''

  // Details (optional): omitted here as they are not available in current partner payload

  // Payment methods row (from extension assets)
  const paymentIconFiles = [
    'public/icons/Payment method icon_VISA.png',
    'public/icons/Payment method icon_mastercard.png',
    'public/icons/Payment method icon_IDEAL.png',
    'public/icons/Payment method icon_APPLEPAY.png',
    'public/icons/Payment method icon_GPAY.png',
  ]
  const paymentIconUrls = paymentIconFiles.map((p) => {
    try {
      return chrome.runtime.getURL(p)
    } catch {
      return ''
    }
  }).filter(Boolean)
  const paymentIconsHtml = paymentIconUrls.map((src) => `
    <img src="${src}" alt="payment" style="height: 18px; width: auto; display: block;" />
  `).join('')

  prompt.innerHTML = `
    <div style="padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #100B1C;">${partner.name}</h3>
        <button id="ws-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666; line-height: 1;">×</button>
      </div>

      <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px;">
        <div style="width: 72px; height: 48px; border-radius: 8px; background: #F3F4F6; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          ${image ? `<img src="${image}" alt="${title}" style="width: 100%; height: 100%; object-fit: cover;">` : `<div style="font-size: 12px; color: #666;">Gift</div>`}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 13px; color: #6B7280; margin-bottom: 2px;">Voucher</div>
          <div style="font-size: 16px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>
        </div>
        ${rateBadge ? `<div style="background: #E6F0FF; color: #1D4ED8; font-weight: 700; font-size: 12px; border-radius: 999px; padding: 6px 10px;">${rateBadge}</div>` : ''}
      </div>

      <div style="margin-bottom: 16px; padding: 12px; background: #F0F8FF; border-radius: 10px;">
        <div style="font-size: 13px; color: #1D4ED8; font-weight: 600;">You’ll get cashback</div>
        <div style="font-size: 18px; color: #111827; font-weight: 700; margin-top: 2px;">€${cashbackAmount}</div>
        <div style="font-size: 12px; color: #6B7280; margin-top: 2px;">Purchase amount: €${amount.toFixed(2)}</div>
      </div>

      <div style="margin-bottom: 16px;">
        ${usps.map(u => `
          <div style="display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #F3F4F6;">
            <span style="font-size: 14px;">${u.icon}</span>
            <span style="font-size: 13px; color: #111827;">${u.text}</span>
          </div>
        `).join('')}
      </div>

      <div style="display: flex; align-items: center; gap: 10px; margin: 6px 0 14px;">
        ${paymentIconsHtml}
      </div>

      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <button id="ws-use-voucher" style="flex: 1; padding: 10px 14px; background: #211940; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;">
          Use voucher
        </button>
        <button id="ws-dismiss" style="padding: 10px 12px; background: #F3F4F6; color: #374151; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">
          Not now
        </button>
      </div>

      
    </div>
  `

  document.body.appendChild(prompt)

  setTimeout(() => {
    (prompt as HTMLElement).style.opacity = '1'
    ;(prompt as HTMLElement).style.transform = 'translateY(0) scale(1)'
  }, 100)

  document.getElementById('ws-close')?.addEventListener('click', () => {
    markVoucherDismissed(5 * 60 * 1000)
    ;(prompt as HTMLElement).style.opacity = '0'
    ;(prompt as HTMLElement).style.transform = 'translateY(-10px) scale(0.95)'
    setTimeout(() => prompt.remove(), 300)
  })
  document.getElementById('ws-dismiss')?.addEventListener('click', () => {
    markVoucherDismissed(5 * 60 * 1000)
    ;(prompt as HTMLElement).style.opacity = '0'
    ;(prompt as HTMLElement).style.transform = 'translateY(-10px) scale(0.95)'
    setTimeout(() => prompt.remove(), 300)
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
    chrome.runtime.sendMessage({ type: 'OPEN_URL', url: dealUrl })
    markVoucherDismissed(5 * 60 * 1000)
    prompt.remove()
  })

  setTimeout(() => {
    if (document.body.contains(prompt)) {
      markVoucherDismissed(5 * 60 * 1000)
      ;(prompt as HTMLElement).style.opacity = '0'
      ;(prompt as HTMLElement).style.transform = 'translateY(-10px) scale(0.95)'
      setTimeout(() => prompt.remove(), 300)
    }
  }, 30000)
}


