// Background service worker: URL detection, icon state, messaging
import { findPartnerByHostname } from '../shared/partners'
import type { IconState, MockUser, ActivationRecord } from '../shared/types'
import { handleActivateCashback } from './activate-cashback'

type IconPaths = string | { 16: string; 32: string; 48: string }

// Map states to your provided multi-resolution icons
const ICONS: Record<IconState, IconPaths> = {
  neutral: { 16: 'icons/icon-grey-16.png', 32: 'icons/icon-grey-32.png', 48: 'icons/icon-grey-48.png' },
  available: { 16: 'icons/icon-yellow-16.png', 32: 'icons/icon-yellow-32.png', 48: 'icons/icon-yellow-48.png' },
  active: { 16: 'icons/icon-green-16.png', 32: 'icons/icon-green-32.png', 48: 'icons/icon-green-48.png' },
  // We no longer use a distinct voucher icon; treat as available (yellow)
  voucher: { 16: 'icons/icon-yellow-16.png', 32: 'icons/icon-yellow-32.png', 48: 'icons/icon-yellow-48.png' },
  // Fallback error icon (single size asset available)
  error: 'icons/state-error-48.png',
}

function setIcon(state: IconState, tabId?: number) {
  const path = ICONS[state] || ICONS.neutral
  const titleMap: Record<IconState, string> = {
    neutral: 'No deals on this site',
    available: 'Cashback available — click to activate',
    active: 'Cashback activated',
    voucher: 'Voucher deal available',
    error: 'Attention needed',
  }
  // Pass multi-size path map when available; Chrome will pick best size
  chrome.action.setIcon({ path: path as any, tabId })
  chrome.action.setTitle({ title: titleMap[state], tabId })
}

chrome.runtime.onInstalled.addListener(() => {
  // Initialize defaults
  const defaultUser: MockUser = {
    isLoggedIn: false,
    totalEarnings: 0,
    activationHistory: [],
    settings: {
      showCashbackPrompt: true,
      showVoucherPrompt: true,
    },
  }
  chrome.storage.local.set({ user: defaultUser })
})

// Track injected scripts to prevent duplicates
const injectedScripts = new Set<number>()

async function evaluateTab(tabId: number, url?: string | null) {
  if (!url) {
    setIcon('neutral', tabId)
    return
  }
  
  try {
    const u = new URL(url)
    const partner = findPartnerByHostname(u.hostname)
    
    if (partner) {
      // Only inject script if not already injected for this tab
      if (!injectedScripts.has(tabId)) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content/checkout.js']
        })
          injectedScripts.add(tabId)
          console.log(`Checkout script injected for tab ${tabId}`)
      } catch (error) {
        // Script might already be injected, ignore
        console.log('Script injection skipped:', error)
        }
      }
      
      // Check if cashback is already active (no automatic prompts)
      const result = await chrome.storage.local.get('user')
      const user: MockUser = result.user || { isLoggedIn: false, totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
      
      const activeActivation = user.activationHistory.find(
        activation => activation.partner === partner.name && activation.status === 'active'
      )
      
      if (activeActivation) {
        setIcon('active', tabId)
  } else if (partner.voucherAvailable && u.pathname.includes('checkout')) {
        // Keep icon as 'available' (yellow) at checkout until voucher is actually purchased
        setIcon('available', tabId)
      } else {
        setIcon('available', tabId)
      }
    } else {
      setIcon('neutral', tabId)
    }
  } catch {
    setIcon('neutral', tabId)
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    evaluateTab(tabId, changeInfo.url ?? tab.url)
  }
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)
  await evaluateTab(activeInfo.tabId, tab.url)
})

// Clean up injected scripts when tabs are removed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedScripts.delete(tabId)
  console.log(`Cleaned up script tracking for tab ${tabId}`)
})

// Clean up when extension is disabled/uninstalled
chrome.runtime.onSuspend.addListener(() => {
  injectedScripts.clear()
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return
  
  try {
    const u = new URL(tab.url)
    const partner = findPartnerByHostname(u.hostname)
    
    if (!partner) {
      setIcon('neutral', tab.id)
      return
    }
    
    // Get current user state
    const result = await chrome.storage.local.get('user')
    const user: MockUser = result.user || { isLoggedIn: false, totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
    
    // Check if already active
    const activeActivation = user.activationHistory.find(
      activation => activation.partner === partner.name && activation.status === 'active'
    )
    
    if (activeActivation) {
      // Already active, show popup with status
      chrome.action.openPopup()
    } else {
      // Activate cashback
      const newActivation: ActivationRecord = {
        partner: partner.name,
        timestamp: Date.now(),
        cashbackRate: partner.cashbackRate,
        estimatedEarnings: 0, // Will be updated when purchase is made
        status: 'active'
      }
      
      user.activationHistory.push(newActivation)
      await chrome.storage.local.set({ user })
      
      setIcon('active', tab.id)
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'Cashback Activated!',
        message: `You'll earn ${partner.cashbackRate}% cashback on ${partner.name} purchases`
      })

      // Voucher offers will be shown automatically when checkout is detected
      // No need for fallback logic here - let the checkout detection handle it
    }
  } catch (error) {
    console.error('Error activating cashback:', error)
    setIcon('error', tab.id)
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SET_ICON' && typeof message.state === 'string') {
    setIcon(message.state as IconState)
    sendResponse({ ok: true })
  } else if (message?.type === 'CHECKOUT_DETECTED') {
    handleCheckoutDetected(message.checkoutInfo, _sender.tab?.id)
    sendResponse({ ok: true })
  } else if (message?.type === 'ACTIVATE_CASHBACK') {
    // coerce to any to satisfy handler signature expecting string; it's safe internally
    handleActivateCashback(message.partner, _sender.tab?.id, setIcon as unknown as (state: string, tabId?: number) => void)
    sendResponse({ ok: true })
  } else if (message?.type === 'OPEN_VOUCHER_PRODUCT') {
    const { url } = message
    if (url && typeof url === 'string') {
      chrome.tabs.create({ url })
      sendResponse({ ok: true })
    } else {
      sendResponse({ ok: false, error: 'Missing URL' })
    }
  }
})

// Removed unused handleShowProfile function

async function handleCheckoutDetected(checkoutInfo: any, tabId?: number) {
  if (!tabId) return
  
  // checkoutInfo.merchant is already a hostname (e.g., "zalando.com"),
  // so we should not wrap it in new URL(...)
  const partner = findPartnerByHostname(checkoutInfo.merchant)
  if (!partner || !partner.voucherAvailable) return
  
  // Check user settings
  const result = await chrome.storage.local.get('user')
  const user: MockUser = result.user || { isLoggedIn: false, totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
  
  if (!user.settings.showVoucherPrompt) return
  
  // Find the best voucher for this order total
  const availableVouchers = partner.vouchers.filter(v => v.available)
  if (availableVouchers.length === 0) return
  
  // Find voucher (supports fixed and flex types)
  function computeBestVoucherAmount(v: any, orderTotal: number): number {
    if (v.type === 'fixed') return v.denomination
    const step = v.step || 1
    const capped = Math.min(orderTotal, v.maxAmount)
    const stepped = Math.floor(capped / step) * step
    return Math.max(v.minAmount, stepped)
  }

  // Choose the voucher that yields the highest applicable amount without exceeding the order total
  let bestVoucher = availableVouchers[0]
  let bestAmount = computeBestVoucherAmount(bestVoucher, checkoutInfo.total)
  for (const v of availableVouchers) {
    const amount = computeBestVoucherAmount(v, checkoutInfo.total)
    if (amount > bestAmount) {
      bestVoucher = v
      bestAmount = amount
    }
  }

  const checkoutTotal = checkoutInfo.total
  
  // Inject voucher offer prompt with checkout total prefilled
  chrome.scripting.executeScript({
    target: { tabId },
    func: showVoucherOffer,
    args: [partner, bestVoucher, checkoutTotal]
  })
}

function showVoucherOffer(partner: any, voucher: any, amount: number) {
  // Prevent multiple instances - check if already exists
  const existing = document.getElementById('woolsocks-voucher-prompt')
  if (existing) {
    console.log('Voucher prompt already exists, skipping creation')
    return
  }
  
  // Check if we already have a voucher offer flag
  if ((window as any).showVoucherOfferInjected) {
    console.log('Voucher offer already injected, skipping creation')
    return
  }
  
  console.log('Creating new voucher prompt')
  
  // Set flag to prevent multiple instances
  ;(window as any).showVoucherOfferInjected = true
  
  // Global cleanup function for easy access
  ;(window as any).closeVoucherDialog = () => {
    console.log('Global close function called')
    const prompt = document.getElementById('woolsocks-voucher-prompt')
    if (prompt) {
      // Add fade out animation
      prompt.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'
      prompt.style.opacity = '0'
      prompt.style.transform = 'scale(0.95) translateY(-10px)'
      
      setTimeout(() => {
        prompt.remove()
        // Keep flag set for a cooldown period to prevent immediate recreation
        setTimeout(() => {
          ;(window as any).showVoucherOfferInjected = false
          console.log('Dialog cooldown ended, can create new dialog')
        }, 1000) // 1 second cooldown
      }, 300) // Wait for animation to complete
    }
  }
  
  // Initialize global variables for current amount and cashback
  ;(window as any).currentAmount = amount
  ;(window as any).currentCashback = amount * (voucher.cashbackRate / 100)
  
  // Avoid overlap with cashback prompt by removing it when voucher appears
  const existingCashback = document.getElementById('woolsocks-cashback-prompt')
  if (existingCashback) {
    const cloned = existingCashback.cloneNode(true)
    existingCashback.parentNode?.replaceChild(cloned, existingCashback)
    existingCashback.remove()
  }
  
  const prompt = document.createElement('div')
  prompt.id = 'woolsocks-voucher-prompt'
  prompt.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 310px;
    height: auto;
    background: #FDC408;
    border: 4px solid #FDC408;
    border-radius: 16px;
    box-shadow: -2px 2px 4px rgba(0,0,0,0.08);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
    transition: opacity 0.25s ease-out, transform 0.25s ease-out, height 0.25s ease;
    flex-direction: column;
    overflow: hidden;
  `

  // Calculate displayed percentage — use voucher rate (matches Figma chip)
  const cashback = amount * (voucher.cashbackRate / 100)
  const cashbackPercentage = Math.round(voucher.cashbackRate)
  
      // Get merchant logo from partner data or fallback
      // removed merchant logo rendering
  
      const getVoucherImage = (voucher: any) => {
        if (voucher.imageUrl) {
          // Voucher card with overlaid percentage pill matching Figma
          return `
            <div style="position: relative; width: 140px; height: 120px; display: flex; align-items: flex-start; justify-content: center;">
              <div style="position: relative; z-index: 1; width: 140px; height: 88px; background: #FFFFFF; border: 0; border-radius: 12px; box-shadow: 0 6px 12px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center;">
                <img src="${voucher.imageUrl}" alt="${partner.name} voucher" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;">
              </div>
              <div style="position: absolute; z-index: 0; left: 50%; bottom: 0; transform: translateX(-50%); width: 140px; background: rgba(253,196,8,0.2); border: 0; border-radius: 0 0 8px 8px; padding: 8px 0 6px 0; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.06);">
                <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 12px; color: #100B1C; letter-spacing: 0.1px;">${cashbackPercentage}%</span>
              </div>
            </div>
          `
        }
        // Fallback to CSS-generated voucher image
        const images: { [key: string]: string } = {
          'MediaMarkt': `
            <div style="position: relative; width: 140px; height: 120px; display: flex; align-items: flex-start; justify-content: center;">
              <div style="position: relative; z-index: 1; width: 140px; height: 88px; background: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; background: #E60012; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: bold; font-size: 10px;">M</span>
                </div>
              </div>
              <div style="position: absolute; z-index: 0; left: 50%; bottom: -16px; transform: translateX(-50%); width: 140px; background: #F9EFD0; border: 1px solid #F3E1A8; border-radius: 0 0 8px 8px; padding: 8px 0 4px 0; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 14px; color: #100B1C; letter-spacing: 0.1px;">${cashbackPercentage}%</span>
              </div>
            </div>
          `,
          'Zalando': `
            <div style="position: relative; width: 140px; height: 120px; display: flex; align-items: flex-start; justify-content: center;">
              <div style="position: relative; z-index: 1; width: 140px; height: 88px; background: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; background: white; border-radius: 2px; display: flex; align-items: center; justify-content: center; transform: rotate(45deg);"></div>
              </div>
              <div style="position: absolute; z-index: 0; left: 50%; bottom: 0; transform: translateX(-50%); width: 140px; background: rgba(253,196,8,0.2); border: 0; border-radius: 0 0 8px 8px; padding: 8px 0 6px 0; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.06);">
                <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 12px; color: #100B1C; letter-spacing: 0.1px;">${cashbackPercentage}%</span>
              </div>
            </div>
          `,
          'Amazon': `
            <div style="position: relative; width: 140px; height: 112px; display: flex; align-items: flex-start; justify-content: center;">
              <div style="position: relative; z-index: 1; width: 140px; height: 88px; background: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; background: white; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #FF9900; font-weight: bold; font-size: 10px;">A</span>
                </div>
              </div>
              <div style="position: absolute; z-index: 0; left: 50%; bottom: -12px; transform: translateX(-50%); background: #F9EFD0; border: 1px solid #F3E1A8; border-radius: 8px; padding: 8px 16px 4px 16px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 14px; color: #100B1C; letter-spacing: 0.1px;">${cashbackPercentage}%</span>
              </div>
            </div>
          `,
          'Coolblue': `
            <div style="position: relative; width: 140px; height: 112px; display: flex; align-items: flex-start; justify-content: center;">
              <div style="position: relative; z-index: 1; width: 140px; height: 88px; background: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; background: white; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #0032FF; font-weight: bold; font-size: 10px;">C</span>
                </div>
              </div>
              <div style="position: absolute; z-index: 0; left: 50%; bottom: -12px; transform: translateX(-50%); background: #F9EFD0; border: 1px solid #F3E1A8; border-radius: 8px; padding: 8px 16px 4px 16px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 14px; color: #100B1C; letter-spacing: 0.1px;">${cashbackPercentage}%</span>
              </div>
            </div>
          `
        }
        return images[partner.name] || images['MediaMarkt']
      }

  // Utility reserved for future cross-state swaps

  function renderWaiting(parentEl: HTMLElement, currentAmount: number) {
    // New "Ready to pay" UI for waiting state
    parentEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; height: 33px;">
        <div style="display: flex; align-items: center; color: #100B1C;">
          <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 14px;">Woolsocks</span>
        </div>
        <div id="close-voucher" style="width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#0D0E0F" stroke-width="1.33" stroke-linecap="round"><path d="M1 1L7 7M7 1L1 7"></path></svg>
        </div>
      </div>
      <div id="ws-waiting" style="flex: 1; background: white; margin: 0 0 16px 0; display: flex; flex-direction: column; border-top-left-radius: 16px; border-top-right-radius: 16px; opacity:1; transform:translateY(0); transition: opacity 0.2s, transform 0.2s;">
        <div style="padding: 16px;">
          <div style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; font-size: 28px; color: #100B1C; text-align: left;">Ready to pay</div>
          <div style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 14px; color: #8F95A3; margin: 8px 0 16px;">This page will show your voucher details automatically when the payment is confirmed</div>
          <div style="display:flex; justify-content:center; margin-bottom: 16px;">
            <!-- QR image from extension assets with fallback -->
            <div style="border-radius: 8px; background: #fff; border: 8px solid #F2F3F5; box-shadow: 0 1px 2px rgba(0,0,0,0.06);">
              <img id="ws-qr" alt="Payment QR" style="display:block; width: 232px; height: 232px; object-fit: contain;" />
            </div>
          </div>
          <div style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 16px; color: #100B1C; margin-bottom: 8px; text-align:center;">Scan this QR with your phone</div>
          <div style="display:flex; gap:8px; margin-top: 16px;">
            <button id="ws-reset" style="height: 32px; background: transparent; color: #100B1C; border: 1px solid #D9D9D9; border-radius: 6px; padding: 0 12px; cursor: pointer;">Reset</button>
          </div>
        </div>
      </div>
    `
    // Set QR image to provided asset if available; otherwise fallback to inline SVG
    const qrImg = parentEl.querySelector('#ws-qr') as HTMLImageElement | null
    if (qrImg) {
      const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="232" height="232" viewBox="0 0 232 232"><rect width="232" height="232" fill="#fff"/><g transform="translate(16,16)"><rect width="200" height="200" fill="#000" opacity="0.06"/><g fill="#000">${Array.from({length:64}).map((_,i)=>`<rect x="${(i%8)*24}" y="${Math.floor(i/8)*24}" width="12" height="12" opacity="${(i*37%5)/5}"/>`).join('')}</g></g><rect x="76" y="76" width="80" height="54" rx="8" fill="#fff" stroke="#eee"/><rect x="82" y="86" width="68" height="34" rx="6" fill="#ff008a"/><text x="116" y="108" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="800" fill="#fff">iDEAL</text></svg>`
      const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
      // You can set window.__woolsocksProvidedQr in DevTools to the provided image data URL
      // For the attached asset, set this once at runtime to that image's data URL
      const provided = (window as any).__woolsocksProvidedQr as string | undefined
      qrImg.src = provided || dataUrl
      // Prototype shortcut: clicking the QR advances to a details confirmation view
      qrImg.style.cursor = 'pointer'
      qrImg.addEventListener('click', () => {
        renderCheckoutDetails(parentEl, currentAmount)
      })
    }
    const resetBtn = parentEl.querySelector('#ws-reset') as HTMLButtonElement | null
    resetBtn?.addEventListener('click', () => {
      chrome.storage.session.remove('voucherIntent')
      // Re-render the full verify view
      parentEl.innerHTML = ''
      prompt.remove()
      ;(window as any).showVoucherOfferInjected = false
      // Recreate the prompt fresh with verify screen
      showVoucherOffer(partner, voucher, currentAmount)
    })
    // Removed "I have the voucher" button
    const closeBtn2 = parentEl.querySelector('#close-voucher') as HTMLElement | null
    closeBtn2?.addEventListener('click', () => {
      // Return to reminder state instead of closing the widget
      chrome.storage.session.remove('voucherIntent')
      parentEl.innerHTML = ''
      const root = document.getElementById('woolsocks-voucher-prompt')
      if (root) {
        root.remove()
      }
      ;(window as any).showVoucherOfferInjected = false
      showVoucherOffer(partner, voucher, currentAmount)
    })
  }

  function renderCheckoutDetails(parentEl: HTMLElement, currentAmount: number) {
    const code = (Math.random().toString(36).substring(2, 14).toUpperCase().match(/.{1,4}/g)?.join('-')) || '1234-8901234567'
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    // Update outer shell color to green to match Figma for this state
    const shell = document.getElementById('woolsocks-voucher-prompt')
    if (shell) {
      shell.style.background = '#27AE60'
      shell.style.border = '4px solid #27AE60'
    }
    parentEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; height: 33px; background:#15a34a;">
        <div style="display: flex; align-items: center; color: #ffffff;">
          <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 14px;">Woolsocks</span>
        </div>
        <div id="close-voucher" style="width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#ffffff" stroke-width="1.33" stroke-linecap="round"><path d="M1 1L7 7M7 1L1 7"></path></svg>
        </div>
      </div>
      <div style="flex: 1; background: white; margin: 0 0 16px 0; display: flex; flex-direction: column; border-top-left-radius: 16px; border-top-right-radius: 16px;">
        <div style="padding: 16px;">
          <div style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; font-size: 24px; color: #100B1C; text-align: left; margin: 0 0 12px;">Ready to checkout!</div>
          <div style="display:flex; justify-content:center; margin: 12px 0 12px;">
            <div style="transform: scale(0.9); transform-origin: center;">${getVoucherImage(voucher)}</div>
          </div>
          <div style="text-align:center; font-weight:600; margin-bottom:16px;">Zalando Cadeaukaart</div>
          <div id="ws-voucher-block" style="background:#F2F3F5; border-radius:10px; padding:12px 14px; margin-bottom:12px; cursor: pointer;">
            <div style="font-size:12px; color:#666; margin-bottom:6px; display:flex; align-items:center; gap:6px;">VOUCHER 
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8F95A3" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </div>
            <div id="ws-voucher-code" style="font-weight:700; letter-spacing:0.3px;">${code}</div>
          </div>
          <div id="ws-pin-block" style="background:#EAF3FF; border-radius:10px; padding:12px 14px; margin-bottom:12px; cursor: pointer;">
            <div style="font-size:12px; color:#666; margin-bottom:6px; display:flex; align-items:center; gap:6px;">PIN 
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8F95A3" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </div>
            <div id="ws-pin-value" style="font-weight:700; letter-spacing:0.3px;">${pin}</div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin: 20px 0;">
            <div>
              <div style="font-size:12px; color:#8F95A3;">Purchase value</div>
              <div style="font-weight:800; font-size:18px;">€${currentAmount.toFixed(2).replace('.', ',')}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:12px; color:#8F95A3;">Exp date</div>
              <div>27/12/2026</div>
            </div>
          </div>
          <div style="margin-top: 16px; text-align:left;">
            <div style="font-weight:700; margin-bottom:6px; text-align:left;">How to use the gift card?</div>
            <ol style="padding-left: 0; margin:0; color:#333; font-size:14px; line-height:1.5; list-style-position: inside;">
              <li>Copy the vouchercode into the giftcard input field at checkout.</li>
              <li>If requested, also paste the PIN.</li>
              <li>Alternatively, you can do this in your account/settings.</li>
            </ol>
          </div>
        </div>
      </div>
    `
    chrome.runtime.sendMessage({ type: 'SET_ICON', state: 'active' })
    // Copy interactions for voucher and PIN + hover/feedback states
    const voucherBlock = parentEl.querySelector('#ws-voucher-block') as HTMLElement | null
    const pinBlock = parentEl.querySelector('#ws-pin-block') as HTMLElement | null
    const voucherCodeEl = parentEl.querySelector('#ws-voucher-code') as HTMLElement | null
    const pinValueEl = parentEl.querySelector('#ws-pin-value') as HTMLElement | null
    const copy = async (text: string) => {
      try { await navigator.clipboard.writeText(text) } catch {}
    }
    const attachInteractive = (block: HTMLElement | null, valueEl: HTMLElement | null, hoverBg: string) => {
      if (!block || !valueEl) return
      const originalBg = block.style.background || ''
      const originalText = valueEl.textContent || ''
      block.addEventListener('mouseenter', () => {
        block.style.background = hoverBg
      })
      block.addEventListener('mouseleave', () => {
        block.style.background = originalBg
      })
      block.addEventListener('click', async () => {
        const text = valueEl.textContent?.trim() || ''
        if (!text) return
        await copy(text)
        // Feedback state
        valueEl.textContent = 'Copied!'
        block.style.transition = 'background 0.2s ease'
        block.style.background = hoverBg
        setTimeout(() => {
          valueEl.textContent = originalText
          block.style.background = originalBg
        }, 1000)
      })
    }
    attachInteractive(voucherBlock, voucherCodeEl, '#E7EBF0')
    attachInteractive(pinBlock, pinValueEl, '#D9EFFF')

    // Auto-insert voucher code into merchant input (best-effort)
    const autoInsertVoucher = (voucherCode: string, voucherPin?: string) => {
      const isVisible = (el: Element) => {
        const rect = (el as HTMLElement).getBoundingClientRect()
        const style = window.getComputedStyle(el as HTMLElement)
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      }
      const dispatchAll = (el: HTMLInputElement) => {
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }))
      }
      const fieldSelectors = [
        'input[name*="voucher" i]','input[id*="voucher" i]','input[placeholder*="voucher" i]',
        'input[name*="gift" i]','input[id*="gift" i]','input[placeholder*="gift" i]',
        'input[name*="cadeau" i]','input[id*="cadeau" i]','input[placeholder*="cadeau" i]',
        'input[name*="coupon" i]','input[id*="coupon" i]','input[placeholder*="coupon" i]',
        'input[name*="promo" i]','input[id*="promo" i]','input[placeholder*="promo" i]',
        'input[name*="kortings" i]','input[id*="kortings" i]','input[placeholder*="kortings" i]'
      ]
      const applyButtonTexts = ['apply','use','redeem','confirm','add','inwisselen','toepassen','gebruiken','toevoegen']
      const findField = (): HTMLInputElement | null => {
        for (const sel of fieldSelectors) {
          const list = Array.from(document.querySelectorAll(sel)) as HTMLInputElement[]
          const candidate = list.find(el =>
            el.type !== 'hidden' && !el.readOnly && !el.disabled && isVisible(el)
          )
          if (candidate) return candidate
        }
        return null
      }
      const clickApply = () => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')) as HTMLElement[]
        const btn = buttons.find(b => {
          const text = (b as HTMLButtonElement).innerText || (b as HTMLInputElement).value || ''
          const t = text.trim().toLowerCase()
          return applyButtonTexts.some(w => t.includes(w))
        })
        if (btn && isVisible(btn)) (btn as HTMLElement).click()
      }
      const tryOnce = () => {
        const field = findField()
        if (field) {
          field.focus()
          field.value = voucherCode
          dispatchAll(field)
          // Optional: fill PIN if a separate field is present
          if (voucherPin) {
            const pinField = (['pin','security','pincode','cadeaupin'] as string[]).map(k =>
              [`input[name*="${k}" i]`,`input[id*="${k}" i]`,`input[placeholder*="${k}" i]`]
            ).flat().map(sel => Array.from(document.querySelectorAll(sel)) as HTMLInputElement[])
             .flat().find(el => el !== field && el.type !== 'hidden' && !el.readOnly && !el.disabled && isVisible(el))
            if (pinField) {
              pinField.focus()
              pinField.value = voucherPin
              dispatchAll(pinField)
            }
          }
          // Try to click an apply/redeem style button
          clickApply()
          return true
        }
        return false
      }
      // Retry over a short window to handle SPA/lazy-loaded forms
      const start = Date.now()
      const timeoutMs = 8000
      const tick = () => {
        if (tryOnce()) return
        if (Date.now() - start < timeoutMs) setTimeout(tick, 500)
      }
      // Delay slightly so page settles
      setTimeout(tick, 300)
    }

    // Kick off auto insert with our generated code
    autoInsertVoucher(code, pin)
    // Close returns to reminder state
    const closeFromDetails = parentEl.querySelector('#close-voucher') as HTMLElement | null
    closeFromDetails?.addEventListener('click', () => {
      chrome.storage.session.remove('voucherIntent')
      parentEl.innerHTML = ''
      const root = document.getElementById('woolsocks-voucher-prompt')
      if (root) root.remove()
      ;(window as any).showVoucherOfferInjected = false
      showVoucherOffer(partner, voucher, currentAmount)
    })
  }

  // Removed details renderer for now (handled by external page)

  prompt.innerHTML = `
        <!-- Header with Woolsocks logo and controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; height: 33px;">
          <!-- Woolsocks Logo -->
          <div style="display: flex; align-items: center; color: #100B1C;">
            <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 14px;">Woolsocks</span>
          </div>
          
          <!-- Controls -->
          <div style="display: flex; gap: 0;">
            <div style="width: 33px; height: 33px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#100B1C" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div style="width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D0E0F" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <div id="close-voucher" style="width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color 0.2s ease;" onmouseover="this.style.backgroundColor='rgba(0,0,0,0.1)'" onmouseout="this.style.backgroundColor='transparent'">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#0D0E0F" stroke-width="1.33" stroke-linecap="round">
                <path d="M1 1L7 7M7 1L1 7"></path>
              </svg>
            </div>
          </div>
        </div>

    <!-- Main Content -->
    <div id="ws-container" style="flex: 1; background: white; margin: 0; display: flex; flex-direction: column; border-top-left-radius: 16px; border-top-right-radius: 16px; overflow: hidden; position: relative;">
          <!-- Reminder entry state -->
          <div id="ws-reminder" style="padding: 16px; display: block; opacity:1; transform: translateY(0); transition: opacity 0.2s, transform 0.2s;">
            <div style="text-align:center; margin-top: 8px; color: #846CF8; font-weight: 600; font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px;">You can save</div>
            <div style="display:flex; justify-content:center; margin-top:8px;">
              <div style="background:#6F5CF1; color:#fff; border-radius:16px; padding:10px 14px; font-size:26px; font-weight:800;">€${cashback.toFixed(2).replace('.', ',')}</div>
            </div>
            <div style="text-align:center; margin-top:8px; color:#846CF8; font-weight:600; font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px;">on this purchase</div>
            <button id="ws-reminder-cta" style="margin-top:14px; width: 100%; height: 40px; background: #211940; color: white; border: none; border-radius: 10px; font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">Get it</button>
          </div>

          <!-- Verify state container (hidden until CTA) -->
          <div id="ws-verify" style="display:none; opacity:0; transform: translateY(6px); transition: opacity 0.2s, transform 0.2s;">
          <!-- Partner Header (left-aligned, no service switch) -->
          <div style="display: flex; align-items: center; padding: 12px 16px 4px 16px; height: 32px;">
            <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 12px; color: #100B1C;">${partner.name}</span>
          </div>

          <!-- Removed centered brand logo -->

          <!-- Dynamic Voucher Card -->
          <div style="display: flex; flex-direction: column; align-items: center; margin: 0 20px;">
            <!-- Dynamic Voucher Image -->
            ${getVoucherImage(voucher)}
            
            <!-- Cashback Percentage Display moved into card overlay -->
        
        <!-- Dynamic Voucher Info -->
        <div style="text-align: center; margin-top: 16px;">
          <div style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 14px; color: #100B1C; margin-bottom: 8px;">${partner.name} Cadeaukaart</div>
          <button id="ws-open-product" style="background:#E5F2FF; color:#0084FF; border:none; border-radius:8px; padding:8px 12px; font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight:600; font-size:12px; cursor:pointer;">View details</button>
        </div>
      </div>

      <!-- Amount Input (Editable) -->
      <div style="padding: 16px;">
        <div style="margin-bottom: 8px;">
          <label style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 14px; color: #100B1C;">How much is the purchase?</label>
        </div>
        <div style="background: #FAFAFA; border: 1px solid #E0E0E0; border-radius: 6px; height: 56px; display: flex; align-items: center; padding: 0 16px; transition: all 0.2s ease;">
          <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 400; font-size: 17px; color: #100B1C; margin-right: 4px;">€</span>
          <input id="amount-input" type="text" inputmode="decimal" value="${amount}" style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 400; font-size: 17px; color: #100B1C; background: transparent; border: none; outline: none; flex: 1; text-align: right;" placeholder="0.00" title="Enter amount between €${voucher.minAmount || 1} and €${voucher.maxAmount || 10000}" autocomplete="off">
        </div>
        <div style="margin-top: 4px; font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 400; font-size: 12px; color: #666; text-align: right;">
          Min: €${voucher.minAmount || 1} • Max: €${voucher.maxAmount || 10000}
        </div>
      </div>

      <!-- Dynamic Cashback Info -->
      <div style="padding: 0 16px; margin-bottom: 12px;">
        <div id="cashback-display" style="display: flex; align-items: baseline; justify-content: center; gap: 4px; height: 43px; padding: 8px 16px; border-radius: 8px; background: transparent;">
          <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 400; font-size: 16px; color: #8564FF;">You'll get</span>
          <div style="background: #8564FF; border-radius: 6px; padding: 2px 4px;">
            <span id="cashback-amount" style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 400; font-size: 16px; color: white;">€${cashback.toFixed(2).replace('.', ',')}</span>
          </div>
          <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 400; font-size: 16px; color: #8564FF;">of cashback</span>
        </div>
      </div>

      <!-- Buy Button -->
      <div style="padding: 0 16px 16px 16px;">
        <button id="buy-voucher" style="width: 100%; height: 40px; background: #211940; color: white; border: none; border-radius: 4px; font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap:8px;">
          Continue
        </button>
      </div>
      </div>
    </div>

    <!-- Collapsible Footer Links - HIDDEN FOR NOW -->
    <!--
    <div style="background: white; display: flex; flex-direction: column;">
      <div id="conditions-toggle" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; cursor: pointer;">
        <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 12px; color: #100B1C;">Conditions</span>
        <svg id="conditions-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" style="transform: rotate(0deg); transition: transform 0.2s;">
          <path d="M5 3L10 7L5 11" stroke="#0F0B1C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div id="conditions-content" style="display: none; padding: 0 16px 16px 16px; background: #FAFAFA;">
        <p style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 400; font-size: 12px; color: #666; margin: 0; line-height: 1.4;">${voucher.conditions}</p>
      </div>
    </div>
    -->
  `

  document.body.appendChild(prompt)

  // Trigger appear animation
  setTimeout(() => {
    prompt.style.opacity = '1'
    prompt.style.transform = 'scale(1) translateY(0)'
  }, 10) // Small delay to ensure DOM is ready

  // Event listener cleanup function
  const cleanupPrompt = () => {
    console.log('Cleaning up voucher prompt')
    
    // Use the global close function for consistency
    if ((window as any).closeVoucherDialog) {
      (window as any).closeVoucherDialog()
    } else {
      // Fallback cleanup
      if (prompt) {
        prompt.style.display = 'none'
        setTimeout(() => prompt.remove(), 100)
      }
      ;(window as any).showVoucherOfferInjected = false
    }
    
    // Clear global variables
    ;(window as any).currentAmount = undefined
    ;(window as any).currentCashback = undefined
    
    console.log('Cleanup completed')
  }

  // Wait for DOM to be fully rendered before adding event listeners
  setTimeout(() => {
    // Event listeners with proper cleanup
    const closeBtn = document.getElementById('close-voucher')
    console.log('Close button found:', closeBtn)
    
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        console.log('Close button clicked!')
        e.preventDefault()
        e.stopPropagation()
        // Use global close function
        if ((window as any).closeVoucherDialog) {
          (window as any).closeVoucherDialog()
        } else {
          cleanupPrompt()
        }
      })
    } else {
      console.error('Close button not found!')
    }
    // Reminder CTA → show verify state
    const reminder = document.getElementById('ws-reminder')
    const verify = document.getElementById('ws-verify')
    const container = document.getElementById('ws-container')
    const reminderCta = document.getElementById('ws-reminder-cta')
    reminderCta?.addEventListener('click', () => {
      if (reminder && verify && container) {
        // animate out reminder
        reminder.style.opacity = '0'
        reminder.style.transform = 'translateY(-6px)'
        // measure verify height by showing it offscreen
        verify.style.display = 'block'
        const targetHeight = container.scrollHeight
        verify.style.opacity = '1'
        verify.style.transform = 'translateY(0)'
        // animate container height
        container.style.height = targetHeight + 'px'
        setTimeout(() => {
          reminder.style.display = 'none'
          container.style.height = 'auto'
        }, 200)
      }
    })
    // Amount input functionality with debugging
    const amountInput = document.getElementById('amount-input') as HTMLInputElement
    const cashbackAmountSpan = document.getElementById('cashback-amount')
    
    console.log('Setting up amount input:', amountInput)
    
    const updateCashback = () => {
      console.log('updateCashback called, input value:', amountInput?.value)
      if (amountInput && cashbackAmountSpan) {
        const inputValue = amountInput.value
        
        // Allow empty input for typing
        if (inputValue === '') {
          cashbackAmountSpan.textContent = '€0,00'
          ;(window as any).currentCashback = 0
          ;(window as any).currentAmount = 0
          return
        }
        
        const newAmount = parseFloat(inputValue)
        
        // Only validate if we have a valid number
        if (isNaN(newAmount)) {
          return // Don't interfere with typing
        }
        
        // Validate amount against voucher limits
        const minAmount = voucher.minAmount || 1
        const maxAmount = voucher.maxAmount || 10000
        
        // Only auto-correct on blur, not while typing
        const newCashback = newAmount * (voucher.cashbackRate / 100)
        cashbackAmountSpan.textContent = `€${newCashback.toFixed(2).replace('.', ',')}`
        
        // Update the global cashback variable for the buy button
        ;(window as any).currentCashback = newCashback
        ;(window as any).currentAmount = newAmount
        
        // Visual feedback for valid input
        const inputContainer = amountInput.parentElement
        if (inputContainer) {
          if (newAmount >= minAmount && newAmount <= maxAmount) {
            inputContainer.style.borderColor = '#E0E0E0'
            inputContainer.style.backgroundColor = '#FAFAFA'
          } else {
            inputContainer.style.borderColor = '#FF6B6B'
            inputContainer.style.backgroundColor = '#FFF5F5'
          }
        }
      }
    }
    
    const validateAndCorrect = () => {
      console.log('validateAndCorrect called, input value:', amountInput?.value)
      if (amountInput) {
        const inputValue = amountInput.value
        const newAmount = parseFloat(inputValue)
        
        // Only validate and correct if we have a number
        if (!isNaN(newAmount)) {
          const minAmount = voucher.minAmount || 1
          const maxAmount = voucher.maxAmount || 10000
          
          if (newAmount < minAmount) {
            console.log('Correcting to min amount:', minAmount)
            amountInput.value = minAmount.toString()
            updateCashback()
          } else if (newAmount > maxAmount) {
            console.log('Correcting to max amount:', maxAmount)
            amountInput.value = maxAmount.toString()
            updateCashback()
          }
        }
      }
    }
    
    // Add input event listeners with debugging
    amountInput?.addEventListener('input', (e) => {
      console.log('Input event:', (e.target as HTMLInputElement)?.value)
      updateCashback()
    })
    amountInput?.addEventListener('change', (e) => {
      console.log('Change event:', (e.target as HTMLInputElement)?.value)
      updateCashback()
    })
    amountInput?.addEventListener('blur', (e) => {
      console.log('Blur event:', (e.target as HTMLInputElement)?.value)
      validateAndCorrect()
    })
    
    // Also add keydown to debug and filter input
    amountInput?.addEventListener('keydown', (e) => {
      console.log('Keydown event:', e.key, 'current value:', (e.target as HTMLInputElement)?.value)
      
      // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
      if ([8, 9, 27, 13, 46, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true)) {
        return
      }
      
      // Ensure that it is a number or decimal point and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105) && e.keyCode !== 190 && e.keyCode !== 110) {
        e.preventDefault()
      }
    })
    
    // Prevent paste of non-numeric content
    amountInput?.addEventListener('paste', (e) => {
      const paste = (e.clipboardData || (window as any).clipboardData).getData('text')
      if (!/^\d*\.?\d*$/.test(paste)) {
        e.preventDefault()
      }
    })
    // Service switch (Vouchers <-> Online Cashback)
    const serviceSwitch = document.getElementById('service-switch')
    serviceSwitch?.addEventListener('click', () => {
      // This would switch between voucher and cashback modes
      // For now, just show an alert
      alert('Switch to Online Cashback mode - Coming soon!')
    })
    
    // Collapsible sections
    const conditionsToggle = document.getElementById('conditions-toggle')
    conditionsToggle?.addEventListener('click', () => {
      const content = document.getElementById('conditions-content')
      const arrow = document.getElementById('conditions-arrow')
      if (content && arrow) {
        const isVisible = content.style.display !== 'none'
        content.style.display = isVisible ? 'none' : 'block'
        arrow.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(90deg)'
      }
    })
    
    // Light blue details button opens product page in a new tab
    const openProductBtn = document.getElementById('ws-open-product')
    openProductBtn?.addEventListener('click', async () => {
      try {
        // Determine final amount and open Woolsocks product page
        const finalAmount = (window as any).currentAmount ?? amount
        const resolvedUrl =
          (partner.buildVoucherProductUrl && partner.buildVoucherProductUrl(finalAmount, 'EUR')) ||
          partner.voucherProductUrl ||
          'https://woolsocks.eu'

        await chrome.storage.session.set({
          voucherIntent: {
            partner: partner.name,
            domain: partner.domain,
            amount: finalAmount,
            createdAt: Date.now()
          }
        })
        // Try background to open new tab; if that fails, fallback to window.open
        try {
          console.log('[Woolsocks] Opening product URL via background:', resolvedUrl)
          chrome.runtime.sendMessage({ type: 'OPEN_VOUCHER_PRODUCT', url: resolvedUrl }, (resp: any) => {
            // Handle possible errors or missing response
            if (chrome.runtime && (chrome.runtime as any).lastError) {
              console.warn('[Woolsocks] Background open error:', (chrome.runtime as any).lastError)
              window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
              return
            }
            const ok = resp && resp.ok
            if (!ok) {
              console.warn('[Woolsocks] Background did not confirm tab open, falling back to window.open')
              window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
            }
          })
        } catch (_e) {
          console.warn('[Woolsocks] Background message throw, falling back to window.open')
          window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
        }
        // Switch UI to waiting state immediately
        renderWaiting(prompt, finalAmount)
      } catch (e) {
        console.error('[Woolsocks] Failed to open product page:', e)
        // Still move to waiting to avoid dead-end
        renderWaiting(prompt, (window as any).currentAmount ?? amount)
      }
    })
    // Main CTA now also moves to waiting state immediately (doesn't open a tab)
    const buyBtn = document.getElementById('buy-voucher')
    buyBtn?.addEventListener('click', () => {
      const finalAmount = (window as any).currentAmount ?? amount
      renderWaiting(prompt, finalAmount)
    })

    // Auto-dismiss after 30 seconds with cleanup
    const autoDismissTimer = setTimeout(() => {}, 30000)
    
    // Cleanup on page navigation
    const beforeUnloadHandler = () => {
      clearTimeout(autoDismissTimer)
      cleanupPrompt()
    }
    window.addEventListener('beforeunload', beforeUnloadHandler)
    // If there is an existing voucher intent for this domain, resume waiting state
    chrome.storage.session.get('voucherIntent').then((data) => {
      const intent = (data as any)?.voucherIntent
      const THIRTY_MIN = 30 * 60 * 1000
      if (intent && intent.domain === partner.domain && Date.now() - intent.createdAt < THIRTY_MIN) {
        // Hide reminder/verify and show waiting with animation
        const reminder = document.getElementById('ws-reminder')
        const verify = document.getElementById('ws-verify')
        if (reminder) reminder.style.display = 'none'
        if (verify) verify.style.display = 'none'
        renderWaiting(prompt, intent.amount || amount)
      }
    }).catch(() => {})
  }, 100)
}

// Removed showCashbackPrompt function - no longer using automatic cashback prompts

// Removed unused showProfileScreen function


