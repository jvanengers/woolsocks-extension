// Email storage module for session recovery
// Stores user email locally to enable verification email triggers without woolsocks.eu redirects

const STORAGE_KEY = 'wsUserEmail'
const EMAIL_TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

export interface StoredEmailData {
  email: string
  storedAt: number
  lastSessionCheck: number
}

/**
 * Store user email with timestamp and session metadata
 */
export async function storeUserEmail(email: string): Promise<void> {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.warn('[EmailStorage] Invalid email provided, not storing')
    return
  }

  const data: StoredEmailData = {
    email: email.trim().toLowerCase(),
    storedAt: Date.now(),
    lastSessionCheck: Date.now(),
  }

  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: data })
    console.log('[EmailStorage] Email stored successfully')
  } catch (error) {
    console.error('[EmailStorage] Failed to store email:', error)
    throw error
  }
}

/**
 * Retrieve stored user email
 * Returns null if no email stored or if expired
 */
export async function getUserEmail(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data = result[STORAGE_KEY] as StoredEmailData | undefined

    if (!data || !data.email) {
      return null
    }

    // Check if expired (90 days since last session check)
    const age = Date.now() - data.lastSessionCheck
    if (age > EMAIL_TTL_MS) {
      console.log('[EmailStorage] Email expired, clearing')
      await clearUserEmail()
      return null
    }

    // Update last session check timestamp
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY]: {
          ...data,
          lastSessionCheck: Date.now(),
        },
      })
    } catch (error) {
      console.warn('[EmailStorage] Failed to update lastSessionCheck:', error)
    }

    return data.email
  } catch (error) {
    console.error('[EmailStorage] Failed to retrieve email:', error)
    return null
  }
}

/**
 * Clear stored email (on logout or manual deletion)
 */
export async function clearUserEmail(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY)
    console.log('[EmailStorage] Email cleared')
  } catch (error) {
    console.error('[EmailStorage] Failed to clear email:', error)
    throw error
  }
}

/**
 * Check if stored email is still valid (not expired)
 */
export async function isEmailStorageValid(): Promise<boolean> {
  const email = await getUserEmail()
  return email !== null
}

/**
 * Get masked email for display (e.g., "jv***@apcreation.nl")
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***'
  }

  const [localPart, domain] = email.split('@')
  
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`
  }

  const visibleChars = Math.min(2, Math.floor(localPart.length / 3))
  const masked = localPart.slice(0, visibleChars) + '***'
  
  return `${masked}@${domain}`
}

/**
 * Extract email domain for analytics (without PII)
 */
export function getEmailDomain(email: string): string {
  if (!email || !email.includes('@')) {
    return 'unknown'
  }

  const [, domain] = email.split('@')
  return domain || 'unknown'
}

