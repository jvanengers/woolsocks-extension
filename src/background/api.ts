// Lightweight Woolsocks API client used by the extension (replicates website method)
// Notes:
// - Uses the site proxy at https://woolsocks.eu/api/wsProxy to call backend
// - Auth relies on the user's Woolsocks website session cookies (HttpOnly)
// - Adds x-application-name: WOOLSOCKS_WEB and a stable anonymous x-user-id
// - Falls back to a content-script relay on a woolsocks.eu tab when cookies are not sent from the background

import type { PartnerLite, Category, Deal } from '../shared/types'
import { track } from './analytics'
import { cachedFetch, CACHE_NAMESPACES } from '../shared/cache'
import { getCountryForDomain } from './partners-config'

const DIAG = false

const SITE_BASE = 'https://woolsocks.eu'

function canCreateRelayTab(): boolean {
  // Allow programmatic relay tab creation only on Chrome (offscreen supported)
  try { return !!(chrome as any).offscreen && typeof (chrome as any).offscreen.createDocument === 'function' } catch { return false }
}

async function getHeaders(): Promise<HeadersInit> {
  const userId = await getUserId()
  const { wsAnonId } = await chrome.storage.local.get(['wsAnonId'])
  let anonId = wsAnonId as string | undefined
  if (!anonId) { anonId = crypto.randomUUID(); await chrome.storage.local.set({ wsAnonId: anonId }) }
  return {
    'x-application-name': 'WOOLSOCKS_WEB',
    'x-user-id': userId || anonId,
    'Content-Type': 'application/json',
  }
}

// Try to fetch the real user id from the user-info API (cached for the session)
let cachedUserId: string | null | undefined
let resolvingUserId = false

// Allow other modules to force a refresh when cookies/session change
export function resetCachedUserId() {
  cachedUserId = undefined
  resolvingUserId = false
}

async function getUserId(): Promise<string | null> {
  if (typeof cachedUserId !== 'undefined') return cachedUserId
  if (resolvingUserId) return null
  resolvingUserId = true
  try {
    // Build minimal headers without calling getHeaders (to avoid recursion)
    const { wsAnonId } = await chrome.storage.local.get(['wsAnonId'])
    let anonId = wsAnonId as string | undefined
    if (!anonId) { anonId = crypto.randomUUID(); await chrome.storage.local.set({ wsAnonId: anonId }) }
    const minHeaders: HeadersInit = { 'x-application-name': 'WOOLSOCKS_WEB', 'x-user-id': anonId || '' }

    // Attempt direct background call
    let json: any = null
    try {
      const direct = await fetch(`${SITE_BASE}/api/wsProxy/user-info/api/v0`, { credentials: 'include', headers: minHeaders as any })
      if (direct.ok) {
        try { json = await direct.json() } catch {}
      }
    } catch {}

    // Fallback to relay with custom headers (no getHeaders)
    if (!json) {
      const rel = await relayFetchViaTabCustomHeaders<{ data?: { id?: string; userId?: string } }>(`/user-info/api/v0`, minHeaders as Record<string, string>)
      json = rel.data
    }

    const id = (
      json?.data?.userId ||
      json?.data?.id ||
      json?.user?.id ||
      json?.id ||
      null
    ) as string | null
    cachedUserId = id
    resolvingUserId = false
    return id
  } catch {
    cachedUserId = null
    resolvingUserId = false
    return null
  }
}

// legacy counters removed with ephemeral relay
const API_RETRY_DELAY = 1000 // 1 second

// Public helper to determine if the user has an active authenticated session
// Uses the same logic as requestRedirectUrl -> resolves a real user id via
// user-info endpoint (with relay fallback) and caches within the background SW
export async function hasActiveSession(): Promise<boolean> {
  try {
    const id = await getUserId()
    return typeof id === 'string' && id.length > 0
  } catch {
    return false
  }
}
const MAX_API_RETRIES = 2

async function ensureOffscreenDocument(): Promise<boolean> {
  try {
    // @ts-ignore chrome.offscreen types may not be present
    const has = await (chrome.offscreen as any).hasDocument?.()
    if (has) return true
  } catch {}
  try {
    // @ts-ignore createDocument API in MV3
    await (chrome.offscreen as any).createDocument?.({
      url: chrome.runtime.getURL('src/offscreen/relay.html'),
      reasons: ['IFRAME_SCRIPTING'],
      justification: 'Credentialed fetch via woolsocks.eu in offscreen iframe to avoid visible tabs',
    })
    return true
  } catch { return false }
}

async function relayFetchViaOffscreen<T>(endpoint: string, init?: RequestInit): Promise<{ data: T | null; status: number }> {
  try {
    const t0 = Date.now()
    const ok = await ensureOffscreenDocument()
    if (!ok) { try { track('relay_offscreen_fail', { reason: 'no_offscreen', endpoint }) } catch {} ; return { data: null, status: 0 } }
    const headers = await getHeaders()
    const resp: any = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'WS_RELAY_FETCH', payload: { url: `${SITE_BASE}/api/wsProxy${endpoint}`, init: { ...init, headers, credentials: 'include' } } }, (r) => {
          if (chrome.runtime.lastError || !r) resolve({ ok: false, status: 0, bodyText: '' })
          else resolve(r)
        })
      } catch { resolve({ ok: false, status: 0, bodyText: '' }) }
    })
    if (!resp || !resp.ok) { try { track('relay_offscreen_fail', { reason: 'resp_not_ok', status: Number(resp?.status || 0), endpoint, duration_ms: Date.now()-t0 }) } catch {} ; return { data: null, status: Number(resp?.status || 0) } }
    let json: any = null
    try { json = resp.bodyText ? JSON.parse(resp.bodyText) : null } catch {}
    try { track('relay_offscreen_success', { endpoint, status: Number(resp.status || 200), duration_ms: Date.now()-t0 }) } catch {}
    return { data: json as T, status: Number(resp.status || 200) }
  } catch { try { track('relay_offscreen_fail', { reason: 'exception', endpoint }) } catch {} ; return { data: null, status: 0 } }
}

async function relayFetchViaTab<T>(endpoint: string, init?: RequestInit): Promise<{ data: T | null; status: number }> {
  const headers = await getHeaders()

  async function ensureRelayTab(): Promise<{ tabId: number; created: boolean }> {
    const tabs = await chrome.tabs.query({ url: [`${SITE_BASE}/*`, `${SITE_BASE.replace('https://', 'https://www.')}/*`] })
    if (tabs[0]?.id) return { tabId: tabs[0].id, created: false }
    if (!canCreateRelayTab()) {
      // Do not create a visible tab on platforms without offscreen support
      throw new Error('Relay tab creation disabled on this platform')
    }
    const t = await chrome.tabs.create({ url: `${SITE_BASE}/nl`, active: false })
    return { tabId: t.id!, created: true }
  }

  async function ping(tabId: number): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, { type: 'WS_PING' }, () => {
          resolve(!chrome.runtime.lastError)
        })
      } catch { resolve(false) }
    })
  }

  async function send(tabId: number): Promise<{ data: T | null; status: number }> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        {
          type: 'WS_RELAY_FETCH',
          payload: {
            url: `${SITE_BASE}/api/wsProxy${endpoint}`,
            init: { ...init, headers, credentials: 'include' },
          },
        },
        (resp) => {
          if (chrome.runtime.lastError || !resp) {
            return resolve({ data: null, status: 0 })
          }
          try {
            const json = resp.bodyText ? JSON.parse(resp.bodyText) : null
            resolve({ data: json as T, status: resp.status })
          } catch {
            resolve({ data: null, status: resp.status })
          }
        }
      )
    })
  }

  let created = false
  let tabId = 0
  try {
    const t0 = Date.now()
    const got = await ensureRelayTab()
    tabId = got.tabId
    created = got.created
    // Wait for content script readiness
    let ready = await ping(tabId)
    let tries = 0
    while (!ready && tries < 6) {
      await new Promise(r => setTimeout(r, 250))
      ready = await ping(tabId)
      tries++
    }
    const result = await send(tabId)
    try { track('relay_tab_result', { endpoint, created, status: Number(result?.status || 0), duration_ms: Date.now()-t0 }) } catch {}
    return result
  } catch {
    try { track('relay_tab_result', { endpoint, created, status: 0, duration_ms: 0, error: true }) } catch {}
    return { data: null, status: 0 }
  } finally {
    // Close ephemeral tab if we created it
    if (created && tabId) {
      try { await chrome.tabs.remove(tabId) } catch {}
    }
  }
}

// Relay variant that uses provided headers (avoids getHeaders recursion)
async function relayFetchViaTabCustomHeaders<T>(endpoint: string, headersOverride: Record<string, string>, init?: RequestInit): Promise<{ data: T | null; status: number }> {
  async function ensureRelayTab(): Promise<{ tabId: number; created: boolean }> {
    const tabs = await chrome.tabs.query({ url: [`${SITE_BASE}/*`, `${SITE_BASE.replace('https://', 'https://www.')}/*`] })
    if (tabs[0]?.id) return { tabId: tabs[0].id, created: false }
    if (!canCreateRelayTab()) {
      throw new Error('Relay tab creation disabled on this platform')
    }
    const t = await chrome.tabs.create({ url: `${SITE_BASE}/nl`, active: false })
    return { tabId: t.id!, created: true }
  }
  async function ping(tabId: number): Promise<boolean> {
    return new Promise((resolve) => {
      try { chrome.tabs.sendMessage(tabId, { type: 'WS_PING' }, () => resolve(!chrome.runtime.lastError)) } catch { resolve(false) }
    })
  }
  async function send(tabId: number): Promise<{ data: T | null; status: number }> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { type: 'WS_RELAY_FETCH', payload: { url: `${SITE_BASE}/api/wsProxy${endpoint}`, init: { ...init, headers: headersOverride, credentials: 'include' } } },
        (resp) => {
          if (chrome.runtime.lastError || !resp) return resolve({ data: null, status: 0 })
          try { const json = resp.bodyText ? JSON.parse(resp.bodyText) : null; resolve({ data: json as T, status: resp.status }) } catch { resolve({ data: null, status: resp.status }) }
        }
      )
    })
  }
  let created = false
  let tabId = 0
  try {
    const got = await ensureRelayTab(); tabId = got.tabId; created = got.created
    let ready = await ping(tabId); let tries = 0
    while (!ready && tries < 6) { await new Promise(r => setTimeout(r, 250)); ready = await ping(tabId); tries++ }
    return await send(tabId)
  } catch { return { data: null, status: 0 } } finally { if (created && tabId) { try { await chrome.tabs.remove(tabId) } catch {} } }
}

async function fetchViaSiteProxy<T>(endpoint: string, init?: RequestInit, retryCount = 0): Promise<{ data: T | null; status: number }> {
  const headers = await getHeaders()
  const fullUrl = `${SITE_BASE}/api/wsProxy${endpoint}`
  if (DIAG) console.debug(`[WS API] fetchViaSiteProxy: ${fullUrl}`)
  if (DIAG) console.debug(`[WS API] Headers:`, headers)
  
  try {
    const resp = await fetch(fullUrl, {
      credentials: 'include',
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      method: init?.method || 'GET',
    })
    const status = resp.status
    if (DIAG) console.debug(`[WS API] Response status: ${status}, ok: ${resp.ok}`)
    
    if (!resp.ok) {
      if (DIAG) console.debug(`[WS API] Response not ok, trying offscreen relay for ${endpoint}`)
      try { track('relay_attempt_offscreen', { endpoint, reason: 'background_resp_not_ok', status }) } catch {}
      const off = await relayFetchViaOffscreen<T>(endpoint, init)
      if (off.data) return off
      if (DIAG) console.debug(`[WS API] Offscreen relay failed, trying tab relay for ${endpoint}`)
      try { track('relay_attempt_tab', { endpoint, reason: 'offscreen_failed_after_resp_not_ok', status }) } catch {}
      return await relayFetchViaTab<T>(endpoint, init)
    }
    const json = (await resp.json()) as T
    if (DIAG) console.debug(`[WS API] Response data:`, json)
    return { data: json, status }
  } catch (e) {
    if (DIAG) console.debug(`[WS API] Fetch error for ${endpoint}:`, e)
    // Network error from background → try relay or retry
    if (retryCount < MAX_API_RETRIES) {
      if (DIAG) console.debug(`[WS API] Retrying fetch (${retryCount + 1}/${MAX_API_RETRIES}) for ${endpoint}`)
      await new Promise(resolve => setTimeout(resolve, API_RETRY_DELAY * (retryCount + 1)))
      return await fetchViaSiteProxy<T>(endpoint, init, retryCount + 1)
    }
    if (DIAG) console.debug(`[WS API] Max retries reached, trying offscreen relay for ${endpoint}`)
    try { track('relay_attempt_offscreen', { endpoint, reason: 'max_retries' }) } catch {}
    const off = await relayFetchViaOffscreen<T>(endpoint, init)
    if (off.data) return off
    try { track('relay_attempt_tab', { endpoint, reason: 'offscreen_failed_after_retries' }) } catch {}
    return await relayFetchViaTab<T>(endpoint, init)
  }
}

/**
 * Fetch from public API endpoints without authentication
 * Skips relay fallback entirely - returns null on any failure
 * Used for merchant discovery/detection to avoid tab flashing
 */
async function fetchPublicAPI<T>(endpoint: string, init?: RequestInit, retryCount = 0): Promise<{ data: T | null; status: number }> {
  // Use anonymous headers only (no real userId)
  const { wsAnonId } = await chrome.storage.local.get(['wsAnonId'])
  let anonId = wsAnonId as string | undefined
  if (!anonId) { anonId = crypto.randomUUID(); await chrome.storage.local.set({ wsAnonId: anonId }) }
  
  const headers: HeadersInit = {
    'x-application-name': 'WOOLSOCKS_WEB',
    'x-user-id': anonId,
    'Content-Type': 'application/json',
  }
  
  const fullUrl = `${SITE_BASE}/api/wsProxy${endpoint}`
  const t0 = Date.now()
  
  if (DIAG) console.debug(`[WS API] fetchPublicAPI: ${fullUrl}`)
  
  try {
    // Try direct fetch WITHOUT credentials to avoid cookie dependency
    const resp = await fetch(fullUrl, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      method: init?.method || 'GET',
      // Omit credentials to make this truly public
    })
    
    const status = resp.status
    const duration = Date.now() - t0
    
    if (DIAG) console.debug(`[WS API] fetchPublicAPI response: ${status}, ok: ${resp.ok}`)
    
    if (!resp.ok) {
      // Don't retry with relay - just fail fast for public endpoints
      try { track('api_public_fail', { endpoint, status, duration_ms: duration, reason: 'not_ok' }) } catch {}
      return { data: null, status }
    }
    
    const json = (await resp.json()) as T
    if (DIAG) console.debug(`[WS API] fetchPublicAPI data received`)
    try { track('api_public_success', { endpoint, status, duration_ms: duration }) } catch {}
    return { data: json, status }
    
  } catch (e) {
    const duration = Date.now() - t0
    if (DIAG) console.debug(`[WS API] fetchPublicAPI error:`, e)
    
    // Retry logic for network errors only (not auth failures)
    if (retryCount < MAX_API_RETRIES) {
      if (DIAG) console.debug(`[WS API] Retrying public API (${retryCount + 1}/${MAX_API_RETRIES})`)
      await new Promise(resolve => setTimeout(resolve, API_RETRY_DELAY * (retryCount + 1)))
      return await fetchPublicAPI<T>(endpoint, init, retryCount + 1)
    }
    
    // Max retries reached - fail without relay
    try { track('api_public_fail', { endpoint, status: 0, duration_ms: duration, reason: 'network_error', retries: retryCount }) } catch {}
    return { data: null, status: 0 }
  }
}

function cleanDomain(input: string | undefined | null): string {
  if (!input) return ''
  try {
    let h = input.trim()
    if (!/^https?:\/\//i.test(h)) h = `https://${h}`
    const u = new URL(h)
    return (u.hostname || '').replace(/^www\./i, '').toLowerCase()
  } catch {
    return String(input).replace(/^www\./i, '').toLowerCase()
  }
}

function getBaseDomain(domain: string): string {
  // Remove TLD and return just the base domain name
  // e.g., "manfield.com" -> "manfield", "shop.example.co.uk" -> "shop.example"
  const parts = domain.split('.')
  if (parts.length <= 2) {
    return parts[0] // e.g., "manfield.com" -> "manfield"
  }
  // For longer domains, take everything except the last part (TLD)
  return parts.slice(0, -1).join('.')
}

function domainsMatch(domain1: string, domain2: string): boolean {
  if (!domain1 || !domain2) return false
  
  // First try exact match
  if (domain1 === domain2) return true
  
  // Then try the original logic (one ends with the other)
  if (domain1.endsWith(domain2) || domain2.endsWith(domain1)) return true
  
  // Finally, try base domain matching (ignore TLD differences)
  const base1 = getBaseDomain(domain1)
  const base2 = getBaseDomain(domain2)
  return base1 === base2
}

function buildNameCandidates(hostnameOrName: string): string[] {
  const raw = hostnameOrName.replace(/^www\./i, '')
  const parts = raw.split('.')
  const core = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
  const candidates = new Set<string>()
  
  // Special case for bol.com - use more specific candidates
  if (raw === 'bol.com' || core === 'bol') {
    candidates.add('bol.com')
    candidates.add('bol')
    candidates.add('Bol')
    candidates.add('BOL')
    return Array.from(candidates).filter(Boolean)
  }
  
  candidates.add(core)
  candidates.add(core.replace(/[-_]/g, ' '))
  candidates.add(raw) // hema.nl
  candidates.add(raw.replace(/\./g, ' ')) // hema nl
  candidates.add(core.toUpperCase())
  candidates.add(core.toLowerCase())
  return Array.from(candidates).filter(Boolean)
}

function pickBestMerchant(query: string, list: any[]): any | null {
  if (!Array.isArray(list) || list.length === 0) return null
  const q = query.toLowerCase().replace(/\s+/g, '')
  
  // Score each merchant based on how well it matches the query
  const scored = list.map((m) => {
    const name = (m?.data?.name || m?.name || '').toLowerCase().replace(/\s+/g, '')
    let score = 0
    
    // Exact match gets highest score
    if (name === q) score = 100
    // Query is exact start of merchant name gets high score
    else if (name.startsWith(q) && name.length === q.length + 1) score = 90
    // Query is start of merchant name gets medium-high score
    else if (name.startsWith(q)) score = 70
    // Query is contained in merchant name gets lower score
    else if (name.includes(q)) score = 50
    // Special case: if query is "bol" and merchant is "bol" (not "bolero"), prioritize it
    else if (q === 'bol' && name === 'bol') score = 95
    
    return { merchant: m, score, name }
  })
  
  // Sort by score (highest first), then by name length (shorter first for ties)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.name.length - b.name.length
  })
  
  const best = scored[0]
  if (best && best.score > 0) {
    return best.merchant.data || best.merchant
  }
  
  // Fallback to first merchant if no good match
  const first = list[0]
  return first?.data || first || null
}

function buildGiftProductUrl(d: any): string | undefined {
  const pid = d?.providerReferenceId || d?.productId || d?.id
  if (pid) return `${SITE_BASE}/nl-NL/giftcards-shop/products/${pid}`
  const m = (d?.links?.webLink || '').match(/giftcards-shop\/products\/([a-f0-9-]{36})/i)
  return m ? `${SITE_BASE}/nl-NL/giftcards-shop/products/${m[1]}` : undefined
}

function extractObMerchantIdFromImageUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    const m = String(url).match(/\/stores(?:\/square)?\/(\d+)(?:[-.]|\/)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

type MerchantsOverviewResponse = {
  data?: {
    merchants?: Array<{
      data?: {
        id?: string
        name?: string
        logoUrl?: string
        cashbackAmount?: {
          amount?: { value?: number; currency?: string; scalingFactor?: number }
          amountType?: 'PERCENTAGE' | 'FIXED'
        }
        description?: Array<{ lang: string; text: string }>
        categories?: string[]
        websiteUrl?: string
      }
    }>
  }
}

type DealsV2Response = {
  data?: {
    deals?: Array<{
      id?: string
      rewardId?: string
      productId?: string
      providerReferenceId?: string
      amount?: { value?: number; currency?: string; scalingFactor?: number }
      amountType?: 'PERCENTAGE' | 'FIXED'
      country?: string
      dealType?: string
      description?: string
      imageUrl?: string
      merchantId?: string | number
      provider?: string
      siteContents?: string[]
      title?: string
      usageType?: string
      links?: { webLink?: string }
      requireOptIn?: boolean
      providerMerchantId?: string | number
    }>
  }
}

// Cashback merchant details (rewards + conditions)
type CashbackMerchantResponse = {
  data?: {
    merchant?: {
      id?: string | number
      name?: string
      logoUrl?: string
      countryCode?: string
      additionalInfo?: string
      termsCondition?: string
      webUrl?: string
    }
    rewards?: Array<{
      rewardId?: string | number
      title?: string
      cashBack?: number
      cashbackType?: 'percent' | 'money'
      currencyCode?: string
    }>
  }
}

function toRate(amount: { value?: number; scalingFactor?: number } | undefined, type: string | undefined): number {
  if (!amount) return 0
  const value = typeof amount.value === 'number' ? amount.value : 0
  const scale = typeof amount.scalingFactor === 'number' ? amount.scalingFactor : 2
  const base = value / Math.pow(10, scale)
  if ((type || '').toUpperCase() === 'PERCENTAGE') return base
  return base
}

function classify(dealType: string | undefined): 'VOUCHERS' | 'ONLINE_CASHBACK' | 'AUTOREWARDS' | 'OTHER' {
  const tRaw = (dealType || '')
  const t = tRaw.toUpperCase()
  const norm = t.replace(/[^A-Z]/g, '')
  if (norm === 'GIFTCARD') return 'VOUCHERS'
  if (norm === 'GIFTCARDPAYLATER') return 'OTHER'
  if (norm === 'CASHBACK') return 'ONLINE_CASHBACK'
  if (norm === 'AUTOREWARD') return 'AUTOREWARDS'
  if (t.includes('GIFT') && !t.includes('PAY') && !t.includes('LATER')) return 'VOUCHERS'
  if (t.includes('CASH')) return 'ONLINE_CASHBACK'
  if (t.includes('AUTO') || t.includes('POINT')) return 'AUTOREWARDS'
  return 'OTHER'
}

export async function searchMerchantByName(name: string, country: string = 'NL', expectedHostDomain?: string): Promise<PartnerLite | null> {
  const cacheKey = `${name}_${country}_${expectedHostDomain || ''}`
  
  return cachedFetch(
    CACHE_NAMESPACES.MERCHANT_SEARCH,
    cacheKey,
    async () => {
      // Normalize tricky merchant names before candidate generation
      let adjusted = name
      if (/^prenatal$/i.test(adjusted)) adjusted = 'prénatal'
      if (/^cadeaubon$/i.test(adjusted)) adjusted = 'keuze cadeaukaart'

      const candidates = buildNameCandidates(adjusted)
      console.log(`[WS API] searchMerchantByName called with name: "${name}" (adjusted: "${adjusted}"), country: "${country}"`)
      console.log(`[WS API] Generated candidates:`, candidates)
  
  for (const candidate of candidates) {
    const params = new URLSearchParams({ name: candidate, country })
    const apiUrl = `/merchants-overview/api/v0.0.1/merchants?${params.toString()}`
    console.log(`[WS API] Searching API with URL: ${apiUrl}`)
    
    const searchRes = await fetchPublicAPI<MerchantsOverviewResponse>(apiUrl)
    console.log(`[WS API] API response status: ${searchRes.status}, data:`, searchRes.data)
    
    const data = searchRes.data?.data
    if (!data || !data.merchants || data.merchants.length === 0) {
      console.log(`[WS API] No merchants found for candidate: "${candidate}"`)
      continue
    }
    
    console.log(`[WS API] Found ${data.merchants.length} merchants for candidate: "${candidate}"`)

    const chosen = pickBestMerchant(candidate, data.merchants)
    const apiMerchant = chosen
    if (!apiMerchant?.id) continue

    const dealsRes = await fetchPublicAPI<DealsV2Response>(`/merchants-overview/api/v0.0.1/v2/deals?merchantId=${apiMerchant.id}&country=${country}`)
    const dealsList = dealsRes.data?.data?.deals || []
    const allCb = dealsList.filter((d: any) => classify(d?.dealType) === 'ONLINE_CASHBACK')
    let providerMerchantId: string | undefined = undefined
    for (const d of allCb) {
      if (d?.providerMerchantId) { providerMerchantId = String(d.providerMerchantId); break }
      const fromImg = extractObMerchantIdFromImageUrl(d?.imageUrl)
      if (fromImg) { providerMerchantId = fromImg; break }
    }
    if (DIAG) try { console.debug('[WS API] Cashback merchant lookup', { providerMerchantId, fallbackFromImage: !providerMerchantId && !!providerMerchantId }) } catch {}

    // Fetch cashback rewards from dedicated endpoint to get rewardId for redirect
    const rawLang = (await getUserLanguage().catch(() => 'nl-NL')) || 'nl-NL'
    const localeHeader = String(rawLang)
    const languageParam = encodeURIComponent(String(localeHeader.split('-')[0]).toLowerCase())
    const cbRes = providerMerchantId
      ? await fetchPublicAPI<CashbackMerchantResponse>(
          `/cashback/api/v1/merchants/${encodeURIComponent(String(providerMerchantId))}?sortRewardsBy=amount%3Adesc&language=${languageParam}`,
          { headers: { 'Accept-Language': localeHeader } }
        )
      : { data: null, status: 0 }
    const rewards = cbRes.data?.data?.rewards || []
    if (DIAG) try { console.debug('[WS API] Cashback rewards fetched', { count: rewards.length }) } catch {}

    // Tighten: ensure OB merchant webUrl matches the expected host/domain if provided
    try {
      const merchantWebUrl = cbRes?.data?.data?.merchant?.webUrl || ''
      const webDomain = cleanDomain(merchantWebUrl)
      const hostDomain = cleanDomain(expectedHostDomain || name)
      if (webDomain && hostDomain && !domainsMatch(hostDomain, webDomain)) {
        console.log('[WS API] Skipping merchant due to domain mismatch', { hostDomain, webDomain, candidate })
        continue
      }
    } catch {}

    let cashbackRate = 0
    let voucherAvailable = false
    const categories: Category[] = []

    // We'll first collect voucher candidates and then filter them using the giftcard details endpoint (usageType)
    const vouchers: any[] = []
    const voucherCandidates: Array<{ id: string; item: any }> = []
    const cashback: any[] = []
    const autorewards: any[] = []

    for (const d of dealsList) {
      const rate = toRate(d.amount, d.amountType || '')
      const item: Deal = {
        name: d?.title || apiMerchant.name || candidate,
        rate,
        description: d?.description || (d?.siteContents && d.siteContents[0]) || '',
        imageUrl: d?.imageUrl,
        dealUrl: buildGiftProductUrl(d),
        // Cashback enrichments
        // id set below based on deal class to avoid mixing UUID (giftcard) with rewardId (cashback)
        amountType: d?.amountType as any,
        currency: (d?.amount as any)?.currency || (d as any)?.currencyCode,
        country: d?.country,
        usageType: d?.usageType,
        provider: d?.provider,
        providerMerchantId: (d as any)?.providerMerchantId,
        providerReferenceId: d?.providerReferenceId as any,
        requireOptIn: (d as any)?.requireOptIn as any,
        conditions: { siteContents: Array.isArray(d?.siteContents) ? d!.siteContents! : [] },
        merchantId: (d as any)?.merchantId,
      }
      const cls = classify(d?.dealType)
      if (cls === 'VOUCHERS') {
        // Extract a product id for the details endpoint
        const explicitId = (d as any)?.providerReferenceId || (d as any)?.productId || (d as any)?.id
        let productId: string | null = explicitId || null
        if (!productId && item.dealUrl) {
          const m = String(item.dealUrl).match(/products\/([A-Za-z0-9-]{8,})/)
          productId = m ? m[1] : null
        }
        if (productId) {
          voucherCandidates.push({ id: productId, item })
        }
      }
      else if (cls === 'ONLINE_CASHBACK') {
        // Prefer rewardId later; for fallback, carry providerReferenceId which sometimes works
        const provRef = (d as any)?.providerReferenceId || (d as any)?.id
        if (provRef && !item.id) item.id = String(provRef)
        cashback.push(item)
      }
      else if (cls === 'AUTOREWARDS') autorewards.push(item)
    }

    // Build Online cashback deals from rewards to ensure we have rewardId
    const rewardsDeals: Deal[] = []
    const merchantCountry = (cbRes.data?.data?.merchant?.countryCode || country || '').toUpperCase()
    for (const r of rewards) {
      const amtType = (r?.cashbackType || '').toLowerCase() === 'percent' ? 'PERCENTAGE' : 'FIXED'
      const rate = typeof r?.cashBack === 'number' ? r.cashBack : 0
      rewardsDeals.push({
        id: r?.rewardId ? String(r.rewardId) : undefined,
        name: r?.title || apiMerchant.name || candidate,
        rate,
        amountType: amtType as any,
        currency: r?.currencyCode,
        country: merchantCountry,
        usageType: 'ONLINE',
        merchantId: apiMerchant.id,
      })
    }

    // Helper to fetch giftcard product details and filter by ONLINE usage
    async function filterVoucherCandidatesOnlineOnly(cands: Array<{ id: string; item: any }>): Promise<any[]> {
      if (!cands.length) return []
      const results = await Promise.all(cands.map(async (c) => {
        try {
          const res = await fetchPublicAPI<any>(`/giftcards/api/v0.0.2/products/${encodeURIComponent(c.id)}`)
          const product = (res?.data && (res.data.data?.product || res.data.product)) || null
          const usageType = (product?.usageType || '').toString().toUpperCase()
          const normalized = usageType.replace(/[^A-Z]/g, '')
          const include = normalized === 'ALL' || normalized.includes('ONLINE')
          return include ? c.item : null
        } catch {
          return null
        }
      }))
      return results.filter(Boolean) as any[]
    }

    // Only include vouchers that are usable ONLINE
    const filteredVouchers = await filterVoucherCandidatesOnlineOnly(voucherCandidates)
    for (const v of filteredVouchers) vouchers.push(v)

    if (autorewards.length) {
      const max = Math.max(...autorewards.map(d => d.rate || 0))
      categories.push({ name: 'Autorewards', deals: autorewards, maxRate: max })
      cashbackRate = Math.max(cashbackRate, max)
    }
    if (vouchers.length) {
      const max = Math.max(...vouchers.map(d => d.rate || 0))
      categories.push({ name: 'Vouchers', deals: vouchers, maxRate: max })
      voucherAvailable = true
      cashbackRate = Math.max(cashbackRate, max)
    }
    const ocDeals = rewardsDeals.length ? rewardsDeals : cashback
    if (ocDeals.length) {
      const max = Math.max(...ocDeals.map(d => d.rate || 0))
      categories.push({ name: 'Online cashback', deals: ocDeals, maxRate: max })
      cashbackRate = Math.max(cashbackRate, max)
    }

    const partner: PartnerLite = {
      domain: name,
      name: apiMerchant.name || candidate,
      cashbackRate: Math.round(cashbackRate * 100) / 100,
      voucherAvailable,
      dealUrl: apiMerchant.websiteUrl,
      merchantImageUrl: apiMerchant.logoUrl,
      description: apiMerchant.description?.find((d: any) => d.lang.toUpperCase() === country)?.text || apiMerchant.description?.[0]?.text,
      categories: categories.length ? categories : undefined,
    }
      return partner
    }
    console.warn('[WS API] merchants search failed (no results for candidates)', candidates)
    return null
    },
    {
      ttl: 30 * 60 * 1000, // 30 minutes
      maxMemoryEntries: 100,
    }
  )
}

export async function getPartnerByHostname(hostname: string): Promise<PartnerLite | null> {
  const countryCode = await getCountryForDomain(hostname)
  const key = `${(hostname || '').replace(/^www\./i, '').toLowerCase()}_${countryCode}`
  
  return cachedFetch(
    CACHE_NAMESPACES.PARTNER_INFO,
    key,
    async () => {
      try {
        hostname.replace(/^www\./, '').toLowerCase()
        // No hard overrides here any more; dynamic search is used for all, with name normalization handled in searchMerchantByName
      } catch {}

      const candidates = buildNameCandidates(hostname)
      console.log(`[WS API] Searching for merchant: ${hostname}, candidates:`, candidates, `country: ${countryCode}`)
      
      for (const c of candidates) {
        try {
          let res = await searchMerchantByName(c, countryCode, hostname)
          // Fallback: if nothing for exact host, try removing country suffixes like '/nl' and hyphens
          if (!res && /^(.*)\.(nl|de|be|fr|it|es)$/i.test(c)) {
            const bare = c.replace(/\.(nl|de|be|fr|it|es)$/i, '')
            res = await searchMerchantByName(bare, countryCode, hostname)
          }
          if (res) {
            console.log(`[WS API] Found merchant: ${res.name} for candidate: ${c}`)
            return res
          }
        } catch (error) {
          console.warn(`[WS API] Error searching for candidate ${c}:`, error)
        }
      }
      
      console.warn(`[WS API] No merchant found for hostname: ${hostname} with candidates:`, candidates)
      return null
    },
    {
      ttl: 60 * 60 * 1000, // 60 minutes
      maxMemoryEntries: 50,
    }
  )
}

export async function getAllPartners(): Promise<{ partners: PartnerLite[]; lastUpdated: Date }>{
  return { partners: [], lastUpdated: new Date() }
}

export async function refreshDeals(): Promise<PartnerLite[]> {
  return []
}

export async function initializeScraper() {}
export function setupScrapingSchedule() {}

// --- Online Cashback helpers -------------------------------------------------

type ClickPostResponse = {
  data?: { linkUrl?: string; redirectUrl?: string; url?: string; link?: string; clickId?: string } | string
}

// Request tracked redirect URL for a cashback reward/deal
export async function requestRedirectUrl(dealId: string | number): Promise<{ url: string; clickId?: string } | null> {
  async function doAttempt(forceRefetchUserId: boolean): Promise<{ url: string; clickId?: string } | null> {
    try {
      const endpoint = `/rewards/api/v0/rewards/${encodeURIComponent(String(dealId))}/redirection`
      // Use REAL user id for redirection clicks
      let headersOverride: Record<string, string> | undefined
      try {
        if (forceRefetchUserId) { cachedUserId = undefined }
        const uid = await getUserId()
        if (uid) headersOverride = { 'x-user-id': String(uid) }
      } catch {}
      const userLang = (await getUserLanguage().catch(() => 'nl-NL')) || 'nl-NL'
      const res = await fetchViaSiteProxy<ClickPostResponse>(endpoint, { method: 'GET', headers: { ...(headersOverride || {}), 'Accept-Language': userLang } })
      const status = res.status
      const body: any = res.data
      const payload = body && (typeof body?.data !== 'undefined') ? body.data : body
      const url = payload?.linkUrl || payload?.redirectUrl || payload?.url || payload?.link
      const clickId = payload?.clickId
      if (typeof url === 'string') return { url, clickId }
      // If forbidden or empty, try once more after forcing user id refresh
      if (status === 403 && !forceRefetchUserId) {
        return await doAttempt(true)
      }
      return null
    } catch {
      if (!forceRefetchUserId) return await doAttempt(true)
      return null
    }
  }
  return await doAttempt(false)
}

// Fetch merchant conditions (terms & extra info) from cashback API
export async function fetchMerchantConditions(merchantId: string | number): Promise<{ termsCondition?: string; additionalInfo?: string } | null> {
  try {
    const endpoint = `/cashback/api/v1/merchants/${encodeURIComponent(String(merchantId))}?sortRewardsBy=amount%3Adesc`
    const res = await fetchViaSiteProxy<any>(endpoint)
    const m = (res?.data && (res.data.data?.merchant || res.data.merchant)) || null
    if (!m) return null
    return {
      termsCondition: m.termsCondition || undefined,
      additionalInfo: m.additionalInfo || undefined,
    }
  } catch {
    return null
  }
}

export async function getUserCountryCode(): Promise<string> {
  // Try to derive from user info endpoint; fall back to NL
  try {
    const lang = await getUserLanguage()
    if (lang) {
      // Expect forms like "nl" or "nl-NL"; prefer region if present
      const parts = lang.split('-')
      if (parts.length === 2 && parts[1]) return parts[1].toUpperCase()
      // Map common languages to default region
      const map: Record<string, string> = { nl: 'NL', en: 'NL', de: 'DE', fr: 'FR', it: 'IT', es: 'ES' }
      return map[lang.toLowerCase()] || 'NL'
    }
  } catch {}
  return 'NL'
}

// Fetch user's language preference from Woolsocks API
export async function getUserLanguage(): Promise<string | null> {
  try {
    const response = await fetchViaSiteProxy<{ data?: { language?: string; locale?: string } }>('/user-info/api/v0')
    
    if (response.status === 200 && response.data?.data) {
      // Try language field first, then locale as fallback
      return response.data.data.language || response.data.data.locale || null
    }
    
    return null
  } catch (error) {
    console.warn('[WS API] Failed to fetch user language:', error)
    return null
  }
}

// --- Server-confirmed clicks --------------------------------------------------
type UserClickItem = {
  clickId?: string
  subId?: string
  store?: { storeId?: string; name?: string; urlPathSegment?: string; logoSquareUrl?: string; logoRectangularUrl?: string }
  dealId?: string
  clickDate?: string
}
type UserClicksResponse = { data?: { clicks?: UserClickItem[] }; meta?: any }

let clicksCache: Map<string, { at: number; clicks: UserClickItem[] }> = new Map()

function apexFromHost(host: string): string {
  try { const h = host.replace(/^www\./i, '').toLowerCase(); const p = h.split('.'); return p.length>=2 ? p.slice(-2).join('.') : h } catch { return host }
}

export async function fetchRecentClicksForSite(hostname: string): Promise<UserClickItem[]> {
  const apex = apexFromHost(hostname)
  const cached = clicksCache.get(apex)
  if (cached && Date.now() - cached.at < 60_000) return cached.clicks

  // Require real user id; if absent, we cannot call personal endpoint reliably
  const uid = await getUserId()
  if (!uid) {
    clicksCache.set(apex, { at: Date.now(), clicks: [] })
    return []
  }

  const res = await fetchViaSiteProxy<UserClicksResponse>('/cashback/api/v1/cashback/clicks', {
    method: 'GET',
    headers: { 'x-application-name': 'WOOLSOCKS_WEB', 'x-user-id': String(uid) },
  })
  const list = (res?.data?.data?.clicks || []) as UserClickItem[]
  clicksCache.set(apex, { at: Date.now(), clicks: list })
  return list
}

// --- Cached API methods for performance optimization ---

type WalletResponse = {
  data?: {
    balance?: {
      totalAmount?: number
    }
  }
}

type TransactionsResponse = {
  data?: {
    transactions?: any[]
  }
  transactions?: any[]
}

/**
 * Get cached user balance with automatic refresh
 */
export async function getCachedBalance(): Promise<number> {
  const uid = await getUserId()
  if (!uid) return 0

  return await cachedFetch(
    CACHE_NAMESPACES.WALLET,
    `balance_${uid}`,
    async () => {
      const res = await fetchViaSiteProxy<WalletResponse>('/wallets/api/v1/wallets/default?transactionsLimit=10&supportsJsonNote=true')
      const raw = res?.data?.data?.balance?.totalAmount
      return typeof raw === 'number' ? raw : 0
    },
    { ttl: 10 * 60 * 1000 } // 10 minutes
  )
}

/**
 * Get cached user transactions with automatic refresh
 */
export async function getCachedTransactions(): Promise<any[]> {
  const uid = await getUserId()
  if (!uid) return []

  return await cachedFetch(
    CACHE_NAMESPACES.TRANSACTIONS,
    `transactions_${uid}`,
    async () => {
      const res = await fetchViaSiteProxy<TransactionsResponse>('/wallets/api/v0/transactions?excludeAutoRewards=false&direction=forward&limit=20&supportsJsonNote=true')
      
      // Handle different response formats
      let list: any[] = []
      if (Array.isArray((res as any)?.data?.data?.transactions)) list = (res as any).data.data.transactions
      else if (Array.isArray((res as any)?.data?.transactions)) list = (res as any).data.transactions
      else if (Array.isArray((res as any)?.data)) list = (res as any).data
      else if (Array.isArray(res)) list = res
      else if ((res as any)?.data?.transactions?.data && Array.isArray((res as any).data.transactions.data)) list = (res as any).data.transactions.data

              // Normalize transaction data to match UI expectations
              return list.map((t) => {
                const merchant = t?.merchant || t?.merchantInfo || {}
                const logo: string | undefined = merchant?.logoUrl || merchant?.logoURI || merchant?.logoUri || merchant?.logo || undefined
                const createdAt: string | undefined = t?.createdAt || t?.created_at || t?.date || t?.eventDate || t?.timestamp
                const state: string | undefined = t?.recordState || t?.recordstate || t?.status || t?.state

                const rawAmount =
                  typeof t?.amount === 'number' ? t.amount :
                  typeof t?.amount?.amount === 'number' ? t.amount.amount :
                  typeof t?.amount?.value === 'number' ? t.amount.value :
                  typeof t?.amountCents === 'number' ? t.amountCents / 100 :
                  undefined
                const amount = typeof rawAmount === 'number' ? rawAmount : 0

                return {
                  id: t?.id || t?.transactionId || `${merchant?.name || 'txn'}-${createdAt || Math.random()}`,
                  amount,
                  currency: t?.currencyCode || t?.currency || 'EUR',
                  merchantName: merchant?.name || merchant?.merchantName || 'Unknown',
                  logo,
                  state: state || 'unknown',
                  recordType: t?.recordType || t?.type || 'Unknown',
                  createdAt: createdAt || new Date().toISOString(),
                }
              })
    },
    { ttl: 10 * 60 * 1000 } // 10 minutes
  )
}

/**
 * Force refresh user data (balance and transactions)
 */
export async function refreshUserData(): Promise<{ balance: number; transactions: any[] }> {
  const uid = await getUserId()
  if (!uid) return { balance: 0, transactions: [] }

  // Force refresh by invalidating cache first
  const { invalidate } = await import('../shared/cache')
  await invalidate(CACHE_NAMESPACES.WALLET, `balance_${uid}`)
  await invalidate(CACHE_NAMESPACES.TRANSACTIONS, `transactions_${uid}`)

  // Fetch fresh data
  const [balance, transactions] = await Promise.all([
    getCachedBalance(),
    getCachedTransactions()
  ])

  return { balance, transactions }
}




