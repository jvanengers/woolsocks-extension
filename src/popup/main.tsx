import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import SettingsPanel from '../options/SettingsPanel'
import { translate, initLanguage } from '../shared/i18n'
import { track } from '../background/analytics'
import OnboardingComponent from '../shared/OnboardingComponent'
import { hasCompletedOnboarding } from '../shared/onboarding'

interface Deal {
  name: string
  rate: number
  description?: string
  imageUrl?: string
  dealUrl?: string
  id?: string
  amountType?: 'PERCENTAGE' | 'FIXED'
}

function App() {
  const [session, setSession] = useState<boolean | null>(null)
  const [view, setView] = useState<'home' | 'transactions' | 'consent'>('home')
  const [balance, setBalance] = useState<number>(0)
  const [onlineCashbackDeals, setOnlineCashbackDeals] = useState<Deal[]>([])
  const [vouchers, setVouchers] = useState<Deal[]>([])
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(false)
  // Global reminders toggle (gates both cashback prompts and voucher reminders)
  const [showReminders, setShowReminders] = useState<boolean>(true)
  const [currentDomain, setCurrentDomain] = useState<string>('')
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false)

  useEffect(() => {
    // Ensure language is initialized from storage so translate() uses the user's setting
    try { initLanguage() } catch {}
    document.documentElement.style.margin = '0'
    document.documentElement.style.background = 'transparent'
    document.body.style.margin = '0'
    document.body.style.background = 'transparent'
    
    // Check if onboarding should be shown
    const completed = hasCompletedOnboarding()
    setShowOnboarding(!completed)
    
    // Trigger cache preload on popup open (once per session)
    ;(async () => {
      try {
        await chrome.runtime.sendMessage({ type: 'CACHE_PRELOAD_REQUEST' })
      } catch (error) {
        console.warn('[Popup] Cache preload request failed:', error)
      }
    })()
    ;(async () => {
      try {
        // Ask background to check via user-info with relay fallback
        const resp = await chrome.runtime.sendMessage({ type: 'CHECK_ACTIVE_SESSION' })
        if (resp && typeof resp.active === 'boolean') {
          setSession(resp.active)
          return
        }
      } catch {}
      // Final safety fallback: cookie presence (any session-like cookie)
      try {
        const site = await chrome.cookies.getAll({ domain: 'woolsocks.eu' })
        const api = await chrome.cookies.getAll({ domain: 'api.woolsocks.eu' })
        const all = [...site, ...api]
        const has = all.some(c => c.name === 'ws-session' || /session/i.test(String(c?.name || '')))
        setSession(has)
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
    // Listen for session updates from background (e.g., after login)
    const listener = (msg: any) => {
      try {
        if (msg && msg.type === 'SESSION_UPDATED' && msg.active === true) {
          setSession(true)
        }
      } catch {}
    }
    try { chrome.runtime.onMessage.addListener(listener) } catch {}
    
    // Cleanup
    return () => {
      try { chrome.runtime.onMessage.removeListener(listener) } catch {}
    }
  }, [])

  const openLogin = () => {
    // Track anonymous user login clicks
    if (session !== true) {
      try {
        chrome.runtime.sendMessage({
          type: 'ANALYTICS_TRACK',
          event: 'anonymous_login_clicked',
          params: {
            source: 'popup_header',
            user_type: 'anonymous'
          }
        })
      } catch {}
    }
    chrome.tabs.create({ url: 'https://woolsocks.eu/nl/profile', active: true })
  }

  // Load balance for the home view (separate from SettingsPanel)
  useEffect(() => {
    if (session !== true) {
      // As a fallback, if background reports an active session, mark session true so UI shows authenticated state
      ;(async () => {
        try { const resp = await chrome.runtime.sendMessage({ type: 'CHECK_ACTIVE_SESSION' }); if (resp && resp.active) setSession(true) } catch {}
      })()
      return
    }
    ;(async () => {
      try {
        // Use cached balance data for instant loading
        const resp = await chrome.runtime.sendMessage({ type: 'GET_CACHED_BALANCE' })
        if (resp && typeof resp.balance === 'number') {
          setBalance(resp.balance)
          const el = document.getElementById('__ws_balance')
          if (el) el.textContent = `€${resp.balance.toFixed(2)}`
        }
        
        // Trigger background refresh for next time
        try {
          await chrome.runtime.sendMessage({ type: 'REFRESH_USER_DATA' })
        } catch {}
      } catch {}
    })()
  }, [session])

  // Load global reminders flag for gating voucher section
  useEffect(() => {
    ;(async () => {
      try {
        const result = await chrome.storage.local.get('user')
        const user = result.user || { settings: {} }
        const flag = user?.settings?.showCashbackReminders
        setShowReminders(flag !== false)
      } catch {}
    })()
  }, [])

  // Auto-activation setting load/save logic removed from popup

  // Load deals from current tab
  useEffect(() => {
    ;(async () => {
      try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.url) return

        const url = new URL(tab.url)
        const hostname = url.hostname
        
        // Store the domain for display
        setCurrentDomain(hostname.replace(/^www\./, ''))

        // Check if tracking is already active for this specific domain regardless of partner data
        try {
          const storageData = await chrome.storage.local.get('__wsOcPopupData')
          if (storageData.__wsOcPopupData) {
            const popupData = storageData.__wsOcPopupData
            const isCurrentDomain = popupData.domain === hostname || hostname.endsWith(`.${popupData.domain}`) || popupData.domain.endsWith(`.${hostname}`)
            const isRecent = popupData.timestamp && (Date.now() - popupData.timestamp < 60 * 60 * 1000)
            if (isCurrentDomain && isRecent) {
              setIsTrackingActive(true)
            }
          }
        } catch {}

        // Ask background if this domain is currently marked active (TTL-based),
        // to avoid relying solely on local popup data. This does not change UI
        // structure; it only toggles the existing Tracking Active badge.
        try {
          const state = await chrome.runtime.sendMessage({ type: 'REQUEST_ACTIVATION_STATE', domain: hostname })
          if (state && state.active) {
            setIsTrackingActive(true)
          }
        } catch {}

        // Check merchant support
        const response: any = await chrome.runtime.sendMessage({ 
          type: 'CHECK_MERCHANT_SUPPORT', 
          hostname 
        })

        if (response?.supported && response?.partner) {
          const partner = response.partner
          
          // Extract online cashback deals
          const ocCategory = partner.categories?.find((c: any) => 
            /online\s*cashback/i.test(c.name || '') || c.name === 'Online cashback'
          )
          if (ocCategory?.deals) {
            setOnlineCashbackDeals(ocCategory.deals.slice(0, 2)) // Show max 2 deals
          }

          // Extract voucher deals from categories
          const voucherCategory = partner.categories?.find((c: any) => 
            /voucher/i.test(c.name || '') || c.name === 'Vouchers'
          )
          if (voucherCategory?.deals && voucherCategory.deals.length > 0) {
            setVouchers(voucherCategory.deals.slice(0, 3)) // Show max 3 vouchers
          }

          // Tracking active state already handled above independent of partner
        }

        // Track anonymous user deal views
        if (session !== true && (onlineCashbackDeals.length > 0 || vouchers.length > 0)) {
          try {
            chrome.runtime.sendMessage({
              type: 'ANALYTICS_TRACK',
              event: 'anonymous_deals_viewed',
              params: {
                domain: hostname.replace(/^www\./, ''),
                deal_count: onlineCashbackDeals.length + vouchers.length,
                has_oc_deals: onlineCashbackDeals.length > 0,
                has_voucher_deals: vouchers.length > 0,
                user_type: 'anonymous'
              }
            })
          } catch {}
        }
      } catch (err) {
        console.error('Failed to load deals:', err)
      }
    })()
  }, [session])

  if (session === null) {
    return (
      <div style={{ background: '#FDC408', padding: 16, borderRadius: 0, overflow: 'hidden', position: 'relative', width: 320 }}>
        <div style={{ fontSize: 13, color: '#111827', opacity: 0.7 }}>{translate('popup.checkingSession')}</div>
      </div>
    )
  }

  // Show onboarding if not completed
  if (showOnboarding) {
    return (
      <div style={{ 
        background: '#fff', 
        borderRadius: 0, 
        overflow: 'hidden', 
        position: 'relative', 
        width: 320, 
        maxHeight: 600, 
        display: 'flex', 
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        <OnboardingComponent 
          variant="popup" 
          onComplete={() => setShowOnboarding(false)} 
        />
      </div>
    )
  }

  // Note: Do not early-return when unauthenticated. We still render the popup,
  // but replace the top-left balance with a Login button matching the
  // bottom-right message styling.
  const brandBg = isTrackingActive ? '#00C275' : '#FDC408'
  const isConsentView = view === 'consent'
  const isTransactionsView = view === 'transactions'
  return (
    <div style={{ 
      background: isConsentView ? '#FFFFFF' : isTransactionsView ? '#F5F5F6' : brandBg, 
      borderRadius: 0, 
      overflow: 'hidden', 
      position: 'relative', 
      width: 310, 
      maxHeight: 600, 
      display: 'flex', 
      flexDirection: 'column',
      border: isConsentView ? '4px solid #FFFFFF' : isTransactionsView ? '4px solid #F5F5F6' : `4px solid ${brandBg}`
    }}>
      {/* Header */}
      <div style={{ 
        padding: view === 'transactions' ? '16px 8px 0 8px' : '8px 8px 0 8px',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        {view === 'consent' ? (
          <>
            {/* Left: back button */}
            <button
              onClick={() => setView('home')}
              aria-label="Back"
              style={{ 
                appearance: 'none', 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                lineHeight: 1,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="#0F0B1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {/* Center spacer */}
            <div style={{ flex: 1 }} />
            {/* Right spacer */}
            <div style={{ width: 32, height: 32 }} />
          </>
        ) : view === 'transactions' ? (
          <>
            {/* Left: back button */}
            <button
              onClick={() => setView('home')}
              aria-label="Back"
              style={{ 
                appearance: 'none', 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                lineHeight: 1,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="#0F0B1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Right: balance display */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              padding: '6px 10px',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: 8,
              height: 32
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14.1755 4.22225C14.1766 2.99445 11.6731 2 8.58832 2C5.50357 2 3.00224 2.99557 3 4.22225M3 4.22225C3 5.45004 5.50133 6.44449 8.58832 6.44449C11.6753 6.44449 14.1766 5.45004 14.1766 4.22225L14.1766 12.8445M3 4.22225V17.5556C3.00112 18.7834 5.50245 19.7779 8.58832 19.7779C10.0849 19.7779 11.4361 19.5412 12.4387 19.1601M3.00112 8.66672C3.00112 9.89451 5.50245 10.889 8.58944 10.889C11.6764 10.889 14.1778 9.89451 14.1778 8.66672M12.5057 14.6946C11.4976 15.0891 10.115 15.3335 8.58832 15.3335C5.50245 15.3335 3.00112 14.3391 3.00112 13.1113M20.5272 13.4646C22.4909 15.4169 22.4909 18.5836 20.5272 20.5358C18.5635 22.4881 15.3781 22.4881 13.4144 20.5358C11.4507 18.5836 11.4507 15.4169 13.4144 13.4646C15.3781 11.5124 18.5635 11.5124 20.5272 13.4646Z" stroke="#0F0B1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ 
                fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                fontSize: 14, 
                fontWeight: 500, 
                color: '#100B1C',
                lineHeight: 1.45,
                letterSpacing: '0.1px'
              }}>
                €{balance.toFixed(2)}
              </span>
            </div>
          </>
        ) : (
          session === true ? (
            <>
              {/* Left: balance button */}
              <button
                onClick={() => setView('transactions')}
                style={{ 
                  background: 'rgba(0,0,0,0.05)', 
                  color: '#100B1C', 
                  padding: '6px 10px', 
                  borderRadius: 8, 
                  fontWeight: 500, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  border: 'none', 
                  cursor: 'pointer',
                  fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                  fontSize: 14
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M14.1755 4.22225C14.1766 2.99445 11.6731 2 8.58832 2C5.50357 2 3.00224 2.99557 3 4.22225M3 4.22225C3 5.45004 5.50133 6.44449 8.58832 6.44449C11.6753 6.44449 14.1766 5.45004 14.1766 4.22225L14.1766 12.8445M3 4.22225V17.5556C3.00112 18.7834 5.50245 19.7779 8.58832 19.7779C10.0849 19.7779 11.4361 19.5412 12.4387 19.1601M3.00112 8.66672C3.00112 9.89451 5.50245 10.889 8.58944 10.889C11.6764 10.889 14.1778 9.89451 14.1778 8.66672M12.5057 14.6946C11.4976 15.0891 10.115 15.3335 8.58832 15.3335C5.50245 15.3335 3.00112 14.3391 3.00112 13.1113M20.5272 13.4646C22.4909 15.4169 22.4909 18.5836 20.5272 20.5358C18.5635 22.4881 15.3781 22.4881 13.4144 20.5358C11.4507 18.5836 11.4507 15.4169 13.4144 13.4646Z" stroke="#0F0B1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span id="__ws_balance">€{balance.toFixed(2)}</span>
              </button>

              {/* Right: settings icon */}
              <button
                onClick={() => setView('consent')}
                aria-label="Settings"
                style={{ appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto', padding: 4 }}
              >
                <img src={chrome.runtime.getURL('public/icons/Settings.svg')} alt="Settings" width={40} height={40} />
              </button>
            </>
          ) : (
            <>
              {/* Left: login button */}
              <button
                onClick={openLogin}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 32,
                  padding: '0 12px',
                  background: '#211940',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'Woolsocks, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: 14,
                  fontWeight: 500,
                  lineHeight: 1.4
                }}
              >
                {translate('popup.login')}
              </button>

              {/* Right: settings icon */}
              <button
                onClick={() => setView('consent')}
                aria-label="Settings"
                style={{ appearance: 'none', background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto', padding: 4 }}
              >
                <img src={chrome.runtime.getURL('public/icons/Settings.svg')} alt="Settings" width={40} height={40} />
              </button>
            </>
          )
        )}
      </div>

      {/* Body */}
      {view === 'consent' ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <OnboardingComponent
            variant="popup"
            cashbackOnly
            onComplete={() => setView('home')}
          />
        </div>
      ) : view === 'transactions' ? (
        session === true ? (
          <SettingsPanel
            variant="popup"
            onBalance={(b) => {
              try {
                setBalance(b)
                const el = document.getElementById('__ws_balance')
                if (el) el.textContent = `€${b.toFixed(2)}`
              } catch {}
            }}
          />
        ) : null
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
          {/* Removed old "Deals for {domain}" label; domain now shows in header next to balance */}

          {/* Tracking Active Status moved inside Online cashback section below the toggle */}

          {/* Online Cashback Section */}
          {onlineCashbackDeals.length > 0 && (
            <div style={{ 
              background: '#FFFFFF', 
              borderRadius: vouchers.length > 0 ? '16px 16px 0 0' : 16,
              padding: '8px 0 16px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginTop: 8
            }}>
              {/* Section Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <img 
                  src={chrome.runtime.getURL('public/icons/online cashback deals.png')} 
                  alt="Online cashback"
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ 
                  fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                  fontSize: 12,
                  color: '#100B1C',
                  opacity: 0.5,
                  letterSpacing: '0.15px'
                }}>
                  {`Earn online cashback at ${currentDomain.replace(/^www\./,'')}`}
                </span>
              </div>

              {/* Deals List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 8px' }}>
                {onlineCashbackDeals.map((deal, index) => (
                  <div 
                    key={index} 
                    onClick={() => {
                      // Trigger manual redirection for this specific deal
                      chrome.runtime.sendMessage({
                        type: 'OC_MANUAL_ACTIVATE_DEAL',
                        domain: currentDomain,
                        dealInfo: deal
                      })
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12, 
                      padding: '12px 8px',
                      cursor: 'pointer',
                      borderRadius: 8,
                      border: '1px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E5F3FF'
                      e.currentTarget.style.borderColor = '#0084FF'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.borderColor = 'transparent'
                    }}
                  >
                    <div style={{ 
                      background: '#FFF9E6', 
                      borderRadius: 8, 
                      width: 40, 
                      height: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{ 
                        fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#100B1C',
                        letterSpacing: '0.1px'
                      }}>
                        {deal.amountType === 'FIXED' ? `€${deal.rate}` : `${deal.rate}%`}
                      </span>
                    </div>
                    <div style={{ 
                      flex: 1,
                      color: '#100B1C',
                      fontFeatureSettings: "'liga' off, 'clig' off",
                      fontFamily: 'Woolsocks',
                      fontSize: 16,
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '145%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {deal.description || deal.name}
                    </div>
                    <img 
                      src={chrome.runtime.getURL('public/icons/Chevron forward.png')} 
                      alt="Activate deal"
                      style={{ 
                        width: 16, 
                        height: 16, 
                        flexShrink: 0,
                        opacity: 0.6
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Auto-activation toggle removed; control moved to settings consent screen */}

              {/* Tracking Active Status - inside Online cashback, below the toggle */}
              {isTrackingActive && (
                <div style={{ padding: '8px 16px 0 16px' }}>
                  <div style={{ 
                    background: '#ECFDF5', 
                    borderRadius: 8, 
                    padding: '8px 0', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 8
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="#268E60"/>
                    </svg>
                    <span style={{ 
                      fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                      fontSize: 16,
                      color: '#268E60'
                    }}>
                      {translate('popup.trackingActive')}
                    </span>
                  </div>
                </div>
              )}

              {/* Tracking Active Status moved above to always render when active */}
            </div>
          )}

          {/* Vouchers Section (gated by global reminders) */}
          {showReminders && vouchers.length > 0 && (
            <div style={{ 
              background: '#FFFFFF', 
              borderRadius: onlineCashbackDeals.length > 0 ? '0 0 16px 16px' : 16,
              padding: '8px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              {/* Section Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <img 
                  src={chrome.runtime.getURL('public/icons/voucher deals.png')} 
                  alt="Vouchers"
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ 
                  fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                  fontSize: 12,
                  color: '#100B1C',
                  opacity: 0.5,
                  letterSpacing: '0.15px'
                }}>
                  {`Pay with vouchers at ${currentDomain.replace(/^www\./,'')}`}
                </span>
              </div>

              {/* Vouchers List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 8px' }}>
                {vouchers.map((voucher, index) => (
                  <div 
                    key={index} 
                    onClick={() => {
                      if (voucher.dealUrl) {
                        chrome.tabs.create({ url: voucher.dealUrl, active: true })
                      }
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12, 
                      padding: '12px 8px',
                      cursor: voucher.dealUrl ? 'pointer' : 'default',
                      borderRadius: 8,
                      border: '1px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (voucher.dealUrl) {
                        e.currentTarget.style.backgroundColor = '#E5F3FF'
                        e.currentTarget.style.borderColor = '#0084FF'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.borderColor = 'transparent'
                    }}
                  >
                    <div style={{ 
                      width: 69, 
                      height: 46, 
                      borderRadius: 8, 
                      border: '2px solid #F5F5F6',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#FFFFFF'
                    }}>
                      {voucher.imageUrl ? (
                        <img 
                          src={voucher.imageUrl} 
                          alt={voucher.name || 'Voucher'} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#F5F5F6' }} />
                      )}
                    </div>
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span style={{ 
                        flex: 1,
                        color: '#100B1C',
                        fontFeatureSettings: "'liga' off, 'clig' off",
                        fontFamily: 'Woolsocks',
                        fontSize: 16,
                        fontStyle: 'normal',
                        fontWeight: 400,
                        lineHeight: '145%'
                      }}>
                        {voucher.name || 'Gift Card'}
                      </span>
                      {voucher.rate && (
                        <div style={{ 
                          background: '#8564FF', 
                          border: '2px solid #F5F5F6',
                          borderRadius: 1278,
                          padding: '0 8px',
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ 
                            fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#FFFFFF',
                            letterSpacing: '0.15px'
                          }}>
                            {voucher.rate}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No deals fallback section */}
          {onlineCashbackDeals.length === 0 && vouchers.length === 0 && (
            <div style={{ 
              background: '#FFFFFF', 
              borderRadius: 16,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 8
            }}>
              <div style={{ 
                textAlign: 'center',
                padding: '8px 0'
              }}>
                <span style={{ 
                  fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                  fontSize: 14,
                  color: '#100B1C',
                  opacity: 0.5,
                  letterSpacing: '0.15px'
                }}>
                  {translate('popup.noDealsForSite')}
                </span>
              </div>
            </div>
          )}

          {/* Logo at bottom */}
          <div style={{ textAlign: 'center', padding: '15px 0' }}>
            <img
              src={chrome.runtime.getURL('public/icons/Woolsocks-logo-large.png')}
              alt="Woolsocks"
              style={{ height: 33, width: 140 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)


