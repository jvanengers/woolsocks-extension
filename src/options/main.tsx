import { useEffect, useState } from 'react'
import { translate, initLanguage, translateTransactionStatus } from '../shared/i18n'
import { createRoot } from 'react-dom/client'
import OnboardingComponent from '../shared/OnboardingComponent'
import { hasCompletedOnboarding } from '../shared/onboarding'

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

    // The API envelope can vary a bit; try common shapes
    let list: any[] = []
    if (Array.isArray(json?.data?.transactions)) list = json.data.transactions
    else if (Array.isArray(json?.transactions)) list = json.transactions
    else if (Array.isArray(json?.data)) list = json.data
    else if (Array.isArray(json)) list = json
    else if (json?.data?.transactions?.data && Array.isArray(json.data.transactions.data)) list = json.data.transactions.data

    // Normalize a few key fields we need in the UI
    const normalized = list.map((t) => {
      const merchant = t?.merchant || t?.merchantInfo || {}
      const logo: string | undefined = merchant?.logoUrl || merchant?.logoURI || merchant?.logoUri || merchant?.logo || undefined
      const createdAt: string | undefined = t?.createdAt || t?.created_at || t?.date || t?.eventDate
      const state: string | undefined = t?.recordState || t?.recordstate || t?.status || t?.state

      // Amount may be plain number, cents, or nested
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

    // Sort newest first and return top 5
    normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return normalized.slice(0, 5)
  } catch {
    return []
  }
}

function Options() {
  const [session, setSession] = useState<boolean | null>(null)
  const [profile, setProfile] = useState<WsProfile | null>(null)
  const [walletData, setWalletData] = useState<any>(null)
  const [transactions, setTransactions] = useState<WsTransaction[]>([])
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false)

  useEffect(() => {
    try { initLanguage() } catch {}
    
    // Check if onboarding should be shown
    const completed = hasCompletedOnboarding()
    setShowOnboarding(!completed)
    
    checkSession().then((has) => {
      setSession(has)
      if (has) {
        loadProfile()
        loadWalletData()
        loadTransactions()
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
    const w = await fetchWalletData()
    setWalletData(w)
  }

  async function loadTransactions() {
    const tx = await fetchTransactions()
    setTransactions(tx)
  }

  const openLogin = async () => {
    // Redirect to woolsocks.eu
    chrome.tabs.create({ url: 'https://woolsocks.eu/nl/profile', active: true })
  }
  

  const firstName: string | undefined =
    profile?.data?.firstName || profile?.firstName || profile?.user?.firstName

  // Try to read a sensible sock/cashback balance from the wallet data
  const sockValueRaw: number | undefined = walletData?.data?.balance?.totalAmount

  const sockValue = typeof sockValueRaw === 'number' ? sockValueRaw : 0

  // Show verification email screen if triggered
  
  // Show onboarding if not completed
  if (showOnboarding) {
    return (
      <div style={{ 
        width: '100%', 
        maxWidth: 600, 
        margin: '0 auto', 
        padding: 24, 
        background: '#fff', 
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' 
      }}>
        <OnboardingComponent 
          variant="options" 
          onComplete={() => setShowOnboarding(false)} 
        />
      </div>
    )
  }

  return (
    <div style={{ width: 320, padding: 16, borderRadius: 12, background: '#fff', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{translate('options.title')}</h2>
        <div style={{ fontSize: 12, color: '#666' }}>{translate('options.sectionTitle')}</div>
      </div>

      {session === null && (
        <div style={{ marginTop: 24, fontSize: 13, color: '#666' }}>{translate('options.checkingSession')}</div>
      )}

      {session === false && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>{translate('options.noActiveSession')}</div>
          <button
            onClick={openLogin}
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
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{translate('options.greeting', { name: firstName || 'there' })}</div>
          <div style={{ marginTop: 8, fontSize: 14, color: '#444' }}>{translate('options.cashbackSock')}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10B981' }}>€{sockValue.toFixed(2)}</div>
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => { loadProfile(); loadTransactions() }}
              style={{ background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}
            >
              {translate('options.refresh')}
            </button>
          </div>

          {/* Recent transactions */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{translate('options.recentTransactions')}</div>
            {transactions.length === 0 && (
              <div style={{ fontSize: 12, color: '#666' }}>{translate('options.noRecentTransactions')}</div>
            )}
            <div>
              {transactions.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', background: '#f6f6f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {t.logo ? (
                      <img src={t.logo} alt={t.merchantName} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                    ) : (
                      <div style={{ fontSize: 10, color: '#999' }}>{t.merchantName?.[0] || '?'}</div>
                    )}
                  </div>
                  <div style={{ flex: 1, marginLeft: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {t.recordType === 'Expense' ? (
                        translate('options.payoutToIban')
                      ) : (
                        t.merchantName
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#777' }}>{new Date(t.createdAt).toLocaleDateString()} · {translateTransactionStatus(t.state)}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.amount >= 0 ? '#059669' : '#ef4444' }}>€{t.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* View all transactions link */}
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button
                onClick={() => chrome.tabs.create({ url: 'https://woolsocks.eu/nl-NL/profile', active: true })}
                style={{
                  background: 'transparent',
                  color: 'var(--action-link-default, #0084FF)',
                  fontFamily: 'Woolsocks, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                  fontSize: 14,
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '130%',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                {translate('options.viewAllTransactions')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Options />)


