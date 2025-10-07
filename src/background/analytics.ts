// GA4 Measurement Protocol client for the extension (background only)

type AnalyticsEvent = { name: string; params?: Record<string, any> }

const DEFAULT_MEASUREMENT_ID = 'G-F8VGS98X04'
const DEFAULT_API_SECRET = 'rZFsprlfRROU2_1nIqvLnA'

const CONFIG_KEY = '__wsAnalyticsConfig'
const QUEUE_KEY = '__wsAnalyticsQueue'

let queue: AnalyticsEvent[] = []
let flushing = false
let initialized = false

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
    const enriched = {
      ...params,
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


