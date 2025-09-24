import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { MockUser } from '../shared/types'

function Options() {
  const [user, setUser] = useState<MockUser | null>(null)

  useEffect(() => {
    chrome.storage.local.get('user', (res) => {
      setUser(res.user || null)
    })
  }, [])

  function updateSetting<K extends keyof MockUser['settings']>(key: K, value: MockUser['settings'][K]) {
    if (!user) return
    
    const updatedUser = {
      ...user,
      settings: {
        ...user.settings,
        [key]: value
      }
    }
    setUser(updatedUser)
    chrome.storage.local.set({ user: updatedUser })
  }

  const logout = () => {
    const loggedOutUser: MockUser = {
      isLoggedIn: false,
      totalEarnings: 0,
      activationHistory: [],
      settings: {
        showCashbackPrompt: true,
        showVoucherPrompt: true,
      },
    }
    chrome.storage.local.set({ user: loggedOutUser })
    setUser(loggedOutUser)
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ width: 400, padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Woolsocks Settings</h2>
        {user.isLoggedIn && (
          <button
            onClick={logout}
            style={{
              background: '#f5f5f5',
              color: '#666',
              border: '1px solid #ddd',
              padding: '6px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Logout
          </button>
        )}
      </div>

      {!user.isLoggedIn && (
        <div style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: 4, 
          padding: 12, 
          marginBottom: 20,
          fontSize: 14
        }}>
          <strong>Not logged in</strong><br />
          <span style={{ color: '#666' }}>Log in to sync settings across devices</span>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, margin: '0 0 12px 0' }}>Notifications</h3>
        <label style={{ display: 'block', marginBottom: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={user.settings.showCashbackPrompt}
            onChange={(e) => updateSetting('showCashbackPrompt', e.target.checked)}
            style={{ marginRight: 8 }}
          />
          <span>Cashback activation reminders</span>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            Show popup when cashback is available on partner sites
          </div>
        </label>
        <label style={{ display: 'block', marginBottom: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={user.settings.showVoucherPrompt}
            onChange={(e) => updateSetting('showVoucherPrompt', e.target.checked)}
            style={{ marginRight: 8 }}
          />
          <span>Voucher suggestions at checkout</span>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            Show gift card offers when you're about to pay
          </div>
        </label>
        <p style={{ fontSize: 12, color: '#666', margin: '8px 0 0 0' }}>
          💡 Icon will still change color even if popups are disabled
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, margin: '0 0 12px 0' }}>Account</h3>
        <div style={{ fontSize: 14, color: '#666' }}>
          <div>Total Earnings: <strong style={{ color: '#4CAF50' }}>€{user.totalEarnings.toFixed(2)}</strong></div>
          <div style={{ marginTop: 4 }}>Active Cashback: {user.activationHistory.filter(a => a.status === 'active').length} sites</div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, margin: '0 0 12px 0' }}>About</h3>
        <div style={{ fontSize: 12, color: '#666' }}>
          <div>Woolsocks Extension v0.1.0</div>
          <div style={{ marginTop: 4 }}>
            <a href="#" style={{ color: '#4CAF50' }}>Privacy Policy</a> • 
            <a href="#" style={{ color: '#4CAF50', marginLeft: 8 }}>Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Options />)


