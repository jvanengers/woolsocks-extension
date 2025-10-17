// Firefox MV2/Chrome MV3 reliable injector for voucher popup
// Listens for a message from background and injects a page script into MAIN world
// using an inline bundle string (no need for web_accessible_resources file names).
import { getVoucherPopupBundle } from '../shared/voucher-popup-bundle'

function log(...args: any[]) {
  try { console.log('[WS Injector]', ...args) } catch {}
}

function injectPageScriptFromBundle(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const code = getVoucherPopupBundle()
      const script = document.createElement('script')
      script.textContent = code
      ;(document.documentElement || document.head || document.body).appendChild(script)
      // Remove the node after execution to reduce noise
      try { script.remove() } catch {}
      log('inline bundle injected')
      resolve()
    } catch (e) { reject(e) }
  })
}

async function injectVoucherPopup(config: any) {
  try {
    log('inject start')
    await injectPageScriptFromBundle()

    // Wait briefly for the page script to register its message listener
    await new Promise(r => setTimeout(r, 100))

    // Use postMessage to cross the isolated world boundary (Firefox MV2)
    // The page script will receive this and create the popup in the page context
    log('posting ws/create-voucher-popup message to page context')
    window.postMessage({ type: 'ws/create-voucher-popup', config }, '*')
    log('message posted successfully')
  } catch (e) {
    log('inject failed', e)
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'ws/inject-voucher-popup') {
    log('message received')
    injectVoucherPopup(message.config)
  }
})


