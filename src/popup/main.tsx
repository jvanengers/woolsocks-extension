import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import SettingsPanel from '../options/SettingsPanel'
import { translate } from '../shared/i18n'
import { track } from '../background/analytics'

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
  const [view, setView] = useState<'home' | 'transactions'>('home')
  const [balance, setBalance] = useState<number>(0)
  const [onlineCashbackDeals, setOnlineCashbackDeals] = useState<Deal[]>([])
  const [vouchers, setVouchers] = useState<Deal[]>([])
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(false)
  const [autoOc, setAutoOc] = useState<boolean>(true)
  const [currentDomain, setCurrentDomain] = useState<string>('')

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

  // Load balance for the home view (separate from SettingsPanel)
  useEffect(() => {
    if (session !== true) return
    ;(async () => {
      try {
        const stored = await chrome.storage.local.get('wsAnonId')
        const anonId: string = stored?.wsAnonId || crypto.randomUUID()
        if (!stored?.wsAnonId) await chrome.storage.local.set({ wsAnonId: anonId })
        const resp = await fetch('https://woolsocks.eu/api/wsProxy/user-info/api/v0', {
          credentials: 'include',
          headers: { 'x-application-name': 'WOOLSOCKS_WEB', 'x-user-id': anonId },
        })
        if (!resp.ok) return
        const data: any = await resp.json()
        const raw:
          number | undefined =
          data?.data?.sockValue ??
          data?.data?.cashback?.sockValue ??
          data?.data?.cashbackSock ??
          data?.data?.balance ??
          data?.sockValue ??
          data?.balance
        const b = typeof raw === 'number' ? raw : 0
        setBalance(b)
        const el = document.getElementById('__ws_balance')
        if (el) el.textContent = `€${b.toFixed(2)}`
      } catch {}
    })()
  }, [session])

  // Load auto-activate setting
  useEffect(() => {
    if (session !== true) return
    ;(async () => {
      try {
        const result = await chrome.storage.local.get('user')
        const user = result.user || { settings: {} }
        const enabled = user.settings?.autoActivateOnlineCashback
        setAutoOc(enabled !== false)
      } catch {}
    })()
  }, [session])

  // Save auto-activate setting
  async function saveAutoOc(next: boolean) {
    try {
      const result = await chrome.storage.local.get('user')
      const user = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true, autoActivateOnlineCashback: true } }
      user.settings = user.settings || { showCashbackPrompt: true, showVoucherPrompt: true, autoActivateOnlineCashback: true }
      user.settings.autoActivateOnlineCashback = next
      await chrome.storage.local.set({ user })
      setAutoOc(next)
    } catch {}
  }

  // Load deals from current tab
  useEffect(() => {
    if (session !== true) return
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

  // Note: Do not early-return when unauthenticated. We still render the popup,
  // but replace the top-left balance with a Login button matching the
  // bottom-right message styling.
  return (
    <div style={{ 
      background: '#FDC408', 
      borderRadius: 0, 
      overflow: 'hidden', 
      position: 'relative', 
      width: 310, 
      maxHeight: 600, 
      display: 'flex', 
      flexDirection: 'column',
      border: '4px solid #FDC408'
    }}>
      {/* Header */}
      <div style={{ 
        padding: view === 'transactions' ? '16px 0 0 0' : '8px 0 0 0',
        display: 'flex', 
        justifyContent: view === 'transactions' ? 'space-between' : 'flex-start', 
        alignItems: 'center',
        paddingLeft: 8,
        paddingRight: 8
      }}>
        {view === 'transactions' ? (
          <>
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
                justifyContent: 'center'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M6.41421 13.0001L10.7071 17.293L9.29289 18.7072L3.29289 12.7072C2.90237 12.3167 2.90237 11.6835 3.29289 11.293L9.29289 5.29297L10.7071 6.70718L6.41421 11.0001H20V13.0001H6.41421Z" fill="#0F0B1C"/>
              </svg>
            </button>
          </>
        ) : (
          session === true ? (
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
                <path d="M14.1755 4.22225C14.1766 2.99445 11.6731 2 8.58832 2C5.50357 2 3.00224 2.99557 3 4.22225M3 4.22225C3 5.45004 5.50133 6.44449 8.58832 6.44449C11.6753 6.44449 14.1766 5.45004 14.1766 4.22225L14.1766 12.8445M3 4.22225V17.5556C3.00112 18.7834 5.50245 19.7779 8.58832 19.7779C10.0849 19.7779 11.4361 19.5412 12.4387 19.1601M3.00112 8.66672C3.00112 9.89451 5.50245 10.889 8.58944 10.889C11.6764 10.889 14.1778 9.89451 14.1778 8.66672M12.5057 14.6946C11.4976 15.0891 10.115 15.3335 8.58832 15.3335C5.50245 15.3335 3.00112 14.3391 3.00112 13.1113M20.5272 13.4646C22.4909 15.4169 22.4909 18.5836 20.5272 20.5358C18.5635 22.4881 15.3781 22.4881 13.4144 20.5358C11.4507 18.5836 11.4507 15.4169 13.4144 13.4646C15.3781 11.5124 18.5635 11.5124 20.5272 13.4646Z" stroke="#0F0B1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span id="__ws_balance">€{balance.toFixed(2)}</span>
            </button>
          ) : (
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
          )
        )}
      </div>

      {/* Body */}
      {view === 'transactions' ? (
        session === true ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
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
          </div>
        ) : null
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
          {/* Deals label - show if there are any deals */}
          {(onlineCashbackDeals.length > 0 || vouchers.length > 0) && currentDomain && (
            <div style={{ 
              textAlign: 'center',
              padding: '8px 16px 0 16px'
            }}>
              <span style={{ 
                fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                fontSize: 14,
                color: '#100B1C',
                opacity: 0.5,
                lineHeight: 1.45
              }}>
                {translate('popup.dealsFor', { domain: currentDomain })}
              </span>
            </div>
          )}

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
                  {translate('popup.onlineCashback')}
                </span>
              </div>

              {/* Deals List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 16px' }}>
                {onlineCashbackDeals.map((deal, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                    <div style={{ 
                      background: 'rgba(253,196,8,0.2)', 
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
                      fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                      fontSize: 12,
                      color: '#100B1C',
                      lineHeight: 1.45,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {deal.description || deal.name}
                    </div>
                  </div>
                ))}
              </div>

              {/* Auto-activation toggle */}
              <div style={{ padding: '0 16px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: 12,
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  padding: 12
                }}>
                  <div style={{ 
                    fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#100B1C'
                  }}>
                    {translate('popup.autoActivation')}
                  </div>
                  <label style={{ 
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}>
                    <div style={{
                      position: 'relative',
                      width: 51,
                      height: 31,
                      background: autoOc ? '#FDC408' : '#E5E7EB',
                      borderRadius: 15.5,
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={autoOc} 
                        onChange={(e) => saveAutoOc(e.target.checked)}
                        style={{
                          position: 'absolute',
                          opacity: 0,
                          width: 0,
                          height: 0
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: 2,
                        left: autoOc ? 22 : 2,
                        width: 27,
                        height: 27,
                        background: '#FFFFFF',
                        borderRadius: '50%',
                        transition: 'left 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {autoOc && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 27 27" fill="none" style={{ display: 'block' }}>
                            <path d="M7 13.5L11.5 18L20 9.5" stroke="#FDC408" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

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
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="#00C275"/>
                    </svg>
                    <span style={{ 
                      fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                      fontSize: 16,
                      color: '#100B1C',
                      opacity: 0.5
                    }}>
                      {translate('popup.trackingActive')}
                    </span>
                  </div>
                </div>
              )}

              {/* Tracking Active Status moved above to always render when active */}
            </div>
          )}

          {/* Vouchers Section */}
          {vouchers.length > 0 && (
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
                  {translate('popup.payWithVouchers')}
                </span>
              </div>

              {/* Vouchers List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {vouchers.map((voucher, index) => (
                  <div 
                    key={index} 
                    onClick={() => {
                      if (voucher.dealUrl) {
                        chrome.tabs.create({ url: voucher.dealUrl, active: true })
                      }
                    }}
                    style={{ 
                      background: '#FFFFFF',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 16, 
                      padding: '8px 16px',
                      cursor: voucher.dealUrl ? 'pointer' : 'default',
                      borderRadius: 8
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
                        fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#100B1C',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
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
              src={chrome.runtime.getURL('public/icons/Woolsocks-logo-large.svg')}
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


