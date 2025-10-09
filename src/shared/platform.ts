// Platform detection utility for browser-specific behavior
// Used to implement platform-specific consent flows and auto-activation rules

export type Platform = 'chrome' | 'safari' | 'firefox' | 'unknown'

/**
 * Detect the current browser platform
 * @returns Platform identifier
 */
export function getPlatform(): Platform {
  try {
    const userAgent = navigator.userAgent.toLowerCase()
    
    // Check for Chrome (including Chromium-based browsers like Edge, Brave)
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return 'chrome'
    }
    
    // Check for Safari (including mobile Safari)
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      return 'safari'
    }
    
    // Check for Firefox
    if (userAgent.includes('firefox')) {
      return 'firefox'
    }
    
    // Check for Edge (Chromium-based)
    if (userAgent.includes('edg')) {
      return 'chrome' // Treat Edge as Chrome for our purposes
    }
    
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Check if the current platform allows automatic redirects with user consent
 * @returns true if platform supports auto-redirects, false otherwise
 */
export function allowsAutoRedirect(): boolean {
  const platform = getPlatform()
  return platform === 'chrome' || platform === 'firefox'
}

/**
 * Check if the current platform requires explicit user gestures for redirects
 * @returns true if platform requires user gestures, false otherwise
 */
export function requiresUserGesture(): boolean {
  const platform = getPlatform()
  return platform === 'safari'
}

/**
 * Get platform-specific default settings
 * @returns Default settings object for the current platform
 */
export function getPlatformDefaults() {
  return {
    showCashbackReminders: true,
    autoActivateOnlineCashback: allowsAutoRedirect()
  }
}
