import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import SettingsPanel from '../options/SettingsPanel'

function App() {
  useEffect(() => {
    document.documentElement.style.margin = '0'
    document.documentElement.style.background = 'transparent'
    document.body.style.margin = '0'
    document.body.style.background = 'transparent'
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


