import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import SettingsPanel from '../options/SettingsPanel'
import { track } from '../background/analytics'

function App() {
  const [session, setSession] = useState<boolean | null>(null)

  useEffect(() => {
    document.documentElement.style.margin = '0'
    document.documentElement.style.background = 'transparent'
    document.body.style.margin = '0'
    document.body.style.background = 'transparent'
    ;(async () => {
      async function getAnonId(): Promise<string> {
        const stored = await chrome.storage.local.get('wsAnonId')
        if (stored?.wsAnonId) return stored.wsAnonId as string
        const id = crypto.randomUUID()
        await chrome.storage.local.set({ wsAnonId: id })
        return id
      }
      try {
        // Prefer network-based check against user-info API
        const anonId = await getAnonId()
        const resp = await fetch('https://woolsocks.eu/api/wsProxy/user-info/api/v0', {
          credentials: 'include',
          headers: { 'x-application-name': 'WOOLSOCKS_WEB', 'x-user-id': anonId },
        })
        if (resp.ok) {
          try {
            const json: any = await resp.json()
            const uid = json?.data?.userId || json?.data?.id || json?.user?.id
            setSession(!!uid)
            return
          } catch {}
        }
        // Fallback to strict cookie presence (exact name only)
        try {
          const site = await chrome.cookies.getAll({ domain: 'woolsocks.eu' })
          const api = await chrome.cookies.getAll({ domain: 'api.woolsocks.eu' })
          const all = [...site, ...api]
          const has = all.some(c => c.name === 'ws-session')
          setSession(has)
        } catch {
          setSession(false)
        }
      } catch {
        setSession(false)
      }
    })()
    ;(async () => {
      try {
        const { __wsOcPopupData } = await chrome.storage.local.get('__wsOcPopupData')
        if (__wsOcPopupData) {
          const el = document.getElementById('__ws_oc_enabled')
          if (el) el.style.display = 'block'
          const title = document.getElementById('__ws_oc_title')
          const rate = document.getElementById('__ws_oc_rate')
          const btn = document.getElementById('__ws_oc_btn') as HTMLButtonElement | null
          const cond = document.getElementById('__ws_oc_cond')
          if (title) title.textContent = `${__wsOcPopupData.partnerName}`
          if (rate) {
            if ((__wsOcPopupData.amountType || 'PERCENTAGE') === 'PERCENTAGE') {
              rate.textContent = `${__wsOcPopupData.rate}% cashback`
            } else {
              rate.textContent = `€${Number(__wsOcPopupData.rate || 0).toFixed(2)} cashback`
            }
          }
          if (cond) {
            const t = __wsOcPopupData?.conditions?.termsCondition
            const a = __wsOcPopupData?.conditions?.additionalInfo
            cond.textContent = t || a || ''
          }
          if (btn) {
            btn.onclick = () => {
              const url = __wsOcPopupData?.affiliateUrl
              if (url) {
                track('oc_manual_reactivate', {
                  domain: __wsOcPopupData?.domain,
                  partner_name: __wsOcPopupData?.partnerName,
                  deal_id: __wsOcPopupData?.dealId,
                  click_id: __wsOcPopupData?.clickId,
                })
                chrome.tabs.create({ url })
              }
            }
          }
        }
      } catch {}
    })()
  }, [])

  const openLogin = () => {
    chrome.tabs.create({ url: 'https://woolsocks.eu/nl/profile', active: true })
  }

  if (session === null) {
    return (
      <div style={{ background: '#FDC408', padding: 16, borderRadius: 0, overflow: 'hidden', position: 'relative', width: 320 }}>
        <div style={{ fontSize: 13, color: '#111827', opacity: 0.7 }}>Checking session…</div>
      </div>
    )
  }

  if (session === false) {
    return (
      <div style={{ background: '#FDC408', padding: 16, borderRadius: 0, overflow: 'hidden', position: 'relative', width: 320 }}>
        <button
          onClick={openLogin}
          style={{
            background: '#211940',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            height: 48,
            width: '100%',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Login to continue
        </button>
      </div>
    )
  }
  return (
    <div style={{ background: '#FDC408', padding: 12, borderRadius: 0, overflow: 'hidden', position: 'relative' }}>
      {/* Top balance chip and close */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', color: '#111827', padding: '8px 12px', borderRadius: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>💰</span>
          <span id="__ws_balance">€0,00</span>
        </div>
        <button onClick={() => window.close()} style={{ appearance: 'none', background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
      </div>

      {session === true && (
        <SettingsPanel variant="popup" onBalance={(b) => {
          const el = document.getElementById('__ws_balance')
          if (el) el.textContent = `€${b.toFixed(2)}`
        }} />
      )}
      {/* OC status card removed per requirement */}
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <img
          src={chrome.runtime.getURL('public/icons/Woolsocks-logo-large.svg')}
          alt="Woolsocks"
          style={{ height: 28, opacity: 0.9 }}
        />
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)


