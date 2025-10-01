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
const MAX_RELAY_ATTEMPTS = 2

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

async function fetchViaSiteProxy<T>(endpoint: string, init?: RequestInit): Promise<{ data: T | null; status: number }> {
  const headers = await getHeaders()
  try {
    const resp = await fetch(`${SITE_BASE}/api/wsProxy${endpoint}`, {
      credentials: 'include',
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      method: init?.method || 'GET',
    })
    const status = resp.status
    if (!resp.ok) {
      // Fallback to relay via page context when cookies are not included
      return await relayFetchViaTab<T>(endpoint, init)
    }
    const json = (await resp.json()) as T
    return { data: json, status }
  } catch (e) {
    // Network error from background → try relay
    return await relayFetchViaTab<T>(endpoint, init)
  }
}

function buildNameCandidates(hostnameOrName: string): string[] {
  const raw = hostnameOrName.replace(/^www\./i, '')
  const parts = raw.split('.')
  const core = parts.length >= 2 ? parts[parts.length - 2] : parts[0]
  const candidates = new Set<string>()
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
  const exact = list.find((m) => (m?.data?.name || m?.name || '').toLowerCase().replace(/\s+/g, '') === q)
  if (exact) return exact.data || exact
  const starts = list.find((m) => (m?.data?.name || m?.name || '').toLowerCase().startsWith(q))
  if (starts) return starts.data || starts
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
  const candidates = buildNameCandidates(name)
  for (const candidate of candidates) {
    const params = new URLSearchParams({ name: candidate, country })
    const searchRes = await fetchViaSiteProxy<MerchantsOverviewResponse>(`/merchants-overview/api/v0.0.1/merchants?${params.toString()}`)
    const data = searchRes.data?.data
    if (!data || !data.merchants || data.merchants.length === 0) {
      continue
    }

    const chosen = pickBestMerchant(candidate, data.merchants)
    const apiMerchant = chosen
    if (!apiMerchant?.id) continue

    const dealsRes = await fetchViaSiteProxy<DealsV2Response>(`/merchants-overview/api/v0.0.1/v2/deals?merchantId=${apiMerchant.id}&country=${country}`)
    const dealsList = dealsRes.data?.data?.deals || []

    let cashbackRate = 0
    let voucherAvailable = false
    const categories: Category[] = []

    const vouchers: any[] = []
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
      if (cls === 'VOUCHERS') vouchers.push(item)
      else if (cls === 'ONLINE_CASHBACK') cashback.push(item)
      else if (cls === 'AUTOREWARDS') autorewards.push(item)
    }

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
  const candidates = buildNameCandidates(hostname)
  for (const c of candidates) {
    const res = await searchMerchantByName(c)
    if (res) return res
  }
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


