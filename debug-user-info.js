// Debug: Fetch raw user profile info via Woolsocks site proxy
// Usage:
// 1) Open DevTools Console on any page (preferably on https://woolsocks.eu/* to avoid CORS)
// 2) Paste the entire script and press Enter
// 3) It prints status, raw response text, parsed JSON, and key fields

(async () => {
  const endpoint = 'https://woolsocks.eu/api/wsProxy/user-info/api/v0'
  try {
    const resp = await fetch(endpoint, { credentials: 'include' })
    const status = resp.status
    const text = await resp.text()
    console.log('[WS DEBUG] GET', endpoint, '→ status:', status)
    console.log('[WS DEBUG] Raw response text:')
    console.log(text)

    try {
      const json = JSON.parse(text)
      console.log('[WS DEBUG] Parsed JSON:')
      console.dir(json)

      const d = (json && (json.data || json)) || {}
      const firstName = d.firstName || d.user?.firstName || d.profile?.firstName || null
      const language = d.language || d.locale || d.profile?.language || null
      const email = d.email || d.user?.email || d.profile?.email || null
      const id = d.id || d.user?.id || d.profile?.id || null
      console.log('[WS DEBUG] Extracted fields:')
      console.table({ firstName, language, email, id })
    } catch (e) {
      console.warn('[WS DEBUG] Response is not valid JSON. See raw text above.', e)
    }

    if (status === 401 || status === 403) {
      console.warn('[WS DEBUG] Not authenticated. Open https://woolsocks.eu/, log in, then rerun this script.')
    }
  } catch (err) {
    console.error('[WS DEBUG] Request failed:', err)
    console.info('Tip: If you see a CORS error, run this on a https://woolsocks.eu/* page so cookies are sent.')
  }
})()


