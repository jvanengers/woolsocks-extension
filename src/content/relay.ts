// Relay and token capture script (runs on https://woolsocks.eu/*)
console.log('[WS Relay] Content script loaded on:', window.location.href)
;(window as any).__WS_RELAY_READY__ = true

// --- Helpers ---------------------------------------------------------------
function isJwt(token: string): boolean {
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)
}

function reportToken(token: string) {
  try {
    chrome.runtime.sendMessage({ type: 'WS_CAPTURE_TOKEN', token })
  } catch (e) {
    console.warn('[WS Relay] Failed to send token:', e)
  }
}

// Listen for tokens coming from the page context
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return
  const data = event.data
  if (data && data.type === 'WS_CAPTURE_TOKEN' && typeof data.token === 'string') {
    if (isJwt(data.token)) {
      reportToken(data.token)
    }
  }
})

// Inject a script into the page context to hook fetch/XMLHttpRequest
function injectPageHook() {
  const code = `(() => {
    function sendToken(token) {
      try { window.postMessage({ type: 'WS_CAPTURE_TOKEN', token }, window.location.origin); } catch(_){}
    }
    function extractBearer(value) {
      if (!value) return null; const m = String(value).match(/Bearer\s+([^\s]+)/i); return m ? m[1] : null;
    }

    function getAuthFromHeaders(h) {
      try {
        if (!h) return null;
        if (typeof h.get === 'function') {
          return h.get('Authorization') || h.get('authorization') || null;
        }
        if (Array.isArray(h)) {
          for (const kv of h) {
            if (!kv) continue; const k = String(kv[0] || '').toLowerCase(); if (k === 'authorization') return kv[1];
          }
          return null;
        }
        return h['Authorization'] || h['authorization'] || null;
      } catch(_) { return null; }
    }

    const _fetch = window.fetch;
    window.fetch = function(input, init) {
      try {
        // Check Request object first
        if (input && typeof input === 'object' && 'headers' in input && input.headers) {
          const authReq = getAuthFromHeaders(input.headers);
          const b1 = extractBearer(authReq);
          if (b1) sendToken(b1);
        }
        const h = init && init.headers ? init.headers : undefined;
        const auth = getAuthFromHeaders(h);
        const b2 = extractBearer(auth);
        if (b2) sendToken(b2);
      } catch(_){}
      return _fetch.apply(this, arguments);
    };

    const XHR = window.XMLHttpRequest;
    function XHRHook(){ return Reflect.construct(XHR, arguments, new.target); }
    XHRHook.prototype = XHR.prototype;
    XHRHook.prototype.setRequestHeader = function(k, v){
      try { if (String(k).toLowerCase() === 'authorization') { const t = extractBearer(v); if (t) sendToken(t); } } catch(_){}
      return XHR.prototype.setRequestHeader.apply(this, arguments);
    };
    window.XMLHttpRequest = XHRHook;

    // Attempt to find tokens in storage as well
    try {
      const scan = (s) => { for (let i=0;i<s.length;i++){ const val = s.getItem(s.key(i)); if(!val) continue; if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(val)) { sendToken(val); return true; } try { const obj = JSON.parse(val); const c = [obj && obj.token, obj && obj.accessToken, obj && obj.idToken, obj && obj.authToken]; for (const x of c) { if (typeof x === 'string' && /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(x)) { sendToken(x); return true; } } } catch(_){} } return false; };
      if (!scan(window.localStorage)) scan(window.sessionStorage);
    } catch(_){}
  })();`;
  const s = document.createElement('script')
  s.textContent = code
  ;(document.head || document.documentElement).appendChild(s)
  s.remove()
}

injectPageHook()

// --- Existing relay kept for backwards compatibility ----------------------
type RelayRequest = {
  type: 'WS_RELAY_FETCH' | 'WS_PING'
  payload?: {
    url: string
    init?: RequestInit
  }
}

type RelayResponse = {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  bodyText: string
}

chrome.runtime.onMessage.addListener((message: RelayRequest, _sender, sendResponse) => {
  if (!message) return

  if (message.type === 'WS_PING') {
    sendResponse({ ok: true })
    return
  }

  if (message.type !== 'WS_RELAY_FETCH') return

  const { url, init } = message.payload || { url: '', init: undefined }
  ;(async () => {
    try {
      const resp = await fetch(url, {
        credentials: 'include',
        ...init,
        headers: {
          ...init?.headers,
          'x-application-name': 'WOOLSOCKS_WEB',
        },
      })

      const headers: Record<string, string> = {}
      resp.headers.forEach((value, key) => {
        headers[key] = value
      })

      const bodyText = await resp.text()

      const relayResponse: RelayResponse = {
        ok: resp.ok,
        status: resp.status,
        statusText: resp.statusText,
        headers,
        bodyText,
      }
      sendResponse(relayResponse)
    } catch (error: any) {
      sendResponse({
        ok: false,
        status: 500,
        statusText: error?.message || 'Relay fetch failed',
        headers: {},
        bodyText: JSON.stringify({ error: error?.message }),
      })
    }
  })()
  return true
})


