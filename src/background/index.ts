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
    height: 602px;
    background: #FDC408;
    border: 4px solid #FDC408;
    border-radius: 16px;
    box-shadow: -2px 2px 4px rgba(0,0,0,0.08);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
    transition: opacity 0.3s ease-out, transform 0.3s ease-out;
    flex-direction: column;
    overflow: hidden;
  `

  // Calculate cashback percentage based on current amount
  const cashback = amount * (voucher.cashbackRate / 100)
  const cashbackPercentage = Math.round((cashback / amount) * 100)
  
      // Get merchant logo from partner data or fallback
      const getMerchantLogo = (partner: any) => {
        if (partner.logo) {
          return `<img src="${partner.logo}" alt="${partner.name}" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px;" />`
        }
        // Fallback to CSS-generated logo
        const logos: { [key: string]: string } = {
          'MediaMarkt': `
            <div style="width: 32px; height: 32px; background: #E60012; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <div style="width: 20px; height: 20px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="color: #E60012; font-weight: bold; font-size: 14px;">M</span>
              </div>
            </div>
          `,
          'Zalando': `
            <div style="width: 24px; height: 24px; background: #FF6900; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 8px; position: relative;">
              <div style="width: 12px; height: 12px; background: white; border-radius: 2px; transform: rotate(45deg);"></div>
            </div>
          `,
          'Amazon': `
            <div style="width: 24px; height: 24px; background: #FF9900; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
              <span style="color: white; font-weight: bold; font-size: 10px;">A</span>
            </div>
          `,
          'Coolblue': `
            <div style="width: 24px; height: 24px; background: #0032FF; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
              <span style="color: white; font-weight: bold; font-size: 10px;">C</span>
            </div>
          `
        }
        return logos[partner.name] || logos['MediaMarkt']
      }
  
      const getVoucherImage = (voucher: any) => {
        if (voucher.imageUrl) {
          // Voucher card with overlaid percentage pill matching Figma
          return `
            <div style="position: relative; width: 140px; height: 112px; display: flex; align-items: flex-start; justify-content: center;">
              <div style="position: relative; z-index: 1; width: 140px; height: 88px; background: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <img src="${voucher.imageUrl}" alt="${partner.name} voucher" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;">
              </div>
              <div style="position: absolute; z-index: 0; left: 50%; bottom: -12px; transform: translateX(-50%); background: #F9EFD0; border: 1px solid #F3E1A8; border-radius: 8px; padding: 8px 16px 4px 16px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 14px; color: #100B1C; letter-spacing: 0.1px;">${cashbackPercentage}%</span>
              </div>
            </div>
          `
        }
        // Fallback to CSS-generated voucher image
        const images: { [key: string]: string } = {
          'MediaMarkt': `
            <div style="position: relative; width: 140px; height: 112px; display: flex; align-items: flex-start; justify-content: center;">
              <div style="position: relative; z-index: 1; width: 140px; height: 88px; background: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; background: #E60012; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: bold; font-size: 10px;">M</span>
                </div>
              </div>
              <div style="position: absolute; z-index: 0; left: 50%; bottom: -12px; transform: translateX(-50%); background: #F9EFD0; border: 1px solid #F3E1A8; border-radius: 8px; padding: 8px 16px 4px 16px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 14px; color: #100B1C; letter-spacing: 0.1px;">${cashbackPercentage}%</span>
              </div>
            </div>
          `,
          'Zalando': `
            <div style="position: relative; width: 140px; height: 112px; display: flex; align-items: flex-start; justify-content: center;">
              <div style="position: relative; z-index: 1; width: 140px; height: 88px; background: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; background: white; border-radius: 2px; display: flex; align-items: center; justify-content: center; transform: rotate(45deg);"></div>
              </div>
              <div style="position: absolute; z-index: 0; left: 50%; bottom: -12px; transform: translateX(-50%); background: #F9EFD0; border: 1px solid #F3E1A8; border-radius: 8px; padding: 8px 16px 4px 16px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 14px; color: #100B1C; letter-spacing: 0.1px;">${cashbackPercentage}%</span>
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
    <div style="flex: 1; background: white; margin: 0 0 25px 0; display: flex; flex-direction: column; border-top-left-radius: 16px; border-top-right-radius: 16px; overflow: visible; position: relative;">
          <!-- Partner Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 16px 8px 16px; height: 32px;">
            <div style="display: flex; align-items: center;">
              <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 12px; color: #100B1C;">${partner.name}</span>
            </div>
            <div id="service-switch" style="display: flex; align-items: center; background: #E5F2FF; border-radius: 8px; padding: 8px; height: 32px; cursor: pointer;">
              <span style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 12px; color: #0084FF; margin-right: 4px;">Vouchers</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="#0084FF" stroke-width="1.43" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <!-- Merchant Logo -->
          <div style="display: flex; justify-content: center; position: relative; top: -48px; margin: 0 0 32px 0;">
            <div style="width: 48px; height: 48px; background: white; border: 7px solid #FDC408; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              ${getMerchantLogo(partner)}
            </div>
          </div>

          <!-- Dynamic Voucher Card -->
          <div style="display: flex; flex-direction: column; align-items: center; margin: 0 20px;">
            <!-- Dynamic Voucher Image -->
            ${getVoucherImage(voucher)}
            
            <!-- Cashback Percentage Display moved into card overlay -->
        
        <!-- Dynamic Voucher Info -->
        <div style="text-align: center; margin-top: 8px;">
          <div style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 14px; color: #100B1C; margin-bottom: 4px;">${partner.name} Cadeaukaart</div>
          <div style="font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 400; font-size: 14px; color: #020B0F; opacity: 0.5;">Geldig ${Math.floor(voucher.validityDays / 365)} jaar na aankoop</div>
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
        <button id="buy-voucher" style="width: 100%; height: 40px; background: #211940; color: white; border: none; border-radius: 4px; font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          Continue
        </button>
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
    
    const buyBtn = document.getElementById('buy-voucher')
    buyBtn?.addEventListener('click', () => {
      cleanupPrompt()
      
      // Get current values from input or fallback to original values
      const finalAmount = (window as any).currentAmount ?? amount
      const finalCashback = (window as any).currentCashback ?? (finalAmount * (voucher.cashbackRate / 100))
      
      // Simulate voucher purchase
      const voucherCode = Math.random().toString(36).substring(2, 15).toUpperCase()
      alert(`🎉 Voucher purchased!\n\nVoucher ID: ${voucher.voucherId}\nCode: ${voucherCode}\nAmount: €${finalAmount.toFixed(2)}\nCashback: €${finalCashback.toFixed(2)}\n\nConditions: ${voucher.conditions}\nValid for: ${voucher.validityDays} days\n\nCopy this code and use it at checkout!`)
      // After voucher purchase, set icon to green (active)
      chrome.runtime.sendMessage({ type: 'SET_ICON', state: 'active' })
    })

    // Auto-dismiss after 30 seconds with cleanup
    const autoDismissTimer = setTimeout(cleanupPrompt, 30000)
    
    // Cleanup on page navigation
    const beforeUnloadHandler = () => {
      clearTimeout(autoDismissTimer)
      cleanupPrompt()
    }
    window.addEventListener('beforeunload', beforeUnloadHandler)
  }, 100)
}

// Removed showCashbackPrompt function - no longer using automatic cashback prompts

// Removed unused showProfileScreen function


