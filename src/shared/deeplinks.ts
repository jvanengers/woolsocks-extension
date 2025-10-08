// Deeplink configuration for Safari iOS extension
// This will be used to replace woolsocks.eu URLs with app deeplinks

export interface DeeplinkConfig {
  // Base deeplink scheme for the React Native app
  scheme: string
  // Whether to use deeplinks (true) or web URLs (false)
  useDeeplinks: boolean
  // Fallback web URL if deeplink fails
  fallbackWebUrl: string
}

// Default configuration - can be overridden per build target
export const deeplinkConfig: DeeplinkConfig = {
  scheme: 'woolsocks://',
  useDeeplinks: false, // Set to true when App Groups integration is ready
  fallbackWebUrl: 'https://woolsocks.eu'
}

// Deeplink URL generators
export const deeplinks = {
  // Profile page
  profile: () => deeplinkConfig.useDeeplinks 
    ? `${deeplinkConfig.scheme}profile` 
    : `${deeplinkConfig.fallbackWebUrl}/nl-NL/profile`,

  // Voucher purchase
  voucher: (productId?: string) => deeplinkConfig.useDeeplinks
    ? `${deeplinkConfig.scheme}voucher${productId ? `/${productId}` : ''}`
    : productId 
      ? `${deeplinkConfig.fallbackWebUrl}/nl-NL/giftcards-shop/products/${productId}`
      : `${deeplinkConfig.fallbackWebUrl}/nl-NL/giftcards-shop`,

  // Voucher search
  voucherSearch: (merchantName: string) => deeplinkConfig.useDeeplinks
    ? `${deeplinkConfig.scheme}voucher/search?q=${encodeURIComponent(merchantName)}`
    : `${deeplinkConfig.fallbackWebUrl}/nl-NL/giftcards-shop?search=${encodeURIComponent(merchantName)}`,

  // Voucher checkout
  voucherCheckout: (productId: string) => deeplinkConfig.useDeeplinks
    ? `${deeplinkConfig.scheme}voucher/checkout/${productId}`
    : `${deeplinkConfig.fallbackWebUrl}/nl-NL/giftcards-shop/products/${productId}/checkout`,

  // Cashback deals
  cashback: (merchantName?: string) => deeplinkConfig.useDeeplinks
    ? `${deeplinkConfig.scheme}cashback${merchantName ? `?merchant=${encodeURIComponent(merchantName)}` : ''}`
    : merchantName
      ? `${deeplinkConfig.fallbackWebUrl}/nl-NL/cashback/search?query=${encodeURIComponent(merchantName)}`
      : `${deeplinkConfig.fallbackWebUrl}/nl-NL/cashback`,

  // Home page
  home: () => deeplinkConfig.useDeeplinks
    ? `${deeplinkConfig.scheme}home`
    : deeplinkConfig.fallbackWebUrl,

  // Settings
  settings: () => deeplinkConfig.useDeeplinks
    ? `${deeplinkConfig.scheme}settings`
    : `${deeplinkConfig.fallbackWebUrl}/nl-NL/profile`
}

// Helper function to open deeplink or fallback to web
export async function openDeeplink(url: string): Promise<void> {
  if (deeplinkConfig.useDeeplinks) {
    try {
      // For Safari iOS, we'll use a different approach when App Groups are integrated
      // For now, fall back to web URL
      await chrome.tabs.create({ url: url.replace(deeplinkConfig.scheme, deeplinkConfig.fallbackWebUrl + '/'), active: true })
    } catch (error) {
      console.warn('[Woolsocks] Deeplink failed, falling back to web:', error)
      await chrome.tabs.create({ url: url.replace(deeplinkConfig.scheme, deeplinkConfig.fallbackWebUrl + '/'), active: true })
    }
  } else {
    await chrome.tabs.create({ url, active: true })
  }
}

// Configuration for different build targets
export const buildConfigs = {
  // Chrome desktop - use web URLs
  chrome: {
    scheme: 'woolsocks://',
    useDeeplinks: false,
    fallbackWebUrl: 'https://woolsocks.eu'
  },
  
  // Safari iOS - use deeplinks when App Groups are integrated
  safari: {
    scheme: 'woolsocks://',
    useDeeplinks: false, // Will be set to true after App Groups integration
    fallbackWebUrl: 'https://woolsocks.eu'
  }
}

// Initialize deeplink config based on build target
export function initDeeplinkConfig(target: 'chrome' | 'safari' = 'chrome'): void {
  const config = buildConfigs[target]
  deeplinkConfig.scheme = config.scheme
  deeplinkConfig.useDeeplinks = config.useDeeplinks
  deeplinkConfig.fallbackWebUrl = config.fallbackWebUrl
  
  console.log(`[Woolsocks] Deeplink config initialized for ${target}:`, deeplinkConfig)
}
