import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Settings = {
  showCashbackPrompt: boolean
  showVoucherPrompt: boolean
}

function Options() {
  const [settings, setSettings] = useState<Settings>({
    showCashbackPrompt: true,
    showVoucherPrompt: true,
  })

  useEffect(() => {
    chrome.storage.local.get('settings', (res) => {
      if (res?.settings) setSettings(res.settings)
    })
  }, [])

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    chrome.storage.local.set({ settings: next })
  }

  return (
    <div style={{ width: 360, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Settings</h2>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={settings.showCashbackPrompt}
          onChange={(e) => update('showCashbackPrompt', e.target.checked)}
        />
        <span style={{ marginLeft: 8 }}>Cashback reminders (popup)</span>
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={settings.showVoucherPrompt}
          onChange={(e) => update('showVoucherPrompt', e.target.checked)}
        />
        <span style={{ marginLeft: 8 }}>Voucher suggestions (checkout)</span>
      </label>
      <p style={{ color: '#555' }}>
        Icon will still change color even if popups are disabled.
      </p>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Options />)


