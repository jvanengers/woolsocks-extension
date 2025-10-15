// Firefox MV2 content-script injector for voucher popup
// Listens for a message from background and injects a page script that exposes
// window.createVoucherPopup, then calls it with the provided config.

function log(...args: any[]) {
  try { console.log('[WS Injector]', ...args) } catch {}
}

function injectPageScript(srcUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script')
      script.src = srcUrl
      script.onload = () => { log('script loaded'); resolve() }
      script.onerror = (e) => { log('script error', e); reject(e) }
      ;(document.documentElement || document.head || document.body).appendChild(script)
    } catch (e) {
      reject(e)
    }
  })
}

async function injectVoucherPopup(config: any) {
  try {
    log('inject start')
    const url = chrome.runtime.getURL('assets/voucher-popup-page.js')
    await injectPageScript(url)

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


