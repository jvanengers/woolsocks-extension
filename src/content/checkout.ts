// Universal checkout detection content script
// This script runs on ALL websites (except excluded domains) and detects checkout/cart pages.
// When a checkout is detected, it sends a message to the background script which:
// 1. Queries the Woolsocks API to check if the merchant has vouchers available
// 2. If vouchers are found, displays the voucher offer panel
// This approach works for ANY merchant that Woolsocks supports, without needing a hardcoded partners list.

import type { CheckoutInfo } from '../shared/types'

try { console.log('[Woolsocks] Checkout detection script loaded on:', window.location.hostname) } catch {}

// Universal amount parsing function with validation
function parseAmount(text: string | null | undefined): number | null {
  if (!text) return null
  
  // Remove currency symbols and normalize whitespace
  const originalRaw = String(text)
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .trim()
  let amount = originalRaw
    .replace(/€|eur|euro/gi, '')
    .replace(/[\u00A0\u2007\u202F]/g, ' ') // NBSP/thin spaces → normal space
    .trim()
  amount = amount.replace(/\s+/g, ' ')
  
  // Handle "999.-" format (common in Netherlands)
  amount = amount.replace(/,?-\s*$/, '')
  
  // Extract only numbers, dots, commas, and spaces
  amount = amount.replace(/[^\d.,\s]/g, '')
  
  if (!amount) return null
  
  // Special case: amounts rendered as "16 95" (no comma/dot, decimals in a separate node)
  // Treat last two digits as decimals when separated by whitespace
  const spacedDecimal = amount.match(/^(\d{1,4})(?:\s+)(\d{2})$/)
  if (spacedDecimal) {
    const euros = spacedDecimal[1]
    const cents = spacedDecimal[2]
    const parsed = parseFloat(`${euros}.${cents}`)
    if (Number.isFinite(parsed)) return parsed
  }

  // Determine decimal separator by analyzing the last separator
  const lastDot = amount.lastIndexOf('.')
  const lastComma = amount.lastIndexOf(',')
  
  let parsed: number | null = null
  
  const trailingDigits = (s: string) => (s.replace(/[^\d]/g, ''))
  
  if (lastDot > lastComma && lastDot !== -1) {
    // Format: 1,234.56 (comma=thousands, dot=decimal)
    const afterDotRaw = amount.slice(lastDot + 1)
    const afterDot = trailingDigits(afterDotRaw)
    if (afterDot.length >= 1 && afterDot.length <= 2) {
      parsed = parseFloat(amount.replace(/,/g, ''))
    }
  } else if (lastComma > lastDot && lastComma !== -1) {
    // Format: 1.234,56 (dot=thousands, comma=decimal)
    const afterCommaRaw = amount.slice(lastComma + 1)
    const afterComma = trailingDigits(afterCommaRaw)
    if (afterComma.length >= 1 && afterComma.length <= 2) {
      parsed = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
    }
  } else {
    // Only one type of separator or none
    if (lastComma !== -1 && /,\s*\d{1,2}(\D|$)/.test(amount)) {
      parsed = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
    } else if (lastDot !== -1 && /\.\s*\d{1,2}(\D|$)/.test(amount)) {
      parsed = parseFloat(amount.replace(/,/g, ''))
    }
  }
  
  // If no decimal separator found, treat as integer euros
  if (parsed === null) {
    const cleanAmount = amount.replace(/[.,\s]/g, '')
    parsed = parseFloat(cleanAmount)
  }
  
  // Validation checks
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  
  // Check 1: No more than 2 decimal places
  const decimalPlaces = (parsed.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) return null
  
  // Check 2: No more than 4 digits before decimal (max €9999.99)
  const integerPart = Math.floor(parsed)
  if (integerPart > 9999) return null
  
  // Check 3: Reasonable minimum (at least €0.01)
  if (parsed < 0.01) return null

  // Correction: If original looked like "77,26" (comma-decimal with 1-3 digits before comma)
  // but parsing path treated it as 7726 (due to site-specific quirks), adjust by /100.
  // BUT: Don't apply this correction if the amount was already correctly parsed as comma-decimal
  const simpleCommaDecimal = /^\s*\d{1,3}\s*,\s*\d{2}\s*$/
  const wasCommaDecimal = lastComma > lastDot && lastComma !== -1 && /,\s*\d{1,2}(\D|$)/.test(amount)
  if (parsed >= 1000 && simpleCommaDecimal.test(originalRaw.replace(/€|eur|euro/gi, '').trim()) && !wasCommaDecimal) {
    const corrected = parsed / 100
    if (Number.isFinite(corrected)) return corrected
  }
  
  return parsed
}

// Determine if an element is visible on screen (basic check)
function isVisible(element: Element): boolean {
  try {
    const rect = (element as HTMLElement).getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return false
    const style = window.getComputedStyle(element as Element)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
    return true
  } catch {
    return true
  }
}

// Identify nodes that belong to our own extension to avoid self-reading amounts
function isWsExtensionNode(element: Element | null): boolean {
  try {
    let el: Element | null = element
    while (el) {
      const id = (el as HTMLElement).id || ''
      const cls = (el as HTMLElement).className?.toString() || ''
      if (id.includes('woolsocks') || cls.includes('woolsocks')) return true
      el = el.parentElement
    }
  } catch {}
  return false
}

// Heuristic: In many carts, the final total is the last visible amount in the order summary (vertical receipt)
function findFinalAmountByVisualOrder(): number | null {
  // Likely containers that hold order summaries/receipts
  const containerSelectors = [
    'aside',
    '[class*="summary"]', '[id*="summary"]',
    '.order-summary', '.checkout-summary', '.cart-summary', '.basket-summary',
    '.order-total', '.cart-totals', '.basket-total', '#orderSummary', '#order-summary',
    '[class*="totals"]', '[id*="totals"]',
    '[data-testid*="summary"]', '[data-testid*="order-summary"]',
    '[class*="checkout"] [class*="summary"]', '[class*="cart"] [class*="summary"]'
  ]
  const containers = Array.from(document.querySelectorAll(containerSelectors.join(',')))
    .filter(c => !isWsExtensionNode(c))
  const roots: Element[] = containers.length > 0 ? containers : [document.body]

  // Prefer containers that contain a total keyword
  const keyword = /(totaal|total|grand\s*total|order\s*total|te\s*betalen|payable|summe|gesamt|totaalbedrag|total incl)/i
  roots.sort((a, b) => {
    const aScore = keyword.test(a.textContent || '') ? 1 : 0
    const bScore = keyword.test(b.textContent || '') ? 1 : 0
    return bScore - aScore
  })

  for (const root of roots) {
    const nodes = Array.from(root.querySelectorAll('span, div, p, li, td, th, strong, b, h1, h2, h3, h4, h5, h6'))
    const candidates: { amount: number; top: number; left: number; score: number }[] = []

    for (const node of nodes) {
      if (isWsExtensionNode(node)) continue
      if (!isVisible(node)) continue
      const text = node.textContent || ''
      const amount = parseAmount(text)
      if (!amount || amount <= 0) continue

      const rect = (node as HTMLElement).getBoundingClientRect()
      const contextContainer = node.closest('tr, li, div, p')
      const context = (contextContainer?.textContent || '').toLowerCase()
      let score = 0
      if (/(totaal|total|grand\s*total|order\s*total|te\s*betalen|payable|total incl|total\s*incl\.|due\s*today|to\s*pay)/i.test(context)) score += 10
      if (/(subtotaal|subtotal)/i.test(context)) score -= 5
      if (/(verzend|shipping|bezorg|delivery|tax|btw|vat|korting|discount)/i.test(context)) score -= 3

      // Look for a label on the same visual row (left side) — helps HEMA/Gamma
      try {
        const siblings = contextContainer?.parentElement?.children || []
        for (const sib of Array.from(siblings)) {
          if (sib === node) continue
          const r = (sib as HTMLElement).getBoundingClientRect()
          const sameRow = Math.abs(r.top - rect.top) <= 6
          const leftSide = r.left < rect.left
          if (sameRow && leftSide) {
            const label = (sib.textContent || '').toLowerCase()
            if (/(totaal|total|grand\s*total|order\s*total|te\s*betalen|payable|totaalbedrag|total incl)/i.test(label)) score += 8
            if (/(subtotaal|subtotal)/i.test(label)) score -= 4
            if (/(verzend|shipping|bezorg|delivery|tax|btw|vat|korting|discount)/i.test(label)) score -= 3
          }
        }
      } catch {}

      candidates.push({ amount, top: rect.top + window.scrollY, left: rect.left + window.scrollX, score })
    }

    if (candidates.length > 0) {
      // Prefer rows marked as totals; otherwise pick the last by visual order
      const totals = candidates.filter(c => c.score >= 5)
      const list = (totals.length > 0 ? totals : candidates)
        .sort((a, b) => {
          // higher score first, then by visual order top→bottom, then left→right
          if (b.score !== a.score) return b.score - a.score
          if (a.top !== b.top) return a.top - b.top
          return a.left - b.left
        })
      // choose the last in visual order within the best-scored group
      const last = list[list.length - 1]
      if (last && last.amount > 0) return last.amount
    }
  }

  return null
}

// Find the largest amount in text (likely the total)
function findLargestAmount(text: string): number | null {
  if (!text) return null
  
  // Match various price patterns
  const patterns = [
    /€\s*[\d.,\s]+/g,           // €123.45, €1,234.56
    /[\d.,\s]+€/g,              // 123.45€, 1,234.56€
    /\b[\d.,\s]+(?:,-|\.00)?\b/g // 123.45, 1,234.56, 999.-
  ]
  
  const candidates: number[] = []
  
  for (const pattern of patterns) {
    const matches = text.match(pattern) || []
    for (const match of matches) {
      const amount = parseAmount(match)
      if (amount && amount > 0) {
        candidates.push(amount)
      }
    }
  }
  
  return candidates.length > 0 ? Math.max(...candidates) : null
}

// Bridge: listen for page (MAIN world) requests to open URLs and relay to background
window.addEventListener('message', (event) => {
  try {
    if (event.source !== window) return
    const data = event.data as any
    if (!data || typeof data !== 'object') return
    if (data.type === 'WS_OPEN_URL' && typeof data.url === 'string') {
      try { chrome.runtime.sendMessage({ type: 'OPEN_URL', url: data.url }) } catch {}
    }
  } catch {}
})

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
        const match = text.match(/€?\s*([\d.,\s-]+)/)
        if (match) {
          const amount = parseAmount(match[1])
          if (amount && amount > 0) return amount
        }
      }
    }
    // Try the universal receipt heuristic within page context
    {
      const receiptAmount = findFinalAmountByVisualOrder()
      if (receiptAmount && receiptAmount > 0) return receiptAmount
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
        const amount = parseAmount(n.textContent)
        if (amount && amount > 0) return amount
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
    // Primary: new Zalando totals block with data-id="total-price"
    const node = document.querySelector('div[data-id="total-price"]') as HTMLElement | null
    if (node) {
      const amt = parseAmount(node.textContent)
      if (amt && amt > 0) return amt
    }

    // Secondary: historical selectors
    const selectors = [
      '[data-testid="checkout-summary"] [data-testid="total-price"]',
      '.checkout-summary__total .price',
      '.total-price'
    ]
    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        const amt = parseAmount(element.textContent)
        if (amt && amt > 0) return amt
      }
    }
    // Fallback: search the whole page text for a Euro amount near total keywords (NL/EN/DE)
    const bodyText = document.body.textContent || ''
    const euroMatch = bodyText.match(/(?:totaal|sum|total|gesamt|bedrag)[^\n€]*€\s*([\d.,]+)/i)
    if (euroMatch) {
      const amt = parseAmount(euroMatch[1])
      if (amt && amt > 0) return amt
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Bol.com checkout detection
const bolDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    const isCheckout = url.includes('/checkout') ||
           url.includes('/cart') ||
           url.includes('/basket') ||
           document.querySelector('.checkout-summary') !== null
    console.log('[Woolsocks] bolDetector.isCheckoutPage for URL:', url, 'result:', isCheckout)
    return isCheckout
  },
  extractTotal: () => {
    console.log('[Woolsocks] bolDetector.extractTotal called')
    
    // Highly targeted: totals highlight banner that contains "Nog te betalen"
    const banners = Array.from(document.querySelectorAll('div.p-4.my-4.bg-accent1-background-low, div[class*="bg-accent1-background-low"], div[aria-live]')) as HTMLElement[]
    for (const banner of banners) {
      const text = (banner.textContent || '').toLowerCase()
      if (/nog\s*te\s*betalen/.test(text)) {
        // pick the last <strong> that contains a euro value
        const strongs = Array.from(banner.querySelectorAll('strong')) as HTMLElement[]
        const euroStrong = strongs.reverse().find(el => /€\s*[\d.,\u00A0\s]+/.test(el.textContent || ''))
        if (euroStrong) {
          const amt = parseAmount(euroStrong.textContent)
          console.log('[Woolsocks] Parsed from banner strong:', euroStrong.textContent, '=>', amt)
          if (amt && amt > 0) return amt
        }
      }
    }

    // Label-based: "Nog te betalen" container → sibling/right value
    const labelNodes = Array.from(document.querySelectorAll('span, div, strong, p'))
      .filter(el => /nog\s*te\s*betalen/i.test((el.textContent || '')))
    for (const node of labelNodes) {
      let scope: Element | null = (node as HTMLElement).closest('div, section, article, aside, tr')
      for (let i = 0; i < 6 && scope; i++) {
        const cands = Array.from(scope.querySelectorAll('strong, span, div')) as HTMLElement[]
        const withEuro = cands.filter(e => /€\s*[\d.,\u00A0\s]+/.test(e.textContent || ''))
        // Prefer the rightmost/last
        const pick = withEuro[withEuro.length - 1]
        if (pick) {
          const amt = parseAmount(pick.textContent)
          console.log('[Woolsocks] Parsed near label:', pick.textContent, '=>', amt)
          if (amt && amt > 0) return amt
        }
        scope = scope.parentElement
      }
    }

    // Fallback: largest euro amount in the summary area
    const summary = document.querySelector('#mainContent') || document.body
    const euroMatches = (summary.textContent || '').match(/€\s*[\d.,\u00A0\s]+/g) || []
    const parsed = euroMatches.map(m => parseAmount(m)).filter((n): n is number => typeof n === 'number' && n > 0)
    if (parsed.length) {
      const max = Math.max(...parsed)
      console.log('[Woolsocks] Fallback max euro amount:', max)
      return max
    }

    console.log('[Woolsocks] No total found, returning null')
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
    
    // URL-based detection (primary signal) - comprehensive patterns
    const urlKeywords = [
      // English patterns
      'checkout', 'cart', 'basket', 'bag', 'order', 'payment', 'purchase',
      'shopping-cart', 'shoppingcart', 'shopping-basket', 'shoppingbasket',
      'checkout/cart', 'order/delivery', 'order/checkout', 'checkout/order',
      'page/checkout', 'checkout/', '/checkout', 'checkout-page',
      'book', 'reserve', 'booking', 'reservation',
      
      // Dutch patterns  
      'betalen', 'kassa', 'winkelmand', 'winkelwagen', 'winkelmandje', 
      'bestellen', 'afrekenen', 'bestelling', 'afrekening',
      'reserveren', 'boeken',
      
      // Common e-commerce patterns
      'buy', 'buy-now', 'purchase', 'complete-order', 'place-order',
      'finalize', 'confirm-order', 'order-summary', 'order-review'
    ]
    
    const hasCheckoutUrl = urlKeywords.some(keyword => 
      pathname.includes(keyword) || url.includes(keyword)
    )
    
    // Debug logging for troubleshooting (universal)
    try {
      console.log('[Woolsocks] URL detection debug:', {
        hostname,
        pathname,
        url,
        hasCheckoutUrl,
        matchedKeywords: urlKeywords.filter(keyword => 
          pathname.includes(keyword) || url.includes(keyword)
        )
      })
    } catch {}
    
    // If URL clearly indicates checkout, that's sufficient
    if (hasCheckoutUrl) return true
    
    // For other cases, require multiple signals to avoid false positives
    let signalCount = 0
    
    // DOM-based detection - comprehensive selectors
    const checkoutSelectors = [
      // Class-based selectors
      '[class*="checkout"]', '[class*="cart"]', '[class*="basket"]', '[class*="bag"]',
      '[class*="order"]', '[class*="payment"]', '[class*="purchase"]', '[class*="buy"]',
      '[class*="kassa"]', '[class*="winkelmand"]', '[class*="winkelwagen"]', '[class*="bestellen"]',
      '[class*="afrekenen"]', '[class*="betalen"]', '[class*="reserveren"]', '[class*="boeken"]',
      
      // ID-based selectors
      '[id*="checkout"]', '[id*="cart"]', '[id*="basket"]', '[id*="bag"]',
      '[id*="order"]', '[id*="payment"]', '[id*="purchase"]', '[id*="buy"]',
      '[id*="winkelmand"]', '[id*="winkelwagen"]', '[id*="bestellen"]',
      
      // Data attribute selectors
      '[data-testid*="checkout"]', '[data-testid*="cart"]', '[data-testid*="basket"]',
      '[data-testid*="order"]', '[data-testid*="payment"]', '[data-testid*="buy"]',
      '[data-cy*="checkout"]', '[data-cy*="cart"]', '[data-cy*="order"]',
      
      // Common e-commerce containers
      '.checkout-summary', '.order-summary', '.cart-summary', '.basket-summary',
      '.payment-summary', '.order-total', '.cart-total', '.basket-total',
      '.shopping-cart', '.shopping-basket', '.order-form', '.checkout-form'
    ]
    
    if (checkoutSelectors.some(selector => document.querySelector(selector) !== null)) {
      signalCount++
    }
    
    // E-commerce specific text patterns - comprehensive
    const ecommercePatterns = [
      // English patterns
      'proceed to checkout', 'place order', 'order summary', 'order total',
      'payment method', 'shipping address', 'billing address', 'add to cart',
      'shopping cart', 'shopping bag', 'item total', 'subtotal', 'grand total',
      'checkout', 'complete order', 'finalize order', 'confirm order',
      'buy now', 'purchase', 'order now', 'proceed to payment',
      'delivery address', 'billing information', 'payment details',
      
      // Dutch patterns
      'bestellen', 'afrekenen', 'betalen', 'winkelmand', 'winkelwagen',
      'bestelling', 'afrekening', 'betaling', 'verzendadres', 'factuuradres',
      'doorgaan naar kassa', 'bestelling plaatsen', 'bestelling voltooien',
      'totaalbedrag', 'subtotaal', 'verzendkosten', 'betaalmethode',
      'reserveren', 'boeken', 'bevestigen'
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
    // Strategy 1: Look for specific total selectors
    const totalSelectors = [
      '[class*="total"]', '[class*="sum"]', '[class*="amount"]', '[class*="price"]',
      '[id*="total"]', '[id*="sum"]', '[id*="amount"]', '[id*="price"]',
      '[data-testid*="total"]', '[data-testid*="sum"]', '[data-testid*="amount"]',
      '.checkout-summary', '.order-summary', '.cart-summary', '.basket-summary',
      '.payment-summary', '.order-total', '.cart-total', '.basket-total'
    ]
    
    // Collect candidates instead of returning the first match; pick the best/last visually
    type Cand = { amount: number; top: number; left: number; score: number }
    const cands: Cand[] = []
    for (const selector of totalSelectors) {
      const elements = document.querySelectorAll(selector)
      for (const element of elements) {
        if (isWsExtensionNode(element)) continue
        const amount = parseAmount(element.textContent)
        if (!amount || amount <= 0) continue
        const rect = (element as HTMLElement).getBoundingClientRect()
        let score = 0
        const classes = ((element as HTMLElement).className || '').toString().toLowerCase()
        if (/total|grand|totaal/.test(classes)) score += 6
        if (/price|amount|sum/.test(classes)) score += 2
        const container = element.closest('tr, li, div, p')
        const context = (container?.textContent || '').toLowerCase()
        if (/(totaal|total|grand\s*total|order\s*total|te\s*betalen|payable|total incl)/.test(context)) score += 8
        if (/(subtotaal|subtotal)/.test(context)) score -= 4
        if (/(verzend|shipping|bezorg|delivery|tax|btw|vat|korting|discount)/.test(context)) score -= 3
        // Same-row left label boost
        try {
          const siblings = container?.parentElement?.children || []
          for (const sib of Array.from(siblings)) {
            if (sib === element) continue
            const rr = (sib as HTMLElement).getBoundingClientRect()
            const sameRow = Math.abs(rr.top - rect.top) <= 6
            const leftSide = rr.left < rect.left
            if (sameRow && leftSide) {
              const label = (sib.textContent || '').toLowerCase()
              if (/(totaal|total|grand\s*total|order\s*total|te\s*betalen|payable)/.test(label)) score += 6
              if (/(subtotaal|subtotal)/.test(label)) score -= 3
            }
          }
        } catch {}
        cands.push({ amount, top: rect.top + window.scrollY, left: rect.left + window.scrollX, score })
      }
    }
    if (cands.length > 0) {
      const topCand = cands
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          if (a.top !== b.top) return a.top - b.top
          return a.left - b.left
        })
      const last = topCand[topCand.length - 1]
      if (last && last.amount > 0) return last.amount
    }
    
    // Strategy 2: Look for price patterns in the entire document
    const pricePatterns = [
      /(?:total|totaal|bedrag|amount|sum)[\s:]*€?\s*([\d.,\s-]+)/i,
      /€\s*([\d.,\s-]+)\s*(?:total|totaal|bedrag|amount|sum)/i,
      /(?:order\s+total|cart\s+total|basket\s+total)[\s:]*€?\s*([\d.,\s-]+)/i,
      /(?:checkout\s+total|payment\s+total)[\s:]*€?\s*([\d.,\s-]+)/i
    ]
    
    for (const pattern of pricePatterns) {
      const match = document.body.textContent?.match(pattern)
      if (match) {
        const amount = parseAmount(match[1])
        if (amount && amount > 0) return amount
      }
    }
    
    // Strategy 3: Receipt heuristic - prefer last visible amount in summary containers
    const receiptAmount = findFinalAmountByVisualOrder()
    if (receiptAmount && receiptAmount > 0) return receiptAmount

    // Strategy 4: Fallback - largest amount on the whole page
    return findLargestAmount(document.body.textContent || '')
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
        const amount = parseAmount(element.textContent)
        if (amount && amount > 0) return amount
      }
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Coolblue checkout detection
const coolblueDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href.toLowerCase()
    const path = window.location.pathname.toLowerCase()
    // Coolblue uses Dutch paths like "/winkelmandje" for cart
    const isCheckoutUrl = (
      url.includes('/cart') ||
           url.includes('/checkout') ||
      path === '/winkelmandje' ||
      path.includes('winkelmand') ||
      path.includes('winkelwagen')
    )
    // Also allow when typical summary elements exist
    const hasSummary = document.querySelector('[class*="summary"], .checkout-summary, .order-summary') !== null
    return isCheckoutUrl || hasSummary
  },
  extractTotal: () => {
    // 1) Try exact/likely selectors seen across Coolblue variants
    const exactSelectors = [
      '.checkout-summary [class*="total"]',
      '.order-summary [class*="total"]',
      '.order-summary [class*="price"]',
      '[data-testid="total-price"]',
      '[data-test="total-price"]',
      '[id*="total"],[class*="total"] [class*="price"]'
    ]
    for (const sel of exactSelectors) {
      const nodes = document.querySelectorAll(sel)
      for (const n of Array.from(nodes)) {
        const amount = parseAmount(n.textContent)
        if (amount && amount > 0) return amount
      }
    }

    // 2) Scan likely containers on the page (right-side summary etc.)
    const containers = Array.from(document.querySelectorAll('aside, [class*="summary"], [class*="Samenvatting"], [class*="basket"], [class*="order"], [class*="checkout"], [class*="winkelmand"]'))
    for (const c of containers) {
      const text = c.textContent || ''
      // Prefer amounts near Dutch labels
      const nearTotal = text.match(/(?:totaalbedrag|totaal|total)[^€]*€\s*([\d.,]+)/i)
      if (nearTotal) {
        const parsed = parseFloat(nearTotal[1].replace(/\./g, '').replace(',', '.'))
        if (!isNaN(parsed) && parsed > 0) return parsed
      }
      const amount = findLargestAmount(text)
      if (amount && amount > 0) return amount
    }

    // 3) Fallback: search whole page for a total label, then largest euro amount
    const bodyText = document.body.textContent || ''
    const labeledMatch = bodyText.match(/(?:totaalbedrag|totaal|total)[^€]*€\s*([\d.,]+)/i)
    if (labeledMatch) {
      const parsed = parseFloat(labeledMatch[1].replace(/\./g, '').replace(',', '.'))
      if (!isNaN(parsed) && parsed > 0) return parsed
    }

    return findLargestAmount(bodyText)
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
        const amount = parseAmount(element.textContent)
        if (amount && amount > 0) return amount
      }
    }
    
    // Fallback: search for total patterns
    const bodyText = document.body.textContent || ''
    const totalMatch = bodyText.match(/(?:totaal|total)[^\n€]*€?\s*([\d.,\s-]+)/i)
    if (totalMatch) {
      const amount = parseAmount(totalMatch[1])
      if (amount && amount > 0) return amount
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// HEMA checkout detection
const hemaDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    // Only trigger on the specific cart page URL
    if (url === 'https://www.hema.nl/cart' || url.endsWith('/cart')) return true
    // Also allow when the sidebar totals container exists
    return document.querySelector('#cart .basket-totals.calculated-totals') !== null
  },
  extractTotal: () => {
    // Primary: exact node provided for the final total row
    const exact = document.querySelector('#cart .basket-totals.calculated-totals .total-prices.redesign .row.total-amount span.price') as HTMLElement | null
    if (exact) {
      const amt = parseAmount(exact.textContent)
      if (amt && amt > 0) return amt
      // When decimals are rendered as '-' the textContent can be '16.-' which parseAmount already handles
    }

    // Secondary: prefer explicit final total row if present
    const container = document.querySelector('#cart .basket-totals.calculated-totals .total-prices.redesign')
    if (container) {
      const finalRowPrice = container.querySelector('.row.total-amount span.price') as HTMLElement | null
      const finalAmt = parseAmount(finalRowPrice?.textContent)
      if (finalAmt && finalAmt > 0) return finalAmt

      // Structured row lookup — find row with label exactly 'totaal' (not 'totaal van alle producten') and read .price on the right
      const rows = container.querySelectorAll('.row')
      for (const row of Array.from(rows)) {
        const label = (row.querySelector('.price-label, .total-label, span') as HTMLElement | null)
        const labelText = (label?.textContent || '').toLowerCase().trim()
        const isExactTotal = /^(totaal|total)$/i.test(labelText)
        if (isExactTotal) {
          const priceEl = row.querySelector('span.price') as HTMLElement | null
          const amt = parseAmount(priceEl?.textContent)
          if (amt && amt > 0) return amt
        }
      }
    }

    // Tertiary: near-text search within the totals container
    if (container) {
      const t = container.textContent || ''
      const m = t.match(/totaal[^€\d]*([€]?[\s\d.,-]+)/i)
      if (m) {
        const amt = parseAmount(m[1])
        if (amt && amt > 0) return amt
      }
    }

    // Fallback: visual heuristic scoped to the sidebar
    {
      const roots = document.querySelectorAll('#cart .basket-totals.calculated-totals')
      for (const _ of Array.from(roots)) {
        const v = findFinalAmountByVisualOrder()
        if (v && v > 0) return v
      }
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
    const hasUrl = url.includes('/page/checkout') || url.includes('/checkout')
    const hasTotals = document.querySelector('.TotalsContainer_sMjF, .TotalPrice_jfub, .SellingPrice-module_Label') !== null
    return hasUrl || hasTotals
  },
  extractTotal: () => {
    // Primary: exact node provided
    const exact = document.querySelector('li.TotalPrice_jfub .SellingPrice-module_Label, .SellingPrice-module_Label') as HTMLElement | null
    if (exact) {
      const amt = parseAmount(exact.textContent)
      if (amt && amt > 0) return amt
    }

    // Secondary: find within totals container near label "Totaal"
    const container = document.querySelector('.TotalsContainer_sMjF')
    if (container) {
      const text = container.textContent || ''
      const m = text.match(/totaal[^€]*€?\s*([\d.,]+)/i)
      if (m) {
        const amt = parseAmount(m[1])
        if (amt && amt > 0) return amt
      }
    }

    // Fallback: visual heuristic (scoped)
    {
      const roots = document.querySelectorAll('.TotalsContainer_sMjF, .BasketPage_bnQ1')
      for (const _ of Array.from(roots)) {
        const v = findFinalAmountByVisualOrder()
        if (v && v > 0) return v
      }
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Etos checkout detection
const etosDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    const hasUrl = url.includes('/cart') || url.includes('/checkout')
    const hasTotals = document.querySelector('.js-cart-totals, .total-summary__totals, .cart-totals__amounts') !== null
    return hasUrl || hasTotals
  },
  extractTotal: () => {
    // 1) Exact row: right-hand bold in totals row
    const exact = document.querySelector('.total-summary__totals .o-grid.u-flex-bottom.u-text--big b.u-flex-self-right') as HTMLElement | null
    if (exact) {
      const amt = parseAmount(exact.textContent)
      if (amt && amt > 0) return amt
    }

    // 2) Structured scan: find grid rows whose left column contains "Totaal"
    const rows = document.querySelectorAll('.total-summary__totals .o-grid, .cart-totals__amounts .o-grid')
    for (const row of Array.from(rows)) {
      const left = (row.querySelector('.o-col-6, .o-col-6.u-flex, .u-text--left') as HTMLElement | null)
      const labelText = (left?.textContent || '').toLowerCase()
      if (/\btotaal\b/.test(labelText)) {
        const right = row.querySelector('b.u-flex-self-right, .u-text--right, strong, b, span') as HTMLElement | null
        const amt = parseAmount(right?.textContent)
        if (amt && amt > 0) return amt
      }
    }

    // 3) Fallback: near-text match inside the summary container
    const container = document.querySelector('.cart-totals__amounts, .total-summary__totals')
    if (container) {
      const text = container.textContent || ''
      const m = text.match(/totaal[^€]*€\s*([\d.,]+)/i)
      if (m) {
        const amt = parseAmount(m[1])
        if (amt && amt > 0) return amt
      }
    }

    // 4) Visual heuristic fallback (scoped)
    {
      const roots = document.querySelectorAll('.cart-totals__amounts, .total-summary__totals')
      for (const _ of Array.from(roots)) {
        const v = findFinalAmountByVisualOrder()
        if (v && v > 0) return v
      }
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Douglas checkout detection
const douglasDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    const hasUrl = url.includes('/cart') || url.includes('/checkout')
    const hasTotals = document.querySelector('.cart-calculations, .cart-calculations__loyalty--total') !== null
    return hasUrl || hasTotals
  },
  extractTotal: () => {
    // Primary: exact node provided for final total
    const exact = document.querySelector('.cart-calculations__loyalty--total .cart-calculations__price--bold [data-testid="price-type-none"]') as HTMLElement | null
    if (exact) {
      const amt = parseAmount(exact.textContent)
      if (amt && amt > 0) return amt
    }

    // Structured scan in calculations section: find a row where the left label is "Totaal"
    const section = document.querySelector('.cart-calculations')
    if (section) {
      const rows = section.querySelectorAll('.row, .cart-calculations__row, .cart-calculations__loyalty')
      for (const row of Array.from(rows)) {
        const label = (row.textContent || '').toLowerCase()
        if (/\btotaal\b/.test(label) || /\btotal\b/.test(label)) {
          const price = row.querySelector('[data-testid="price-type-none"], .cart-calculations__price--bold, .cart-calculations__price') as HTMLElement | null
          const amt = parseAmount(price?.textContent)
          if (amt && amt > 0) return amt
        }
      }
    }

    // Fallbacks: near-text search then visual heuristic
    const text = document.body.textContent || ''
    const near = text.match(/totaal[^€]*€\s*([\d.,]+)/i)
    if (near) {
      const amt = parseAmount(near[1])
      if (amt && amt > 0) return amt
    }

    const v = findFinalAmountByVisualOrder()
    if (v && v > 0) return v
    return null
  },
  getCurrency: () => 'EUR'
}

// Gamma checkout detection
const gammaDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    const hasUrl = url.includes('/cart') || url.includes('/checkout')
    const hasSummary = document.querySelector('.sticky.top-8, [class*="cart-summary"], [data-testid*="summary"]') !== null
    return hasUrl || hasSummary
  },
  extractTotal: () => {
    // Primary: bold total amount element in sidebar summary
    const primary = document.querySelector('.sticky.top-8 span.whitespace-nowrap.transition-colors.font-bold') as HTMLElement | null
    if (primary) {
      const amt = parseAmount(primary.textContent)
      if (amt && amt > 0) return amt
    }

    // Secondary: find element next to label "Totaal"
    const summary = document.querySelector('.sticky.top-8, [class*="cart-summary"], [data-testid*="summary"]')
    if (summary) {
      // Look for rows; Gamma uses flex containers
      const rows = summary.querySelectorAll('div, span')
      for (const row of Array.from(rows)) {
        const t = (row.textContent || '').toLowerCase()
        if (/\btotaal\b/.test(t) || /\btotal\b/.test(t)) {
          const bold = row.querySelector('span.whitespace-nowrap.transition-colors.font-bold, b, strong, span') as HTMLElement | null
          const amt = parseAmount(bold?.textContent)
          if (amt && amt > 0) return amt
        }
      }
    }

    // Fallbacks
    const near = (summary?.textContent || document.body.textContent || '').match(/totaal[^€]*€\s*([\d.,]+)/i)
    if (near) {
      const amt = parseAmount(near[1])
      if (amt && amt > 0) return amt
    }

    const v = findFinalAmountByVisualOrder()
    if (v && v > 0) return v
    return null
  },
  getCurrency: () => 'EUR'
}

// VVV Cadeaukaarten checkout detection
const vvvCadeaukaartenDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    const hasUrl = url.includes('/winkelmand') || url.includes('/checkout')
    const hasTotals = document.querySelector('div.border-y.py-4, [data-testid*="totals"], [class*="totals"]') !== null
    return hasUrl || hasTotals
  },
  extractTotal: () => {
    // Primary: exact node provided (final total value)
    const exact = document.querySelector('span.w-full.text-right.text-lg.font-semibold.mb-0') as HTMLElement | null
    if (exact) {
      const amt = parseAmount(exact.textContent)
      if (amt && amt > 0) return amt
    }

    // Secondary: find the row with label "Totaal (incl. btw)" and read the right-side span
    const container = document.querySelector('div.border-y.py-4')
    if (container) {
      const rows = container.querySelectorAll('div.w-full.flex.items-center.justify-between')
      for (const row of Array.from(rows)) {
        const label = (row.querySelector('div, span') as HTMLElement | null)
        const labelText = (label?.textContent || '').toLowerCase()
        if (labelText.includes('totaal') && labelText.includes('incl. btw')) {
          const price = row.querySelector('span, b, strong') as HTMLElement | null
          const amt = parseAmount(price?.textContent)
          if (amt && amt > 0) return amt
        }
      }
    }

    // Fallbacks
    const near = (container?.textContent || document.body.textContent || '').match(/totaal\s*\(incl\.?\s*btw\)[^€\d]*([€]?[\s\d.,-]+)/i)
    if (near) {
      const amt = parseAmount(near[1])
      if (amt && amt > 0) return amt
    }

    const v = findFinalAmountByVisualOrder()
    if (v && v > 0) return v
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
      '.checkout-summary .total',
      '[data-test*="totals"], [data-testid*="totals"], [data-qa*="totals"]'
    ]
    
    // Collect candidates with visual order like generic detector
    type Cand = { amount: number; top: number; left: number; score: number }
    const cands: Cand[] = []
    for (const selector of selectors) {
      const nodes = document.querySelectorAll(selector)
      for (const el of nodes) {
        if (isWsExtensionNode(el)) continue
        const amount = parseAmount(el.textContent)
        if (!amount || amount <= 0) continue
        const rect = (el as HTMLElement).getBoundingClientRect()
        let score = 0
        const ctx = (el.closest('tr, li, div, p')?.textContent || '').toLowerCase()
        if (/(totaal|total|order\s*total)/.test(ctx)) score += 8
        if (/(subtotaal|subtotal)/.test(ctx)) score -= 4
        cands.push({ amount, top: rect.top + window.scrollY, left: rect.left + window.scrollX, score })
      }
    }
    if (cands.length > 0) {
      const best = cands.sort((a, b) => (b.score - a.score) || (a.top - b.top) || (a.left - b.left))
      const last = best[best.length - 1]
      if (last && last.amount > 0) return last.amount
    }
    
    // Fallback: search for total patterns
    const bodyText = document.body.textContent || ''
    const totalMatch = bodyText.match(/(?:totaal|total)[^\n€]*€?\s*([\d.,\s-]+)/i)
    if (totalMatch) {
      const amount = parseAmount(totalMatch[1])
      if (amount && amount > 0) return amount
    }
    // Try visual-order heuristic as final fallback
    {
      const receiptAmount = findFinalAmountByVisualOrder()
      if (receiptAmount && receiptAmount > 0) return receiptAmount
    }
    return null
  },
  getCurrency: () => 'EUR'
}

// Rituals checkout detection
const ritualsDetector: CheckoutDetector = {
  isCheckoutPage: () => {
    const url = window.location.href
    // Rituals cart and checkout flows
    const hasUrl = url.includes('/cart') || url.includes('/checkout')
    // Stable container in the order totals sidebar
    const hasTotals = document.querySelector('.order-total .cart-footer-total') !== null
    return hasUrl || hasTotals
  },
  extractTotal: () => {
    // Primary: exact node provided (final total row)
    const exact = document.querySelector('.order-total .cart-footer-total .cart-footer__item--val.order-value.js-order-value') as HTMLElement | null
    if (exact) {
      const attr = exact.getAttribute('data-price-without-shipping')
      if (attr && /^\d+(?:[.,]\d+)?$/.test(attr)) {
        const num = parseFloat(attr.replace(',', '.'))
        if (Number.isFinite(num) && num > 0) return num
      }
      const amt = parseAmount(exact.textContent)
      if (amt && amt > 0) return amt
    }

    // Secondary: search within the order totals summary container near label "Totaal"
    const container = document.querySelector('.js-order-summary.order-totals-summary, .order-total')
    if (container) {
      const text = container.textContent || ''
      const totalNear = text.match(/totaal[^€]*€\s*([\d.,]+)/i)
      if (totalNear) {
        const amt = parseAmount(totalNear[1])
        if (amt && amt > 0) return amt
      }
    }

    // Fallback: use visual receipt heuristic scoped to the sidebar
    const scoped = (() => {
      const roots = document.querySelectorAll('.order-total, .order-totals, .js-order-summary.order-totals-summary')
      for (const _el of Array.from(roots)) {
        const tmp = findFinalAmountByVisualOrder()
        if (tmp && tmp > 0) return tmp
      }
      return null
    })()
    if (scoped && scoped > 0) return scoped

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
            url.includes('/basket') ||
            document.querySelector('[class*="checkout"], [class*="order"], [class*="payment"], [data-qa*="order-summary"], [data-qa*="total"]') !== null)
  },
  extractTotal: () => {
    // Primary: resolve pair using explicit label and amount in the same container
    const labelEl = document.querySelector('[data-qa="order-summary-item-total-label"]')
    if (labelEl) {
      let scope: Element | null = (labelEl as HTMLElement).closest('div, section, li')
      for (let i = 0; i < 4 && scope; i++) {
        const amountEl = scope.querySelector('[data-qa="order-summary-item-total-amount"]') as HTMLElement | null
        if (amountEl) {
          const amt = parseAmount(amountEl.textContent)
          if (amt && amt > 0) return amt
        }
        scope = scope.parentElement
      }
    }

    // Secondary: exact node for final total (only by data-qa to avoid matching subtotal rows)
    const exact = document.querySelector('[data-qa="order-summary-item-total-amount"]') as HTMLElement | null
    if (exact) {
      const amt = parseAmount(exact.textContent)
      if (amt && amt > 0) return amt
    }

    // Secondary: within order summary look for label 'Totaal'
    const orderSummary = document.querySelector('[data-qa*="order-summary"], [class*="order-summary"]')
    if (orderSummary) {
      const rows = orderSummary.querySelectorAll('div, span, strong')
      for (const row of Array.from(rows)) {
        const txt = (row.textContent || '').toLowerCase()
        if (/\btotaal\b/.test(txt) && /€/.test(txt)) {
          const amt = parseAmount(row.textContent)
          if (amt && amt > 0) return amt
        }
      }
      // If label is separate from amount, find the closest amount element in the same row
      const totalLabel = Array.from(rows).find((el) => /\btotaal\b/i.test((el.textContent || '')))
      if (totalLabel) {
        const container = totalLabel.closest('div, section, li') || orderSummary
        const priceEl = container?.querySelector('[data-qa="order-summary-item-total-amount"], strong, span') as HTMLElement | null
        const amt = parseAmount(priceEl?.textContent)
        if (amt && amt > 0) return amt
      }
    }

    // Fallbacks
    const near = (orderSummary?.textContent || document.body.textContent || '').match(/totaal[^€]*([€]?[\s\d.,-]+)/i)
    if (near) {
      const amt = parseAmount(near[1])
      if (amt && amt > 0) return amt
    }
    const v = findFinalAmountByVisualOrder()
    if (v && v > 0) return v
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
  if (hostname.includes('douglas')) return douglasDetector
  if (hostname.includes('gamma')) return gammaDetector
  if (hostname.includes('vvvcadeaukaarten')) return vvvCadeaukaartenDetector
  if (hostname.includes('wehkamp')) return wehkampDetector
  if (hostname.includes('rituals')) return ritualsDetector
  if (hostname.includes('thuisbezorgd')) return thuisbezorgdDetector
  return genericDetector
}

function detectCheckout(): CheckoutInfo | null {
  // Kick off support check in the background but do not block detection
  if (!__wsSupportChecked) requestMerchantSupportCheck()

  const hostname = window.location.hostname
  const url = window.location.href
  
  // Skip browser internal pages
  if (url.startsWith('chrome://') || 
      url.startsWith('chrome-extension://') || 
      url.startsWith('brave://') || 
      url.startsWith('edge://') || 
      url.startsWith('firefox://') || 
      url.startsWith('moz-extension://') || 
      url.startsWith('about:') || 
      url.startsWith('file://')) {
    console.log('[Woolsocks] Skipping browser internal page:', url)
    return null
  }
  
  console.log('[Woolsocks] detectCheckout called for hostname:', hostname, 'url:', url)

  const detector = getDetector(hostname)
  console.log('[Woolsocks] Using detector for hostname:', hostname)
  const isCheckout = detector.isCheckoutPage()
  console.log('[Woolsocks] isCheckoutPage result:', isCheckout)
  
  if (!isCheckout) return null

  const extracted = detector.extractTotal()
  console.log('[Woolsocks] detector.extractTotal() returned:', extracted)
  let total = extracted && extracted > 0 ? extracted : 0
  console.log('[Woolsocks] final total after processing:', total)

  // Do not auto-normalize amounts >= 100; sites like Zalando legitimately have totals ≥ 100

  const checkoutInfo = {
    total,
    currency: detector.getCurrency(),
    merchant: hostname,
    timestamp: Date.now()
  }
  
  console.log('[Woolsocks] returning checkoutInfo:', checkoutInfo)
  return checkoutInfo
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
    // Respect user setting: QA bypass dismissal
    try {
      chrome.storage.local.get('user', (res) => {
        const qaBypass = !!res?.user?.settings?.qaBypassVoucherDismissal
        if (!qaBypass) {
          if (isVoucherDismissed(window.location.hostname)) return
        }
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
      })
    } catch {
      if (isVoucherDismissed(window.location.hostname)) return
      if (checkoutInfo.total && checkoutInfo.total > 0) {
        if (__wsLastSentTotal !== checkoutInfo.total) {
          chrome.runtime.sendMessage({ type: 'CHECKOUT_DETECTED', checkoutInfo })
          __wsLastSentTotal = checkoutInfo.total
          __wsClearRetry()
          const cashbackPrompt = document.getElementById('woolsocks-cashback-prompt')
          if (cashbackPrompt) cashbackPrompt.remove()
        }
      } else {
        __wsScheduleRetry(debouncedCheckForCheckout)
      }
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
