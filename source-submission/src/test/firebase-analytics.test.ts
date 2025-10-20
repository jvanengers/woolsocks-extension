// Test Firebase Analytics integration
// This test validates that Firebase Analytics can be initialized and events can be tracked

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  initFirebaseAnalytics, 
  trackFirebaseEvent, 
  setFirebaseUserId, 
  setFirebaseUserProperties,
  isFirebaseAnalyticsInitialized 
} from '../shared/firebase-analytics'

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => [])
}))

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({})),
  logEvent: vi.fn(),
  setUserId: vi.fn(),
  setUserProperties: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(true))
}))

vi.mock('../shared/platform', () => ({
  getPlatform: vi.fn(() => 'chrome')
}))

// Mock chrome runtime
global.chrome = {
  runtime: {
    getManifest: vi.fn(() => ({ version: '0.10.0' }))
  }
} as any

describe('Firebase Analytics Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize Firebase Analytics successfully', async () => {
    const result = await initFirebaseAnalytics()
    expect(result).toBe(true)
    expect(isFirebaseAnalyticsInitialized()).toBe(true)
  })

  it('should track events successfully', async () => {
    await initFirebaseAnalytics()
    
    const { logEvent } = await import('firebase/analytics')
    
    await trackFirebaseEvent('test_event', { test_param: 'test_value' })
    
    expect(logEvent).toHaveBeenCalledWith(
      expect.anything(),
      'test_event',
      expect.objectContaining({
        test_param: 'test_value',
        ext_version: '0.10.0',
        ts: expect.any(Number)
      })
    )
  })

  it('should set user ID successfully', async () => {
    await initFirebaseAnalytics()
    
    const { setUserId } = await import('firebase/analytics')
    
    await setFirebaseUserId('test-user-123')
    
    expect(setUserId).toHaveBeenCalledWith(expect.anything(), 'test-user-123')
  })

  it('should set user properties successfully', async () => {
    await initFirebaseAnalytics()
    
    const { setUserProperties } = await import('firebase/analytics')
    
    await setFirebaseUserProperties({
      country: 'NL',
      account_age: 30
    })
    
    expect(setUserProperties).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        country: 'NL',
        account_age: 30
      })
    )
  })

  it('should handle Firebase Analytics not supported', async () => {
    // Reset the module to clear any previous initialization
    vi.resetModules()
    
    // Mock isSupported to return false
    vi.doMock('firebase/analytics', () => ({
      getAnalytics: vi.fn(() => ({})),
      logEvent: vi.fn(),
      setUserId: vi.fn(),
      setUserProperties: vi.fn(),
      isSupported: vi.fn(() => Promise.resolve(false))
    }))
    
    // Re-import the module with the new mock
    const { initFirebaseAnalytics: initFirebaseAnalyticsFresh, isFirebaseAnalyticsInitialized: isFirebaseAnalyticsInitializedFresh } = await import('../shared/firebase-analytics')
    
    const result = await initFirebaseAnalyticsFresh()
    expect(result).toBe(false)
    expect(isFirebaseAnalyticsInitializedFresh()).toBe(false)
  })

  it('should queue events when Firebase is not initialized', async () => {
    // Reset the module to clear any previous initialization
    vi.resetModules()
    
    // Mock Firebase modules
    vi.doMock('firebase/app', () => ({
      initializeApp: vi.fn(() => ({})),
      getApps: vi.fn(() => [])
    }))
    
    vi.doMock('firebase/analytics', () => ({
      getAnalytics: vi.fn(() => ({})),
      logEvent: vi.fn(),
      setUserId: vi.fn(),
      setUserProperties: vi.fn(),
      isSupported: vi.fn(() => Promise.resolve(true))
    }))
    
    // Re-import the module with the new mock
    const { trackFirebaseEvent: trackFirebaseEventFresh } = await import('../shared/firebase-analytics')
    
    // Don't initialize Firebase, just track an event
    await trackFirebaseEventFresh('queued_event', { queued_param: 'queued_value' })
    
    // Event should be queued, not sent immediately since Firebase isn't initialized
    const { logEvent } = await import('firebase/analytics')
    expect(logEvent).not.toHaveBeenCalled()
  })
})
