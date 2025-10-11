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
        // Amazon variants
        'amazon.com': 'US',
        'amazon.nl': 'NL',
        'amazon.de': 'DE',
        'amazon.fr': 'FR',
        'amazon.co.uk': 'GB',
        'amazon.it': 'IT',
        'amazon.es': 'ES',
        'amazon.ca': 'CA',
        'amazon.com.au': 'AU',
        
        // AliExpress variants
        'aliexpress.com': 'US',
        'aliexpress.us': 'US',
        'aliexpress.ru': 'RU',
        'aliexpress.de': 'DE',
        'aliexpress.fr': 'FR',
        'aliexpress.nl': 'NL',
        'aliexpress.it': 'IT',
        'aliexpress.es': 'ES',
        'aliexpress.pl': 'PL',
        'aliexpress.th': 'TH',
        'aliexpress.tr': 'TR',
        'aliexpress.vn': 'VI',
        'aliexpress.id': 'ID',
        'aliexpress.jp': 'JA',
        'aliexpress.kr': 'KO',
        'aliexpress.pt': 'PT',
        'aliexpress.ar': 'AR',
        'aliexpress.il': 'HE',
        'aliexpress.my': 'MY',
        
        // Food delivery
        'thuisbezorgd.nl': 'NL',
        'thuisbezorgd.de': 'DE',
        'thuisbezorgd.be': 'BE',
        'takeaway.com': 'NL',
        'just-eat.nl': 'NL',
        'just-eat.de': 'DE',
        'just-eat.fr': 'FR',
        'just-eat.co.uk': 'GB',
        
        // Fashion & retail
        'bol.com': 'NL',
        'zalando.nl': 'NL',
        'zalando.de': 'DE',
        'zalando.fr': 'FR',
        'zalando.it': 'IT',
        'zalando.es': 'ES',
        'zalando.co.uk': 'GB',
        'aboutyou.de': 'DE',
        'aboutyou.nl': 'NL',
        'aboutyou.fr': 'FR',
        'aboutyou.com': 'DE',
        'shein.com': 'US',
        'shein.nl': 'NL',
        'shein.de': 'DE',
        'shein.fr': 'FR',
        'hm.com': 'US',
        'hm.nl': 'NL',
        'hm.de': 'DE',
        'hm.fr': 'FR',
        'hm.co.uk': 'GB',
        'nike.com': 'US',
        'nike.nl': 'NL',
        'nike.de': 'DE',
        'nike.fr': 'FR',
        'nike.co.uk': 'GB',
        'adidas.com': 'US',
        'adidas.nl': 'NL',
        'adidas.de': 'DE',
        'adidas.fr': 'FR',
        'adidas.co.uk': 'GB',
        'asos.com': 'GB',
        'asos.nl': 'NL',
        'asos.de': 'DE',
        'asos.fr': 'FR',
        
        // Electronics & tech
        'coolblue.nl': 'NL',
        'wehkamp.nl': 'NL',
        'mediamarkt.nl': 'NL',
        'mediamarkt.de': 'DE',
        'mediamarkt.fr': 'FR',
        'mediamarkt.be': 'BE',
        'mediamarkt.it': 'IT',
        'mediamarkt.es': 'ES',
        'saturn.de': 'DE',
        'saturn.at': 'AT',
        'saturn.ch': 'CH',
        
        // Home & furniture
        'ikea.nl': 'NL',
        'ikea.de': 'DE',
        'ikea.fr': 'FR',
        'ikea.co.uk': 'GB',
        'ikea.com': 'US',
        'ikea.it': 'IT',
        'ikea.es': 'ES',
        'ikea.be': 'BE',
        'ikea.at': 'AT',
        'ikea.ch': 'CH',
        
        // Dutch retailers
        'action.nl': 'NL',
        'hema.nl': 'NL',
        'hema.de': 'DE',
        'hema.be': 'BE',
        'hema.fr': 'FR',
        'intertoys.nl': 'NL',
        'intertoys.de': 'DE',
        'intertoys.be': 'BE',
        'intertoys.fr': 'FR',
        'prénatal.nl': 'NL',
        'prénatal.de': 'DE',
        'prénatal.fr': 'FR',
        'prénatal.be': 'BE',
        
        // Pet & health
        'zooplus.nl': 'NL',
        'zooplus.de': 'DE',
        'zooplus.fr': 'FR',
        'zooplus.co.uk': 'GB',
        'zooplus.it': 'IT',
        'zooplus.es': 'ES',
        'bodyandfit.nl': 'NL',
        'bodyandfit.de': 'DE',
        'bodyandfit.fr': 'FR',
        'bodyandfit.co.uk': 'GB',
        'medpets.nl': 'NL',
        'medpets.de': 'DE',
        'medpets.fr': 'FR',
        'medpets.co.uk': 'GB',
        
        // Sports & lifestyle
        'jd-sports.nl': 'NL',
        'jd-sports.de': 'DE',
        'jd-sports.fr': 'FR',
        'jd-sports.co.uk': 'GB',
        'vitesse.nl': 'NL',
        'vitesse.de': 'DE',
        'vitesse.fr': 'FR',
        'scapino.nl': 'NL',
        'scapino.de': 'DE',
        'scapino.be': 'BE',
        'we-fashion.nl': 'NL',
        'we-fashion.de': 'DE',
        'we-fashion.fr': 'FR',
        'we-fashion.be': 'BE',
        
        // Travel & services
        'trip.com': 'US',
        'booking.com': 'NL',
        'expedia.nl': 'NL',
        'expedia.de': 'DE',
        'expedia.fr': 'FR',
        'expedia.co.uk': 'GB',
        'staatsloterij.nl': 'NL',
        'greetz.nl': 'NL',
        'greetz.de': 'DE',
        'greetz.fr': 'FR',
        'greetz.co.uk': 'GB',
        'lidl.nl': 'NL',
        'lidl.de': 'DE',
        'lidl.fr': 'FR',
        'lidl.co.uk': 'GB',
        'lidl.be': 'BE',
        'lidl.it': 'IT',
        'lidl.es': 'ES',
        
        // Gaming & tech
        'ninja.nl': 'NL',
        'ninja.de': 'DE',
        'ninja.fr': 'FR',
        'ninja.co.uk': 'GB',
        'overstappen.nl': 'NL',
        'de-notenshop.nl': 'NL',
        'de-notenshop.de': 'DE',
        'de-notenshop.fr': 'FR',
        'brekz.nl': 'NL',
        'brekz.de': 'DE',
        'brekz.fr': 'FR',
        'uitgekookt.nl': 'NL',
        'uitgekookt.de': 'DE',
        'uitgekookt.fr': 'FR',
        'plein.nl': 'NL',
        'plein.de': 'DE',
        'plein.fr': 'FR',
        'lounge-by-zalando.nl': 'NL',
        'lounge-by-zalando.de': 'DE',
        'lounge-by-zalando.fr': 'FR',
        'lounge-by-zalando.co.uk': 'GB',
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
 * Get country for a domain or URL
 * Handles various localization patterns:
 * - Simple domains: ikea.nl, amazon.de
 * - Path-based: ikea.com/nl/nl/, nike.com/nl/en/
 * - Query parameters: aliexpress.com/?gatewayAdapt=glo2nld
 */
export async function getCountryForDomain(domainOrUrl: string): Promise<string> {
  try {
    const mappings = await getCountryMappings()
    
    // Handle full URLs vs just domains
    let domain: string
    let path: string = ''
    let searchParams: string = ''
    
    if (domainOrUrl.includes('/') || domainOrUrl.includes('?')) {
      // It's a full URL, parse it
      try {
        const url = new URL(domainOrUrl.startsWith('http') ? domainOrUrl : `https://${domainOrUrl}`)
        domain = url.hostname.replace(/^www\./, '').toLowerCase()
        path = url.pathname
        searchParams = url.search
      } catch {
        // Fallback: treat as domain
        domain = domainOrUrl.replace(/^www\./, '').toLowerCase()
      }
    } else {
      // Just a domain
      domain = domainOrUrl.replace(/^www\./, '').toLowerCase()
    }
    
    // 1. Check for subdomain-based country indicators (highest priority)
    const subdomainMatch = domain.match(/^([a-z]{2})\.(.+)$/)
    if (subdomainMatch) {
      const countryCode = subdomainMatch[1].toUpperCase()
      if (['NL', 'DE', 'FR', 'GB', 'US', 'BE', 'IT', 'ES', 'RU', 'PL', 'TH', 'TR', 'VI', 'ID', 'JA', 'KO', 'PT', 'AR', 'HE', 'MY'].includes(countryCode)) {
        return countryCode
      }
    }
    
    // 2. Check for path-based country indicators (high priority for multi-country domains)
    if (path) {
      // IKEA pattern: ikea.com/nl/nl/ or ikea.com/de/de/
      const ikeaMatch = path.match(/^\/([a-z]{2})\/[a-z]{2}/)
      if (ikeaMatch) {
        const countryCode = ikeaMatch[1].toUpperCase()
        if (['NL', 'DE', 'FR', 'GB', 'US', 'BE', 'IT', 'ES'].includes(countryCode)) {
          return countryCode
        }
      }
      
      // Nike pattern: nike.com/nl/en/ or nike.com/de/en/
      const nikeMatch = path.match(/^\/([a-z]{2})\/[a-z]{2}/)
      if (nikeMatch) {
        const countryCode = nikeMatch[1].toUpperCase()
        if (['NL', 'DE', 'FR', 'GB', 'US', 'BE', 'IT', 'ES'].includes(countryCode)) {
          return countryCode
        }
      }
      
      // Generic pattern: /nl/, /de/, /fr/, etc.
      const genericMatch = path.match(/^\/([a-z]{2})(?:\/|$)/)
      if (genericMatch) {
        const countryCode = genericMatch[1].toUpperCase()
        if (['NL', 'DE', 'FR', 'GB', 'US', 'BE', 'IT', 'ES'].includes(countryCode)) {
          return countryCode
        }
      }
    }
    
    // 3. Check direct domain mapping (for single-country domains)
    if (mappings[domain]) {
      return mappings[domain]
    }
    
    // 4. Check for query parameter country indicators
    if (searchParams) {
      const params = new URLSearchParams(searchParams)
      
      // AliExpress pattern: ?gatewayAdapt=glo2nld (nld = Netherlands)
      const gatewayAdapt = params.get('gatewayAdapt')
      if (gatewayAdapt) {
        const countryMap: Record<string, string> = {
          'glo2nld': 'NL', // Netherlands
          'glo2deu': 'DE', // Germany
          'glo2fra': 'FR', // France
          'glo2gbr': 'GB', // Great Britain
          'glo2usa': 'US', // USA
          'glo2bel': 'BE', // Belgium
          'glo2ita': 'IT', // Italy
          'glo2esp': 'ES', // Spain
          'glo2rus': 'RU', // Russia
          'glo2pol': 'PL', // Poland
          'glo2tha': 'TH', // Thailand
          'glo2tur': 'TR', // Turkey
          'glo2vnm': 'VI', // Vietnam
          'glo2idn': 'ID', // Indonesia
          'glo2jpn': 'JA', // Japan
          'glo2kor': 'KO', // South Korea
          'glo2prt': 'PT', // Portugal
          'glo2arg': 'AR', // Argentina
          'glo2isr': 'HE', // Israel
          'glo2mys': 'MY', // Malaysia
        }
        if (countryMap[gatewayAdapt]) {
          return countryMap[gatewayAdapt]
        }
      }
      
      // Generic country parameter
      const countryParam = params.get('country') || params.get('locale') || params.get('region')
      if (countryParam) {
        const countryCode = countryParam.toUpperCase()
        if (['NL', 'DE', 'FR', 'GB', 'US', 'BE', 'IT', 'ES', 'RU', 'PL', 'TH', 'TR', 'VI', 'ID', 'JA', 'KO', 'PT', 'AR', 'HE', 'MY'].includes(countryCode)) {
          return countryCode
        }
      }
    }
    
    // 5. Fallback to TLD-based detection
    const tldMatch = domain.match(/\.([a-z]{2})$/)
    if (tldMatch) {
      const tld = tldMatch[1].toUpperCase()
      const tldMap: Record<string, string> = {
        'NL': 'NL',
        'DE': 'DE', 
        'FR': 'FR',
        'UK': 'GB',
        'US': 'US',
        'BE': 'BE',
        'IT': 'IT',
        'ES': 'ES',
        'RU': 'RU',
        'PL': 'PL',
        'TH': 'TH',
        'TR': 'TR',
        'VN': 'VI',
        'ID': 'ID',
        'JP': 'JA',
        'KR': 'KO',
        'PT': 'PT',
        'AR': 'AR',
        'IL': 'HE',
        'MY': 'MY',
      }
      if (tldMap[tld]) {
        return tldMap[tld]
      }
    }
    
    // 5. Default fallback
    return 'NL'
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