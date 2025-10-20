// Firebase configuration for Woolsocks Extension
// Based on roadmap item 21: Migrate from Google Analytics to Firebase Analytics

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBtq8BW-qwWDB8JUbOp_RCrseWKkEoHIec",
  authDomain: "woolsocks-release.firebaseapp.com",
  projectId: "woolsocks-release",
  storageBucket: "woolsocks-release.firebasestorage.app",
  messagingSenderId: "569989225682",
  appId: "1:569989225682:web:8036c27a88e992c2cd210b",
  measurementId: "G-WK9ZNG07JV",
  databaseURL: "https://woolsocks-release.firebaseio.com"
} as const

// Firebase Analytics configuration
export const ANALYTICS_CONFIG = {
  // Enable debug mode in development
  debug: true, // Temporarily enabled for testing
  // Set analytics storage consent based on user preferences
  analytics_storage: 'granted' as const,
  // Disable personalized ads by default
  ad_storage: 'denied' as const,
  // Enable functionality storage for core features
  functionality_storage: 'granted' as const,
  // Disable personalization storage
  personalization_storage: 'denied' as const,
  // Enable security storage
  security_storage: 'granted' as const
} as const

// Event names that should be designated as key events in Firebase Analytics
export const KEY_EVENTS = [
  'voucher_click',
  'voucher_used', 
  'cashback_activated'
] as const

// Standard Firebase Analytics event parameters
export const STANDARD_PARAMS = {
  // Custom parameters we use consistently
  domain: 'domain',
  partner_name: 'partner_name',
  deal_id: 'deal_id',
  amount_type: 'amount_type',
  rate: 'rate',
  country: 'country',
  provider: 'provider',
  link_host: 'link_host',
  reason: 'reason',
  ext_version: 'ext_version',
  click_id: 'click_id',
  oc_event_desc: 'oc_event_desc',
  ts: 'ts'
} as const

// User properties we set in Firebase Analytics
export const USER_PROPERTIES = {
  country: 'country',
  user_type: 'user_type', // 'logged_in' | 'anonymous'
  account_age: 'account_age',
  platform: 'platform' // 'chrome' | 'firefox' | 'safari'
} as const
