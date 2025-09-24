// Content script for checkout detection and price parsing
import { findPartnerByHostname } from '../shared/partners'
import type { CheckoutInfo } from '../shared/types'

interface CheckoutDetector {
  isCheckoutPage: () => boolean
  extractTotal: () => number | null
  getCurrency: () => string
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

// Generic fallback detector
const genericDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const checkoutKeywords = ['checkout', 'cart', 'order', 'payment', 'betalen']
    const pathname = window.location.pathname.toLowerCase()
    const bodyText = document.body.textContent?.toLowerCase() || ''
    
    return checkoutKeywords.some(keyword => 
      pathname.includes(keyword) || bodyText.includes(keyword)
    )
  },
  extractTotal: () => {
    // Look for common price patterns
    const priceRegex = /(?:total|totaal|bedrag|amount)[\s:]*€?\s*([\d,]+\.?\d*)/i
    const match = document.body.textContent?.match(priceRegex)
    if (match) {
      return parseFloat(match[1].replace(',', ''))
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
    const modalTitle = Array.from(document.querySelectorAll('h2, h3, div'))
      .some(el => /cadeaukaart|gift.?card/i.test(el.textContent || ''))
    // Strong signals for the payment step and summary present
    const hasPaymentRoot = !!document.querySelector('[data-test="checkout-payment-page"]')
    const hasSummary = !!document.querySelector('#totalPriceWrapper, [data-test="checkout-total"], h3.sc-94eb08bc-0.gZiaJK')
    return url.includes('/checkout') || url.includes('/checkout/payment') || modalTitle || hasPaymentRoot || hasSummary
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
    const bodyText = document.body.textContent || ''
    const euroMatch = bodyText.match(/(?:totaal|total)[^\n€]*€\s*([\d.,]+)/i)
    if (euroMatch) {
      return parseFloat(euroMatch[1].replace('.', '').replace(',', '.'))
    }
    return null
  },
  getCurrency: () => 'EUR'
}

function getDetector(hostname: string): CheckoutDetector {
  if (hostname.includes('amazon')) return amazonDetector
  if (hostname.includes('zalando')) return zalandoDetector
  if (hostname.includes('bol.com')) return bolDetector
  if (hostname.includes('nike')) return nikeDetector
  if (hostname.includes('coolblue')) return coolblueDetector
  if (hostname.includes('mediamarkt')) return mediamarktDetector
  return genericDetector
}

function detectCheckout(): CheckoutInfo | null {
  const partner = findPartnerByHostname(window.location.hostname)
  if (!partner) return null
  
  const detector = getDetector(window.location.hostname)
  
  if (!detector.isCheckoutPage()) return null
  
  const total = detector.extractTotal()
  if (!total || total <= 0) return null
  
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
    chrome.runtime.sendMessage({
      type: 'CHECKOUT_DETECTED',
      checkoutInfo
    })
    // Ensure voucher prompt is not blocked by an existing cashback banner
    const cashbackPrompt = document.getElementById('woolsocks-cashback-prompt')
    if (cashbackPrompt) cashbackPrompt.remove()
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
  // Only process mutations that might affect checkout detection
  const relevantMutations = mutations.filter(mutation => {
    // Skip text-only changes
    if (mutation.type === 'characterData') return false
    
    // Skip changes to our own elements
    if (mutation.target instanceof Element) {
      const target = mutation.target as Element
      if (target.id?.includes('woolsocks') || 
          target.closest('[id*="woolsocks"]')) {
        return false
      }
    }
    
    return true
  })
  
  if (relevantMutations.length > 0) {
    debouncedCheckForCheckout()
  }
})

// Only observe specific parts of the DOM, not the entire subtree
observer.observe(document.body, {
  childList: true,
  subtree: false, // Only direct children, not deep subtree
  attributes: false
})

// Cleanup function
function cleanup() {
  observer.disconnect()
  clearInterval(urlCheckInterval)
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup)

// Cleanup if this script is removed
if (typeof window !== 'undefined') {
  // Store cleanup function globally for potential external cleanup
  ;(window as any).__woolsocksCleanup = cleanup
}
