// Dual Analytics System - GA4 + Firebase Analytics
// Used during migration phase to validate Firebase Analytics parity with GA4

import { track as trackGA4, initAnalytics as initGA4, flush as flushGA4 } from '../background/analytics'
import { 
  trackFirebaseEvent, 
  initFirebaseAnalytics, 
  setFirebaseUserId, 
  setFirebaseUserProperties,
  flushFirebaseEvents,
  isFirebaseAnalyticsInitialized
} from './firebase-analytics'

// type AnalyticsEvent = { name: string; params?: Record<string, any> }

let dualTrackingEnabled = true
let firebaseInitialized = false

/**
 * Initialize both GA4 and Firebase Analytics
 */
export async function initDualAnalytics(): Promise<void> {
  // Initialize GA4 (existing system)
  initGA4()
  
  // Initialize Firebase Analytics
  firebaseInitialized = await initFirebaseAnalytics()
  
  if (firebaseInitialized) {
    console.log('Dual analytics tracking enabled: GA4 + Firebase')
  } else {
    console.warn('Firebase Analytics failed to initialize, falling back to GA4 only')
  }
}

/**
 * Track event in both GA4 and Firebase Analytics
 */
export async function trackDual(name: string, params?: Record<string, any>): Promise<void> {
  try {
    // Always track in GA4 (existing system)
    await trackGA4(name, params)
    
    // Track in Firebase if initialized
    if (firebaseInitialized) {
      await trackFirebaseEvent(name, params)
    }
  } catch (error) {
    console.error('Dual analytics tracking failed:', error)
    // Fallback to GA4 only
    try {
      await trackGA4(name, params)
    } catch (ga4Error) {
      console.error('GA4 fallback also failed:', ga4Error)
    }
  }
}

/**
 * Set user ID in both systems
 */
export async function setDualUserId(userId: string | null): Promise<void> {
  try {
    // Firebase Analytics user ID setting
    if (firebaseInitialized) {
      await setFirebaseUserId(userId)
    }
    
    // Note: GA4 doesn't have direct user ID setting in our current implementation
    // This would need to be added to the GA4 system if required
  } catch (error) {
    console.error('Failed to set dual user ID:', error)
  }
}

/**
 * Set user properties in both systems
 */
export async function setDualUserProperties(properties: Record<string, any>): Promise<void> {
  try {
    // Firebase Analytics user properties
    if (firebaseInitialized) {
      await setFirebaseUserProperties(properties)
    }
    
    // Note: GA4 doesn't have direct user properties in our current implementation
    // This would need to be added to the GA4 system if required
  } catch (error) {
    console.error('Failed to set dual user properties:', error)
  }
}

/**
 * Flush both analytics systems
 */
export async function flushDual(): Promise<void> {
  try {
    // Flush GA4
    await flushGA4()
    
    // Flush Firebase
    if (firebaseInitialized) {
      await flushFirebaseEvents()
    }
  } catch (error) {
    console.error('Dual analytics flush failed:', error)
  }
}

/**
 * Disable dual tracking and switch to Firebase only
 * Call this after validation period is complete
 */
export function disableDualTracking(): void {
  dualTrackingEnabled = false
  console.log('Dual tracking disabled, switching to Firebase Analytics only')
}

/**
 * Check if dual tracking is enabled
 */
export function isDualTrackingEnabled(): boolean {
  return dualTrackingEnabled
}

/**
 * Check if Firebase Analytics is available
 */
export function isFirebaseAvailable(): boolean {
  return firebaseInitialized && isFirebaseAnalyticsInitialized()
}

// Export the main tracking function for easy replacement
export const track = trackDual
export const initAnalytics = initDualAnalytics
export const setUserId = setDualUserId
export const setUserProperties = setDualUserProperties
export const flush = flushDual

// Cache Analytics Helper Functions (maintain compatibility)

/**
 * Track cache hit event
 */
export function trackCacheHit(namespace: string, key: string, age?: number): void {
  trackDual('cache_hit', {
    namespace,
    key: key.substring(0, 50),
    age_ms: age,
    cache_type: 'memory_or_persistent'
  })
}

/**
 * Track cache miss event
 */
export function trackCacheMiss(namespace: string, key: string, reason?: string): void {
  trackDual('cache_miss', {
    namespace,
    key: key.substring(0, 50),
    reason: reason || 'not_found',
    cache_type: 'memory_or_persistent'
  })
}

/**
 * Track cache refresh duration
 */
export function trackCacheRefresh(namespace: string, endpoint: string, duration: number, success: boolean): void {
  trackDual('cache_refresh_duration', {
    namespace,
    endpoint: endpoint.substring(0, 100),
    duration_ms: duration,
    success
  })
}

/**
 * Track popup load time with cache status
 */
export function trackPopupLoadTime(loadTime: number, cacheStatus: 'fresh' | 'stale' | 'miss', dataTypes: string[]): void {
  trackDual('popup_load_time', {
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
  trackDual('cache_cleanup', {
    removed_entries: removedCount,
    total_size_bytes: totalSize,
    cleanup_type: 'expired_entries'
  })
}

/**
 * Track cache preload event
 */
export function trackCachePreload(merchants: string[], successCount: number, failureCount: number): void {
  trackDual('cache_preload', {
    merchants_count: merchants.length,
    success_count: successCount,
    failure_count: failureCount,
    merchants: merchants.join(',')
  })
}
