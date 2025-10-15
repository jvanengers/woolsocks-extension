// Import everything inline to avoid require() calls in page context
// This file will be bundled with all its dependencies into a single file
import { createVoucherPopup } from './voucher-popup'
import { applyStyles } from './voucher-popup-styles'

// Debug: Log that this script is executing
console.log('[WS Page Script] voucher-popup-page.js is executing')

// Expose the function globally for the injector to call
;(window as any).createVoucherPopup = createVoucherPopup

// Also expose dependencies in case they're needed
;(window as any).__wsVoucherPopupDeps = {
  applyStyles
}

// Debug: Log that the function was assigned
console.log('[WS Page Script] createVoucherPopup assigned to window:', typeof (window as any).createVoucherPopup)

// Listen for messages from content script (crosses isolated world boundary in Firefox MV2)
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return
  
  const message = event.data
  if (message && message.type === 'ws/create-voucher-popup') {
    console.log('[WS Page Script] received ws/create-voucher-popup message:', message.config)
    try {
      const popup = createVoucherPopup(message.config)
      document.body.appendChild(popup)
      console.log('[WS Page Script] Popup created and appended successfully')
    } catch (e) {
      console.error('[WS Page Script] Failed to create popup:', e)
      console.error('[WS Page Script] Error stack:', (e as Error).stack)
    }
  }
})

console.log('[WS Page Script] Message listener registered')


