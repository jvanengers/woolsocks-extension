// Background service worker: URL detection, icon state, messaging
import { findPartnerByHostname, PARTNERS } from '../shared/partners'
import { IconState, MockUser, ActivationRecord } from '../shared/types'
import { handleActivateCashback } from './activate-cashback'

const ICONS: Record<IconState, string> = {
  neutral: 'icons/icon-48.png',
  available: 'icons/state-available-48.png',
  active: 'icons/state-active-48.png',
  voucher: 'icons/state-voucher-48.png',
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
  chrome.action.setIcon({ path, tabId })
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

async function evaluateTab(tabId: number, url?: string | null) {
  if (!url) {
    setIcon('neutral', tabId)
    return
  }
  
  try {
    const u = new URL(url)
    const partner = findPartnerByHostname(u.hostname)
    
    if (partner) {
      // Inject checkout detection script
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content/checkout.js']
        })
      } catch (error) {
        // Script might already be injected, ignore
        console.log('Script injection skipped:', error)
      }
      
      // Show cashback prompt if not already active and settings allow
      const result = await chrome.storage.local.get('user')
      const user: MockUser = result.user || { isLoggedIn: false, totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
      
      const activeActivation = user.activationHistory.find(
        activation => activation.partner === partner.name && activation.status === 'active'
      )
      
      if (!activeActivation && user.settings.showCashbackPrompt) {
        // Show cashback activation prompt
        chrome.scripting.executeScript({
          target: { tabId },
          func: showCashbackPrompt,
          args: [partner]
        })
      }
      
      if (activeActivation) {
        setIcon('active', tabId)
      } else if (partner.voucherAvailable && u.pathname.includes('checkout')) {
        setIcon('voucher', tabId)
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
    handleActivateCashback(message.partner, _sender.tab?.id, setIcon)
    sendResponse({ ok: true })
  }
})

async function handleCheckoutDetected(checkoutInfo: any, tabId?: number) {
  if (!tabId) return
  
  const partner = findPartnerByHostname(new URL(checkoutInfo.merchant).hostname)
  if (!partner || !partner.voucherAvailable) return
  
  // Check user settings
  const result = await chrome.storage.local.get('user')
  const user: MockUser = result.user || { isLoggedIn: false, totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
  
  if (!user.settings.showVoucherPrompt) return
  
  // Calculate voucher offer
  const voucherAmount = Math.min(checkoutInfo.total, Math.max(...partner.voucherDenominations))
  const cashbackAmount = voucherAmount * (partner.voucherCashbackRate / 100)
  
  // Inject voucher offer prompt
  chrome.scripting.executeScript({
    target: { tabId },
    func: showVoucherOffer,
    args: [partner, voucherAmount, cashbackAmount]
  })
}

function showVoucherOffer(partner: any, amount: number, cashback: number) {
  // Remove existing prompts
  const existing = document.getElementById('woolsocks-voucher-prompt')
  if (existing) existing.remove()
  
  const prompt = document.createElement('div')
  prompt.id = 'woolsocks-voucher-prompt'
  prompt.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 320px;
    background: #fff;
    border: 2px solid #4CAF50;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: system-ui, sans-serif;
    font-size: 14px;
  `
  
  prompt.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="margin: 0; color: #4CAF50; font-size: 16px;">💰 Save with Gift Card!</h3>
      <button id="close-voucher" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
    </div>
    <p style="margin: 0 0 12px 0; color: #333;">
      Buy a €${amount} ${partner.name} gift card and get <strong>€${cashback.toFixed(2)} cashback</strong> instantly!
    </p>
    <div style="display: flex; gap: 8px;">
      <button id="buy-voucher" style="flex: 1; background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
        Buy Gift Card
      </button>
      <button id="dismiss-voucher" style="background: #f5f5f5; color: #666; border: 1px solid #ddd; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        No Thanks
      </button>
    </div>
  `
  
  document.body.appendChild(prompt)
  
  // Event listeners
  document.getElementById('close-voucher')?.addEventListener('click', () => prompt.remove())
  document.getElementById('dismiss-voucher')?.addEventListener('click', () => prompt.remove())
  document.getElementById('buy-voucher')?.addEventListener('click', () => {
    prompt.remove()
    // Simulate voucher purchase
    const voucherCode = Math.random().toString(36).substring(2, 15).toUpperCase()
    alert(`🎉 Voucher purchased!\n\nCode: ${voucherCode}\nAmount: €${amount}\nCashback: €${cashback.toFixed(2)}\n\nCopy this code and use it at checkout!`)
  })
  
  // Auto-dismiss after 30 seconds
  setTimeout(() => prompt.remove(), 30000)
}

function showCashbackPrompt(partner: any) {
  // Remove existing prompts
  const existing = document.getElementById('woolsocks-cashback-prompt')
  if (existing) existing.remove()
  
  const prompt = document.createElement('div')
  prompt.id = 'woolsocks-cashback-prompt'
  prompt.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 320px;
    background: #fff;
    border: 2px solid #FFA500;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: system-ui, sans-serif;
    font-size: 14px;
  `
  
  prompt.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="margin: 0; color: #FFA500; font-size: 16px;">💰 Cashback Available!</h3>
      <button id="close-cashback" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
    </div>
    <p style="margin: 0 0 12px 0; color: #333;">
      Activate <strong>${partner.cashbackRate}% cashback</strong> on ${partner.name} purchases. Never miss out on savings!
    </p>
    <div style="display: flex; gap: 8px;">
      <button id="activate-cashback" style="flex: 1; background: #FFA500; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
        Activate Cashback
      </button>
      <button id="dismiss-cashback" style="background: #f5f5f5; color: #666; border: 1px solid #ddd; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        Not Now
      </button>
    </div>
  `
  
  document.body.appendChild(prompt)
  
  // Event listeners
  document.getElementById('close-cashback')?.addEventListener('click', () => prompt.remove())
  document.getElementById('dismiss-cashback')?.addEventListener('click', () => prompt.remove())
  document.getElementById('activate-cashback')?.addEventListener('click', () => {
    prompt.remove()
    // Send message to background to activate cashback
    chrome.runtime.sendMessage({
      type: 'ACTIVATE_CASHBACK',
      partner: partner.name
    })
  })
  
  // Auto-dismiss after 30 seconds
  setTimeout(() => prompt.remove(), 30000)
}


