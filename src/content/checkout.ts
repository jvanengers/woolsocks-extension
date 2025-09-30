// Content script for checkout detection and price parsing
import type { CheckoutInfo } from '../shared/types'

// Merchant support check (non-blocking)
let __wsSupportChecked = false

function requestMerchantSupportCheck() {
  try {
    chrome.runtime.sendMessage(
      { type: 'CHECK_MERCHANT_SUPPORT', hostname: window.location.hostname },
      () => { __wsSupportChecked = true }
    )
  } catch {}
}

// Track temporary dismissals for voucher prompt per hostname (shared via localStorage)
function isVoucherDismissed(hostname: string): boolean {
  try {
    const raw = window.localStorage.getItem('__wsVoucherDismissals')
    if (!raw) return false
    const map = JSON.parse(raw) as Record<string, number>
    const until = map && typeof map[hostname] === 'number' ? map[hostname] : 0
    return Date.now() < until
  } catch {
    // Fallback: check a DOM attribute if storage isn't accessible
    try {
      const untilAttr = document.documentElement.getAttribute('data-ws-voucher-dismissed-until')
      const until = untilAttr ? parseInt(untilAttr, 10) : 0
      return Date.now() < until
    } catch {
      return false
    }
  }
}

interface CheckoutDetector {
  isCheckoutPage: () => boolean
  extractTotal: () => number | null
  getCurrency: () => string
}

// Retry state for delayed amount availability
let __wsLastSentTotal: number | null = null
let __wsRetryTimeoutId: number | null = null
let __wsRetryAttempts = 0
const __wsMaxRetryAttempts = 10

function __wsClearRetry() {
  if (__wsRetryTimeoutId) {
    clearTimeout(__wsRetryTimeoutId)
    __wsRetryTimeoutId = null
  }
  __wsRetryAttempts = 0
}

function __wsScheduleRetry(trigger: () => void) {
  if (__wsRetryAttempts >= __wsMaxRetryAttempts) return
  const base = 500
  const delay = Math.min(base * Math.pow(2, __wsRetryAttempts), 8000)
  __wsRetryAttempts += 1
  if (__wsRetryTimeoutId) clearTimeout(__wsRetryTimeoutId)
  __wsRetryTimeoutId = window.setTimeout(() => {
    trigger()
  }, delay)
}

// Amazon checkout detection
const amazonDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/gp/cart') || 
           url.includes('/checkout') ||
           url.includes('/cart') ||
           document.querySelector('[data-testid="order-summary"]') !== null
  },
  extractTotal: () => {
    // Try multiple selectors for Amazon total
    const selectors = [
      '[data-testid="order-summary"] [data-testid="total-price"]',
      '.a-size-medium.a-color-base.sc-price',
      '#orderSummary .a-color-price',
      '.sc-price'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/[\d,]+\.?\d*/)
        if (match) {
          return parseFloat(match[0].replace(',', ''))
        }
      }
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Airbnb checkout detection
const airbnbDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const hostname = window.location.hostname.toLowerCase()
    const url = window.location.href.toLowerCase()
    if (!hostname.includes('airbnb')) return false
    // Detect booking/payment flows
    return url.includes('/book/') || url.includes('/checkout') || url.includes('/payments') || url.includes('/confirm')
  },
  extractTotal: () => {
    // Attempt to find a Euro total; Airbnb markup varies heavily
    const selectors = [
      '[data-testid*="total"]',
      '[class*="total"]',
      '[class*="price"]',
      '[data-testid*="price"]'
    ]
    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel)
      for (const n of Array.from(nodes)) {
        const t = n.textContent || ''
        const m = t.match(/€\s*([\d.,]+)/)
        if (m) {
          return parseFloat(m[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Zalando checkout detection
const zalandoDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/cart') ||
           url.includes('/checkout/confirm') ||
           url.includes('/checkout/payment') ||
           document.querySelector('[data-testid="checkout-summary"]') !== null
  },
  extractTotal: () => {
    const selectors = [
      '[data-testid="checkout-summary"] [data-testid="total-price"]',
      '.checkout-summary__total .price',
      '.total-price'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/[\d,]+\.?\d*/)
        if (match) {
          return parseFloat(match[0].replace(',', ''))
        }
      }
    }
    // Fallback: search the whole page text for a Euro amount near total keywords (NL/EN/DE)
    const bodyText = document.body.textContent || ''
    const euroMatch = bodyText.match(/(?:totaal|sum|total|gesamt|bedrag)[^\n€]*€\s*([\d.,]+)/i)
    if (euroMatch) {
      return parseFloat(euroMatch[1].replace('.', '').replace(',', '.'))
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Bol.com checkout detection
const bolDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/checkout') ||
           url.includes('/cart') ||
           document.querySelector('.checkout-summary') !== null
  },
  extractTotal: () => {
    const selectors = [
      '.checkout-summary .total-price',
      '.order-summary .price',
      '[data-testid="total-price"]'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/[\d,]+\.?\d*/)
        if (match) {
          return parseFloat(match[0].replace(',', ''))
        }
      }
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Generic fallback detector - works on any website with improved false positive filtering
const genericDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const hostname = window.location.hostname.toLowerCase()
    const url = window.location.href.toLowerCase()
    const pathname = window.location.pathname.toLowerCase()
    const bodyText = document.body.textContent?.toLowerCase() || ''
    
    // Exclude known non-e-commerce domains to reduce false positives
    const nonEcommerceDomains = [
      'wikipedia.org', 'github.com', 'stackoverflow.com', 'reddit.com',
      'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
      'linkedin.com', 'tiktok.com', 'snapchat.com', 'pinterest.com',
      'bbc.com', 'cnn.com', 'nu.nl', 'telegraaf.nl', 'ad.nl',
      'coursera.org', 'edx.org', 'khanacademy.org', 'udemy.com',
      'rijksoverheid.nl', 'belastingdienst.nl', 'digid.nl', 'overheid.nl',
      'google.com', 'microsoft.com', 'apple.com/support', 'developer.',
      '.gov', '.edu', '.org/wiki', 'news.', 'blog.', 'help.', 'support.'
    ]
    
    const isNonEcommerce = nonEcommerceDomains.some(domain => 
      hostname.includes(domain) || url.includes(domain)
    )
    
    if (isNonEcommerce) return false
    
    // URL-based detection (primary signal)
    const urlKeywords = [
      'checkout', 'cart', 'basket', 'bag', 'order', 'payment', 'betalen', 
      'kassa', 'winkelmand', 'winkelwagen', 'bestellen', 'afrekenen',
      'shopping-cart', 'shoppingcart', 'checkout/cart', 'order/delivery'
    ]
    
    const hasCheckoutUrl = urlKeywords.some(keyword => 
      pathname.includes(keyword)
    )
    
    // If URL clearly indicates checkout, that's sufficient
    if (hasCheckoutUrl) return true
    
    // For other cases, require multiple signals to avoid false positives
    let signalCount = 0
    
    // DOM-based detection
    const checkoutSelectors = [
      '[class*="checkout"]', '[class*="cart"]', '[class*="basket"]', 
      '[class*="order"]', '[class*="payment"]', '[class*="kassa"]',
      '[class*="winkelmand"]', '[class*="winkelwagen"]', '[class*="bestellen"]',
      '[id*="checkout"]', '[id*="cart"]', '[id*="basket"]', '[id*="order"]',
      '[data-testid*="checkout"]', '[data-testid*="cart"]', '[data-testid*="order"]'
    ]
    
    if (checkoutSelectors.some(selector => document.querySelector(selector) !== null)) {
      signalCount++
    }
    
    // E-commerce specific text patterns
    const ecommercePatterns = [
      'proceed to checkout', 'place order', 'order summary', 'order total',
      'payment method', 'shipping address', 'billing address', 'add to cart',
      'shopping cart', 'shopping bag', 'item total', 'subtotal', 'grand total'
    ]
    
    if (ecommercePatterns.some(pattern => bodyText.includes(pattern))) {
      signalCount++
    }
    
    // Form-based detection
    if (document.querySelector('form[action*="checkout"], form[action*="order"], form[action*="payment"]') !== null) {
      signalCount++
    }
    
    // Button-based detection with e-commerce context
    const checkoutButtons = document.querySelectorAll('button, input[type="submit"], a')
    const hasEcommerceButton = Array.from(checkoutButtons).some(button => {
      const text = button.textContent?.toLowerCase() || ''
      const value = (button as HTMLInputElement).value?.toLowerCase() || ''
      return ['proceed to checkout', 'place order', 'complete purchase', 'pay now', 'buy now'].some(phrase =>
        text.includes(phrase) || value.includes(phrase)
      )
    })
    
    if (hasEcommerceButton) {
      signalCount++
    }
    
    // Price indicators
    const hasPriceElements = document.querySelectorAll('[class*="price"], [class*="total"], [class*="amount"]').length > 2
    if (hasPriceElements) {
      signalCount++
    }
    
    // Require at least 2 signals for detection (more conservative)
    return signalCount >= 2
  },
  extractTotal: () => {
    // Try multiple strategies to find the total amount
    
    // Strategy 1: Look for specific total selectors
    const totalSelectors = [
      '[class*="total"]', '[class*="sum"]', '[class*="amount"]', '[class*="price"]',
      '[id*="total"]', '[id*="sum"]', '[id*="amount"]', '[id*="price"]',
      '[data-testid*="total"]', '[data-testid*="sum"]', '[data-testid*="amount"]',
      '.checkout-summary', '.order-summary', '.cart-summary', '.basket-summary',
      '.payment-summary', '.order-total', '.cart-total', '.basket-total'
    ]
    
    for (const selector of totalSelectors) {
      const elements = document.querySelectorAll(selector)
      for (const element of elements) {
        const text = element.textContent || ''
        const match = text.match(/€\s*([\d.,]+)/)
        if (match) {
          return parseFloat(match[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    
    // Strategy 2: Look for price patterns in the entire document
    const pricePatterns = [
      /(?:total|totaal|bedrag|amount|sum)[\s:]*€?\s*([\d.,]+)/i,
      /€\s*([\d.,]+)\s*(?:total|totaal|bedrag|amount|sum)/i,
      /(?:order\s+total|cart\s+total|basket\s+total)[\s:]*€?\s*([\d.,]+)/i,
      /(?:checkout\s+total|payment\s+total)[\s:]*€?\s*([\d.,]+)/i
    ]
    
    for (const pattern of pricePatterns) {
      const match = document.body.textContent?.match(pattern)
      if (match) {
        return parseFloat(match[1].replace('.', '').replace(',', '.'))
      }
    }
    
    // Strategy 3: Look for the largest Euro amount (likely the total)
    const euroMatches = document.body.textContent?.match(/€\s*([\d.,]+)/g) || []
    if (euroMatches.length > 0) {
      const amounts = euroMatches.map(match => {
        const amount = match.replace('€', '').trim()
        return parseFloat(amount.replace('.', '').replace(',', '.'))
      }).filter(amount => !isNaN(amount) && amount > 0)
      
      if (amounts.length > 0) {
        // Return the largest amount (likely the total)
        return Math.max(...amounts)
      }
    }
    
    return null
  },
  getCurrency: () => 'EUR'
}

// Nike checkout detection
const nikeDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/cart') || 
           url.includes('/checkout') ||
           document.querySelector('.checkout-summary') !== null
  },
  extractTotal: () => {
    const selectors = [
      '.checkout-summary .total-price',
      '.order-summary .price',
      '[data-testid="total-price"]'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/[\d,]+\.?\d*/)
        if (match) {
          return parseFloat(match[0].replace(',', ''))
        }
      }
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Coolblue checkout detection
const coolblueDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/cart') || 
           url.includes('/checkout') ||
           document.querySelector('.checkout-summary') !== null
  },
  extractTotal: () => {
    const selectors = [
      '.checkout-summary .total-price',
      '.order-summary .price',
      '[data-testid="total-price"]'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/[\d,]+\.?\d*/)
        if (match) {
          return parseFloat(match[0].replace(',', ''))
        }
      }
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// MediaMarkt checkout detection (NL)
const mediamarktDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    
    // Only check for actual checkout URLs
    const isCheckoutURL = url.includes('/checkout') || url.includes('/checkout/payment') || url.includes('/cart')
    
    // Strong signals for the payment step and summary present
    const hasPaymentRoot = !!document.querySelector('[data-test="checkout-payment-page"]')
    const hasSummary = !!document.querySelector('#totalPriceWrapper, [data-test="checkout-total"], h3.sc-94eb08bc-0.gZiaJK')
    
    // Only return true if we have strong checkout indicators
    return isCheckoutURL && (hasPaymentRoot || hasSummary)
  },
  extractTotal: () => {
    // First try exact selectors from the page you shared
    const exactSelectors = [
      '#totalPriceWrapper [data-test="checkout-total"] span',
      '[data-test="checkout-total"] span',
      '#totalPriceWrapper span',
    ]
    for (const sel of exactSelectors) {
      const el = document.querySelector(sel)
      if (el && el.textContent) {
        const match = el.textContent.match(/€\s*([\d.,]+)/)
        if (match) return parseFloat(match[1].replace('.', '').replace(',', '.'))
      }
    }

    // Then scan likely containers
    const containers = Array.from(document.querySelectorAll('aside, [class*="summary"], [class*="Samenvatting"], [class*="basket"], [class*="order"], [class*="checkout"]'))
    for (const c of containers) {
      const text = c.textContent || ''
      if (/(totaal|samenvatting|total)/i.test(text)) {
        const match = text.match(/€\s*([\d.,]+)/)
        if (match) {
          return parseFloat(match[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    // Only search in checkout-related containers to avoid homepage false positives
    const checkoutContainers = document.querySelectorAll('[class*="checkout"], [class*="cart"], [class*="order"], [class*="payment"], #totalPriceWrapper')
    for (const container of checkoutContainers) {
      const text = container.textContent || ''
      const euroMatch = text.match(/(?:totaal|total)[^\n€]*€\s*([\d.,]+)/i)
      if (euroMatch) {
        return parseFloat(euroMatch[1].replace('.', '').replace(',', '.'))
      }
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// IKEA checkout detection
const ikeaDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/shoppingcart') || 
           url.includes('/order/delivery') ||
           url.includes('/checkout') ||
           document.querySelector('[data-testid="checkout"]') !== null
  },
  extractTotal: () => {
    const selectors = [
      '[data-testid="checkout-total"]',
      '.checkout-summary .total',
      '.order-summary .total',
      '[class*="total"] [class*="price"]'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/€\s*([\d.,]+)/)
        if (match) {
          return parseFloat(match[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    
    // Fallback: search for total patterns
    const bodyText = document.body.textContent || ''
    const totalMatch = bodyText.match(/(?:totaal|total)[^\n€]*€\s*([\d.,]+)/i)
    if (totalMatch) {
      return parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// HEMA checkout detection
const hemaDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/cart') || 
           url.includes('/checkout') ||
           document.querySelector('[class*="cart"]') !== null
  },
  extractTotal: () => {
    const selectors = [
      '[class*="total"] [class*="price"]',
      '[class*="cart"] [class*="total"]',
      '.checkout-summary .total'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/€\s*([\d.,]+)/)
        if (match) {
          return parseFloat(match[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    
    // Fallback: search for total patterns
    const bodyText = document.body.textContent || ''
    const totalMatch = bodyText.match(/(?:totaal|total)[^\n€]*€\s*([\d.,]+)/i)
    if (totalMatch) {
      return parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Decathlon checkout detection
const decathlonDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/checkout/cart') || 
           url.includes('/checkout') ||
           document.querySelector('[class*="cart"]') !== null
  },
  extractTotal: () => {
    const selectors = [
      '[class*="total"] [class*="price"]',
      '[class*="cart"] [class*="total"]',
      '.checkout-summary .total'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/€\s*([\d.,]+)/)
        if (match) {
          return parseFloat(match[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    
    // Fallback: search for total patterns
    const bodyText = document.body.textContent || ''
    const totalMatch = bodyText.match(/(?:totaal|total)[^\n€]*€\s*([\d.,]+)/i)
    if (totalMatch) {
      return parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// H&M checkout detection
const hmDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/cart') || 
           url.includes('/checkout') ||
           document.querySelector('[class*="cart"]') !== null
  },
  extractTotal: () => {
    const selectors = [
      '[class*="total"] [class*="price"]',
      '[class*="cart"] [class*="total"]',
      '.checkout-summary .total'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/€\s*([\d.,]+)/)
        if (match) {
          return parseFloat(match[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    
    // Fallback: search for total patterns
    const bodyText = document.body.textContent || ''
    const totalMatch = bodyText.match(/(?:totaal|total)[^\n€]*€\s*([\d.,]+)/i)
    if (totalMatch) {
      return parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Bijenkorf checkout detection
const bijenkorfDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/page/checkout') || 
           url.includes('/checkout') ||
           document.querySelector('[class*="checkout"]') !== null
  },
  extractTotal: () => {
    const selectors = [
      '[class*="total"] [class*="price"]',
      '[class*="checkout"] [class*="total"]',
      '.checkout-summary .total'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/€\s*([\d.,]+)/)
        if (match) {
          return parseFloat(match[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    
    // Fallback: search for total patterns
    const bodyText = document.body.textContent || ''
    const totalMatch = bodyText.match(/(?:totaal|total)[^\n€]*€\s*([\d.,]+)/i)
    if (totalMatch) {
      return parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Etos checkout detection
const etosDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/cart') || 
           url.includes('/checkout') ||
           document.querySelector('[class*="cart"]') !== null
  },
  extractTotal: () => {
    const selectors = [
      '[class*="total"] [class*="price"]',
      '[class*="cart"] [class*="total"]',
      '.checkout-summary .total'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/€\s*([\d.,]+)/)
        if (match) {
          return parseFloat(match[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    
    // Fallback: search for total patterns
    const bodyText = document.body.textContent || ''
    const totalMatch = bodyText.match(/(?:totaal|total)[^\n€]*€\s*([\d.,]+)/i)
    if (totalMatch) {
      return parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Wehkamp checkout detection
const wehkampDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/winkelmand') || 
           url.includes('/checkout') ||
           document.querySelector('[class*="winkelmand"]') !== null
  },
  extractTotal: () => {
    const selectors = [
      '[class*="total"] [class*="price"]',
      '[class*="winkelmand"] [class*="total"]',
      '.checkout-summary .total'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/€\s*([\d.,]+)/)
        if (match) {
          return parseFloat(match[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    
    // Fallback: search for total patterns
    const bodyText = document.body.textContent || ''
    const totalMatch = bodyText.match(/(?:totaal|total)[^\n€]*€\s*([\d.,]+)/i)
    if (totalMatch) {
      return parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Rituals checkout detection
const ritualsDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('/cart') || 
           url.includes('/checkout') ||
           document.querySelector('[class*="cart"]') !== null
  },
  extractTotal: () => {
    const selectors = [
      '[class*="total"] [class*="price"]',
      '[class*="cart"] [class*="total"]',
      '.checkout-summary .total'
    ]
    
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent || ''
        const match = text.match(/€\s*([\d.,]+)/)
        if (match) {
          return parseFloat(match[1].replace('.', '').replace(',', '.'))
        }
      }
    }
    
    // Fallback: search for total patterns
    const bodyText = document.body.textContent || ''
    const totalMatch = bodyText.match(/(?:totaal|total)[^\n€]*€\s*([\d.,]+)/i)
    if (totalMatch) {
      return parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Thuisbezorgd checkout detection
const thuisbezorgdDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    return url.includes('thuisbezorgd.nl') && 
           (url.includes('/checkout') || 
            document.querySelector('[class*="checkout"], [class*="order"], [class*="payment"]') !== null)
  },
  extractTotal: () => {
    // For thuisbezorgd, we want the final total amount for cashback calculation
    // Based on the screenshot, the final total is €23.88, not the subtotal €20.70
    
    // First try to find the total in the order summary area
    const orderSummary = document.querySelector('[class*="order-summary"], [class*="bestelsamenvatting"], [class*="checkout-summary"]')
    if (orderSummary) {
      const summaryText = orderSummary.textContent || ''
      
      // Look for "Totaal" (final total) followed by Euro amount
      const totalMatch = summaryText.match(/Totaal[^\n€]*€\s*([\d.,]+)/i)
      if (totalMatch) {
        return parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
      }
    }
    
    // Fallback: look for Euro amounts and prioritize total over subtotal
    const allEuroMatches = document.body.textContent?.match(/€\s*([\d.,]+)/g) || []
    if (allEuroMatches.length > 0) {
      const amounts = allEuroMatches.map(match => {
        const amount = match.replace('€', '').trim()
        return parseFloat(amount.replace('.', '').replace(',', '.'))
      }).filter(amount => !isNaN(amount) && amount > 0)
      
      if (amounts.length > 0) {
        // Sort amounts and look for total first
        const sortedAmounts = amounts.sort((a, b) => b - a)
        
        // Look for amounts near "Totaal" first
        for (const amount of sortedAmounts) {
          const amountStr = amount.toString().replace('.', ',')
          const amountWithComma = amountStr.includes(',') ? amountStr : amountStr + ',00'
          
          // Check if this amount appears near "Totaal"
          const bodyText = document.body.textContent || ''
          const totalPattern = new RegExp(`(?:Totaal|total)[^€]*€\\s*${amountWithComma.replace('.', '\\.')}`, 'i')
          if (totalPattern.test(bodyText)) {
            return amount
          }
        }
        
        // If no total found, look for "Subtotaal" as fallback
        for (const amount of sortedAmounts) {
          const amountStr = amount.toString().replace('.', ',')
          const amountWithComma = amountStr.includes(',') ? amountStr : amountStr + ',00'
          
          // Check if this amount appears near "Subtotaal"
          const bodyText = document.body.textContent || ''
          const subtotalPattern = new RegExp(`(?:Subtotaal|subtotal)[^€]*€\\s*${amountWithComma.replace('.', '\\.')}`, 'i')
          if (subtotalPattern.test(bodyText)) {
            return amount
          }
        }
        
        // If no specific match, return the largest amount
        return sortedAmounts[0]
      }
    }
    
    return null
  },
  getCurrency: () => 'EUR'
}

function getDetector(hostname: string): CheckoutDetector {
  if (hostname.includes('amazon')) return amazonDetector
  if (hostname.includes('airbnb')) return airbnbDetector
  if (hostname.includes('zalando')) return zalandoDetector
  if (hostname.includes('bol.com')) return bolDetector
  if (hostname.includes('nike')) return nikeDetector
  if (hostname.includes('coolblue')) return coolblueDetector
  if (hostname.includes('mediamarkt')) return mediamarktDetector
  if (hostname.includes('ikea')) return ikeaDetector
  if (hostname.includes('hema')) return hemaDetector
  if (hostname.includes('decathlon')) return decathlonDetector
  if (hostname.includes('hm.com')) return hmDetector
  if (hostname.includes('debijenkorf')) return bijenkorfDetector
  if (hostname.includes('etos')) return etosDetector
  if (hostname.includes('wehkamp')) return wehkampDetector
  if (hostname.includes('rituals')) return ritualsDetector
  if (hostname.includes('thuisbezorgd')) return thuisbezorgdDetector
  return genericDetector
}

function detectCheckout(): CheckoutInfo | null {
  // Kick off support check in the background but do not block detection
  if (!__wsSupportChecked) requestMerchantSupportCheck()

  const detector = getDetector(window.location.hostname)
  if (!detector.isCheckoutPage()) return null

  const extracted = detector.extractTotal()
  const total = extracted && extracted > 0 ? extracted : 0

  return {
    total,
    currency: detector.getCurrency(),
    merchant: window.location.hostname,
    timestamp: Date.now()
  }
}

// Throttle function to prevent excessive calls
function throttle(func: Function, delay: number) {
  let timeoutId: number | null = null
  let lastExecTime = 0
  return function (...args: any[]) {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}

// Debounced checkout detection
const debouncedCheckForCheckout = throttle(() => {
  const checkoutInfo = detectCheckout()
  if (checkoutInfo) {
    if (isVoucherDismissed(window.location.hostname)) return
    if (checkoutInfo.total && checkoutInfo.total > 0) {
      if (__wsLastSentTotal !== checkoutInfo.total) {
        chrome.runtime.sendMessage({
          type: 'CHECKOUT_DETECTED',
          checkoutInfo
        })
        __wsLastSentTotal = checkoutInfo.total
        __wsClearRetry()
        const cashbackPrompt = document.getElementById('woolsocks-cashback-prompt')
        if (cashbackPrompt) cashbackPrompt.remove()
      }
    } else {
      __wsScheduleRetry(debouncedCheckForCheckout)
    }
  }
}, 500) // Throttle to max once per 500ms

// Initial check
debouncedCheckForCheckout()

// Track URL changes for SPA navigation
let lastUrl = window.location.href
const urlCheckInterval = setInterval(() => {
  const currentUrl = window.location.href
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl
    debouncedCheckForCheckout()
  }
}, 1000)

// Single optimized MutationObserver for DOM changes
const observer = new MutationObserver((mutations) => {
  const relevantMutations = mutations.filter((mutation) => {
    if (mutation.type === 'characterData') return false

    // Ignore mutations caused by our own UI being added/removed
    const isWsNode = (node: Node): boolean => {
      if (!(node instanceof Element)) return false
      const el = node as Element
      return !!(el.id?.includes('woolsocks') || el.closest('[id*="woolsocks"]'))
    }

    if (mutation.type === 'childList') {
      const added = Array.from((mutation as MutationRecord).addedNodes)
      for (const n of added) { if (isWsNode(n)) return false }
      const removed = Array.from((mutation as MutationRecord).removedNodes)
      for (const n of removed) { if (isWsNode(n)) return false }
    }

    if (mutation.target instanceof Element) {
      const target = mutation.target as Element
      if (target.id?.includes('woolsocks') || target.closest('[id*="woolsocks"]')) return false
    }
    return true
  })
  if (relevantMutations.length > 0) debouncedCheckForCheckout()
})

observer.observe(document.body, { childList: true, subtree: true, attributes: false })

function cleanup() { observer.disconnect(); clearInterval(urlCheckInterval); __wsClearRetry() }
window.addEventListener('beforeunload', cleanup)
if (typeof window !== 'undefined') { ;(window as any).__woolsocksCleanup = cleanup }
