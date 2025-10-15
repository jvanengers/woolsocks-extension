// Offscreen relay orchestrator. Runs in offscreen document, hosts an invisible
// iframe to woolsocks.eu and forwards WS_PING / WS_RELAY_FETCH to the page
// context via postMessage and a small script injected by the content script.

type RelayRequest = {
  type: 'WS_PING' | 'WS_RELAY_FETCH'
  payload?: { url: string; init?: RequestInit }
}

type RelayResponse = {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  bodyText: string
}

const ORIGIN = 'https://woolsocks.eu'

const frame: HTMLIFrameElement | null = document.getElementById('wsRelayFrame') as HTMLIFrameElement | null

function pingFrame(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const id = setTimeout(() => { if (!settled) resolve(false) }, 1000)
    try {
      window.addEventListener('message', function onMsg(ev: MessageEvent<any>) {
        if (ev.origin !== ORIGIN) return
        if (ev.data && ev.data.type === 'WS_PING_ACK') {
          settled = true
          window.removeEventListener('message', onMsg as any)
          clearTimeout(id)
          resolve(true)
        }
      })
      frame?.contentWindow?.postMessage({ type: 'WS_PING' }, ORIGIN)
    } catch {
      clearTimeout(id)
      resolve(false)
    }
  })
}

function forwardFetch(url: string, init?: RequestInit): Promise<RelayResponse> {
  return new Promise((resolve) => {
    const reqId = Math.random().toString(36).slice(2)
    function onMsg(ev: MessageEvent<any>) {
      if (ev.origin !== ORIGIN) return
      const d = ev.data
      if (!d || d.type !== 'WS_RELAY_FETCH_RESULT' || d.reqId !== reqId) return
      window.removeEventListener('message', onMsg as any)
      resolve({
        ok: !!d.ok,
        status: Number(d.status) || 0,
        statusText: String(d.statusText || ''),
        headers: d.headers || {},
        bodyText: String(d.bodyText || ''),
      })
    }
    window.addEventListener('message', onMsg as any)
    frame?.contentWindow?.postMessage({ type: 'WS_RELAY_FETCH', reqId, url, init }, ORIGIN)
    setTimeout(() => {
      try { window.removeEventListener('message', onMsg as any) } catch {}
      resolve({ ok: false, status: 0, statusText: 'timeout', headers: {}, bodyText: '' })
    }, 10000)
  })
}

chrome.runtime.onMessage.addListener((message: RelayRequest, _sender, sendResponse) => {
  if (!message) return
  ;(async () => {
    try {
      const ready = await pingFrame()
      if (!ready) { sendResponse({ ok: false, status: 0, statusText: 'no-frame', headers: {}, bodyText: '' }); return }
      if (message.type === 'WS_PING') { sendResponse({ ok: true, status: 200, statusText: 'ok', headers: {}, bodyText: '' }); return }
      if (message.type === 'WS_RELAY_FETCH') {
        const { url, init } = message.payload || { url: '', init: undefined }
        const resp = await forwardFetch(url, init)
        sendResponse(resp)
        return
      }
      sendResponse({ ok: false, status: 400, statusText: 'bad-request', headers: {}, bodyText: '' })
    } catch (e: any) {
      sendResponse({ ok: false, status: 500, statusText: String(e?.message || 'error'), headers: {}, bodyText: '' })
    }
  })()
  return true
})


