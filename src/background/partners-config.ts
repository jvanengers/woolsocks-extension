// Partner configuration cache module
// Handles caching of partner eligibility rules, country mappings, and domain blacklists

import { get, set, cachedFetch, CACHE_NAMESPACES } from '../shared/cache'

export interface PartnerConfig {
  eligibilityRules: Record<string, boolean>
  countryMappings: Record<string, string>
  domainBlacklists: {
    onlineCashback: string[]
    voucherCheckout: string[]
  }
  version: string
  lastUpdated: number
}

export interface CountryMapping {
  domain: string
  country: string
  locale: string
}

/**
 * Get partner eligibility rules with caching
 * TTL: 24 hours
 */
export async function getPartnerEligibilityRules(): Promise<Record<string, boolean>> {
  return cachedFetch(
    CACHE_NAMESPACES.PARTNER_CONFIG,
    'eligibility_rules',
    async () => {
      // For now, return empty rules - this will be populated when blacklist system is implemented
      // This follows roadmap item #1 (realtime blacklists)
      return {}
    },
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      storageType: 'persistent',
    }
  )
}

/**
 * Get country mappings with caching
 * TTL: 24 hours
 */
export async function getCountryMappings(): Promise<Record<string, string>> {
  return cachedFetch(
    CACHE_NAMESPACES.PARTNER_CONFIG,
    'country_mappings',
    async () => {
      // Default country mappings for common domains
      const defaultMappings: Record<string, string> = {
        'amazon.com': 'US',
        'amazon.nl': 'NL',
        'amazon.de': 'DE',
        'amazon.fr': 'FR',
        'amazon.co.uk': 'GB',
        'bol.com': 'NL',
        'zalando.nl': 'NL',
        'zalando.de': 'DE',
        'zalando.fr': 'FR',
        'coolblue.nl': 'NL',
        'wehkamp.nl': 'NL',
        'mediamarkt.nl': 'NL',
        'mediamarkt.de': 'DE',
        'ikea.nl': 'NL',
        'ikea.de': 'DE',
        'action.nl': 'NL',
        'hema.nl': 'NL',
        'nike.com': 'US',
        'nike.nl': 'NL',
        'adidas.com': 'US',
        'adidas.nl': 'NL',
        'asos.com': 'GB',
        'aboutyou.de': 'DE',
        'shein.com': 'US',
        'intertoys.nl': 'NL',
      }
      
      return defaultMappings
    },
    {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      storageType: 'persistent',
    }
  )
}

/**
 * Get domain blacklists with caching
 * TTL: 5 minutes (frequent updates expected)
 */
export async function getDomainBlacklists(): Promise<{
  onlineCashback: string[]
  voucherCheckout: string[]
}> {
  return cachedFetch(
    CACHE_NAMESPACES.PARTNER_CONFIG,
    'domain_blacklists',
    async () => {
      // For now, return empty blacklists - this will be populated when blacklist system is implemented
      // This follows roadmap item #1 (realtime blacklists)
      return {
        onlineCashback: [],
        voucherCheckout: [],
      }
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes
      storageType: 'persistent',
    }
  )
}

/**
 * Check if a domain is blacklisted for online cashback
 */
export async function isDomainBlacklistedForCashback(domain: string): Promise<boolean> {
  try {
    const blacklists = await getDomainBlacklists()
    const cleanDomain = domain.replace(/^www\./, '').toLowerCase()
    return blacklists.onlineCashback.includes(cleanDomain)
  } catch {
    return false
  }
}

/**
 * Check if a domain is blacklisted for voucher checkout
 */
export async function isDomainBlacklistedForVouchers(domain: string): Promise<boolean> {
  try {
    const blacklists = await getDomainBlacklists()
    const cleanDomain = domain.replace(/^www\./, '').toLowerCase()
    return blacklists.voucherCheckout.includes(cleanDomain)
  } catch {
    return false
  }
}

/**
 * Get country for a domain
 */
export async function getCountryForDomain(domain: string): Promise<string> {
  try {
    const mappings = await getCountryMappings()
    const cleanDomain = domain.replace(/^www\./, '').toLowerCase()
    return mappings[cleanDomain] || 'NL' // Default to NL
  } catch {
    return 'NL'
  }
}

/**
 * Update partner configuration (for future use with remote config)
 */
export async function updatePartnerConfig(config: Partial<PartnerConfig>): Promise<void> {
  try {
    if (config.eligibilityRules) {
      await set(CACHE_NAMESPACES.PARTNER_CONFIG, 'eligibility_rules', config.eligibilityRules)
    }
    
    if (config.countryMappings) {
      await set(CACHE_NAMESPACES.PARTNER_CONFIG, 'country_mappings', config.countryMappings)
    }
    
    if (config.domainBlacklists) {
      await set(CACHE_NAMESPACES.PARTNER_CONFIG, 'domain_blacklists', config.domainBlacklists)
    }
  } catch (error) {
    console.warn('[PartnersConfig] Error updating partner config:', error)
  }
}

/**
 * Invalidate all partner configuration cache
 */
export async function invalidatePartnerConfigCache(): Promise<void> {
  try {
    await Promise.all([
      set(CACHE_NAMESPACES.PARTNER_CONFIG, 'eligibility_rules', null),
      set(CACHE_NAMESPACES.PARTNER_CONFIG, 'country_mappings', null),
      set(CACHE_NAMESPACES.PARTNER_CONFIG, 'domain_blacklists', null),
    ])
  } catch (error) {
    console.warn('[PartnersConfig] Error invalidating partner config cache:', error)
  }
}

/**
 * Get cached partner configuration stats
 */
export async function getPartnerConfigStats(): Promise<{
  eligibilityRulesCount: number
  countryMappingsCount: number
  blacklistedDomainsCount: number
  lastUpdated: number
}> {
  try {
    const [eligibilityRules, countryMappings, blacklists] = await Promise.all([
      get(CACHE_NAMESPACES.PARTNER_CONFIG, 'eligibility_rules') as any,
      get(CACHE_NAMESPACES.PARTNER_CONFIG, 'country_mappings') as any,
      get(CACHE_NAMESPACES.PARTNER_CONFIG, 'domain_blacklists') as any,
    ])
    
    return {
      eligibilityRulesCount: Object.keys(eligibilityRules || {}).length,
      countryMappingsCount: Object.keys(countryMappings || {}).length,
      blacklistedDomainsCount: (blacklists?.onlineCashback?.length || 0) + (blacklists?.voucherCheckout?.length || 0),
      lastUpdated: Math.max(
        eligibilityRules?.timestamp || 0,
        countryMappings?.timestamp || 0,
        blacklists?.timestamp || 0
      ),
    }
  } catch {
    return {
      eligibilityRulesCount: 0,
      countryMappingsCount: 0,
      blacklistedDomainsCount: 0,
      lastUpdated: 0,
    }
  }
}