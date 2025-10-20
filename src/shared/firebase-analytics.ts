// Firebase Analytics wrapper for Woolsocks Extension
// Replaces GA4 Measurement Protocol with Firebase Analytics SDK

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { 
  getAnalytics, 
  type Analytics, 
  logEvent, 
  setUserId, 
  setUserProperties,
  isSupported
} from 'firebase/analytics'
import { FIREBASE_CONFIG, KEY_EVENTS, USER_PROPERTIES } from './firebase-config'
import { getPlatform } from './platform'

type AnalyticsEvent = { name: string; params?: Record<string, any> }

let firebaseApp: FirebaseApp | null = null
let analytics: Analytics | null = null
let initialized = false
let queue: AnalyticsEvent[] = []
let flushing = false

// Human-readable descriptions for online cashback lifecycle events
// These are sent as Firebase event parameters for reporting
const OC_EVENT_DESCRIPTIONS: Record<string, string> = {
  oc_partner_detected: 'Recognized current site as a supported cashback partner',
  oc_eligible: 'Visit is eligible for cashback based on rules and country',
  oc_redirect_requested: 'Requested tracked redirect via affiliate link',
  oc_redirect_issued: 'Generated affiliate/tracking URL and initiated navigation',
  oc_redirect_navigated: 'Browser navigated to affiliate/merchant as part of redirect',
  oc_blocked: 'Flow blocked due to settings, cooldown, or missing requirements',
  oc_state_query: 'Checked current activation/attribution state for this domain',
  oc_activated: 'Cashback tracking is active for this domain/tab',
  oc_state_reemit: 'Re-broadcasted activation state to ensure UI consistency',
  oc_state_mark_active: 'Marked domain active without a fresh redirect (state restore)',
  oc_restore_deeplink: 'Restored original deep link after affiliate hop',
  // New consent and countdown events
  oc_countdown_shown: 'Showed countdown banner for auto-activation',
  oc_countdown_cancelled: 'User cancelled countdown before auto-redirect',
  oc_countdown_completed: 'Countdown completed and auto-redirect executed',
  oc_manual_activation_shown: 'Showed manual activation button (Safari or manual mode)',
  oc_manual_activation_clicked: 'User clicked manual activation button',
  consent_shown: 'Showed onboarding consent step for auto-activation',
  consent_accepted: 'User accepted auto-activation during onboarding',
  consent_declined: 'User declined auto-activation during onboarding',
  // Cache performance events
  cache_hit: 'Cache hit - data served from cache',
  cache_miss: 'Cache miss - data fetched from API',
  cache_refresh_duration: 'Time taken to refresh cached data',
  popup_load_time: 'Time taken to load popup with cache status',
  cache_cleanup: 'Cache cleanup removed expired entries',
  cache_preload: 'Cache preload warmed popular merchants',
}

/**
 * Initialize Firebase Analytics
 * Should be called from background script or offscreen context
 */
export async function initFirebaseAnalytics(): Promise<boolean> {
  if (initialized) return true

  try {
    // Check if Firebase Analytics is supported in this environment
    const supported = await isSupported()
    if (!supported) {
      console.warn('Firebase Analytics not supported in this environment')
      return false
    }

    // Initialize Firebase app if not already initialized
    if (getApps().length === 0) {
      firebaseApp = initializeApp(FIREBASE_CONFIG)
    } else {
      firebaseApp = getApps()[0]
    }

    // Initialize Analytics
    analytics = getAnalytics(firebaseApp)

    // Note: Consent settings are handled at the Firebase project level
    // Individual consent management is not available in the current SDK

    // Set platform as user property
    await setUserProperties(analytics, {
      [USER_PROPERTIES.platform]: getPlatform()
    })

    initialized = true
    console.log('Firebase Analytics initialized successfully')
    
    // Process any queued events
    if (queue.length > 0) {
      await flushFirebaseEvents()
    }

    return true
  } catch (error) {
    console.error('Failed to initialize Firebase Analytics:', error)
    return false
  }
}

/**
 * Track an analytics event
 * Maintains compatibility with existing GA4 event structure
 */
export async function trackFirebaseEvent(name: string, params?: Record<string, any>): Promise<void> {
  try {
    // Always enrich with extension version and timestamp
    const version = chrome.runtime.getManifest().version
    const now = Date.now()
    
    // Auto-attach human-readable description for oc_* events
    const desc = (params && typeof params.oc_event_desc === 'string' && params.oc_event_desc)
      || OC_EVENT_DESCRIPTIONS[name]
      || undefined

    const enriched = {
      ...params,
      ...(desc ? { oc_event_desc: desc } : {}),
      ext_version: version,
      ts: now,
    }

    // If Firebase is initialized, send immediately
    if (analytics && initialized) {
      await logEvent(analytics, name, enriched)
      
      // Mark as key event if applicable
      if (KEY_EVENTS.includes(name as any)) {
        await logEvent(analytics, 'key_event', { event_name: name, ...enriched })
      }
    } else {
      // Queue for later if not initialized
      queue.push({ name, params: enriched })
    }
  } catch (error) {
    console.error('Failed to track Firebase event:', error)
    // Fallback to queueing
    queue.push({ name, params })
  }
}

/**
 * Set user ID for Firebase Analytics
 * Should be called when user logs in
 */
export async function setFirebaseUserId(userId: string | null): Promise<void> {
  if (!analytics || !initialized) return

  try {
    await setUserId(analytics, userId)
    
    // Update user type property
    await setUserProperties(analytics, {
      [USER_PROPERTIES.user_type]: userId ? 'logged_in' : 'anonymous'
    })
  } catch (error) {
    console.error('Failed to set Firebase user ID:', error)
  }
}

/**
 * Set user properties for Firebase Analytics
 */
export async function setFirebaseUserProperties(properties: Record<string, any>): Promise<void> {
  if (!analytics || !initialized) return

  try {
    // Map our properties to Firebase user properties
    const firebaseProperties: Record<string, any> = {}
    
    if (properties.country) {
      firebaseProperties[USER_PROPERTIES.country] = properties.country
    }
    
    if (properties.account_age) {
      firebaseProperties[USER_PROPERTIES.account_age] = properties.account_age
    }

    if (Object.keys(firebaseProperties).length > 0) {
      await setUserProperties(analytics, firebaseProperties)
    }
  } catch (error) {
    console.error('Failed to set Firebase user properties:', error)
  }
}

/**
 * Flush queued events
 */
export async function flushFirebaseEvents(): Promise<void> {
  if (flushing || !analytics || !initialized) return
  
  flushing = true
  try {
    const batch = queue.splice(0, 20)
    for (const event of batch) {
      await logEvent(analytics, event.name, event.params)
      
      // Mark as key event if applicable
      if (KEY_EVENTS.includes(event.name as any)) {
        await logEvent(analytics, 'key_event', { event_name: event.name, ...event.params })
      }
    }
  } catch (error) {
    console.error('Failed to flush Firebase events:', error)
    // Re-queue failed events
    queue = [...queue]
  } finally {
    flushing = false
  }
}

/**
 * Check if Firebase Analytics is initialized
 */
export function isFirebaseAnalyticsInitialized(): boolean {
  return initialized && analytics !== null
}

/**
 * Get analytics instance for direct access (if needed)
 */
export function getFirebaseAnalytics(): Analytics | null {
  return analytics
}

// Cache Analytics Helper Functions (maintain compatibility with existing code)

/**
 * Track cache hit event
 */
export function trackCacheHit(namespace: string, key: string, age?: number): void {
  trackFirebaseEvent('cache_hit', {
    namespace,
    key: key.substring(0, 50), // Truncate long keys
    age_ms: age,
    cache_type: 'memory_or_persistent'
  })
}

/**
 * Track cache miss event
 */
export function trackCacheMiss(namespace: string, key: string, reason?: string): void {
  trackFirebaseEvent('cache_miss', {
    namespace,
    key: key.substring(0, 50), // Truncate long keys
    reason: reason || 'not_found',
    cache_type: 'memory_or_persistent'
  })
}

/**
 * Track cache refresh duration
 */
export function trackCacheRefresh(namespace: string, endpoint: string, duration: number, success: boolean): void {
  trackFirebaseEvent('cache_refresh_duration', {
    namespace,
    endpoint: endpoint.substring(0, 100), // Truncate long endpoints
    duration_ms: duration,
    success
  })
}

/**
 * Track popup load time with cache status
 */
export function trackPopupLoadTime(loadTime: number, cacheStatus: 'fresh' | 'stale' | 'miss', dataTypes: string[]): void {
  trackFirebaseEvent('popup_load_time', {
    load_time_ms: loadTime,
    cache_status: cacheStatus,
    data_types: dataTypes.join(','),
    cached_data_count: dataTypes.filter(t => t !== 'miss').length
  })
}

/**
 * Track cache cleanup event
 */
export function trackCacheCleanup(removedCount: number, totalSize: number): void {
  trackFirebaseEvent('cache_cleanup', {
    removed_entries: removedCount,
    total_size_bytes: totalSize,
    cleanup_type: 'expired_entries'
  })
}

/**
 * Track cache preload event
 */
export function trackCachePreload(merchants: string[], successCount: number, failureCount: number): void {
  trackFirebaseEvent('cache_preload', {
    merchants_count: merchants.length,
    success_count: successCount,
    failure_count: failureCount,
    merchants: merchants.join(',')
  })
}
