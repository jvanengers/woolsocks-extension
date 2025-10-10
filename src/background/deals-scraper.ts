// Enhanced on-demand search for woolsocks.eu deals
import type { PartnerLite, Category } from '../shared/types'

interface SearchResult {
  merchant: string
  cashbackRate?: number
  voucherAvailable: boolean
  cashbackUrl?: string
  voucherUrl?: string
  // Enhanced data
  categories?: Category[]
  merchantImageUrl?: string
  description?: string
  // Voucher data
  allVouchers?: Array<{
    url: string
    imageUrl?: string
    name?: string
    cashbackRate?: number
  }>
}

// Simple cache for individual merchant searches
interface MerchantCache {
  [merchantName: string]: {
    result: PartnerLite | null
    searchedAt: number
    ttl: number
  }
}

const CACHE_KEY = 'merchantCache'
const DEFAULT_TTL = 60 * 60 * 1000 // 1 hour per merchant

// Search for merchant deals on woolsocks.eu
async function searchMerchantDeals(merchantName: string): Promise<SearchResult | null> {
  try {
    // Search for cashback deals
    const cashbackResult = await searchCashbackDeals(merchantName)
    
    // Search for vouchers
    const voucherResult = await searchVoucherDeals(merchantName)
    
    if (!cashbackResult && !voucherResult) {
      return null
    }
    
    return {
      merchant: merchantName,
      cashbackRate: cashbackResult?.cashbackRate,
      voucherAvailable: voucherResult?.voucherAvailable || false,
      cashbackUrl: cashbackResult?.cashbackUrl,
      voucherUrl: voucherResult?.voucherUrl,
      // Enhanced data from cashback search
      categories: cashbackResult?.categories,
      merchantImageUrl: cashbackResult?.merchantImageUrl,
      description: cashbackResult?.description,
      // Voucher data
      allVouchers: voucherResult?.allVouchers
    }
  } catch (error) {
    console.warn(`Failed to search deals for ${merchantName}:`, error)
    return null
  }
}

// Search cashback deals on /nl/cashback/search
async function searchCashbackDeals(merchantName: string): Promise<{ 
  cashbackRate: number, 
  cashbackUrl: string,
  categories?: Category[],
  merchantImageUrl?: string,
  description?: string
} | null> {
  try {
    // Custom normalization for some merchants where diacritics matter on search
    let query = merchantName
    // Fix for name variants to surface correct brand in results
    if (/^prenatal$/i.test(query)) query = 'prénatal'
    if (/^cadeaubon$/i.test(query)) query = 'keuze cadeaukaart'
    // Use the correct search URL format
    const searchUrl = `https://woolsocks.eu/nl/cashback/search?query=${encodeURIComponent(query)}`
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
      }
    })
    
    if (!response.ok) {
      console.warn(`Cashback search failed for ${merchantName}: ${response.status}`)
      return null
    }
    
    const html = await response.text()
    return await parseCashbackSearchResults(html, query)
  } catch (error) {
    console.warn(`Error searching cashback for ${merchantName}:`, error)
    return null
  }
}

// Search voucher deals on /nl/giftcards-shop
async function searchVoucherDeals(merchantName: string): Promise<{ 
  voucherAvailable: boolean, 
  voucherUrl: string,
  voucherImageUrl?: string,
  voucherName?: string,
  voucherCashbackRate?: number,
  allVouchers?: Array<{
    url: string,
    imageUrl?: string,
    name?: string,
    cashbackRate?: number
  }>
} | null> {
  try {
    // First try cashback search to find merchant page
    let q = merchantName
    if (/^prenatal$/i.test(q)) q = 'prénatal'
    if (/^cadeaubon$/i.test(q)) q = 'keuze cadeaukaart'
    const cashbackSearchUrl = `https://woolsocks.eu/cashback/search?query=${encodeURIComponent(q)}`
    console.log(`Trying cashback search: ${cashbackSearchUrl}`)
    
    const searchResponse = await fetch(cashbackSearchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
      }
    })
    
    if (searchResponse.ok) {
      const searchHtml = await searchResponse.text()
      
      // Find all cashback URLs and check which one has the merchant name in context
      const allCashbackUrls = searchHtml.match(/href="(\/cashback\/[a-f0-9-]+)"/g)
      if (allCashbackUrls) {
        for (const urlMatch of allCashbackUrls) {
          const urlMatchResult = urlMatch.match(/href="(\/cashback\/[a-f0-9-]+)"/)
          if (!urlMatchResult) continue
          
          const url = urlMatchResult[1]
          const urlIndex = searchHtml.indexOf(urlMatch)
          
          // Check if merchant name appears within 1000 characters before or after this URL
          const contextStart = Math.max(0, urlIndex - 1000)
          const contextEnd = Math.min(searchHtml.length, urlIndex + 1000)
          const context = searchHtml.substring(contextStart, contextEnd)
          
          // Check for merchant name variations
          const merchantVariations = [
            merchantName.toLowerCase(),
            merchantName.toLowerCase().replace(/[^a-z0-9]/g, ''),
            merchantName.toLowerCase().replace(/\s+/g, '')
          ]
          
          // More precise merchant matching - look for merchant name in specific contexts
          const foundMerchant = merchantVariations.some(variation => {
            // Look for merchant name in merchant card context, not just anywhere
            const merchantCardContext = context.match(/MerchantCard[^>]*>[\s\S]*?<\/div>/gi)
            if (merchantCardContext) {
              return merchantCardContext.some(card => {
                const cardLower = card.toLowerCase()
                // For short names like "HEMA", be more lenient
                if (variation.length <= 4) {
                  return cardLower.includes(variation)
                }
                // For longer names, check word boundaries
                const variationIndex = cardLower.indexOf(variation)
                if (variationIndex === -1) return false
                
                const beforeChar = variationIndex > 0 ? cardLower[variationIndex - 1] : ' '
                const afterChar = variationIndex + variation.length < cardLower.length ? cardLower[variationIndex + variation.length] : ' '
                
                const isWordBoundary = /[^a-z0-9]/.test(beforeChar) && /[^a-z0-9]/.test(afterChar)
                
                return isWordBoundary
              })
            }
            return false
          })
          
          if (foundMerchant) {
            const merchantPageUrl = `https://woolsocks.eu${url}`
            console.log(`Found merchant page: ${merchantPageUrl}`)
            
            // Fetch the merchant page to find voucher URLs
            const merchantResponse = await fetch(merchantPageUrl, {
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache'
              }
            })
            
            if (merchantResponse.ok) {
              const merchantHtml = await merchantResponse.text()
              
              // Look for voucher product URLs and images on the merchant page
              // Only look in the "Vouchers | cashback of pay later" section to avoid autorewards
              const vouchersSection = merchantHtml.match(/Vouchers\s*\|\s*cashback\s*of\s*pay\s*later[\s\S]*?(?=<h[1-6]|$)/i)
              
              let voucherUrls: string[] = []
              if (vouchersSection && vouchersSection[0]) {
                // Look for voucher URLs only within the vouchers section
                // Updated regex to match the actual URL pattern: /nl/giftcards-shop/products/[uuid]
                voucherUrls = vouchersSection[0].match(/href="(\/nl\/giftcards-shop\/products\/[a-z0-9-]+)"/g) || []
              }
              
              if (voucherUrls && voucherUrls.length > 0) {
                console.log(`Found ${voucherUrls.length} voucher URLs on merchant page`)
                
                // Extract voucher information including images
                const vouchers = []
                for (const urlMatch of voucherUrls) {
                  const urlMatchResult = urlMatch.match(/href="([^"]+)"/)
                  if (!urlMatchResult) continue
                  
                  let url = urlMatchResult[1]
                  // Ensure URL is absolute
                  if (url.startsWith('/')) {
                    url = `https://woolsocks.eu${url}`
                  } else if (!url.startsWith('http')) {
                    url = `https://woolsocks.eu/${url}`
                  }
                  
                  const urlIndex = vouchersSection![0].indexOf(urlMatch)
                  
                  // Get context around this specific voucher URL to find associated image and details
                  // Use a smaller context window to avoid mixing up voucher details
                  const contextStart = Math.max(0, urlIndex - 500)
                  const contextEnd = Math.min(vouchersSection![0].length, urlIndex + 500)
                  const context = vouchersSection![0].substring(contextStart, contextEnd)
                  
                  // Look for image URL in the context - try multiple patterns
                  let imageUrl = null
                  const imagePatterns = [
                    /src="([^"]*\.(?:jpg|jpeg|png|gif|webp|svg)[^"]*)"/i,
                    /src="([^"]*api\.sniptech\.com[^"]*)"/i,
                    /src="([^"]*content\.blackhawknetwork\.com[^"]*)"/i
                  ]
                  
                  for (const pattern of imagePatterns) {
                    const imageMatch = context.match(pattern)
                    if (imageMatch) {
                      imageUrl = imageMatch[1]
                      break
                    }
                  }
                  
                  // Look for voucher name/title in the context - try multiple patterns
                  let voucherName = null
                  const namePatterns = [
                    // Look for alt text in images (most reliable)
                    /alt="([^"]*)"[^>]*class="[^"]*image[^"]*"/i,
                    /alt="([^"]+)"/i,
                    // Look for specific voucher names
                    /one4all[^<]*kids[^<]*cadeau/gi,
                    /keuze[^<]*cadeau[^<]*kaart/gi,
                    /woolsocks[^<]*all[^<]*in[^<]*one/gi,
                    /all[^<]*in[^<]*one/gi,
                    /intertoys[^<]*kadokaart/gi,
                    // Generic patterns as fallback
                    /title="([^"]+)"/i,
                    /<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</i
                  ]
                  
                  for (const pattern of namePatterns) {
                    const nameMatch = context.match(pattern)
                    if (nameMatch) {
                      voucherName = nameMatch[1] || nameMatch[0]
                      // Clean up the name
                      voucherName = voucherName.replace(/\s+image$/, '').trim()
                      break
                    }
                  }
                  
                  // Skip autorewards and coin-related entries
                  if (voucherName && (
                    voucherName.toLowerCase().includes('coin') ||
                    voucherName.toLowerCase().includes('autorewards') ||
                    voucherName.toLowerCase().includes('bespaar') ||
                    voucherName.toLowerCase().includes('op al je aankopen')
                  )) {
                    console.log(`Skipping autorewards/coin entry: ${voucherName}`)
                    continue
                  }
                  
                  // Look for cashback percentage - be more specific to avoid autorewards
                  const cashbackMatch = context.match(/(\d+(?:[.,]\d+)?)%/)
                  let cashbackRate = cashbackMatch ? parseFloat(cashbackMatch[1].replace(',', '.')) : null
                  
                  // Skip if this looks like autorewards (2.0% rate) or coin entries
                  if (cashbackRate === 2.0 || (voucherName && voucherName.toLowerCase().includes('coin'))) {
                    console.log(`Skipping autorewards/coin entry with ${cashbackRate}% rate: ${voucherName}`)
                    continue
                  }
                  
                  vouchers.push({
                    url: url,
                    imageUrl: imageUrl || undefined,
                    name: voucherName || undefined,
                    cashbackRate: cashbackRate || undefined
                  })
                }
                
                if (vouchers.length > 0) {
                  console.log(`Found ${vouchers.length} vouchers with details for ${merchantName}`)
                  
                  // Return the first voucher with all its details
                  const firstVoucher = vouchers[0]
                  console.log(`Found voucher for ${merchantName}: ${firstVoucher.url}`)
                  if (firstVoucher.imageUrl) {
                    console.log(`Voucher image: ${firstVoucher.imageUrl}`)
                  }
                  
                  return {
                    voucherAvailable: true,
                    voucherUrl: firstVoucher.url,
                    voucherImageUrl: firstVoucher.imageUrl,
                    voucherName: firstVoucher.name,
                    voucherCashbackRate: firstVoucher.cashbackRate,
                    allVouchers: vouchers // Include all vouchers for potential future use
                  }
                }
              }
            }
            break // Found the merchant, no need to check other URLs
          }
        }
      }
    }
    
    // Fallback to direct giftcards-shop search
    const giftcardSearchUrls = [
      `https://woolsocks.eu/nl/giftcards-shop?search=${encodeURIComponent(merchantName)}`,
      `https://woolsocks.eu/giftcards-shop?search=${encodeURIComponent(merchantName)}`,
      `https://woolsocks.eu/nl/giftcards-shop?search=${encodeURIComponent(merchantName.replace(/[^a-zA-Z0-9]/g, ''))}`,
      `https://woolsocks.eu/giftcards-shop?search=${encodeURIComponent(merchantName.replace(/[^a-zA-Z0-9]/g, ''))}`,
      // Try alternative search terms for specific merchants
      ...(merchantName.toLowerCase().includes('hema') ? [
        `https://woolsocks.eu/nl/giftcards-shop?search=hema`,
        `https://woolsocks.eu/giftcards-shop?search=hema`
      ] : []),
      ...(merchantName.toLowerCase().includes('gall') ? [
        `https://woolsocks.eu/nl/giftcards-shop?search=gall`,
        `https://woolsocks.eu/giftcards-shop?search=gall`,
        `https://woolsocks.eu/nl/giftcards-shop?search=gall%20gall`,
        `https://woolsocks.eu/giftcards-shop?search=gall%20gall`
      ] : [])
    ]
    
    for (const searchUrl of giftcardSearchUrls) {
      console.log(`Trying giftcard search: ${searchUrl}`)
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        console.warn(`Voucher search failed for ${merchantName} at ${searchUrl}: ${response.status}`)
        continue
      }
      
      const html = await response.text()
      const searchResult = parseVoucherSearchResults(html, merchantName)
      
      // If we found a product page URL, construct the checkout URL directly using the known pattern
      if (searchResult && searchResult.voucherUrl && searchResult.voucherUrl.includes('/products/') && !searchResult.voucherUrl.includes('/checkout')) {
        // Extract product ID from the URL
        const productIdMatch = searchResult.voucherUrl.match(/\/products\/([a-f0-9-]+)/)
        if (productIdMatch) {
          const productId = productIdMatch[1]
          // Construct checkout URL using the known pattern
          const checkoutUrl = `https://woolsocks.eu/nl/giftcards-shop/products/${productId}/checkout`
          console.log(`Found voucher for ${merchantName}: ${checkoutUrl}`)
          return {
            voucherAvailable: true,
            voucherUrl: checkoutUrl,
            voucherImageUrl: searchResult.voucherImageUrl,
            voucherName: searchResult.voucherName,
            voucherCashbackRate: searchResult.voucherCashbackRate,
            allVouchers: searchResult.allVouchers
          }
        }
      }
      
      // If we found a result, return it even if it's not a product URL
      if (searchResult) {
        return searchResult
      }
    }
    
    return null
  } catch (error) {
    console.warn(`Error searching vouchers for ${merchantName}:`, error)
    return null
  }
}

// Parse cashback search results and click through to merchant page
async function parseCashbackSearchResults(html: string, merchantName: string): Promise<{ 
  cashbackRate: number, 
  cashbackUrl: string,
  categories?: Category[],
  merchantImageUrl?: string,
  description?: string
} | null> {
  try {
    // Look for the top merchant result in search results
    // Based on the search results page structure, find the first merchant card
    const merchantCardPattern = new RegExp(
      `<a[^>]*class="[^"]*MerchantCard[^"]*"[^>]*href="([^"]*)"[^>]*>[\\s\\S]*?${merchantName}[\\s\\S]*?<span[^>]*>([^<]*%)</span>`,
      'gi'
    )
    
    let match = merchantCardPattern.exec(html)
    if (!match) {
      // Custom fallback: iterate merchant cards to find closest name match, e.g. accent/spacing variants
      const cardRegex = /<a[^>]*class="[^"]*MerchantCard[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*MerchantCard_name[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*>([^<]*%)<\/span>/gi
      let candidate: { href: string; rate: string; name: string } | null = null
      let m: RegExpExecArray | null
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      const target = norm(merchantName)
      while ((m = cardRegex.exec(html)) !== null) {
        const name = m[2]?.trim() || ''
        if (!name) continue
        if (norm(name).includes(target)) {
          candidate = { href: m[1], rate: m[3] || '0%', name }
          break
        }
      }
      if (candidate) {
        match = [candidate.href, candidate.href, candidate.rate] as unknown as RegExpExecArray
      } else {
        console.warn(`No merchant card found for ${merchantName} in search results`)
        return null
      }
    }
    
    const merchantPageUrl = match[1].startsWith('http') ? match[1] : `https://woolsocks.eu${match[1]}`
    const searchResultRate = parseFloat(match[2].replace('%', ''))
    
    // Now fetch the individual merchant page to get accurate cashback rates
    const merchantPageResult = await fetchMerchantPage(merchantPageUrl, merchantName)
    
    if (merchantPageResult) {
      return {
        cashbackRate: merchantPageResult.cashbackRate,
        cashbackUrl: merchantPageUrl,
        categories: merchantPageResult.categories,
        merchantImageUrl: merchantPageResult.merchantImageUrl,
        description: merchantPageResult.description
      }
    }
    
    // Fallback to search result rate if merchant page parsing fails
    if (searchResultRate > 0) {
      return {
        cashbackRate: searchResultRate,
        cashbackUrl: merchantPageUrl
      }
    }
    
    return null
  } catch (error) {
    console.warn('Error parsing cashback search results:', error)
    return null
  }
}

// Fetch and parse individual merchant page
async function fetchMerchantPage(merchantPageUrl: string, merchantName: string): Promise<{ 
  cashbackRate: number,
  categories: Category[],
  merchantImageUrl?: string,
  description?: string
} | null> {
  try {
    const response = await fetch(merchantPageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
      }
    })
    
    if (!response.ok) {
      console.warn(`Failed to fetch merchant page ${merchantPageUrl}: ${response.status}`)
      return null
    }
    
    const html = await response.text()
    return parseMerchantPage(html, merchantName, merchantPageUrl)
  } catch (error) {
    console.warn(`Error fetching merchant page ${merchantPageUrl}:`, error)
    return null
  }
}

// Parse individual merchant page for detailed data
function parseMerchantPage(html: string, _merchantName: string, merchantPageUrl?: string): { 
  cashbackRate: number
  categories: Category[]
  merchantImageUrl?: string
  description?: string
  dealUrl?: string
} | null {
  try {
    const categories: Category[] = []
    let bestRate = 0
    let merchantImageUrl: string | undefined
    let description: string | undefined

    // Extract merchant image - look for merchant logo in sidebar
    const imageMatch = html.match(/<img[^>]*src="([^"]*)"[^>]*alt="[^"]*[A-Za-z]+[^"]*"[^>]*class="[^"]*merchant[^"]*"/i)
    if (imageMatch) {
      merchantImageUrl = imageMatch[1].startsWith('http') ? imageMatch[1] : `https://woolsocks.eu${imageMatch[1]}`
    }

    // Extract description - look for "Over [Merchant]" section
    const descPatterns = [
      /We willen dicht bij[\s\S]*?\./i,
      /In de winkel vind je[\s\S]*?\./i,
      /Over\s+[A-Za-z]+[\s\S]*?<p[^>]*>([^<]+)/i
    ]
    
    for (const pattern of descPatterns) {
      const match = html.match(pattern)
      if (match) {
        description = match[1] ? match[1].trim() : match[0].trim()
        break
      }
    }

    // Parse Autorewards category
    const autorewardsCategory = parseAutorewardsCategory(html)
    if (autorewardsCategory) {
      categories.push(autorewardsCategory)
      if (autorewardsCategory.maxRate && autorewardsCategory.maxRate > bestRate) {
        bestRate = autorewardsCategory.maxRate
      }
    }

    // Parse Vouchers category
    const vouchersCategory = parseVouchersCategory(html)
    if (vouchersCategory) {
      categories.push(vouchersCategory)
      if (vouchersCategory.maxRate && vouchersCategory.maxRate > bestRate) {
        bestRate = vouchersCategory.maxRate
      }
    }

    // Parse Online cashback category
    const onlineCashbackCategory = parseOnlineCashbackCategory(html)
    if (onlineCashbackCategory) {
      categories.push(onlineCashbackCategory)
      if (onlineCashbackCategory.maxRate && onlineCashbackCategory.maxRate > bestRate) {
        bestRate = onlineCashbackCategory.maxRate
      }
    }

    // Fallback: look for the main "Tot X%" rate if no categories found
    if (categories.length === 0) {
      const mainRateMatch = html.match(/Tot\s*(\d+(?:[.,]\d+)?)%/i)
      if (mainRateMatch) {
        bestRate = parseFloat(mainRateMatch[1].replace(',', '.'))
      }
    }

    if (bestRate > 0 || categories.length > 0) {
      return {
        cashbackRate: bestRate,
        categories,
        merchantImageUrl,
        description,
        dealUrl: merchantPageUrl
      }
    }
    
    return null
  } catch (error) {
    console.warn('Error parsing merchant page:', error)
    return null
  }
}

// Parse Autorewards category
function parseAutorewardsCategory(html: string): Category | null {
  try {
    // Look for Autorewards section
    const autorewardsSection = html.match(/Autorewards[\s\S]*?(?=Vouchers|Online cashback|$)/i)
    if (!autorewardsSection) return null

    // Look for DealItem within Autorewards section
    const dealMatch = autorewardsSection[0].match(/<div[^>]*class="[^"]*DealItem[^"]*"[^>]*>[\s\S]*?<\/div>/i)
    if (!dealMatch) return null

    // Extract rate from DealItem
    const rateMatch = dealMatch[0].match(/(\d+(?:[.,]\d+)?)%/)
    if (!rateMatch) return null

    const rate = parseFloat(rateMatch[1].replace(',', '.'))
    
    // Extract description
    const descMatch = dealMatch[0].match(/Bespaar\s+(\d+(?:[.,]\d+)?)%\s+op\s+al\s+je\s+aankopen/i)
    const description = descMatch ? `Bespaar ${descMatch[1]}% op al je aankopen` : 'Bespaar op al je aankopen'

    return {
      name: 'Autorewards',
      deals: [{
        name: 'Autorewards',
        rate,
        description
      }],
      maxRate: rate
    }
  } catch (error) {
    console.warn('Error parsing Autorewards category:', error)
    return null
  }
}

// Parse Vouchers category
function parseVouchersCategory(html: string): Category | null {
  try {
    // Look for "Vouchers | cashback of pay later" section
    const vouchersSection = html.match(/Vouchers\s*\|\s*cashback\s*of\s*pay\s*later[\s\S]*?(?=<h[1-6]|$)/i)
    if (!vouchersSection) return null

    const deals: any[] = []
    let maxRate = 0

    // Extract individual deals from the vouchers section
    // Look for GiftCardDeal links
    const dealMatches = vouchersSection[0].match(/<a[^>]*class="[^"]*GiftCardDeal[^"]*"[^>]*>[\s\S]*?<\/a>/gi)
    if (dealMatches) {
      dealMatches.forEach(dealHtml => {
        // Extract deal name from alt attribute
        const nameMatch = dealHtml.match(/alt="([^"]*)"[^>]*class="[^"]*image[^"]*"/i)
        const dealName = nameMatch ? nameMatch[1].replace(/\s+image$/, '') : 'Gift Card'
        
        // Extract rate from GiftCardDeal_amount__ogp1u span
        const rateMatch = dealHtml.match(/<span[^>]*class="[^"]*GiftCardDeal_amount[^"]*"[^>]*>(\d+(?:\.\d+)?)%<\/span>/i)
        if (rateMatch) {
          const rate = parseFloat(rateMatch[1])
          if (rate > maxRate) maxRate = rate
          
          // Extract image URL
          const imageMatch = dealHtml.match(/src="([^"]*)"/)
          const imageUrl = imageMatch ? imageMatch[1] : undefined
          
          deals.push({
            name: dealName,
            rate,
            description: 'Cadeaukaart',
            imageUrl
          })
        }
      })
    }

    if (deals.length === 0) return null

    return {
      name: 'Vouchers',
      deals,
      maxRate
    }
  } catch (error) {
    console.warn('Error parsing Vouchers category:', error)
    return null
  }
}

// Parse Online cashback category
function parseOnlineCashbackCategory(html: string): Category | null {
  try {
    // Look for Online cashback section
    const onlineSection = html.match(/Online cashback[\s\S]*?(?=Over\s+[A-Za-z]+|$)/i)
    if (!onlineSection) return null

    const deals: any[] = []
    let maxRate = 0

    // Look for individual DealItems in online cashback section
    const dealMatches = onlineSection[0].match(/<div[^>]*class="[^"]*DealItem[^"]*"[^>]*>[\s\S]*?<\/div>/gi)
    if (dealMatches) {
      dealMatches.forEach(dealHtml => {
        // Extract deal name
        const nameMatch = dealHtml.match(/<span[^>]*class="[^"]*DealItem_title[^"]*"[^>]*>([^<]+)</i)
        const dealName = nameMatch ? nameMatch[1].trim() : 'Online aankoop'
        
        // Extract rate
        const rateMatch = dealHtml.match(/(\d+(?:[.,]\d+)?)%/)
        if (rateMatch) {
          const rate = parseFloat(rateMatch[1].replace(',', '.'))
          if (rate > maxRate) maxRate = rate
          
          deals.push({
            name: dealName,
            rate,
            description: 'Online purchase'
          })
        }
      })
    }

    if (deals.length === 0) return null

    return {
      name: 'Online cashback',
      deals,
      maxRate
    }
  } catch (error) {
    console.warn('Error parsing Online cashback category:', error)
    return null
  }
}


// Parse voucher search results
function parseVoucherSearchResults(html: string, merchantName: string): { 
  voucherAvailable: boolean, 
  voucherUrl: string,
  voucherImageUrl?: string,
  voucherName?: string,
  voucherCashbackRate?: number,
  allVouchers?: Array<{
    url: string,
    imageUrl?: string,
    name?: string,
    cashbackRate?: number
  }>
} | null {
  try {
    // Look for specific voucher product URLs in the format:
    // /nl/giftcards-shop/products/{product-id}/checkout?amount={amount}
    const productUrlPattern = new RegExp(
      `href="(/nl/giftcards-shop/products/[a-f0-9-]+/checkout\\?amount=\\d+)"[^>]*>[^<]*${merchantName}[^<]*`,
      'gi'
    )
    
    const productMatch = productUrlPattern.exec(html)
    if (productMatch) {
      const productUrl = `https://woolsocks.eu${productMatch[1]}`
      return {
        voucherAvailable: true,
        voucherUrl: productUrl
      }
    }
    
    // Look for voucher product page URLs (without checkout) - more flexible pattern
    const productPagePattern = new RegExp(
      `href="(/nl/giftcards-shop/products/[a-f0-9-]+)"[^>]*>[^<]*${merchantName}[^<]*`,
      'gi'
    )
    
    const productPageMatch = productPagePattern.exec(html)
    if (productPageMatch) {
      const productPageUrl = `https://woolsocks.eu${productPageMatch[1]}`
      return {
        voucherAvailable: true,
        voucherUrl: productPageUrl
      }
    }
    
    // More flexible approach: find all product URLs and check if merchant name appears nearby
    const allProductUrls = html.match(/href="(\/nl\/giftcards-shop\/products\/[a-f0-9-]+)"/g)
    if (allProductUrls) {
      // Filter out autorewards and coin-related URLs
      const filteredProductUrls = allProductUrls.filter(url => {
        const urlIndex = html.indexOf(url)
        const contextStart = Math.max(0, urlIndex - 500)
        const contextEnd = Math.min(html.length, urlIndex + 500)
        const context = html.substring(contextStart, contextEnd).toLowerCase()
        
        // Skip if context contains autorewards or coin-related terms
        return !context.includes('coin') && 
               !context.includes('autorewards') && 
               !context.includes('bespaar') && 
               !context.includes('op al je aankopen')
      })
      
      if (filteredProductUrls.length === 0) {
        console.log('All product URLs filtered out due to autorewards/coin content')
        return null
      }
      // Define merchant variations once
      const merchantVariations = [
        merchantName.toLowerCase(),
        merchantName.toLowerCase().replace(/[^a-z0-9]/g, ''), // Remove special chars
        merchantName.toLowerCase().replace(/\s+/g, ''), // Remove spaces
        merchantName.toLowerCase().replace(/&/g, 'and'), // Replace & with and
        merchantName.toLowerCase().replace(/&/g, ''), // Remove &
      ]
      
      // Add common variations for specific merchants
      if (merchantName.toLowerCase().includes('ikea')) {
        merchantVariations.push('ikea', 'ikea nederland')
      }
      if (merchantName.toLowerCase().includes('zalando')) {
        merchantVariations.push('zalando')
      }
      if (merchantName.toLowerCase().includes('hema')) {
        merchantVariations.push('hema')
      }
      if (merchantName.toLowerCase().includes('mediamarkt')) {
        merchantVariations.push('mediamarkt', 'media markt')
      }
      if (merchantName.toLowerCase().includes('gall')) {
        merchantVariations.push('gall', 'gall gall', 'gall&gall')
      }
      if (merchantName.toLowerCase().includes('vtwonen')) {
        merchantVariations.push('vtwonen', 'vt wonen')
      }
      
      // First try to find a product URL with merchant name in context
      for (const urlMatch of filteredProductUrls) {
        const urlMatchResult = urlMatch.match(/href="(\/nl\/giftcards-shop\/products\/[a-f0-9-]+)"/)
        if (!urlMatchResult) continue
        
        const url = urlMatchResult[1]
        const urlIndex = html.indexOf(urlMatch)
        
        // Check if merchant name appears within 2000 characters before or after this URL
        const contextStart = Math.max(0, urlIndex - 2000)
        const contextEnd = Math.min(html.length, urlIndex + 2000)
        const context = html.substring(contextStart, contextEnd)
        
        const foundMerchant = merchantVariations.some(variation => 
          context.toLowerCase().includes(variation)
        )
        
        if (foundMerchant) {
          const productPageUrl = `https://woolsocks.eu${url}`
          
          // Extract image, name, cashback from context
          const imageMatch = context.match(/src="([^"]*\.(?:jpg|jpeg|png|gif|webp|svg)[^"]*)"/i)
          const imageUrl = imageMatch ? imageMatch[1] : undefined
          
          const nameMatch = context.match(/<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</i) || 
                           context.match(/<[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)</i) ||
                           context.match(/alt="([^"]+)"/i)
          const voucherName = nameMatch ? nameMatch[1].trim() : undefined
          
          const cashbackMatch = context.match(/(\d+(?:[.,]\d+)?)%/)
          const cashbackRate = cashbackMatch ? parseFloat(cashbackMatch[1].replace(',', '.')) : undefined
          
          return {
            voucherAvailable: true,
            voucherUrl: productPageUrl,
            voucherImageUrl: imageUrl,
            voucherName: voucherName,
            voucherCashbackRate: cashbackRate,
            allVouchers: [{ url: productPageUrl, imageUrl, name: voucherName, cashbackRate }]
          }
        }
      }
      
      // Only use fallback if we can confirm the merchant has vouchers available
      // AND the merchant name appears in the context of at least one product URL
      // This prevents returning wrong vouchers (e.g., Etos voucher for MediaMarkt)
      const merchantInResults = merchantVariations.some(variation => 
        html.toLowerCase().includes(variation)
      )
      
      if (merchantInResults && filteredProductUrls.length > 0) {
        // Check if merchant appears in context of any product URL
        let merchantInAnyContext = false
        for (const urlMatch of filteredProductUrls) {
          const urlMatchResult = urlMatch.match(/href="(\/nl\/giftcards-shop\/products\/[a-f0-9-]+)"/)
          if (!urlMatchResult) continue
          
          const urlIndex = html.indexOf(urlMatch)
          const contextStart = Math.max(0, urlIndex - 2000)
          const contextEnd = Math.min(html.length, urlIndex + 2000)
          const context = html.substring(contextStart, contextEnd)
          
          const foundInContext = merchantVariations.some(variation => 
            context.toLowerCase().includes(variation)
          )
          
          if (foundInContext) {
            merchantInAnyContext = true
            break
          }
        }
        
        // Only use fallback if merchant appears in context of at least one product
        if (merchantInAnyContext) {
          const firstUrlMatch = filteredProductUrls[0].match(/href="(\/nl\/giftcards-shop\/products\/[a-f0-9-]+)"/)
          if (firstUrlMatch) {
            const firstUrl = firstUrlMatch[1]
            const productPageUrl = `https://woolsocks.eu${firstUrl}`
            
            // Extract details from the first URL context
            const firstUrlIndex = html.indexOf(allProductUrls[0])
            const contextStart = Math.max(0, firstUrlIndex - 2000)
            const contextEnd = Math.min(html.length, firstUrlIndex + 2000)
            const context = html.substring(contextStart, contextEnd)
            
            const imageMatch = context.match(/src="([^"]*\.(?:jpg|jpeg|png|gif|webp|svg)[^"]*)"/i)
            const imageUrl = imageMatch ? imageMatch[1] : undefined
            
            const nameMatch = context.match(/<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</i) || 
                             context.match(/<[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)</i) ||
                             context.match(/alt="([^"]+)"/i)
            const voucherName = nameMatch ? nameMatch[1].trim() : undefined
            
            const cashbackMatch = context.match(/(\d+(?:[.,]\d+)?)%/)
            const cashbackRate = cashbackMatch ? parseFloat(cashbackMatch[1].replace(',', '.')) : undefined
            
            return {
              voucherAvailable: true,
              voucherUrl: productPageUrl,
              voucherImageUrl: imageUrl,
              voucherName: voucherName,
              voucherCashbackRate: cashbackRate,
              allVouchers: [{ url: productPageUrl, imageUrl, name: voucherName, cashbackRate }]
            }
          }
        }
      }
    }
    
    // For cashback search results, look for voucher links in the merchant cards
    if (html.includes('cashback/search')) {
      console.log('Processing cashback search results for voucher links')
      
      // Look for merchant cards that might contain voucher links
      const merchantCardPattern = new RegExp(
        `(${merchantName}[^<]*voucher[^<]*|voucher[^<]*${merchantName}[^<]*)`,
        'gi'
      )
      
      const merchantCardMatch = merchantCardPattern.exec(html)
      if (merchantCardMatch) {
        console.log(`Found merchant card match: ${merchantCardMatch[0]}`)
        
        // Look for voucher links in the context around this match
        const matchIndex = html.indexOf(merchantCardMatch[0])
        const contextStart = Math.max(0, matchIndex - 2000)
        const contextEnd = Math.min(html.length, matchIndex + 2000)
        const context = html.substring(contextStart, contextEnd)
        
        // Look for voucher product URLs in this context
        const voucherUrlMatch = context.match(/href="(\/nl\/giftcards-shop\/products\/[a-f0-9-]+)"/)
        if (voucherUrlMatch) {
          const voucherUrl = `https://woolsocks.eu${voucherUrlMatch[1]}`
          console.log(`Found voucher URL in cashback search: ${voucherUrl}`)
          return {
            voucherAvailable: true,
            voucherUrl: voucherUrl
          }
        }
      }
      
      // Also check if merchant appears in search results and has voucher mentions
      const merchantInResults = merchantName.toLowerCase().split(' ').some(word => 
        html.toLowerCase().includes(word)
      )
      
      if (merchantInResults) {
        // Look for any voucher-related content
        const voucherMentions = html.match(/voucher|cadeau|gift[^<]*card/gi)
        if (voucherMentions && voucherMentions.length > 0) {
          console.log(`Found ${voucherMentions.length} voucher mentions in cashback search`)
          
          // Look for voucher product URLs anywhere in the results
          const allVoucherUrls = html.match(/href="(\/nl\/giftcards-shop\/products\/[a-f0-9-]+)"/g)
          if (allVoucherUrls && allVoucherUrls.length > 0) {
            // Only use voucher URL if merchant appears in context of at least one voucher URL
            let merchantInVoucherContext = false
            for (const urlMatch of allVoucherUrls) {
              const urlMatchResult = urlMatch.match(/href="(\/nl\/giftcards-shop\/products\/[a-f0-9-]+)"/)
              if (!urlMatchResult) continue
              
              const urlIndex = html.indexOf(urlMatch)
              const contextStart = Math.max(0, urlIndex - 2000)
              const contextEnd = Math.min(html.length, urlIndex + 2000)
              const context = html.substring(contextStart, contextEnd)
              
              const merchantVariations = [
                merchantName.toLowerCase(),
                merchantName.toLowerCase().replace(/[^a-z0-9]/g, ''),
                merchantName.toLowerCase().replace(/\s+/g, ''),
                merchantName.toLowerCase().replace(/&/g, 'and'),
                merchantName.toLowerCase().replace(/&/g, '')
              ]
              
              const foundInContext = merchantVariations.some(variation => 
                context.toLowerCase().includes(variation)
              )
              
              if (foundInContext) {
                merchantInVoucherContext = true
                break
              }
            }
            
            // Only return voucher if merchant appears in context of voucher URLs
            if (merchantInVoucherContext) {
              const firstVoucherMatch = allVoucherUrls[0].match(/href="(\/nl\/giftcards-shop\/products\/[a-f0-9-]+)"/)
              if (firstVoucherMatch) {
                const voucherUrl = `https://woolsocks.eu${firstVoucherMatch[1]}`
                console.log(`Using first voucher URL from cashback search: ${voucherUrl}`)
                return {
                  voucherAvailable: true,
                  voucherUrl: voucherUrl
                }
              }
            } else {
              console.log(`Merchant ${merchantName} found in cashback search but not in context of voucher URLs`)
            }
          }
        }
      }
    }
    
    // Look for voucher availability patterns
    const voucherPatterns = [
      // Look for merchant name in voucher context
      new RegExp(`${merchantName}[^<]*voucher`, 'gi'),
      new RegExp(`${merchantName}[^<]*gift`, 'gi'),
      new RegExp(`${merchantName}[^<]*cadeau`, 'gi'),
      // Look for voucher-specific indicators
      new RegExp(`voucher[^<]*${merchantName}`, 'gi'),
      new RegExp(`gift[^<]*${merchantName}`, 'gi')
    ]
    
    let voucherFound = false
    let voucherUrl = ''
    
    voucherPatterns.forEach(pattern => {
      if (pattern.test(html)) {
        voucherFound = true
      }
    })
    
    // Look for voucher-specific links
    const linkPattern = new RegExp(`<a[^>]*href="([^"]*)"[^>]*>.*?${merchantName}.*?(?:voucher|gift|cadeau)`, 'gi')
    const linkMatch = linkPattern.exec(html)
    if (linkMatch) {
      voucherUrl = linkMatch[1].startsWith('http') ? linkMatch[1] : `https://woolsocks.eu${linkMatch[1]}`
    }
    
    if (voucherFound) {
      return {
        voucherAvailable: true,
        voucherUrl: voucherUrl || `https://woolsocks.eu/nl/giftcards-shop?search=${encodeURIComponent(merchantName)}`
      }
    }
    
    return null
  } catch (error) {
    console.warn('Error parsing voucher search results:', error)
    return null
  }
}


// Extract domain from merchant name
function extractDomainFromName(name: string): string {
  // Convert name to domain-like format
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .replace(/^(the|de|het|le|la|el|il)\s*/, '') // Remove common prefixes
}


// Get cached merchant result
async function getCachedMerchant(merchantName: string): Promise<PartnerLite | null> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY)
    const cache: MerchantCache = result[CACHE_KEY] || {}
    const merchantCache = cache[merchantName]
    
    if (merchantCache && (Date.now() - merchantCache.searchedAt < merchantCache.ttl)) {
      return merchantCache.result
    }
    
    return null
  } catch (error) {
    console.warn('Failed to get cached merchant:', error)
    return null
  }
}

// Cache merchant result
async function cacheMerchantResult(merchantName: string, result: PartnerLite | null): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(CACHE_KEY)
    const cache: MerchantCache = stored[CACHE_KEY] || {}
    
    cache[merchantName] = {
      result,
      searchedAt: Date.now(),
      ttl: DEFAULT_TTL
    }
    
    await chrome.storage.local.set({ [CACHE_KEY]: cache })
  } catch (error) {
    console.warn('Failed to cache merchant result:', error)
  }
}


// Search for a specific merchant's deals (on-demand)
export async function searchMerchant(merchantName: string): Promise<PartnerLite | null> {
  console.log(`[DEBUG] searchMerchant called with: ${merchantName}`)
  
  // Check cache first
  const cached = await getCachedMerchant(merchantName)
  if (cached) {
    console.log(`[DEBUG] Using cached data for ${merchantName}:`, cached)
    return cached
  }
  
  console.log(`[DEBUG] No cached data found, scraping for ${merchantName}`)
  
  try {
    const searchResult = await searchMerchantDeals(merchantName)
    if (!searchResult) {
      // Cache negative result to avoid repeated searches
      await cacheMerchantResult(merchantName, null)
      return null
    }
    
    const result: PartnerLite = {
      domain: extractDomainFromName(searchResult.merchant),
      name: searchResult.merchant,
      cashbackRate: searchResult.cashbackRate || 0,
      voucherAvailable: searchResult.voucherAvailable,
      dealUrl: searchResult.cashbackUrl,
      voucherProductUrl: searchResult.voucherUrl,
      // Enhanced data
      categories: searchResult.categories,
      merchantImageUrl: searchResult.merchantImageUrl,
      description: searchResult.description,
      // Voucher data
      allVouchers: searchResult.allVouchers
    }
    
    console.log(`[DEBUG] Created result for ${merchantName}:`, result)
    
    // Cache the result
    await cacheMerchantResult(merchantName, result)
    console.log(`[DEBUG] Cached result for ${merchantName}`)
    return result
  } catch (error) {
    console.warn(`Failed to search merchant ${merchantName}:`, error)
    return null
  }
}

// Get partner by hostname using on-demand search
export async function getPartnerByHostname(hostname: string): Promise<PartnerLite | null> {
  console.log(`[DEBUG] getPartnerByHostname called with: ${hostname}`)
  
  // Extract merchant name from hostname
  const merchantName = extractMerchantNameFromHostname(hostname)
  console.log(`[DEBUG] Extracted merchant name: ${merchantName}`)
  
  if (!merchantName) {
    console.log(`[DEBUG] No merchant name extracted, returning null`)
    return null
  }
  
  // Search for this specific merchant
  const result = await searchMerchant(merchantName)
  console.log(`[DEBUG] searchMerchant result:`, result)
  return result
}

// Extract merchant name from hostname
function extractMerchantNameFromHostname(hostname: string): string | null {
  // Remove common TLDs and subdomains
  const cleanHostname = hostname
    .replace(/^www\./, '')
    .replace(/\.(com|nl|de|be|fr|uk|co\.uk)$/, '')
    .replace(/\.(net|org|eu)$/, '')
  
  // Map common hostnames to merchant names
  const hostnameMap: Record<string, string> = {
    'amazon': 'Amazon',
    'zalando': 'Zalando',
    'bol': 'Bol.com',
    'coolblue': 'Coolblue',
    'wehkamp': 'Wehkamp',
    'mediamarkt': 'MediaMarkt',
    'hunkemoller': 'Hunkemöller',
    'ikea': 'IKEA',
    'action': 'Action',
    'hema': 'HEMA',
    'nike': 'Nike',
    'adidas': 'Adidas',
    'asos': 'ASOS',
    'aboutyou': 'About You',
    'shein': 'Shein',
    'intertoys': 'Intertoys'
  }
  
  return hostnameMap[cleanHostname] || cleanHostname
}

// Get all cached partners (for options page)
export async function getAllPartners(): Promise<{ partners: PartnerLite[], lastUpdated: Date }> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY)
    const cache: MerchantCache = result[CACHE_KEY] || {}
    
    const partners = Object.values(cache)
      .filter(item => item.result !== null)
      .map(item => item.result!)
    
    const lastSearched = Math.max(...Object.values(cache).map(item => item.searchedAt), 0)
    
    return {
      partners,
      lastUpdated: new Date(lastSearched)
    }
  } catch (error) {
    console.warn('Failed to get cached partners:', error)
    return {
      partners: [],
      lastUpdated: new Date()
    }
  }
}

// Clear cache (for refresh functionality)
export async function refreshDeals(): Promise<PartnerLite[]> {
  try {
    await chrome.storage.local.remove(CACHE_KEY)
  } catch (error) {
    console.warn('Failed to clear cache:', error)
  }
  
  return []
}

// Initialize scraper (no longer needed for bulk operations)
export async function initializeScraper(): Promise<void> {
  // No initialization needed for on-demand search
  console.log('On-demand scraper initialized')
}

// Scraper cache cleanup throttling constants
const LAST_SCRAPER_CLEANUP_KEY = '__ws_last_scraper_cleanup_timestamp'
const SCRAPER_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

// Set up event-driven cache cleanup (replaces alarm-based cleanup)
export function setupScrapingSchedule(): void {
  // No longer needed - cleanup is handled by event-driven triggers in background/index.ts
  console.log('Scraper schedule setup (event-driven cleanup enabled)')
}

/**
 * Check if scraper cache cleanup is needed and run it if so
 * Throttles cleanup to run at most once per 24 hours
 */
export async function cleanupScraperCacheIfNeeded(): Promise<number> {
  const stored = await chrome.storage.local.get(LAST_SCRAPER_CLEANUP_KEY)
  const lastCleanup = stored[LAST_SCRAPER_CLEANUP_KEY] || 0
  const now = Date.now()
  
  if (now - lastCleanup < SCRAPER_CLEANUP_INTERVAL) {
    return 0 // Skip cleanup
  }
  
  const removed = await cleanupOldCacheEntries()
  await chrome.storage.local.set({ [LAST_SCRAPER_CLEANUP_KEY]: now })
  
  if (removed > 0) {
    console.log(`[Scraper] Cleanup removed ${removed} old cache entries`)
  }
  
  return removed
}

// Clean up old cache entries
async function cleanupOldCacheEntries(): Promise<number> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY)
    const cache: MerchantCache = result[CACHE_KEY] || {}
    const now = Date.now()
    
    // Remove entries older than 7 days
    const cleanedCache: MerchantCache = {}
    for (const [merchantName, entry] of Object.entries(cache)) {
      if (now - entry.searchedAt < 7 * 24 * 60 * 60 * 1000) {
        cleanedCache[merchantName] = entry
      }
    }
    
    const removed = Object.keys(cache).length - Object.keys(cleanedCache).length
    await chrome.storage.local.set({ [CACHE_KEY]: cleanedCache })
    console.log(`Cache cleanup completed. Removed ${removed} old entries.`)
    return removed
  } catch (error) {
    console.warn('Failed to cleanup cache:', error)
    return 0
  }
}
