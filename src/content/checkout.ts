// Content script for checkout detection and price parsing
import { findPartnerByHostname } from '../shared/partners'
import { CheckoutInfo } from '../shared/types'

interface CheckoutDetector {
  isCheckoutPage: () => boolean
  extractTotal: () => number | null
  getCurrency: () => string
}

// Amazon checkout detection
const amazonDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    return window.location.pathname.includes('/gp/cart') || 
           window.location.pathname.includes('/checkout') ||
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
    return window.location.pathname.includes('/checkout') ||
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
    return null
  },
  getCurrency: () => 'EUR'
}

// Bol.com checkout detection
const bolDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    return window.location.pathname.includes('/checkout') ||
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

function getDetector(hostname: string): CheckoutDetector {
  if (hostname.includes('amazon')) return amazonDetector
  if (hostname.includes('zalando')) return zalandoDetector
  if (hostname.includes('bol.com')) return bolDetector
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
    merchant: partner.name,
    timestamp: Date.now()
  }
}

// Check for checkout on page load and when DOM changes
function checkForCheckout() {
  const checkoutInfo = detectCheckout()
  if (checkoutInfo) {
    chrome.runtime.sendMessage({
      type: 'CHECKOUT_DETECTED',
      checkoutInfo
    })
  }
}

// Initial check
checkForCheckout()

// Watch for DOM changes (for SPA navigation)
const observer = new MutationObserver(() => {
  checkForCheckout()
})

observer.observe(document.body, {
  childList: true,
  subtree: true
})

// Also check on URL changes
let lastUrl = window.location.href
new MutationObserver(() => {
  const url = window.location.href
  if (url !== lastUrl) {
    lastUrl = url
    setTimeout(checkForCheckout, 1000) // Delay to let page load
  }
}).observe(document, { subtree: true, childList: true })
