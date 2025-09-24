// Background service worker: URL detection, icon state, messaging

type IconState = 'neutral' | 'available' | 'active' | 'voucher' | 'error'

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
  chrome.storage.local.set({
    settings: {
      showCashbackPrompt: true,
      showVoucherPrompt: true,
    },
  })
})

async function evaluateTab(tabId: number, url?: string | null) {
  if (!url) {
    setIcon('neutral', tabId)
    return
  }
  try {
    const u = new URL(url)
    // Placeholder detection: treat example domains as partners
    const isPartner = /amazon\.|zalando\.|bol\./i.test(u.hostname)
    if (isPartner) {
      setIcon('available', tabId)
      // We defer content injection to explicit actions for now
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
  if (!tab.id) return
  // For MVP, clicking toggles between available -> active
  // In future, this triggers affiliate activation logic
  setIcon('active', tab.id)
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SET_ICON' && typeof message.state === 'string') {
    setIcon(message.state as IconState)
    sendResponse({ ok: true })
  }
})


