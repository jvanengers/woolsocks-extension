import { useEffect, useState } from 'react'
import { translate, initLanguage, translateTransactionStatus } from '../shared/i18n'
import { loadWoolsocksFonts, getWoolsocksFontFamily } from '../shared/fonts'

type WsProfile = any
type WsTransaction = any

async function getAnonId(): Promise<string> {
  const stored = await chrome.storage.local.get('wsAnonId')
  if (stored?.wsAnonId) return stored.wsAnonId as string
  const id = crypto.randomUUID()
  await chrome.storage.local.set({ wsAnonId: id })
  return id
}

async function fetchUserInfo(): Promise<WsProfile | null> {
  try {
    const anonId = await getAnonId()
    const resp = await fetch('https://woolsocks.eu/api/wsProxy/user-info/api/v0', {
      credentials: 'include',
      headers: {
        'x-application-name': 'WOOLSOCKS_WEB',
        'x-user-id': anonId,
      },
    })
    if (!resp.ok) return null
    const data = await resp.json()
    return data
  } catch {
    return null
  }
}

async function fetchWalletData(): Promise<any> {
  try {
    const anonId = await getAnonId()
    const url = 'https://woolsocks.eu/api/wsProxy/wallets/api/v1/wallets/default?transactionsLimit=10&supportsJsonNote=true'
    const resp = await fetch(url, {
      credentials: 'include',
      headers: {
        'x-application-name': 'WOOLSOCKS_WEB',
        'x-user-id': anonId,
      },
    })
    if (!resp.ok) return null
    const data = await resp.json()
    return data
  } catch {
    return null
  }
}
async function fetchTransactions(): Promise<WsTransaction[]> {
  try {
    const anonId = await getAnonId()
    const url = 'https://woolsocks.eu/api/wsProxy/wallets/api/v0/transactions?excludeAutoRewards=false&direction=forward&limit=20&supportsJsonNote=true'
    const resp = await fetch(url, {
      credentials: 'include',
      headers: {
        'x-application-name': 'WOOLSOCKS_WEB',
        'x-user-id': anonId,
      },
    })
    if (!resp.ok) return []
    const json = await resp.json()
    try { console.debug('[WS] transactions raw', json) } catch {}

    let list: any[] = []
    if (Array.isArray(json?.data?.transactions)) list = json.data.transactions
    else if (Array.isArray(json?.transactions)) list = json.transactions
    else if (Array.isArray(json?.data)) list = json.data
    else if (Array.isArray(json)) list = json
    else if (json?.data?.transactions?.data && Array.isArray(json.data.transactions.data)) list = json.data.transactions.data

    const normalized = list.map((t) => {
      const merchant = t?.merchant || t?.merchantInfo || {}
      const logo: string | undefined = merchant?.logoUrl || merchant?.logoURI || merchant?.logoUri || merchant?.logo || undefined
      const createdAt: string | undefined = t?.createdAt || t?.created_at || t?.date || t?.eventDate
      const state: string | undefined = t?.recordState || t?.recordstate || t?.status || t?.state

      const rawAmount =
        typeof t?.amount === 'number' ? t.amount :
        typeof t?.amount?.amount === 'number' ? t.amount.amount :
        typeof t?.amount?.value === 'number' ? t.amount.value :
        typeof t?.amountCents === 'number' ? t.amountCents / 100 :
        undefined
      const amount = typeof rawAmount === 'number' ? rawAmount : 0

      return {
        id: t?.id || `${merchant?.name || 'txn'}-${createdAt || Math.random()}`,
        amount,
        currency: t?.currencyCode || t?.currency || 'EUR',
        merchantName: merchant?.name || 'Unknown',
        logo,
        state: state || 'unknown',
        recordType: t?.recordType || t?.type || 'Unknown',
        createdAt: createdAt || new Date().toISOString(),
      }
    })

    normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return normalized.slice(0, 5)
  } catch {
    return []
  }
}

export default function SettingsPanel({ variant = 'options', onBalance }: { variant?: 'popup' | 'options'; onBalance?: (balance: number) => void }) {
  const [session, setSession] = useState<boolean | null>(null)
  const [profile, setProfile] = useState<WsProfile | null>(null)
  const [walletData, setWalletData] = useState<any>(null)
  const [transactions, setTransactions] = useState<WsTransaction[]>([])
  const [qaBypass, setQaBypass] = useState<boolean>(false)
  const [autoOc, setAutoOc] = useState<boolean>(true)

  useEffect(() => {
    try { initLanguage() } catch {}
    
    // Load Woolsocks fonts
    loadWoolsocksFonts().catch(console.warn)
    
    checkSession().then((has) => {
      setSession(has)
      if (has) {
        loadProfile()
        loadWalletData()
        loadTransactions()
        loadQaBypass()
        loadAutoOc()
      }
    })
  }, [])
  

  async function checkSession(): Promise<boolean> {
    try {
      const site = await chrome.cookies.getAll({ domain: 'woolsocks.eu' })
      const api = await chrome.cookies.getAll({ domain: 'api.woolsocks.eu' })
      const all = [...site, ...api]
      return all.some(c => c.name === 'ws-session' || /session/i.test(c.name))
    } catch {
      return false
    }
  }

  async function loadProfile() {
    const p = await fetchUserInfo()
    setProfile(p)
  }

  async function loadWalletData() {
    try {
      // Use cached data for instant loading
      const resp = await chrome.runtime.sendMessage({ type: 'GET_CACHED_BALANCE' })
      if (resp && typeof resp.balance === 'number') {
        const mockWalletData = { data: { balance: { totalAmount: resp.balance } } }
        setWalletData(mockWalletData)
        if (onBalance) {
          onBalance(resp.balance)
        }
      }
      
      // Trigger background refresh for next time
      try {
        await chrome.runtime.sendMessage({ type: 'REFRESH_USER_DATA' })
      } catch {}
    } catch (error) {
      console.warn('Error loading cached wallet data:', error)
      // Fallback to direct fetch
      const w = await fetchWalletData()
      setWalletData(w)
      if (onBalance && w?.data?.balance?.totalAmount) {
        onBalance(w.data.balance.totalAmount)
      }
    }
  }

  async function loadTransactions() {
    try {
      // Use cached data for instant loading
      const resp = await chrome.runtime.sendMessage({ type: 'GET_CACHED_TRANSACTIONS' })
      if (resp && Array.isArray(resp.transactions)) {
        setTransactions(resp.transactions)
      }
      
      // Trigger background refresh for next time
      try {
        await chrome.runtime.sendMessage({ type: 'REFRESH_USER_DATA' })
      } catch {}
    } catch (error) {
      console.warn('Error loading cached transactions:', error)
      // Fallback to direct fetch
      const tx = await fetchTransactions()
      setTransactions(tx)
    }
  }

  async function loadQaBypass() {
    const result = await chrome.storage.local.get('user')
    const user = result.user || { settings: {} }
    setQaBypass(!!user.settings?.qaBypassVoucherDismissal)
  }

  async function loadAutoOc() {
    const result = await chrome.storage.local.get('user')
    const user = result.user || { settings: {} }
    const enabled = user.settings?.autoActivateOnlineCashback
    setAutoOc(enabled !== false)
  }


  async function saveQaBypass(next: boolean) {
    const result = await chrome.storage.local.get('user')
    const user = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
    user.settings = user.settings || { showCashbackPrompt: true, showVoucherPrompt: true }
    user.settings.qaBypassVoucherDismissal = next
    await chrome.storage.local.set({ user })
    setQaBypass(next)
  }

  async function saveAutoOc(next: boolean) {
    const result = await chrome.storage.local.get('user')
    const user = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true, autoActivateOnlineCashback: true } }
    user.settings = user.settings || { showCashbackPrompt: true, showVoucherPrompt: true, autoActivateOnlineCashback: true }
    
    // When the checkbox is toggled, set both settings appropriately:
    // - If enabled: both showCashbackReminders and autoActivateOnlineCashback = true (Automatic mode)
    // - If disabled: showCashbackReminders = true, autoActivateOnlineCashback = false (Remind me mode)
    user.settings.showCashbackReminders = true
    user.settings.autoActivateOnlineCashback = next
    
    await chrome.storage.local.set({ user })
    setAutoOc(next)
  }


  const firstName: string | undefined =
    profile?.data?.firstName || profile?.firstName || profile?.user?.firstName

  // Determine if user belongs to QA domains
  const email: string | undefined =
    (profile as any)?.data?.email || (profile as any)?.email || (profile as any)?.user?.email || (profile as any)?.profile?.email
  const isQaUser = !!email && /@(woolsocks\.eu|apcreation\.nl)$/i.test(email)

  const sockValueRaw: number | undefined = walletData?.data?.balance?.totalAmount

  const sockValue = typeof sockValueRaw === 'number' ? sockValueRaw : 0

  // Notify parent (popup) about balance
  useEffect(() => {
    try { onBalance && onBalance(sockValue) } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sockValue])

  // Enforce that non-QA users cannot keep QA bypass enabled
  useEffect(() => {
    if (!profile) return
    if (!isQaUser && qaBypass) {
      saveQaBypass(false)
    }
  }, [profile, isQaUser, qaBypass])

  return (
    <div style={{ 
      width: variant === 'popup' ? '100%' : 360, 
      padding: variant === 'popup' ? 0 : 16, 
      borderRadius: variant === 'popup' ? 0 : 12, 
      background: variant === 'popup' ? '#F5F5F6' : '#fff', 
      fontFamily: getWoolsocksFontFamily(),
      minHeight: variant === 'popup' ? 'auto' : 'auto'
    }}>

      {session === null && (
        <div style={{ marginTop: 24, fontSize: 13, color: '#666' }}>{translate('options.checkingSession')}</div>
      )}

      {session === false && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>{translate('options.noActiveSession')}</div>
          <button
            onClick={() => chrome.tabs.create({ url: 'https://woolsocks.eu/nl/profile', active: true })}
            style={{
              background: '#211940', color: 'white', border: 'none', borderRadius: 6,
              padding: '10px 14px', fontSize: 13, cursor: 'pointer'
            }}
          >
            {translate('options.loginAtWs')}
          </button>
        </div>
      )}

      {session === true && (
        <div style={{ marginTop: variant === 'popup' ? 8 : 24 }}>

          {/* QA toggle - only show in options page */}
          {isQaUser && variant !== 'popup' && (
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{translate('options.qaBypassTitle')}</div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={qaBypass} onChange={(e) => saveQaBypass(e.target.checked)} />
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{qaBypass ? translate('options.enabled') : translate('options.disabled')}</span>
                </label>
              </div>
            </div>
          )}


          {/* Online cashback auto-activation toggle - only show in options page */}
          {variant !== 'popup' && (
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{translate('options.autoActivateOnlineCashback')}</div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoOc} onChange={(e) => saveAutoOc(e.target.checked)} />
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{autoOc ? translate('options.enabled') : translate('options.disabled')}</span>
                </label>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4, marginBottom: 8 }}>
                {autoOc ? translate('options.autoActivateOnlineCashbackDescription') : translate('options.manualActivationDescription')}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.3 }}>
                {translate('options.affiliateDisclosure')}
              </div>
            </div>
          )}

          {variant === 'popup' ? (
            <>
              {/* Page title only - no back button or balance since they're in the main header */}
              <div style={{ 
                padding: '16px 8px 6px 8px'
              }}>
                <h1 style={{ 
                  fontFamily: getWoolsocksFontFamily(),
                  fontSize: 16, 
                  fontWeight: 500, 
                  color: '#100B1C',
                  lineHeight: 1.3,
                  margin: 0
                }}>
                  {translate('options.myCashbackTransactions')}
                </h1>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{translate('options.greeting', { name: firstName || 'there' })}</div>
              <div style={{ marginTop: 8, fontSize: 14, color: '#444' }}>{translate('options.cashbackSock')}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#000000' }}>€{sockValue.toFixed(2)}</div>
            </>
          )}

          {/* Recent transactions */}
          <div style={{ marginTop: variant === 'popup' ? 0 : 24 }}>
            {variant !== 'popup' && (
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{translate('options.recentTransactions')}</div>
            )}
            {transactions.length === 0 && (
              <div style={{ fontSize: 12, color: '#666' }}>{translate('options.noRecentTransactions')}</div>
            )}
            <div style={{ 
              background: variant === 'popup' ? '#F5F5F6' : 'transparent',
              borderRadius: variant === 'popup' ? 16 : 0,
              padding: variant === 'popup' ? '0' : '0'
            }}>
              <div style={{ 
                background: variant === 'popup' ? '#FFFFFF' : 'transparent',
                borderRadius: variant === 'popup' ? '16px 16px 16px 16px' : 0,
                padding: variant === 'popup' ? '24px 0' : '0'
              }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 8
                }}>
                  {transactions.map((t) => (
                    <div key={t.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: variant === 'popup' ? '8px 16px' : '12px 0',
                      gap: 8
                    }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 4, 
                        overflow: 'hidden', 
                        background: '#FFFFFF', 
                        border: '0.5px solid #ECEBED', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {t.logo ? (
                          <img src={t.logo} alt={t.merchantName} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                        ) : (
                          <div style={{ fontSize: 12, color: '#999' }}>{t.merchantName?.[0] || '?'}</div>
                        )}
                      </div>
                      <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 4,
                        minWidth: 0
                      }}>
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 600,
                          fontFamily: getWoolsocksFontFamily(),
                          color: '#100B1C',
                          lineHeight: 1.45,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {t.recordType === 'Expense' ? (
                            translate('options.payoutToIban')
                          ) : (
                            t.merchantName
                          )}
                        </div>
                        <div style={{ 
                          fontSize: 12, 
                          fontFamily: getWoolsocksFontFamily(),
                          color: '#100B1C',
                          opacity: 0.5,
                          lineHeight: 1.4
                        }}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        gap: 4,
                        flexShrink: 0
                      }}>
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 600,
                          fontFamily: getWoolsocksFontFamily(),
                          color: '#100B1C',
                          lineHeight: 1.45,
                          whiteSpace: 'nowrap'
                        }}>
                          €{t.amount.toFixed(2)}
                        </div>
                        <div style={{ 
                          fontSize: 12,
                          fontFamily: getWoolsocksFontFamily(),
                          color: '#100B1C',
                          opacity: 0.5,
                          lineHeight: 1.4,
                          whiteSpace: 'nowrap'
                        }}>
                          {translateTransactionStatus(t.state)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* View all transactions link */}
                <div style={{ 
                  marginTop: 8, 
                  textAlign: 'center', 
                  padding: variant === 'popup' ? '0 16px' : '0' 
                }}>
                  <button
                    onClick={() => chrome.tabs.create({ url: 'https://woolsocks.eu/nl-NL/profile', active: true })}
                    style={{
                      background: 'transparent',
                      color: '#0084FF',
                      fontFamily: getWoolsocksFontFamily(),
                      fontSize: 14,
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: '130%',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
                  >
                    {translate('options.viewAllTransactions')}
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* Cache Management - Hidden for end users, kept for debugging */}
          {false && (
            <div style={{ 
              background: '#FFFFFF', 
              borderRadius: 16, 
              padding: 16, 
              marginTop: 16,
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ 
                fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                color: '#100B1C',
                marginBottom: 12
              }}>
                {translate('options.cacheManagement')}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={async () => {
                    try {
                      await chrome.runtime.sendMessage({ type: 'REFRESH_USER_DATA' })
                      // Reload data after refresh
                      loadWalletData()
                      loadTransactions()
                    } catch (error) {
                      console.warn('Error refreshing user data:', error)
                    }
                  }}
                  style={{
                    background: '#FDC408',
                    color: '#100B1C',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
                  }}
                >
                  {translate('options.refreshData')}
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      await chrome.runtime.sendMessage({ type: 'CACHE_INVALIDATE' })
                      // Reload data after clearing cache
                      loadWalletData()
                      loadTransactions()
                    } catch (error) {
                      console.warn('Error clearing cache:', error)
                    }
                  }}
                  style={{
                    background: '#F3F4F6',
                    color: '#6B7280',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
                  }}
                >
                  {translate('options.clearCache')}
                </button>
              </div>
            </div>
          )}

          {/* Woolsocks logo at bottom for popup variant */}
          {variant === 'popup' && (
            <div style={{ textAlign: 'center', marginTop: 15, marginBottom: 15 }}>
              <img
                src={chrome.runtime.getURL('public/icons/Woolsocks-logo-large.png')}
                alt="Woolsocks"
                style={{ height: 33, width: 140 }}
              />
            </div>
          )}
        </div>
      )}


    </div>
  )
}

// Cache stats UI removed for this branch
