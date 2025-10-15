// Online Cashback UI panel (content script)
// Renders a top-right panel that reflects cashback status per MCP annotations

// Export onExecute function for CRXJS loader
export function onExecute() {
  // Content script initialization
}

type Deal = { id?: string | number; name?: string; rate?: number; amountType?: string; currency?: string }
import { translate, initLanguage } from '../shared/i18n'

// Boot diagnostics
const OC_DEBUG = false // Set to true for debugging
const BOOT_HASH = '__OC_BOOT_v1__'
const domain = (() => { try { return window.location.hostname.replace(/^www\./i, '').toLowerCase() } catch { return 'unknown' } })()
if (OC_DEBUG) console.log(`[WS OC Content] ${BOOT_HASH} loaded on ${domain}`)

type UiEvent =
  | { kind: 'oc_scan_start'; host: string }
  | { kind: 'oc_deals_found'; host: string; deals: Deal[] }
  | { kind: 'oc_redirect_requested'; host: string }
  | { kind: 'oc_blocked'; reason: 'no_deals' | 'settings' | 'cooldown' | string; host: string }
  | { kind: 'oc_activated'; host: string; deals: Deal[]; dealId?: string | number; providerMerchantId?: string | number }
  | { kind: 'oc_login_required'; host: string; deals: Deal[]; providerMerchantId?: string | number }
  | { kind: 'oc_countdown_start'; host: string; dealInfo: Deal; countdown: number }
  | { kind: 'oc_countdown_cancel'; host: string }
  | { kind: 'oc_countdown_complete'; host: string }

// Brand logos from design system (exposed via web_accessible_resources)
const WS_LOGO = {
  // Use the provided Woolsocks \"W\" assets from public/icons
  green: chrome.runtime.getURL('public/icons/woolsocks _W_ green.png'),
  yellow: chrome.runtime.getURL('public/icons/woolsocks _W_ yellow.png'),
  grey: chrome.runtime.getURL('public/icons/woolsocks _W_ grey.png'),
}
const CLOSE_ICON = chrome.runtime.getURL('public/icons/Close.svg')
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM16.8071 9.59036C17.1332 9.14459 17.0361 8.51891 16.5904 8.19286C16.1446 7.86681 15.5189 7.96387 15.1929 8.40964L10.8166 14.3929L8.75809 12C8.39791 11.5813 7.76653 11.5339 7.34785 11.8941C6.92917 12.2543 6.88174 12.8856 7.24191 13.3043L10.1219 16.6522C10.3209 16.8835 10.6146 17.0113 10.9194 16.9992C11.2243 16.9872 11.507 16.8366 11.6871 16.5904L16.8071 9.59036Z" fill="#00C275"/></svg>`

// SVG icons for minimize/expand buttons
const SVG_ARROW_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9999 14.0858L17.2928 8.79289L18.707 10.2071L12.707 16.2071C12.3165 16.5976 11.6833 16.5976 11.2928 16.2071L5.29282 10.2071L6.70703 8.79289L11.9999 14.0858Z" fill="#0084FF"/></svg>`
// removed: SVG_ARROW_UP (no longer used)
// SVG icons for deck navigation
const SVG_NAV_LEFT = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><g opacity=\"0.5\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M6.41421 10.9999L10.7071 6.70703L9.29289 5.29282L3.29289 11.2928C2.90237 11.6833 2.90237 12.3165 3.29289 12.707L9.29289 18.707L10.7071 17.2928L6.41421 12.9999L20 12.9999L20 10.9999L6.41421 10.9999Z\" fill=\"#0F0B1C\"/></g></svg>`
const SVG_NAV_RIGHT = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\"><path opacity=\"0.5\" fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M17.5858 13.0001L13.2929 17.293L14.7071 18.7072L20.7071 12.7072C21.0976 12.3167 21.0976 11.6835 20.7071 11.293L14.7071 5.29297L13.2929 6.70718L17.5858 11.0001H4V13.0001H17.5858Z\" fill=\"#0F0B1C\"/></svg>`

// Deck navigation between pages is stateless for now

// Shadow DOM root
let root: ShadowRoot | null = null
let hostEl: HTMLElement | null = null
let containerEl: HTMLElement | null = null
const CORNER_KEY = '__wsOcPanelCorner'
let dragSetup = false

function applyCorner(corner: 'tl'|'tr'|'bl'|'br') {
  if (!hostEl) return
  const m = '16px'
  hostEl.style.left = ''
  hostEl.style.right = ''
  hostEl.style.top = ''
  hostEl.style.bottom = ''
  if (corner === 'br') { hostEl.style.right = m; hostEl.style.bottom = m }
  else if (corner === 'bl') { hostEl.style.left = m; hostEl.style.bottom = m }
  else if (corner === 'tr') { hostEl.style.right = m; hostEl.style.top = m }
  else { hostEl.style.left = m; hostEl.style.top = m }
}

function computeCorner(): 'tl'|'tr'|'bl'|'br' {
  if (!hostEl) return 'br'
  const rect = hostEl.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  return (cy > window.innerHeight/2)
    ? ((cx > window.innerWidth/2) ? 'br' : 'bl')
    : ((cx > window.innerWidth/2) ? 'tr' : 'tl')
}

function setupDrag() {
  if (dragSetup || !hostEl) return
  dragSetup = true
  let dragging = false
  let dx = 0, dy = 0
  const onMove = (e: MouseEvent) => {
    if (!dragging || !hostEl) return
    hostEl.style.left = Math.max(0, Math.min(window.innerWidth - 40, e.clientX - dx)) + 'px'
    hostEl.style.top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dy)) + 'px'
    hostEl.style.right = ''
    hostEl.style.bottom = ''
  }
  const onUp = () => {
    if (!dragging) return
    dragging = false
    document.removeEventListener('mousemove', onMove)
    const corner = computeCorner()
    applyCorner(corner)
    ;(async () => { try { await chrome.storage.session.set({ [CORNER_KEY]: corner }) } catch {} })()
  }
  hostEl.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return
    const rect = hostEl!.getBoundingClientRect()
    dragging = true
    dx = e.clientX - rect.left
    dy = e.clientY - rect.top
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp, { once: true })
    e.preventDefault()
  })
}
let stateTimer: number | null = null
let deckTimer: number | null = null

// Persistent minimized pill per-domain (session)
const ACTIVE_PILL_KEY = '__wsOcActivePillByDomain'

function getDomain(): string {
  try { const hn = location.hostname.replace(/^www\./i, '').toLowerCase(); return hn } catch { return '' }
}

async function setActivePill(domain: string, active: boolean) {
  try {
    const key = ACTIVE_PILL_KEY
    const current = (await chrome.storage.session.get(key))[key] as Record<string, boolean> | undefined
    const map = current || {}
    map[domain] = active
    await chrome.storage.session.set({ [key]: map })
  } catch {}
}

async function getActivePill(domain: string): Promise<boolean> {
  try {
    const key = ACTIVE_PILL_KEY
    const current = (await chrome.storage.session.get(key))[key] as Record<string, boolean> | undefined
    return !!(current && current[domain])
  } catch { return false }
}

async function setPillDismissed(domain: string, dismissed: boolean) {
  try {
    const key = '__wsOcPillDismissedByDomain'
    const current = (await chrome.storage.session.get(key))[key] as Record<string, number> | undefined
    const map = current || {}
    if (dismissed) {
      map[domain] = Date.now() + (10 * 60 * 1000) // Match activation TTL
    } else {
      delete map[domain]
    }
    await chrome.storage.session.set({ [key]: map })
  } catch {}
}

async function isPillDismissed(domain: string): Promise<boolean> {
  try {
    const key = '__wsOcPillDismissedByDomain'
    const current = (await chrome.storage.session.get(key))[key] as Record<string, number> | undefined
    if (!current || !current[domain]) return false
    return Date.now() < current[domain]
  } catch { return false }
}

function ensureMount(): ShadowRoot {
  // Reuse existing host if present; otherwise remove stale duplicates
  if (root && hostEl && document.documentElement.contains(hostEl) && hostEl.shadowRoot && (hostEl.shadowRoot as ShadowRoot).getElementById('ws-oc-container')) return root
  try {
    const existing = document.getElementById('ws-oc-panel-host') as HTMLElement | null
    if (existing) {
      hostEl = existing
      // Ensure correct positioning styles in case page mutated them
      hostEl.style.position = 'fixed'
      // default from saved position will be applied below
      hostEl.style.zIndex = '2147483647'
      hostEl.style.width = 'auto'
      hostEl.style.maxWidth = 'calc(100vw - 32px)'
      hostEl.style.pointerEvents = 'none'
      root = hostEl.shadowRoot || hostEl.attachShadow({ mode: 'open' })
      // Ensure styles exist
      if (!root.querySelector('style[data-ws-oc="core"]')) {
        const style = document.createElement('style')
        style.setAttribute('data-ws-oc', 'core')
        style.textContent = `
    :host { display:block !important; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important; font-size:14px !important; line-height:1.4 !important; color:#0F0B1C !important; background:transparent !important; }
    * { box-sizing:border-box !important; margin:0 !important; padding:0 !important; }
    .panel { pointer-events:auto !important; border-radius:16px !important; background:#FFFFFF !important; box-shadow:0 4px 24px rgba(0,0,0,.1) !important; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important; font-size:14px !important; overflow:hidden !important; width:auto !important; min-width:240px !important; max-width:360px !important; min-height:200px !important; display:block !important; }
        `
        root.appendChild(style)
      }
      if (!root.querySelector('style[data-ws-oc="extra"]')) {
        const extra = document.createElement('style')
        extra.setAttribute('data-ws-oc', 'extra')
        extra.textContent = `@keyframes ws-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } } .spin{animation:ws-spin 1.5s linear infinite !important;}`
        root.appendChild(extra)
      }
      // Ensure container exists
      containerEl = root.getElementById('ws-oc-container') as HTMLElement | null
      if (!containerEl) {
        containerEl = document.createElement('div')
        containerEl.id = 'ws-oc-container'
        root.appendChild(containerEl)
      }
      // Apply saved corner/width and enable drag
      ;(async () => {
        try {
          const savedCorner = (await chrome.storage.session.get('__wsOcPanelCorner'))['__wsOcPanelCorner'] as 'tl'|'tr'|'bl'|'br' | undefined
          if (savedCorner) {
            const m = '16px'
            hostEl!.style.left = hostEl!.style.right = hostEl!.style.top = hostEl!.style.bottom = ''
            if (savedCorner === 'br') { hostEl!.style.right = m; hostEl!.style.bottom = m }
            else if (savedCorner === 'bl') { hostEl!.style.left = m; hostEl!.style.bottom = m }
            else if (savedCorner === 'tr') { hostEl!.style.right = m; hostEl!.style.top = m }
            else { hostEl!.style.left = m; hostEl!.style.top = m }
          }
          const savedWidth = (await chrome.storage.session.get('__wsOcPanelWidth'))['__wsOcPanelWidth']
          if (savedWidth && hostEl) hostEl.style.width = `${savedWidth}px`
        } catch {}
      })()
      setupDrag()
      return root!
    }
  } catch {}
  hostEl = document.createElement('div')
  hostEl.id = 'ws-oc-panel-host'
  hostEl.style.position = 'fixed'
  hostEl.style.bottom = '16px'
  hostEl.style.right = '16px'
  hostEl.style.zIndex = '2147483647'
  // Let panels size themselves to fit content; avoid fixed width
  hostEl.style.width = 'auto'
  hostEl.style.maxWidth = 'calc(100vw - 32px)'
  hostEl.style.pointerEvents = 'none'
  document.documentElement.appendChild(hostEl)
  root = hostEl.attachShadow({ mode: 'open' })
  
  // Add styles directly to the shadow root
  const style = document.createElement('style')
  style.setAttribute('data-ws-oc', 'core')
  style.textContent = `
    :host { 
      display: block !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
      color: #0F0B1C !important;
      background: transparent !important;
    }
    * {
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .panel { 
      pointer-events: auto !important; 
      border-radius: 16px !important; 
      background: #FFFFFF !important; 
      box-shadow: 0px 4px 24px 0px rgba(0,0,0,0.1) !important; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; 
      font-size: 14px !important;
      overflow: hidden !important; 
      width: auto !important;
      min-width: 240px !important;
      max-width: 360px !important;
      min-height: 200px !important;
      display: block !important;
    }
  `
  root.appendChild(style)
  
  // Add additional styles for all other elements
  const additionalStyle = document.createElement('style')
  additionalStyle.setAttribute('data-ws-oc', 'extra')
  additionalStyle.textContent = `
    .logo { display: inline-block !important; }
    .logo-30 { width: 30px !important; height: 31px !important; }
    .row { 
      display: flex !important; 
      align-items: center !important; 
      gap: 12px !important; 
      padding: 12px 16px !important; 
      font-size: 14px !important;
    }
    .header { 
      font-weight: 500 !important; 
      color: #0F0B1C !important; 
      font-size: 20px !important; 
      line-height: 1.25 !important;
      text-align: center !important;
    }
    .subtle { 
      color: #0F0B1C !important; 
      font-size: 16px !important; 
      line-height: 1.45 !important;
      opacity: 0.5 !important;
    }
    .progress { 
      height: 6px !important; 
      background: #E5F3FF !important; 
      border-radius: 999px !important; 
      overflow: hidden !important; 
      margin: 8px 16px 16px !important; 
    }
    .bar { 
      height: 100% !important; 
      width: 40% !important; 
      background: #0084FF !important; 
      border-radius: inherit !important; 
      animation: grow 1100ms infinite alternate ease-in-out !important; 
    }
    @keyframes grow { from { width: 30% } to { width: 85% } }
    /* progress bar removed */
    @keyframes ws-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
    .spin { animation: ws-spin 1.5s linear infinite !important; }
    .panel.compact { min-width: unset !important; max-width: none !important; min-height: auto !important; width: auto !important; }
    .setup-row { display:flex !important; align-items:center !important; gap:12px !important; padding: 12px 16px !important; }
    .setup-text { color:#0F0B1C !important; font-size:16px !important; line-height:1.45 !important; opacity:0.5 !important; white-space:nowrap !important; }
    .footer { 
      display: flex !important; 
      gap: 8px !important; 
      padding: 12px 16px !important; 
      justify-content: flex-end !important; 
    }
    .btn { 
      border: none !important; 
      border-radius: 8px !important; 
      height: 36px !important; 
      padding: 0 12px !important; 
      cursor: pointer !important; 
      font-weight: 500 !important; 
      font-size: 12px !important;
      line-height: 1.3 !important;
      font-family: inherit !important;
    }
    .primary { 
      background: #0F0B1C !important; 
      color: #FFFFFF !important; 
    }
    .ghost { 
      background: transparent !important; 
      color: #0F0B1C !important; 
    }
    .link-btn {
      display: flex !important;
      padding: 8px !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 4px !important;
      flex: 1 0 0 !important;
      background: #E5F3FF !important;
      color: #0084FF !important;
      border-radius: 8px !important;
      font-weight: 500 !important;
      font-size: 12px !important;
      line-height: 1.3 !important;
      border: none !important;
      cursor: pointer !important;
      font-family: inherit !important;
    }
    .deal { 
      display: flex !important; 
      align-items: center !important; 
      gap: 8px !important; 
      padding: 2px 0 !important; 
    }
    .badge { 
      min-width: 40px !important; 
      text-align: center !important; 
      padding: 16px !important; 
      border-radius: 8px !important; 
      background: rgba(0,194,117,0.2) !important; 
      color: #0F0B1C !important; 
      font-weight: 500 !important; 
      font-size: 12px !important;
      line-height: 1.45 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .deal-text {
      flex: 1 !important;
      color: #0F0B1C !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
      font-weight: 400 !important;
      font-family: inherit !important;
    }
    .minipill { 
      pointer-events: auto !important; 
      display: flex !important; 
      align-items: center !important; 
      gap: 8px !important; 
      background: #FFFFFF !important; 
      border-radius: 16px !important; 
      box-shadow: 0px 4px 24px 0px rgba(0,0,0,0.1) !important; 
      padding: 8px !important; 
      white-space: nowrap !important;
    }
    .countdown-banner {
      pointer-events: auto !important;
      background: #FFFFFF !important;
      border-radius: 16px !important;
      box-shadow: 0px 4px 24px 0px rgba(0,0,0,0.1) !important;
      padding: 16px !important;
      min-width: 360px !important;
      max-width: 480px !important;
    }
    .countdown-content { display:block !important; }
    .countdown-row { display:flex !important; align-items:center !important; gap:24px !important; }
    .countdown-text { flex: 1 !important; display:flex !important; flex-direction:column !important; gap:6px !important; }
    .countdown-title {
      font-size: 16px !important;
      font-weight: 600 !important;
      color: #0F0B1C !important;
      line-height: 1.4 !important;
    }
    .countdown-deal {
      font-size: 14px !important;
      color: #0F0B1C !important;
      opacity: 0.7 !important;
      line-height: 1.4 !important;
      margin-top: 2px !important;
    }
    .countdown-actions { display:flex !important; align-items:center !important; justify-content:flex-end !important; }
    /* progress svg removed */
    .countdown-cancel-btn {
      background: #211940 !important;
      color: #FFFFFF !important;
      border: none !important;
      border-radius: 8px !important;
      padding: 10px 16px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      font-family: inherit !important;
    }
    .countdown-cancel-btn:hover { opacity: .9 !important; }
    .countdown-number {
      width: 48px !important;
      height: 48px !important;
      border-radius: 50% !important;
      background: #FF6B35 !important;
      color: #FFFFFF !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 20px !important;
      font-weight: 700 !important;
      font-family: inherit !important;
    }
    .logo-24 { width: 24px !important; height: 24px !important; }
    .manual-activation-banner {
      pointer-events: auto !important;
      background: #FFFFFF !important;
      border-radius: 16px !important;
      box-shadow: 0px 4px 24px 0px rgba(0,0,0,0.1) !important;
      padding: 16px !important;
      width: auto !important;
      min-width: 320px !important;
      max-width: calc(100vw - 32px) !important;
      display: flex !important;
      align-items: center !important;
      gap: 16px !important;
      flex-wrap: nowrap !important;
    }
    .manual-activation-left { display:flex !important; align-items:center !important; gap:12px !important; flex:1 !important; min-width:0 !important; }
    .manual-activation-title { font-size: 20px !important; font-weight: 700 !important; color:#0F0B1C !important; line-height:1.25 !important; }
    .manual-activation-sub { font-size: 14px !important; color:#6B7280 !important; line-height:1.4 !important; margin-top:6px !important; }
    .manual-activate-btn { background:#211940 !important; color:#FFFFFF !important; border:none !important; border-radius:8px !important; height:48px !important; padding: 0 16px !important; font-size:14px !important; font-weight:600 !important; cursor:pointer !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important; }
    .manual-activate-btn:hover { opacity:.92 !important; }
    .icon-btn { background: transparent !important; border: none !important; cursor: pointer !important; padding: 0 !important; display:flex !important; align-items:center !important; justify-content:center !important; width: 48px !important; height: 48px !important; }
    .cta-btn { 
      display:flex !important; align-items:center !important; justify-content:center !important;
      height: 32px !important; padding: 0 12px !important; 
      background: #211940 !important; color: #FFFFFF !important; 
      border: none !important; border-radius: 4px !important; cursor: pointer !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 14px !important; font-weight: 500 !important; line-height: 1.4 !important;
    }
    .pill-row { display:flex !important; align-items:center !important; gap:8px !important; white-space: nowrap !important; padding: 8px !important; }
    .label-text { white-space: nowrap !important; font-weight:400 !important; color:#0F0B1C !important; font-size:16px !important; line-height:1.45 !important; opacity:0.5 !important; }
    .active-pill { display:flex !important; align-items:center !important; gap:12px !important; background: rgba(0,194,117,0.12) !important; border-radius: 16px !important; padding: 8px 16px !important; white-space: nowrap !important; }
    .active-text { color:#268E60 !important; font-size:16px !important; line-height:1.45 !important; font-weight:500 !important; }
    .minimize-btn {
      display: flex !important;
      padding: 0 16px !important;
      align-items: center !important;
      gap: 8px !important;
      align-self: stretch !important;
      border-radius: 4px !important;
      background: #E5F3FF !important;
      border: none !important;
      cursor: pointer !important;
      justify-content: center !important;
      height: 31px !important;
      width: auto !important;
      min-width: 56px !important;
      font-family: inherit !important;
    }
    .minimize-btn:hover {
      background: #0084FF !important;
    }
    .minimize-btn:hover svg path {
      fill: #FFFFFF !important;
    }
    .hidden { display: none !important; }
    .deck-container {
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
      padding: 16px !important;
    }
    .deck-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      width: 100% !important;
    }
    .deck-header .nav-btn { width: 24px !important; height: 24px !important; display:flex !important; align-items:center !important; justify-content:center !important; cursor: pointer !important; }
    .deck-header .step-indicator { display:flex !important; align-items:center !important; gap:6px !important; }
    .deck-header .step-dot { width:6px !important; height:6px !important; border-radius:50% !important; background:#E5F3FF !important; }
    .deck-header .step-dot.active { background:#0084FF !important; }
    .deck-nav {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }
    .deck-dots {
      display: flex !important;
      gap: 4px !important;
    }
    .dot {
      width: 6px !important;
      height: 6px !important;
      border-radius: 50% !important;
      background: #E5F3FF !important;
    }
    .dot.active {
      background: #0084FF !important;
    }
    .deck-content {
      text-align: center !important;
      color: #100B1C !important;
      font-size: 20px !important;
      font-weight: 500 !important;
      line-height: 1.25 !important; /* 125% */
      letter-spacing: -0.15px !important;
      width: 100% !important;
      word-break: break-word !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    .deck-footer {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      padding: 16px 0 !important;
      width: 100% !important;
      align-self: stretch !important;
    }
    .primary-cta {
      display: flex !important;
      height: 48px !important;
      padding: 12px 16px !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 8px !important;
      align-self: stretch !important;
      border-radius: 4px !important;
      background: #211940 !important;
      color: #FFFFFF !important;
      text-align: center !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 14px !important;
      font-style: normal !important;
      font-weight: 500 !important;
      line-height: 1.4 !important;
      border: none !important;
      cursor: pointer !important;
      width: 100% !important;
      margin: 8px 0 0 0 !important;
    }
    .deck-status {
      color: #0F0B1C !important;
      font-size: 16px !important;
      font-weight: 400 !important;
      line-height: 1.45 !important;
      opacity: 0.5 !important;
      font-family: inherit !important;
      flex: 1 1 auto !important;
      text-align: center !important;
    }
  `
  root.appendChild(additionalStyle)
  // Ensure a dedicated container for dynamic content so styles persist across renders
  containerEl = document.createElement('div')
  containerEl.id = 'ws-oc-container'
  root.appendChild(containerEl)
  // Apply saved corner and width; enable dragging
  ;(async () => {
    try {
      const savedCorner = (await chrome.storage.session.get(CORNER_KEY))[CORNER_KEY] as 'tl'|'tr'|'bl'|'br' | undefined
      if (savedCorner) applyCorner(savedCorner)
      const savedWidth = (await chrome.storage.session.get('__wsOcPanelWidth'))['__wsOcPanelWidth']
      if (savedWidth && hostEl) hostEl.style.width = `${savedWidth}px`
    } catch {}
  })()
  setupDrag()
  return root!
}

/* Container helper no longer needed after reverting render behavior
function getContainer(): HTMLElement {
  const r = ensureMount()
  // Ensure style tags exist even if something cleared the root previously
  if (!r.querySelector('style[data-ws-oc="core"]')) {
    // Re-inject core styles
    const s = document.createElement('style')
    s.setAttribute('data-ws-oc', 'core')
    s.textContent = (
      (Array.from(r.querySelectorAll('style[data-ws-oc]'))[0] as HTMLStyleElement | undefined)?.textContent || ''
    )
    // If not recoverable, skip; new styles will be injected on next cold start
    if (s.textContent) r.appendChild(s)
  }
  if (!containerEl || !r.contains(containerEl)) {
    containerEl = document.createElement('div')
    containerEl.id = 'ws-oc-container'
    r.appendChild(containerEl)
  }
  return containerEl!
}
*/

function clearTimers() {
  if (stateTimer) { window.clearTimeout(stateTimer); stateTimer = null }
  if (deckTimer) { window.clearTimeout(deckTimer); deckTimer = null }
  clearCountdown()
}

function render(el: HTMLElement, html: string) {
  // Avoid raw innerHTML: create a container and assign as text for dynamic parts
  // The template here is controlled; however, to satisfy AMO we render safely
  const temp = document.createElement('div')
  temp.className = el.className
  temp.style.cssText = el.style.cssText
  // Insert as static HTML (no user input). If variables are needed, set via textContent below.
  temp.appendChild(document.createElement('div'))
  el.replaceWith(temp)
  const safeHost = temp
}

function showChecking(_host: string) {
  // Intentionally no-op: do not show a "checking for deals" panel
  // to avoid flashing intermediate state. Other states remain intact.
  return
}

function showDealsFound(host: string, deals: Deal[]) {
  const r = ensureMount(); clearTimers()
  const box = document.createElement('div'); box.className = 'panel'
  const safeHost = host.replace(/^www\./i, '')
  const list = deals.map(d => `<div class='deal'><div class='badge'>${formatRate(d)}</div><div>${escapeHtml(d.name || 'Online aankoop')}</div></div>`).join('')
  render(box, `
    <div class="row header">${translate('ocPanel.dealsFoundAt', { host: escapeHtml(safeHost) })}</div>
    <div class="progress"><div class="bar"></div></div>
    ${list}
  `)
  r.getElementById?.('ws-oc-container')?.replaceChildren(box)
}

function showNoDeals() {
  const r = ensureMount(); clearTimers()
  const box = document.createElement('div'); box.className = 'panel'
  render(box, `
    <div class="row header">${translate('ocPanel.noDealsFound')}</div>
  `)
  r.getElementById?.('ws-oc-container')?.replaceChildren(box)
  stateTimer = window.setTimeout(() => hideAll(), 10000)
}

function showDeckPage1(allDeals: Deal[], onViewConditions: () => void, onReset: () => void, opts?: { hideHeader?: boolean; unauth?: boolean }) {
  const r = ensureMount(); clearTimers()
  const box = document.createElement('div'); box.className = 'panel'
  // Force inline styles as fallback
  box.style.background = '#FFFFFF'
  box.style.borderRadius = '16px'
  box.style.boxShadow = '0px 4px 24px 0px rgba(0,0,0,0.1)'
  box.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  box.style.fontSize = '14px'
  box.style.color = '#0F0B1C'
  box.style.display = 'block'
  box.style.overflow = 'hidden'
  box.style.width = 'auto'
  box.style.minWidth = '240px'
  box.style.maxWidth = '360px'
  box.style.minHeight = '200px'
  // Prefer the merchant webUrl domain if provided via last deals payload stored by background
  let domain = getDomain()
  try {
    const cache = (window as any).__wsLastMerchantWebUrl as string | undefined
    if (cache) {
      const u = new URL(cache)
      domain = u.hostname.replace(/^www\./i, '') || domain
    }
  } catch {}
  const list = allDeals.map(d => `
    <div class="deal">
      <div class="badge">${formatRate(d)}</div>
      <div class="deal-text">${escapeHtml(d.name || 'Online aankoop')}</div>
    </div>
  `).join('')
  render(box, `
    <div class="deck-container">
      ${opts?.hideHeader ? '' : `
      <div class=\"deck-header\">
        <div class=\"nav-btn\" id=\"ws-nav-left-1\">${SVG_NAV_LEFT}</div>
        <div class=\"step-indicator\"><div class=\"step-dot active\"></div><div class=\"step-dot\"></div><div class=\"step-dot\"></div></div>
        <div class=\"nav-btn\" id=\"ws-nav-right-1\">${SVG_NAV_RIGHT}</div>
      </div>`}
      ${opts?.unauth ? '' : `<div class=\"deck-content\">${escapeHtml(domain)}</div>`}
      ${opts?.unauth ? `<!-- conditions hidden in unauthenticated state -->` : `
      <div style=\"display:flex;gap:16px;width:100%;\">
        <button class=\"link-btn\" id=\"ws-view\" style=\"flex:1 0 100% !important;width:100%\">${translate('ocPanel.viewConditions')}</button>
      </div>`}
      ${list}
      <button class="primary-cta" id="ws-login">${translate('ocPanel.signupLogin')}</button>
      <div class="deck-footer">
        <button class="minimize-btn" id="ws-minimize">${SVG_ARROW_DOWN}</button>
        <div class="deck-status">${opts?.unauth ? escapeHtml(domain) : translate('ocPanel.cashbackActive')}</div>
        <img class="logo logo-30" alt="Woolsocks" src="${opts?.unauth ? WS_LOGO.grey : WS_LOGO.green}">
      </div>
    </div>
  `)
  r.getElementById?.('ws-oc-container')?.replaceChildren(box)
  // Apply saved width for consistency with minimized pill
  ;(async () => {
    try {
      const saved = (await chrome.storage.session.get('__wsOcPanelWidth'))['__wsOcPanelWidth']
      if (saved && hostEl) {
        hostEl.style.width = `${saved}px`
      } else if (opts?.unauth) {
        // If no saved width yet, match minimized layout width using the footer row
        const footer = box.querySelector('.deck-footer') as HTMLElement | null
        const w = footer?.getBoundingClientRect().width
        if (w && hostEl) {
          const rounded = Math.round(w)
          hostEl.style.width = `${rounded}px`
          await chrome.storage.session.set({ '__wsOcPanelWidth': rounded })
        }
      }
    } catch {}
  })()
  if (!opts?.unauth) { box.querySelector('#ws-view')?.addEventListener('click', onViewConditions) }
  box.querySelector('#ws-login')?.addEventListener('click', onReset)
  if (!opts?.hideHeader) {
    box.querySelector('#ws-nav-right-1')?.addEventListener('click', () => { showDeckPage2() })
    box.querySelector('#ws-nav-left-1')?.addEventListener('click', () => { showDeckPage3() })
  }
  box.querySelector('#ws-minimize')?.addEventListener('click', () => {
    if (opts?.unauth) {
      showMinimizedPill({ unauth: true, deals: allDeals })
    } else {
      showMinimizedPill()
    }
  })
}

function showDeckPage2() {
  const r = ensureMount(); clearTimers()
  const box = document.createElement('div'); box.className = 'panel'
  // Force inline styles as fallback
  box.style.background = '#FFFFFF'
  box.style.borderRadius = '16px'
  box.style.boxShadow = '0px 4px 24px 0px rgba(0,0,0,0.1)'
  box.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  box.style.fontSize = '14px'
  box.style.color = '#0F0B1C'
  box.style.display = 'block'
  box.style.overflow = 'hidden'
  box.style.width = 'auto'
  box.style.minWidth = '240px'
  box.style.maxWidth = '360px'
  box.style.minHeight = '200px'
  render(box, `
    <div class="deck-container">
      <div class="deck-header">
        <div class="nav-btn" id="ws-nav-left-2">${SVG_NAV_LEFT}</div>
        <div class="step-indicator"><div class="step-dot"></div><div class="step-dot active"></div><div class="step-dot"></div></div>
        <div class="nav-btn" id="ws-nav-right-2">${SVG_NAV_RIGHT}</div>
      </div>
      <div class="deck-content">${translate('ocPanel.shopAndPayNormally')}</div>
      <div class="deck-footer">
        <button class="minimize-btn" id="ws-minimize">${SVG_ARROW_DOWN}</button>
        <div class="deck-status">${translate('ocPanel.cashbackActive')}</div>
        <img class="logo logo-30" alt="Woolsocks" src="${WS_LOGO.green}">
      </div>
    </div>
  `)
  r.getElementById?.('ws-oc-container')?.replaceChildren(box)
  box.querySelector('#ws-nav-right-2')?.addEventListener('click', () => { showDeckPage3() })
  box.querySelector('#ws-nav-left-2')?.addEventListener('click', () => { location.hash = ''; showDeckPage1([], ()=>{}, ()=>{}) })
  box.querySelector('#ws-minimize')?.addEventListener('click', () => {
    showMinimizedPill()
  })
}

function showDeckPage3() {
  const r = ensureMount(); clearTimers()
  const box = document.createElement('div'); box.className = 'panel'
  // Force inline styles as fallback
  box.style.background = '#FFFFFF'
  box.style.borderRadius = '16px'
  box.style.boxShadow = '0px 4px 24px 0px rgba(0,0,0,0.1)'
  box.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  box.style.fontSize = '14px'
  box.style.color = '#0F0B1C'
  box.style.display = 'block'
  box.style.overflow = 'hidden'
  box.style.width = 'auto'
  box.style.minWidth = '256px'
  box.style.maxWidth = '320px'
  box.style.minHeight = '200px'
  render(box, `
    <div class="deck-container">
      <div class="deck-header">
        <div class="nav-btn" id="ws-nav-left-3">${SVG_NAV_LEFT}</div>
        <div class="step-indicator"><div class="step-dot"></div><div class="step-dot"></div><div class="step-dot active"></div></div>
        <div class="nav-btn" id="ws-nav-right-3">${SVG_NAV_RIGHT}</div>
      </div>
      <div class="deck-content">${translate('ocPanel.acceptCookiesDisableAdblock')}</div>
      <div class="deck-footer">
        <button class="minimize-btn" id="ws-minimize">${SVG_ARROW_DOWN}</button>
        <div class="deck-status">${translate('ocPanel.cashbackActive')}</div>
        <img class="logo logo-30" alt="Woolsocks" src="${WS_LOGO.green}">
      </div>
    </div>
  `)
  r.getElementById?.('ws-oc-container')?.replaceChildren(box)
  box.querySelector('#ws-nav-right-3')?.addEventListener('click', () => { showDeckPage1([], ()=>{}, ()=>{}) })
  box.querySelector('#ws-nav-left-3')?.addEventListener('click', () => { showDeckPage2() })
  box.querySelector('#ws-minimize')?.addEventListener('click', () => {
    showMinimizedPill()
  })
}

function showMinimizedPill(opts?: { unauth?: boolean; deals?: Deal[] }) {
  const r = ensureMount(); clearTimers()
  const pill = document.createElement('div'); pill.className = 'minipill'
  const deals = opts?.deals || (window as any).__wsLastDeals || []
  const bestRate = Array.isArray(deals) && deals.length ? Math.max(...deals.map((d:any)=>Number(d?.rate||0))) : 0
  const label = opts?.unauth ? translate('ocPanel.earnRateCashback', { rate: bestRate }) : translate('ocPanel.cashbackActive')
  const logo = opts?.unauth ? WS_LOGO.grey : WS_LOGO.green
  // Replace innerHTML usage with DOM construction for the pill
  while (pill.firstChild) pill.removeChild(pill.firstChild)
  const pillRow = document.createElement('div')
  pillRow.className = 'pill-row'
  const label = document.createElement('span')
  label.className = 'label-text'
  label.textContent = 'Tracking status'
  const active = document.createElement('span')
  active.className = 'active-text'
  active.textContent = 'Active'
  pillRow.appendChild(label)
  pillRow.appendChild(active)
  pill.appendChild(pillRow)
    <div class="pill-row">
      <button class="cta-btn" id="ws-expand">${translate('popup.login')}</button>
      <div class="label-text">${label}</div>
      <img class="logo logo-30" alt="Woolsocks" src="${logo}">
      <button class="icon-btn" id="ws-dismiss"><img src="${CLOSE_ICON}" alt="close" width="48" height="48" /></button>
    </div>
  `
  r.getElementById?.('ws-oc-container')?.replaceChildren(pill)
  // Save current width to keep consistent sizing
  ;(async () => {
    try {
      const w = pill.getBoundingClientRect().width
      if (w && hostEl) {
        hostEl.style.width = `${Math.round(w)}px`
        await chrome.storage.session.set({ '__wsOcPanelWidth': Math.round(w) })
      }
    } catch {}
  })()
  pill.querySelector('#ws-dismiss')?.addEventListener('click', async () => {
    const domain = getDomain()
    try { 
      await setActivePill(domain, false)
      await setPillDismissed(domain, true)
    } catch {}
    hideAll()
  })
  pill.querySelector('#ws-expand')?.addEventListener('click', () => {
    if (opts?.unauth) {
      chrome.runtime.sendMessage({ type: 'OPEN_URL', url: 'https://woolsocks.eu' })
    } else {
      showDeckPage1((window as any).__wsLastDeals || [], ()=>{}, ()=>{})
    }
  })
}

function showAuthenticatedActivePill() {
  const r = ensureMount(); clearTimers()
  const pill = document.createElement('div'); pill.className = 'minipill'
  while (pill.firstChild) pill.removeChild(pill.firstChild)
  const pillRow2 = document.createElement('div')
  pillRow2.className = 'pill-row'
  const label2 = document.createElement('span')
  label2.className = 'label-text'
  label2.textContent = 'Tracking status'
  const inactive = document.createElement('span')
  inactive.className = 'active-text'
  inactive.textContent = 'Not active'
  pillRow2.appendChild(label2)
  pillRow2.appendChild(inactive)
  pill.appendChild(pillRow2)
    <div class="active-pill">
      ${CHECK_SVG}
      <div class="active-text">${translate('ocPanel.cashbackActive')}</div>
    </div>
    <button class="icon-btn" id="ws-dismiss"><img src="${CLOSE_ICON}" alt="close" width="48" height="48" /></button>
  `
  r.getElementById?.('ws-oc-container')?.replaceChildren(pill)
  // dynamic width based on content
  ;(async () => {
    try {
      const w = pill.getBoundingClientRect().width
      if (w && hostEl) {
        hostEl.style.width = `${Math.round(w)}px`
        await chrome.storage.session.set({ '__wsOcPanelWidth': Math.round(w) })
      }
    } catch {}
  })()
  pill.querySelector('#ws-dismiss')?.addEventListener('click', async () => {
    const domain = getDomain()
    try { 
      await setActivePill(domain, false)
      await setPillDismissed(domain, true)
    } catch {}
    hideAll()
  })
}

function hideAll() {
  clearTimers()
  if (hostEl && hostEl.parentNode) hostEl.parentNode.removeChild(hostEl)
  hostEl = null; root = null
}

function escapeHtml(s: string): string { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c]) }
function formatRate(d: Deal): string { if ((d.amountType||'').toUpperCase()==='FIXED') return `${d.currency||'€'}${d.rate}`; const r = typeof d.rate==='number'? d.rate:0; return `${r}%` }

// Countdown banner for auto-activation
let countdownTimer: number | null = null
let countdownSeconds = 0

function showCountdownBanner(domain: string, dealInfo: Deal, initialCountdown: number = 3) {
  const r = ensureMount(); clearTimers()
  countdownSeconds = initialCountdown
  
  const banner = document.createElement('div')
  banner.className = 'countdown-banner'
  while (banner.firstChild) banner.removeChild(banner.firstChild)
  const bannerRow = document.createElement('div')
  bannerRow.className = 'countdown-row'
  const number = document.createElement('div')
  number.className = 'countdown-number'
  number.textContent = String(3)
  const textWrap = document.createElement('div')
  textWrap.className = 'countdown-text'
  const title = document.createElement('div')
  title.className = 'countdown-title'
  title.textContent = 'Activating cashback…'
  const sub = document.createElement('div')
  sub.className = 'countdown-deal'
  sub.textContent = ''
  textWrap.appendChild(title)
  textWrap.appendChild(sub)
  const actions = document.createElement('div')
  actions.className = 'countdown-actions'
  const cancel = document.createElement('button')
  cancel.className = 'countdown-cancel-btn'
  cancel.textContent = 'Cancel'
  actions.appendChild(cancel)
  bannerRow.appendChild(number)
  bannerRow.appendChild(textWrap)
  bannerRow.appendChild(actions)
  banner.appendChild(bannerRow)
    <div class="countdown-content">
      <div class="countdown-row">
        <div class="countdown-text">
          <div class="countdown-title" id="ws-countdown-title">${translate('ocPanel.countdownTitle', { seconds: countdownSeconds.toString() })}</div>
          
        </div>
        <div class="countdown-actions">
          <button class="countdown-cancel-btn" id="ws-countdown-cancel">${translate('ocPanel.countdownCancel')}</button>
        </div>
      </div>
      <div class="countdown-deal">${formatRate(dealInfo)} cashback on ${escapeHtml(domain)}</div>
    </div>
  `
  
  // Ensure dynamic width so long texts are not truncated
  try {
    if (hostEl) hostEl.style.width = 'auto'
    // Clear any saved fixed width so future mounts stay dynamic
    try { chrome.storage.session.remove('__wsOcPanelWidth') } catch {}
  } catch {}
  r.getElementById?.('ws-oc-container')?.replaceChildren(banner)
  
  // Animate progress bar exactly over the countdown duration
  const titleEl = banner.querySelector('#ws-countdown-title') as HTMLElement | null

  // Start countdown
  countdownTimer = window.setInterval(() => {
    countdownSeconds--
    if (titleEl) { titleEl.textContent = translate('ocPanel.countdownTitle', { seconds: countdownSeconds.toString() }) }
    
    
    if (countdownSeconds <= 0) {
      clearCountdown()
      // Notify background that countdown completed
      chrome.runtime.sendMessage({ 
        type: 'OC_COUNTDOWN_COMPLETE', 
        domain: domain,
        dealInfo: dealInfo 
      })
      hideAll()
    }
  }, 1000)
  
  // Cancel button handler
  banner.querySelector('#ws-countdown-cancel')?.addEventListener('click', () => {
    clearCountdown()
    // Notify background that countdown was cancelled
    chrome.runtime.sendMessage({ 
      type: 'OC_COUNTDOWN_CANCEL', 
      domain: domain 
    })
    hideAll()
  })
}

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  countdownSeconds = 0
}


// Manual activation banner for Safari or manual mode
function showManualActivationBanner(host: string, _deals: Deal[], bestDeal: Deal | null) {
  const r = ensureMount(); clearTimers()
  
  // Clear any saved width to allow dynamic sizing
  if (hostEl) hostEl.style.width = 'auto'
  try { chrome.storage.session.remove('__wsOcPanelWidth') } catch {}
  
  const banner = document.createElement('div')
  banner.className = 'manual-activation-banner'
  // Apply blue bordered card styling per spec
  try {
    (banner as HTMLElement).style.borderRadius = '16px'
    ;(banner as HTMLElement).style.border = '2px solid #0084FF'
    ;(banner as HTMLElement).style.background = '#FFFFFF'
    ;(banner as HTMLElement).style.boxShadow = '0 0 24px 0 rgba(0, 0, 0, 0.20)'
    ;(banner as HTMLElement).style.display = 'grid'
    ;(banner as HTMLElement).style.gridTemplateColumns = '1fr auto auto'
    ;(banner as HTMLElement).style.alignItems = 'center'
    ;(banner as HTMLElement).style.gap = '12px'
    ;(banner as HTMLElement).style.padding = '12px 16px'
  } catch {}
  const rate = bestDeal ? formatRate(bestDeal) : '0%'
  
  while (banner.firstChild) banner.removeChild(banner.firstChild)
  const left = document.createElement('div')
  left.className = 'manual-activation-left'
  const title2 = document.createElement('div')
  title2.className = 'manual-activation-title'
  title2.textContent = 'Activate cashback'
  const sub2 = document.createElement('div')
  sub2.className = 'manual-activation-sub'
  sub2.textContent = ''
  left.appendChild(title2)
  left.appendChild(sub2)
  const btn = document.createElement('button')
  btn.className = 'manual-activate-btn'
  btn.textContent = 'Activate now'
  banner.appendChild(left)
  banner.appendChild(btn)
    <div class="manual-activation-left" style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
      <img class="logo" alt="Woolsocks" src="${WS_LOGO.yellow}" style="width:40px;height:40px;flex-shrink:0;"/>
      <div class="manual-activation-text" style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:1;">
        <div class="manual-activation-title single-line" style="white-space:nowrap;font-size:18px;font-weight:700;color:#0F0B1C;overflow:visible;">${translate('ocPanel.activateTitle', { rate: rate })}</div>
        <div class="manual-activation-sub single-line" style="white-space:nowrap;font-size:14px;color:#6B7280;overflow:visible;">${translate('ocPanel.activateDescription', { host: escapeHtml(host) })}</div>
      </div>
    </div>
    <button class="manual-activate-btn" id="ws-manual-activate" style="height:40px;padding:0 16px;border:none;border-radius:8px;background:#211940;color:#FFFFFF;font-weight:700;cursor:pointer;flex-shrink:0;">${translate('ocPanel.activateCta')}</button>
    <button class="icon-btn" id="ws-dismiss" style="flex-shrink:0;"><img src="${CLOSE_ICON}" alt="close" width="48" height="48" /></button>
  `
  
  r.getElementById?.('ws-oc-container')?.replaceChildren(banner)
  
  // Manual activation button handler
  banner.querySelector('#ws-manual-activate')?.addEventListener('click', () => {
    // Notify background to perform manual activation
    chrome.runtime.sendMessage({ 
      type: 'OC_MANUAL_ACTIVATE', 
      domain: host,
      dealInfo: bestDeal 
    })
    hideAll()
  })
  
  // Dismiss button handler
  banner.querySelector('#ws-dismiss')?.addEventListener('click', async () => {
    const domain = getDomain()
    try { 
      await setActivePill(domain, false)
      await setPillDismissed(domain, true)
    } catch {}
    hideAll()
  })
}

// Message handling from background
chrome.runtime.onMessage.addListener(async (msg: any, _sender, sendResponse) => {
  // Handle ping request from background
  if (msg?.__wsPing) {
    if (OC_DEBUG) console.log('[WS OC Content] Received WS_PING, sending ACK')
    sendResponse({ __wsAck: true })
    return true
  }
  
  if (!msg || !msg.__wsOcUi) return
  const domain = getDomain()
  const ev = msg as UiEvent
  
  if (OC_DEBUG) console.log(`[WS OC Content] Received message: ${ev.kind}`)
  
  if (ev.kind === 'oc_scan_start') {
    showChecking(ev.host)
  } else if (ev.kind === 'oc_deals_found') {
    // Check if we should show manual activation (Safari or manual mode)
    const platform = (ev as any).platform || 'chrome'
    const isManualMode = (ev as any).isManualMode || false
    
    if (platform === 'safari' || isManualMode) {
      const bestDeal = ev.deals && ev.deals.length ? ev.deals.sort((a, b) => (b.rate || 0) - (a.rate || 0))[0] : null
      showManualActivationBanner(ev.host, ev.deals || [], bestDeal)
    } else {
      showDealsFound(ev.host, ev.deals || [])
    }
  } else if (ev.kind === 'oc_redirect_requested') {
    // Hide banner immediately - redirect is about to happen and will destroy this content script
    // When user lands back on merchant, oc_activated will be sent to show the "active" pill
    hideAll()
  } else if (ev.kind === 'oc_blocked') {
    if (ev.reason === 'no_deals') showNoDeals(); else hideAll()
  } else if (ev.kind === 'oc_activated') {
    // Clear any previous dismissal and show fresh activation
    await setPillDismissed(domain, false) // Clear any previous dismissal
    ;(async () => { try { await setActivePill(domain, true) } catch {} })()
    showAuthenticatedActivePill()
  } else if (ev.kind === 'oc_login_required') {
    // Simplified unauthenticated state: show minimized pill only
    try { (window as any).__wsLastDeals = ev.deals || [] } catch {}
    try { (window as any).__wsLastProviderId = ev.providerMerchantId } catch {}
    ;(async () => { try { await setActivePill(getDomain(), true) } catch {} })()
    showMinimizedPill({ unauth: true, deals: ev.deals || [] })
  } else if (ev.kind === 'oc_countdown_start') {
    // Show countdown banner for auto-activation
    showCountdownBanner(ev.host, ev.dealInfo, ev.countdown)
  }
})

// On visibility/show, request activation state from background and re-emit if active
// Also check for activation state on page load as a fallback
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const domain = getDomain()
    if (await isPillDismissed(domain)) return // Add this check
    
    // Set boot marker in session storage
    try {
      await chrome.storage.session.set({ __wsOcBoot: { host: domain, ts: Date.now() } })
      if (OC_DEBUG) console.log(`[WS OC Content] DOMContentLoaded - boot marker set for ${domain}`)
    } catch {}
    
    // Send WS_READY signal to background
    try {
      chrome.runtime.sendMessage({ __wsReady: true, host: domain })
      if (OC_DEBUG) console.log(`[WS OC Content] Sent WS_READY for ${domain}`)
    } catch {}
    
    const key = '__wsOcActivePillByDomain'
    const result = await chrome.storage.session.get(key)
    const activePills = result[key] as Record<string, boolean> | undefined
    if (activePills && activePills[domain]) {
      // Show activation pill if we missed the message
      console.log(`[WS OC Debug] Fallback: showing activation pill for ${domain}`)
      showAuthenticatedActivePill()
    }
  } catch (error) {
    console.warn('[WS OC Debug] Fallback check failed:', error)
  }
})
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return
  try {
    const domain = getDomain()
    if (await isPillDismissed(domain)) return // Add this check
    
    chrome.runtime.sendMessage({ type: 'REQUEST_ACTIVATION_STATE', domain }, (resp) => {
      if (resp && resp.active) {
        showAuthenticatedActivePill()
        try { (window as any).__wsLastActivation = { at: resp.at, clickId: resp.clickId } } catch {}
        try { /* analytics breadcrumb */ (console as any).debug?.('[WS OC] reemit active from bg state') } catch {}
      }
    })
  } catch {}
  // Read pending UI event persisted by background if message delivery raced
  try {
    const { __wsOcPendingUi } = await chrome.storage.session.get(['__wsOcPendingUi']) as any
    if (__wsOcPendingUi && __wsOcPendingUi.kind && typeof __wsOcPendingUi.ts === 'number') {
      const age = Date.now() - __wsOcPendingUi.ts
      if (age < 10000) { // valid for 10s
        if (__wsOcPendingUi.kind === 'oc_countdown_start') {
          showCountdownBanner(__wsOcPendingUi.host, __wsOcPendingUi.dealInfo, __wsOcPendingUi.countdown || 3)
        }
      }
      try { await chrome.storage.session.remove(['__wsOcPendingUi']) } catch {}
    }
  } catch {}
})

// On load: if domain has active pill persisted in this session, show it immediately
;(async () => {
  try { await initLanguage() } catch {}
  const domain = getDomain()
  if (await getActivePill(domain)) {
    showMinimizedPill()
  }
})()
 