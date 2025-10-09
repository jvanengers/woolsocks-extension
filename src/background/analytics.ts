// GA4 Measurement Protocol client for the extension (background only)

type AnalyticsEvent = { name: string; params?: Record<string, any> }

const DEFAULT_MEASUREMENT_ID = 'G-F8VGS98X04'
const DEFAULT_API_SECRET = 'rZFsprlfRROU2_1nIqvLnA'

const CONFIG_KEY = '__wsAnalyticsConfig'
const QUEUE_KEY = '__wsAnalyticsQueue'

let queue: AnalyticsEvent[] = []
let flushing = false
let initialized = false

// Human-readable descriptions for online cashback lifecycle events.
// These are sent as the GA4 event parameter `oc_event_desc` so they can be
// registered as an event-scoped custom dimension for reporting.
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
}

async function getClientId(): Promise<string> {
  const stored = await chrome.storage.local.get('wsAnonId')
  let id = stored?.wsAnonId as string | undefined
  if (!id) {
    id = crypto.randomUUID()
    await chrome.storage.local.set({ wsAnonId: id })
  }
  return id
}

async function getConfig(): Promise<{ measurementId: string; apiSecret: string } | null> {
  const stored = await chrome.storage.local.get(CONFIG_KEY)
  const cfg = (stored?.[CONFIG_KEY] || {}) as { measurementId?: string; apiSecret?: string }
  const measurementId = cfg.measurementId || DEFAULT_MEASUREMENT_ID
  const apiSecret = cfg.apiSecret || DEFAULT_API_SECRET
  if (!measurementId || !apiSecret) return null
  return { measurementId, apiSecret }
}

export async function setAnalyticsConfig(measurementId: string, apiSecret: string): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: { measurementId, apiSecret } })
}

async function loadPersistedQueue(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(QUEUE_KEY)
    const list = Array.isArray(stored?.[QUEUE_KEY]) ? (stored[QUEUE_KEY] as AnalyticsEvent[]) : []
    if (list.length) queue.push(...list)
  } catch {}
}

async function persistQueue(): Promise<void> {
  try { await chrome.storage.local.set({ [QUEUE_KEY]: queue }) } catch {}
}

export async function track(name: string, params?: Record<string, any>): Promise<void> {
  try {
    // Always enrich with extension version and timestamp
    const version = chrome.runtime.getManifest().version
    const now = Date.now()
    // Auto-attach human-readable description for oc_* events, unless caller
    // already provided one.
    const desc = (params && typeof params.oc_event_desc === 'string' && params.oc_event_desc)
      || OC_EVENT_DESCRIPTIONS[name]
      || undefined
    const enriched = {
      ...params,
      ...(desc ? { oc_event_desc: desc } : {}),
      ext_version: version,
      ts: now,
    }
    queue.push({ name, params: enriched })
    if (queue.length >= 10) flush()
    else persistQueue()
  } catch {}
}

export function initAnalytics(): void {
  if (initialized) return
  initialized = true
  loadPersistedQueue().then(() => {
    flush()
  })
  // Periodic flush
  setInterval(() => {
    if (queue.length) flush()
  }, 60_000)
}

export async function flush(): Promise<void> {
  if (flushing) return
  const cfg = await getConfig()
  if (!cfg) return
  if (!queue.length) return
  flushing = true
  try {
    const batch = queue.splice(0, 20)
    const client_id = await getClientId()
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(cfg.measurementId)}&api_secret=${encodeURIComponent(cfg.apiSecret)}`
    const body = {
      client_id,
      non_personalized_ads: true,
      events: batch.map((e) => ({ name: e.name, params: e.params })),
    }
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    // On failure, requeue the last attempted batch
    try { queue = [...queue] } catch {}
  } finally {
    await persistQueue()
    flushing = false
  }
}


