import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type WsProfile = any

async function getAnonId(): Promise<string> {
  const stored = await chrome.storage.local.get('wsAnonId')
  if (stored?.wsAnonId) return stored.wsAnonId as string
  const id = crypto.randomUUID()
  await chrome.storage.local.set({ wsAnonId: id })
  return id
}

async function fetchUserInfo(): Promise<WsProfile | null> {
  try {
    const anonId = await getAnonId()
    const resp = await fetch('https://woolsocks.eu/api/wsProxy/user-info/api/v0', {
      credentials: 'include',
      headers: {
        'x-application-name': 'WOOLSOCKS_WEB',
        'x-user-id': anonId,
      },
    })
    if (!resp.ok) return null
    const data = await resp.json()
    return data
  } catch {
    return null
  }
}

function Options() {
  const [session, setSession] = useState<boolean | null>(null)
  const [profile, setProfile] = useState<WsProfile | null>(null)

  useEffect(() => {
    checkSession().then((has) => {
      setSession(has)
      if (has) loadProfile()
    })
  }, [])

  async function checkSession(): Promise<boolean> {
    try {
      const site = await chrome.cookies.getAll({ domain: 'woolsocks.eu' })
      const api = await chrome.cookies.getAll({ domain: 'api.woolsocks.eu' })
      const all = [...site, ...api]
      return all.some(c => c.name === 'ws-session' || /session/i.test(c.name))
    } catch {
      return false
    }
  }

  async function loadProfile() {
    const p = await fetchUserInfo()
    setProfile(p)
  }

  const openLogin = () => {
    chrome.tabs.create({ url: 'https://woolsocks.eu/nl/profile', active: true })
  }

  const firstName: string | undefined =
    profile?.data?.firstName || profile?.firstName || profile?.user?.firstName

  // Try to read a sensible sock/cashback balance from the profile payload
  const sockValueRaw: number | undefined =
    profile?.data?.sockValue ??
    profile?.data?.cashback?.sockValue ??
    profile?.data?.cashbackSock ??
    profile?.data?.balance ??
    profile?.sockValue ??
    profile?.balance

  const sockValue = typeof sockValueRaw === 'number' ? sockValueRaw : 0

  return (
    <div style={{ width: 420, padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Woolsocks</h2>
        <div style={{ fontSize: 12, color: '#666' }}>Options</div>
      </div>

      {session === null && (
        <div style={{ marginTop: 24, fontSize: 13, color: '#666' }}>Checking session…</div>
      )}

      {session === false && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>No active session found.</div>
          <button
            onClick={openLogin}
            style={{
              background: '#211940', color: 'white', border: 'none', borderRadius: 6,
              padding: '10px 14px', fontSize: 13, cursor: 'pointer'
            }}
          >
            Login at Woolsocks.eu
          </button>
        </div>
      )}

      {session === true && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Hi {firstName || 'there'} 👋</div>
          <div style={{ marginTop: 8, fontSize: 14, color: '#444' }}>Cashback sock</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10B981' }}>€{sockValue.toFixed(2)}</div>
          <div style={{ marginTop: 16 }}>
            <button
              onClick={loadProfile}
              style={{ background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Options />)


