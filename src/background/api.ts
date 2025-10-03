// Lightweight Woolsocks API client used by the extension (replicates website method)
// Notes:
// - Uses the site proxy at https://woolsocks.eu/api/wsProxy to call backend
// - Auth relies on the user's Woolsocks website session cookies (HttpOnly)
// - Adds x-application-name: WOOLSOCKS_WEB and a stable anonymous x-user-id
// - Falls back to a content-script relay on a woolsocks.eu tab when cookies are not sent from the background

import type { PartnerLite, Category } from '../shared/types'

const SITE_BASE = 'https://woolsocks.eu'

async function getHeaders(): Promise<HeadersInit> {
  const { wsAnonId } = await chrome.storage.local.get(['wsAnonId'])
  let anonId = wsAnonId as string | undefined
  if (!anonId) {
    anonId = crypto.randomUUID()
    await chrome.storage.local.set({ wsAnonId: anonId })
  }
  return {
    'x-application-name': 'WOOLSOCKS_WEB',
    'x-user-id': anonId,
    'Content-Type': 'application/json',
  }
}

let relayAttempts = 0
const MAX_RELAY_ATTEMPTS = 3
const API_RETRY_DELAY = 1000 // 1 second
const MAX_API_RETRIES = 2

async function relayFetchViaTab<T>(endpoint: string, init?: RequestInit): Promise<{ data: T | null; status: number }> {
  return new Promise(async (resolve) => {
    const headers = await getHeaders()
    const tabs = await chrome.tabs.query({ url: [`${SITE_BASE}/*`, `${SITE_BASE.replace('https://', 'https://www.')}/*`] })
    let tab = tabs[0]
    if (!tab || !tab.id) {
      if (relayAttempts >= MAX_RELAY_ATTEMPTS) {
        return resolve({ data: null, status: 0 })
      }
      relayAttempts++
      try {
        tab = await chrome.tabs.create({ url: `${SITE_BASE}/nl`, active: false })
      } catch {
        return resolve({ data: null, status: 0 })
      }
      setTimeout(() => attempt(tab!.id!), 800)
      return
    }
    attempt(tab.id)

    function attempt(tabId: number) {
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
          if (chrome.runtime.lastError) {
            if (relayAttempts < MAX_RELAY_ATTEMPTS) {
              relayAttempts++
              setTimeout(() => attempt(tabId), 500)
              return
            }
            return resolve({ data: null, status: 0 })
          }
          if (!resp) return resolve({ data: null, status: 0 })
          try {
            const json = resp.bodyText ? JSON.parse(resp.bodyText) : null
            resolve({ data: json as T, status: resp.status })
          } catch {
            resolve({ data: null, status: resp.status })
          }
        }
      )
    }
  })
}

async function fetchViaSiteProxy<T>(endpoint: string, init?: RequestInit, retryCount = 0): Promise<{ data: T | null; status: number }> {
  const headers = await getHeaders()
  const fullUrl = `${SITE_BASE}/api/wsProxy${endpoint}`
  console.log(`[WS API] fetchViaSiteProxy: ${fullUrl}`)
  console.log(`[WS API] Headers:`, headers)
  
  try {
    const resp = await fetch(fullUrl, {
      credentials: 'include',
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      method: init?.method || 'GET',
    })
    const status = resp.status
    console.log(`[WS API] Response status: ${status}, ok: ${resp.ok}`)
    
    if (!resp.ok) {
      console.log(`[WS API] Response not ok, trying relay for ${endpoint}`)
      // Fallback to relay via page context when cookies are not included
      return await relayFetchViaTab<T>(endpoint, init)
    }
    const json = (await resp.json()) as T
    console.log(`[WS API] Response data:`, json)
    return { data: json, status }
  } catch (e) {
    console.log(`[WS API] Fetch error for ${endpoint}:`, e)
    // Network error from background → try relay or retry
    if (retryCount < MAX_API_RETRIES) {
      console.log(`[WS API] Retrying fetch (${retryCount + 1}/${MAX_API_RETRIES}) for ${endpoint}`)
      await new Promise(resolve => setTimeout(resolve, API_RETRY_DELAY * (retryCount + 1)))
      return await fetchViaSiteProxy<T>(endpoint, init, retryCount + 1)
    }
    console.log(`[WS API] Max retries reached, trying relay for ${endpoint}`)
    return await relayFetchViaTab<T>(endpoint, init)
  }
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
      productId?: string
      providerReferenceId?: string
      amount?: { value?: number; currency?: string; scalingFactor?: number }
      amountType?: 'PERCENTAGE' | 'FIXED'
      country?: string
      dealType?: string
      description?: string
      imageUrl?: string
      merchantId?: string
      provider?: string
      siteContents?: string[]
      title?: string
      links?: { webLink?: string }
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

export async function searchMerchantByName(name: string, country: string = 'NL'): Promise<PartnerLite | null> {
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
    
    const searchRes = await fetchViaSiteProxy<MerchantsOverviewResponse>(apiUrl)
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

    const dealsRes = await fetchViaSiteProxy<DealsV2Response>(`/merchants-overview/api/v0.0.1/v2/deals?merchantId=${apiMerchant.id}&country=${country}`)
    const dealsList = dealsRes.data?.data?.deals || []

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
      const item = {
        name: d?.title || apiMerchant.name || candidate,
        rate,
        description: d?.description || (d?.siteContents && d.siteContents[0]) || '',
        imageUrl: d?.imageUrl,
        dealUrl: buildGiftProductUrl(d),
        dealType: d?.dealType,
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
      else if (cls === 'ONLINE_CASHBACK') cashback.push(item)
      else if (cls === 'AUTOREWARDS') autorewards.push(item)
    }

    // Helper to fetch giftcard product details and filter by ONLINE usage
    async function filterVoucherCandidatesOnlineOnly(cands: Array<{ id: string; item: any }>): Promise<any[]> {
      if (!cands.length) return []
      const results = await Promise.all(cands.map(async (c) => {
        try {
          const res = await fetchViaSiteProxy<any>(`/giftcards/api/v0.0.2/products/${encodeURIComponent(c.id)}`)
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
    if (cashback.length) {
      const max = Math.max(...cashback.map(d => d.rate || 0))
      categories.push({ name: 'Online cashback', deals: cashback, maxRate: max })
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
}

export async function getPartnerByHostname(hostname: string): Promise<PartnerLite | null> {
  try {
    hostname.replace(/^www\./, '').toLowerCase()
    // No hard overrides here any more; dynamic search is used for all, with name normalization handled in searchMerchantByName
  } catch {}

  const candidates = buildNameCandidates(hostname)
  console.log(`[WS API] Searching for merchant: ${hostname}, candidates:`, candidates)
  
  for (const c of candidates) {
    try {
      const res = await searchMerchantByName(c)
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
}

export async function getAllPartners(): Promise<{ partners: PartnerLite[]; lastUpdated: Date }>{
  return { partners: [], lastUpdated: new Date() }
}

export async function refreshDeals(): Promise<PartnerLite[]> {
  return []
}

export async function initializeScraper() {}
export function setupScrapingSchedule() {}

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


