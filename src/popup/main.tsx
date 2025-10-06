import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import SettingsPanel from '../options/SettingsPanel'
import { track } from '../background/analytics'

function App() {
  useEffect(() => {
    document.documentElement.style.margin = '0'
    document.documentElement.style.background = 'transparent'
    document.body.style.margin = '0'
    document.body.style.background = 'transparent'
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
  return (
    <div style={{ background: '#FFC107', padding: 12, borderRadius: 0, overflow: 'hidden', position: 'relative' }}>
      {/* Top balance chip and close */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', color: '#111827', padding: '8px 12px', borderRadius: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>💰</span>
          <span id="__ws_balance">€0,00</span>
        </div>
        <button onClick={() => window.close()} style={{ appearance: 'none', background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
      </div>

      <SettingsPanel variant="popup" onBalance={(b) => {
        const el = document.getElementById('__ws_balance')
        if (el) el.textContent = `€${b.toFixed(2)}`
      }} />
      <div id="__ws_oc_enabled" style={{ display: 'none', background: 'white', borderRadius: 8, padding: 12, marginTop: 12 }}>
        <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>Cashback tracking enabled</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div id="__ws_oc_rate" style={{ background: '#211940', color: 'white', borderRadius: 6, padding: '2px 6px' }}>0%</div>
          <div id="__ws_oc_title" style={{ fontWeight: 600 }}>Merchant</div>
        </div>
        <div id="__ws_oc_cond" style={{ color: '#374151', fontSize: 12, marginBottom: 8 }}></div>
        <button id="__ws_oc_btn" style={{ background: '#211940', color: 'white', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}>Go to store with cashback</button>
      </div>
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


