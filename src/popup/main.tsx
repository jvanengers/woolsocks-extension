import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  return (
    <div style={{ width: 320, padding: 12, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>Woolsocks</h1>
      <p style={{ marginTop: 8 }}>Cashback helper is running.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => chrome.runtime.sendMessage({ type: 'SET_ICON', state: 'available' })}
        >
          Mark Available
        </button>
        <button
          onClick={() => chrome.runtime.sendMessage({ type: 'SET_ICON', state: 'active' })}
        >
          Mark Active
        </button>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)


