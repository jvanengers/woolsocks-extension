// MVP: Remote config client for partners and admin toggles
import type { PartnerLite, PartnersCache } from '../shared/types'
import { PARTNERS } from '../shared/partners'

const CONFIG_ENDPOINT = 'https://woolsocks.eu/api/extension/merchants'
const CACHE_KEY = 'partnersCache'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000 // 24 hours max

// Convert legacy Partner to PartnerLite
function partnerToLite(partner: any): PartnerLite {
  return {
    domain: partner.domain,
    name: partner.name,
    cashbackRate: partner.cashbackRate,
    voucherAvailable: partner.voucherAvailable,
    dealUrl: partner.dealUrl,
    voucherProductUrl: partner.voucherProductUrl
  }
}

// Fallback to seed data when remote fails
function getFallbackConfig(): PartnersCache {
  const partners = PARTNERS.map(partnerToLite)
  const toggles: Record<string, boolean> = {}
  partners.forEach(p => { toggles[p.domain] = true })
  
  return {
    partners,
    toggles,
    fetchedAt: Date.now(),
    ttl: DEFAULT_TTL
  }
}

// Fetch remote config with conditional requests
async function fetchRemoteConfig(): Promise<PartnersCache | null> {
  try {
    const cached = await getCachedConfig()
    const headers: HeadersInit = {}
    
    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag
    }
    if (cached?.lastModified) {
      headers['If-Modified-Since'] = cached.lastModified
    }
    
    const response = await fetch(CONFIG_ENDPOINT, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    })
    
    if (response.status === 304) {
      // Not modified, return cached version
      return cached
    }
    
    if (!response.ok) {
      console.warn('Remote config fetch failed:', response.status, response.statusText)
      return null
    }
    
    const data = await response.json()
    
    // Validate response structure
    if (!data.partners || !Array.isArray(data.partners)) {
      console.warn('Invalid remote config: missing partners array')
      return null
    }
    
    const config: PartnersCache = {
      partners: data.partners,
      toggles: data.toggles || {},
      fetchedAt: Date.now(),
      ttl: data.cacheTtlSeconds ? data.cacheTtlSeconds * 1000 : DEFAULT_TTL,
      etag: response.headers.get('etag') || undefined,
      lastModified: response.headers.get('last-modified') || undefined
    }
    
    // Cache the new config
    await chrome.storage.local.set({ [CACHE_KEY]: config })
    return config
    
  } catch (error) {
    console.warn('Remote config fetch error:', error)
    return null
  }
}

// Get cached config from storage
async function getCachedConfig(): Promise<PartnersCache | null> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY)
    return result[CACHE_KEY] || null
  } catch (error) {
    console.warn('Failed to get cached config:', error)
    return null
  }
}

// Check if cache is still valid
function isCacheValid(cache: PartnersCache): boolean {
  const age = Date.now() - cache.fetchedAt
  return age < cache.ttl && age < MAX_CACHE_AGE
}

// Get partner by hostname with admin toggles applied
export async function getPartnerByHostname(hostname: string): Promise<PartnerLite | null> {
  let config = await getCachedConfig()
  
  // If cache is invalid or missing, try to fetch fresh
  if (!config || !isCacheValid(config)) {
    const freshConfig = await fetchRemoteConfig()
    if (freshConfig) {
      config = freshConfig
    } else if (!config) {
      // No cache and fetch failed, use fallback
      config = getFallbackConfig()
      await chrome.storage.local.set({ [CACHE_KEY]: config })
    }
  }
  
  // Find partner and check admin toggle
  const partner = config.partners.find(p => 
    hostname === p.domain || hostname.endsWith('.' + p.domain)
  )
  
  if (!partner) return null
  
  // Apply admin toggle (default to enabled if not specified)
  const isEnabled = config.toggles[partner.domain] !== false
  return isEnabled ? partner : null
}

// Get all partners (for options page)
export async function getAllPartners(): Promise<{ partners: PartnerLite[], toggles: Record<string, boolean>, lastUpdated: Date }> {
  let config = await getCachedConfig()
  
  if (!config || !isCacheValid(config)) {
    const freshConfig = await fetchRemoteConfig()
    if (freshConfig) {
      config = freshConfig
    } else if (!config) {
      config = getFallbackConfig()
      await chrome.storage.local.set({ [CACHE_KEY]: config })
    }
  }
  
  return {
    partners: config.partners,
    toggles: config.toggles,
    lastUpdated: new Date(config.fetchedAt)
  }
}

// Force refresh config (for manual refresh)
export async function refreshConfig(): Promise<PartnersCache> {
  const config = await fetchRemoteConfig()
  if (config) {
    return config
  }
  
  // Fallback if fetch fails
  const fallback = getFallbackConfig()
  await chrome.storage.local.set({ [CACHE_KEY]: fallback })
  return fallback
}

// Initialize config on startup
export async function initializeConfig(): Promise<void> {
  const config = await getCachedConfig()
  
  if (!config || !isCacheValid(config)) {
    await fetchRemoteConfig()
  }
}

// Set up periodic refresh alarm
export function setupConfigRefresh(): void {
  // Clear existing alarm
  chrome.alarms.clear('config-refresh')
  
  // Set new alarm for every 5 minutes
  chrome.alarms.create('config-refresh', {
    delayInMinutes: 5,
    periodInMinutes: 5
  })
  
  // Listen for alarm
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'config-refresh') {
      fetchRemoteConfig().catch(error => {
        console.warn('Periodic config refresh failed:', error)
      })
    }
  })
}

