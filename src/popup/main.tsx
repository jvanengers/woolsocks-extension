import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { MockUser } from '../shared/types'
import { ONBOARDING_STEPS, hasCompletedOnboarding, markOnboardingComplete } from '../shared/onboarding'

function App() {
  const [user, setUser] = useState<MockUser | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)

  useEffect(() => {
    // Load user state
    chrome.storage.local.get('user', (result) => {
      setUser(result.user || null)
    })
    
    // Check if onboarding should be shown
    if (!hasCompletedOnboarding()) {
      setShowOnboarding(true)
    }
  }, [])

  const generateQRCode = () => {
    // Generate a mock QR code data
    const mockToken = Math.random().toString(36).substring(2, 15)
    const qrData = `woolsocks://login?token=${mockToken}`
    setQrCode(qrData)
    setShowQR(true)
    
    // Simulate successful login after 3 seconds
    setTimeout(() => {
      const loggedInUser: MockUser = {
        isLoggedIn: true,
        totalEarnings: 0,
        activationHistory: [],
        settings: {
          showCashbackPrompt: true,
          showVoucherPrompt: true,
        },
      }
      chrome.storage.local.set({ user: loggedInUser })
      setUser(loggedInUser)
      setShowQR(false)
    }, 3000)
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

  const nextOnboardingStep = () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep(onboardingStep + 1)
    } else {
      markOnboardingComplete()
      setShowOnboarding(false)
    }
  }

  const skipOnboarding = () => {
    markOnboardingComplete()
    setShowOnboarding(false)
  }

  if (showOnboarding) {
    const step = ONBOARDING_STEPS[onboardingStep]
    return (
      <div style={{ width: 320, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{step.icon}</div>
          <h2 style={{ fontSize: 18, margin: '0 0 8px 0' }}>{step.title}</h2>
          <p style={{ fontSize: 14, color: '#666', margin: 0, lineHeight: 1.4 }}>
            {step.content}
          </p>
        </div>
        
        <div style={{ marginBottom: 20 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 4,
            marginBottom: 16 
          }}>
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: index <= onboardingStep ? '#4CAF50' : '#ddd'
                }}
              />
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={nextOnboardingStep}
            style={{
              flex: 1,
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '12px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            {onboardingStep === ONBOARDING_STEPS.length - 1 ? 'Get Started!' : 'Next'}
          </button>
          <button
            onClick={skipOnboarding}
            style={{
              background: 'none',
              color: '#666',
              border: 'none',
              padding: '12px 16px',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Skip
          </button>
        </div>
      </div>
    )
  }

  if (showQR) {
    return (
      <div style={{ width: 320, padding: 16, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, margin: '0 0 16px 0' }}>Login with Woolsocks</h2>
        <div style={{ 
          width: 200, 
          height: 200, 
          margin: '0 auto 16px', 
          background: '#f0f0f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '2px solid #ddd',
          borderRadius: 8
        }}>
          <div style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>
            <div>📱</div>
            <div>QR Code</div>
            <div style={{ marginTop: 8, wordBreak: 'break-all' }}>{qrCode}</div>
          </div>
        </div>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 16px 0' }}>
          Scan this QR code with your Woolsocks app to log in
        </p>
        <button
          onClick={() => setShowQR(false)}
          style={{
            background: '#f5f5f5',
            color: '#666',
            border: '1px solid #ddd',
            padding: '8px 16px',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    )
  }

  if (!user?.isLoggedIn) {
    return (
      <div style={{ width: 320, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 18, margin: '0 0 12px 0' }}>Woolsocks</h1>
        <p style={{ margin: '0 0 16px 0', color: '#666' }}>
          Log in to track your cashback and savings
        </p>
        <button
          onClick={generateQRCode}
          style={{
            width: '100%',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '12px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 'bold'
          }}
        >
          📱 Login with QR Code
        </button>
        <p style={{ fontSize: 12, color: '#999', margin: '12px 0 0 0', textAlign: 'center' }}>
          Demo: Login will complete automatically
        </p>
      </div>
    )
  }

  return (
    <div style={{ width: 320, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Woolsocks</h1>
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          Logout
        </button>
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Total Earnings</div>
        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#4CAF50' }}>
          €{user.totalEarnings.toFixed(2)}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Active Cashback</div>
        {user.activationHistory.filter(a => a.status === 'active').length > 0 ? (
          <div>
            {user.activationHistory
              .filter(a => a.status === 'active')
              .map((activation, index) => (
                <div key={index} style={{ 
                  background: '#f0f8f0', 
                  padding: 8, 
                  borderRadius: 4, 
                  marginBottom: 4,
                  fontSize: 12
                }}>
                  {activation.partner} - {activation.cashbackRate}% cashback
                </div>
              ))}
          </div>
        ) : (
          <div style={{ color: '#999', fontSize: 12 }}>No active cashback</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          style={{
            flex: 1,
            background: '#f5f5f5',
            color: '#666',
            border: '1px solid #ddd',
            padding: '8px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          ⚙️ Settings
        </button>
        <button
          onClick={() => {
            localStorage.removeItem('woolsocks-onboarding-completed')
            setShowOnboarding(true)
            setOnboardingStep(0)
          }}
          style={{
            flex: 1,
            background: '#FFA500',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          📚 Tutorial
        </button>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)


