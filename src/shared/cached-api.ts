// Cached API functions for user data (balance, transactions, profile)
// Uses the cache manager to provide instant loading with background refresh

import { get, set, cachedFetch, CACHE_NAMESPACES } from './cache'

// Helper to get anonymous user ID
async function getAnonId(): Promise<string> {
  const stored = await chrome.storage.local.get('wsAnonId')
  let anonId: string = stored?.wsAnonId || crypto.randomUUID()
  if (!stored?.wsAnonId) {
    await chrome.storage.local.set({ wsAnonId: anonId })
  }
  return anonId
}

// Helper to get user ID from background script
async function getUserId(): Promise<string | null> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_USER_ID' })
    return response?.userId || null
  } catch {
    return null
  }
}

/**
 * Fetch wallet data with caching
 * Returns cached data immediately, triggers background refresh if stale
 */
export async function fetchWalletDataCached(): Promise<any> {
  const userId = await getUserId()
  const anonId = await getAnonId()
  const cacheKey = userId || anonId
  
  return cachedFetch(
    CACHE_NAMESPACES.WALLET,
    cacheKey,
    async () => {
      const url = 'https://woolsocks.eu/api/wsProxy/wallets/api/v1/wallets/default?transactionsLimit=10&supportsJsonNote=true'
      const resp = await fetch(url, {
        credentials: 'include',
        headers: {
          'x-application-name': 'WOOLSOCKS_WEB',
          'x-user-id': userId || anonId,
        },
      })
      
      if (!resp.ok) {
        throw new Error(`Wallet API failed: ${resp.status}`)
      }
      
      return await resp.json()
    },
    {
      ttl: 15 * 60 * 1000, // 15 minutes
      refreshOnAccess: true,
    }
  )
}

/**
 * Fetch transactions with caching
 * Returns cached data immediately, triggers background refresh if stale
 */
export async function fetchTransactionsCached(): Promise<any[]> {
  const userId = await getUserId()
  const anonId = await getAnonId()
  const cacheKey = userId || anonId
  
  return cachedFetch(
    CACHE_NAMESPACES.TRANSACTIONS,
    cacheKey,
    async () => {
      const url = 'https://woolsocks.eu/api/wsProxy/wallets/api/v0/transactions?excludeAutoRewards=false&direction=forward&limit=20&supportsJsonNote=true'
      const resp = await fetch(url, {
        credentials: 'include',
        headers: {
          'x-application-name': 'WOOLSOCKS_WEB',
          'x-user-id': userId || anonId,
        },
      })
      
      if (!resp.ok) {
        throw new Error(`Transactions API failed: ${resp.status}`)
      }
      
      const json = await resp.json()
      
      // Normalize transaction data structure
      let list: any[] = []
      if (Array.isArray(json?.data?.transactions)) list = json.data.transactions
      else if (Array.isArray(json?.transactions)) list = json.transactions
      else if (Array.isArray(json?.data)) list = json.data
      else if (Array.isArray(json)) list = json
      else if (json?.data?.transactions?.data && Array.isArray(json.data.transactions.data)) list = json.data.transactions.data
      
      // Normalize key fields for UI consistency
      return list.map((t) => {
        const merchant = t?.merchant || t?.merchantInfo
        const amount = t?.amount || t?.value || t?.cashbackAmount
        const currency = t?.currency || t?.currencyCode || 'EUR'
        const date = t?.date || t?.createdAt || t?.timestamp
        const status = t?.status || t?.state || 'completed'
        const type = t?.type || t?.transactionType || 'cashback'
        
        return {
          id: t?.id || t?.transactionId || `${merchant?.name || 'unknown'}_${date}`,
          merchant: merchant?.name || 'Unknown Merchant',
          amount: typeof amount === 'number' ? amount : 0,
          currency,
          date,
          status,
          type,
          description: t?.description || t?.note || `${type} from ${merchant?.name || 'merchant'}`,
          original: t, // Keep original for debugging
        }
      })
    },
    {
      ttl: 10 * 60 * 1000, // 10 minutes
      refreshOnAccess: true,
    }
  )
}

/**
 * Fetch user profile with caching
 * Returns cached data immediately, triggers background refresh if stale
 */
export async function fetchUserProfileCached(): Promise<any> {
  const userId = await getUserId()
  const anonId = await getAnonId()
  const cacheKey = userId || anonId
  
  return cachedFetch(
    CACHE_NAMESPACES.USER_PROFILE,
    cacheKey,
    async () => {
      const url = 'https://woolsocks.eu/api/wsProxy/user-info/api/v0'
      const resp = await fetch(url, {
        credentials: 'include',
        headers: {
          'x-application-name': 'WOOLSOCKS_WEB',
          'x-user-id': userId || anonId,
        },
      })
      
      if (!resp.ok) {
        throw new Error(`User profile API failed: ${resp.status}`)
      }
      
      return await resp.json()
    },
    {
      ttl: 30 * 60 * 1000, // 30 minutes
      storageType: 'persistent',
    }
  )
}

/**
 * Get cached balance from wallet data
 * Returns 0 if no cached data available
 */
export async function getCachedBalance(): Promise<number> {
  try {
    const walletData = await get(CACHE_NAMESPACES.WALLET, await getAnonId()) as any
    if (walletData?.data?.balance?.totalAmount) {
      return walletData.data.balance.totalAmount
    }
  } catch (error) {
    console.warn('[CachedAPI] Error getting cached balance:', error)
  }
  return 0
}

/**
 * Get cached transactions
 * Returns empty array if no cached data available
 */
export async function getCachedTransactions(): Promise<any[]> {
  try {
    const transactions = await get(CACHE_NAMESPACES.TRANSACTIONS, await getAnonId()) as any[]
    return transactions || []
  } catch (error) {
    console.warn('[CachedAPI] Error getting cached transactions:', error)
    return []
  }
}

/**
 * Get cached user profile
 * Returns null if no cached data available
 */
export async function getCachedUserProfile(): Promise<any> {
  try {
    const profile = await get(CACHE_NAMESPACES.USER_PROFILE, await getAnonId())
    return profile || null
  } catch (error) {
    console.warn('[CachedAPI] Error getting cached user profile:', error)
    return null
  }
}

/**
 * Invalidate user data cache (called when user logs in/out)
 */
export async function invalidateUserDataCache(): Promise<void> {
  const anonId = await getAnonId()
  
  // Invalidate all user-specific caches
  await Promise.all([
    set(CACHE_NAMESPACES.WALLET, anonId, null),
    set(CACHE_NAMESPACES.TRANSACTIONS, anonId, null),
    set(CACHE_NAMESPACES.USER_PROFILE, anonId, null),
  ])
}

/**
 * Check if cached data is stale (older than 5 minutes)
 */
export async function isUserDataStale(): Promise<boolean> {
  try {
    const anonId = await getAnonId()
    const walletData = await get(CACHE_NAMESPACES.WALLET, anonId) as any
    
    if (!walletData) return true
    
    const age = Date.now() - walletData.timestamp
    return age > 5 * 60 * 1000 // 5 minutes
  } catch {
    return true
  }
}
