import { useEffect, useState } from 'react'

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
  const [transactions, setTransactions] = useState<WsTransaction[]>([])
  const [qaBypass, setQaBypass] = useState<boolean>(false)

  useEffect(() => {
    checkSession().then((has) => {
      setSession(has)
      if (has) {
        loadProfile()
        loadTransactions()
        loadQaBypass()
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

  async function loadTransactions() {
    const tx = await fetchTransactions()
    setTransactions(tx)
  }

  async function loadQaBypass() {
    const result = await chrome.storage.local.get('user')
    const user = result.user || { settings: {} }
    setQaBypass(!!user.settings?.qaBypassVoucherDismissal)
  }

  async function saveQaBypass(next: boolean) {
    const result = await chrome.storage.local.get('user')
    const user = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
    user.settings = user.settings || { showCashbackPrompt: true, showVoucherPrompt: true }
    user.settings.qaBypassVoucherDismissal = next
    await chrome.storage.local.set({ user })
    setQaBypass(next)
  }

  const firstName: string | undefined =
    profile?.data?.firstName || profile?.firstName || profile?.user?.firstName

  const sockValueRaw: number | undefined =
    profile?.data?.sockValue ??
    profile?.data?.cashback?.sockValue ??
    profile?.data?.cashbackSock ??
    profile?.data?.balance ??
    profile?.sockValue ??
    profile?.balance

  const sockValue = typeof sockValueRaw === 'number' ? sockValueRaw : 0

  // Notify parent (popup) about balance
  useEffect(() => {
    try { onBalance && onBalance(sockValue) } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sockValue])

  return (
    <div style={{ width: 320, padding: 16, borderRadius: 12, background: '#fff', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}>

      {session === null && (
        <div style={{ marginTop: 24, fontSize: 13, color: '#666' }}>Checking session…</div>
      )}

      {session === false && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>No active session found.</div>
          <button
            onClick={() => chrome.tabs.create({ url: 'https://woolsocks.eu/nl/profile', active: true })}
            style={{
              background: '#211940', color: 'white', border: 'none', borderRadius: 6,
              padding: '10px 14px', fontSize: 13, cursor: 'pointer'
            }}
          >
            Login at Woolsocks.eu
          </button>
        </div>
      )}

      {session === true && (
        <div style={{ marginTop: variant === 'popup' ? 8 : 24 }}>
          {/* QA toggle */}
          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>QA: Always show voucher (ignore dismissals)</div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={qaBypass} onChange={(e) => saveQaBypass(e.target.checked)} />
                <span style={{ fontSize: 12, color: '#6B7280' }}>{qaBypass ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
          </div>

          {variant === 'popup' ? (
            <div style={{ textAlign: 'center', margin: '8px 0 16px 0' }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Hi {firstName || 'there'},</div>
              <div style={{ marginTop: 8, fontSize: 16, color: '#6b7280' }}>Recent transactions</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Hi {firstName || 'there'} 👋</div>
              <div style={{ marginTop: 8, fontSize: 14, color: '#444' }}>Cashback sock</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#000000' }}>€{sockValue.toFixed(2)}</div>
            </>
          )}

          {/* Recent transactions */}
          <div style={{ marginTop: variant === 'popup' ? 12 : 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Recent transactions</div>
            {transactions.length === 0 && (
              <div style={{ fontSize: 12, color: '#666' }}>No recent transactions found.</div>
            )}
            <div>
              {transactions.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
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
                        navigator.language?.toLowerCase().startsWith('nl') ? 'Uitbetaling naar IBAN' : 'Payout to IBAN'
                      ) : (
                        t.merchantName
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#777' }}>{new Date(t.createdAt).toLocaleDateString()} · {t.state}</div>
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
                View all cashback transactions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


