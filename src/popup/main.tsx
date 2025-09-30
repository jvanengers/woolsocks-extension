import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { AnonymousUser } from '../shared/types'
import { ONBOARDING_STEPS, hasCompletedOnboarding, markOnboardingComplete } from '../shared/onboarding'

function App() {
  const [user, setUser] = useState<AnonymousUser | null>(null)
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

  // MVP: Simplified popup - no login required
  if (!user) {
    return (
      <div style={{ width: 320, padding: 16, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ width: 320, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Woolsocks</h1>
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


