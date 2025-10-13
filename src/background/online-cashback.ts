// Online cashback auto-activation on navigation
// Hooks webNavigation to detect merchant visits, select best online cashback deal,
// request a tracked redirect URL, and open the popup once activated.

import { getPartnerByHostname, requestRedirectUrl, fetchMerchantConditions, getUserCountryCode, fetchRecentClicksForSite, hasActiveSession } from './api'
import { track, initAnalytics } from './analytics'
import { getPlatform, allowsAutoRedirect, requiresUserGesture } from '../shared/platform'
import type { Deal, PartnerLite } from '../shared/types'

const EXCLUDED_HOSTS = new Set<string>([
  'woolsocks.eu',
  'scoupy.nl', 'scoupy.com',
  'ok.nl', 'ok.com',
  'shopbuddies.nl', 'shopbuddies.com',
  'praxis.nl',
])

const COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes cooldown to avoid repeated redirects
const OC_DEBUG = false // Set to true for debugging
const ACTIVE_TTL_MS = 10 * 60 * 1000 // 10 minutes active state per domain

type RedirectState = {
  expectedFinalHost: string
  partnerName: string
  deal: Deal
  originalUrl: string
  restoredOnce?: boolean
  affiliateHost?: string
  createdAt?: number
  startedAt?: number
}

const tabRedirectState = new Map<number, RedirectState>()
const navigationDebounce = new Map<string, number>() // key = `${tabId}:${host}`

// Global limit to prevent runaway activation loops (e.g., when not authenticated)
let activeActivationProcesses = 0
const MAX_CONCURRENT_ACTIVATIONS = 5

// Some affiliates open a new tab; tabId-based pending can be lost. Keep a
// short-lived domain-scoped pending as a fallback to recognize landings.
type PendingByDomain = { affiliateHost?: string; clickId?: string; partnerName?: string; deal?: Deal; originalUrl?: string; until: number }
const pendingByDomain = new Map<string, PendingByDomain>() // key: expectedFinalHost (clean)

// Activation registry: single source of truth for current active domains (TTL)
type ActivationEntry = { at: number; clickId?: string; tabIds: Set<number> }
const activationRegistry = new Map<string, ActivationEntry>() // key: clean host

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function cleanHost(hostname: string): string {
  try { return hostname.replace(/^www\./i, '').toLowerCase() } catch { return hostname }
}

function mirrorActivationToSessionStorage() {
  try {
    const key = '__wsOcActiveByDomain'
    const obj: Record<string, { at: number; clickId?: string }> = {}
    for (const [d, e] of activationRegistry.entries()) obj[d] = { at: e.at, clickId: e.clickId }
    chrome.storage.session.set({ [key]: obj })
  } catch {}
}

export function getDomainActivationState(domain: string): { active: boolean; clickId?: string; at?: number } {
  const d = cleanHost(domain)
  const e = activationRegistry.get(d)
  if (!e) return { active: false }
  const active = Date.now() - e.at < ACTIVE_TTL_MS
  return { active, clickId: e.clickId, at: e.at }
}

function markDomainActive(domain: string, tabId?: number, clickId?: string) {
  const d = cleanHost(domain)
  const now = Date.now()
  const prev = activationRegistry.get(d)
  if (prev) {
    prev.at = now
    if (clickId) prev.clickId = clickId
    if (typeof tabId === 'number') prev.tabIds.add(tabId)
  } else {
    activationRegistry.set(d, { at: now, clickId, tabIds: new Set<number>(typeof tabId === 'number' ? [tabId] : []) })
  }
  mirrorActivationToSessionStorage()
  try { track('oc_state_mark_active', { domain: d, click_id: clickId }) } catch {}
}

function cleanupExpiredActivations() {
  const now = Date.now()
  for (const [d, e] of activationRegistry.entries()) {
    if (now - e.at >= ACTIVE_TTL_MS) activationRegistry.delete(d)
  }
  mirrorActivationToSessionStorage()
}

// Periodic cleanup (non-blocking; MV3 service worker timers are best-effort)
try { setInterval(() => { try { cleanupExpiredActivations() } catch {} }, 60 * 1000) } catch {}

function cleanupPendingByDomain() {
  const now = Date.now()
  for (const [d, entry] of pendingByDomain.entries()) {
    if (now > entry.until) pendingByDomain.delete(d)
  }
}
try { setInterval(() => { try { cleanupPendingByDomain() } catch {} }, 30 * 1000) } catch {}

function hasValidDomainPending(clean: string): boolean {
  const now = Date.now()
  const direct = pendingByDomain.get(clean)
  if (direct && now < direct.until) return true
  for (const [k, v] of pendingByDomain.entries()) {
    if (clean.endsWith(k) && now < v.until) return true
  }
  return false
}

export function removeTabFromOtherDomains(tabId: number, currentDomain: string) {
  const cur = cleanHost(currentDomain)
  for (const [d, e] of activationRegistry.entries()) {
    if (d === cur) continue
    if (e.tabIds.delete(tabId)) {
      // best-effort mirror; keep until TTL
    }
  }
}

function isExcluded(hostname: string): boolean {
  const h = cleanHost(hostname)
  for (const d of EXCLUDED_HOSTS) {
    if (h === d || h.endsWith('.' + d)) return true
  }
  return false
}

// Use apex/base domain as a site key so subdomains (e.g., nl.aliexpress.com,
// best.aliexpress.com) share the same cooldown window and don't re-trigger.
function siteKey(hostname: string): string {
  const h = cleanHost(hostname)
  const parts = h.split('.')
  if (parts.length >= 2) return parts.slice(-2).join('.')
  return h
}

function hasAffiliateMarkers(url: string): boolean {
  try {
    const u = new URL(url)
    const q = u.searchParams
    const val = (k: string) => (q.get(k) || '').toLowerCase()
    if (q.has('tduid')) return true
    if (/tradedoubler|awin|impact|partnerize|webgains|admitad|zanox|rakuten|orangebuddies/i.test(val('utm_source'))) return true
    if (/tradedoubler|awin|impact|partnerize|webgains|admitad|zanox|rakuten|orangebuddies/i.test(val('utm_campaign'))) return true
    if (q.has('aff') || q.has('affiliate') || q.has('affid') || (q.has('utm_medium') && /aff/i.test(val('utm_medium')))) return true
    return false
  } catch { return false }
}

// Determine whether a URL has only marketing/tracking params (no meaningful deep link)
function isJustTrackingParams(u: URL): boolean {
  try {
    const keys = Array.from(u.searchParams.keys()).map(k => k.toLowerCase())
    if (!keys.length) return true
    const isTracking = (k: string) => /^(utm_|gclid|fbclid|ttclid|tt|tduid|affid|affiliate|aff|campaign|adgroup|adset|clickid|pk_|mc_|scid|msclkid|yclid|irclickid|awc)$/i.test(k)
    return keys.every(isTracking)
  } catch { return true }
}

async function getCooldownUntil(host: string): Promise<number> {
  try {
    const { __wsOcLastActivationByDomain } = await chrome.storage.local.get('__wsOcLastActivationByDomain')
    const map = (__wsOcLastActivationByDomain || {}) as Record<string, number>
    const key = siteKey(host)
    return map[key] || 0
  } catch {
    return 0
  }
}

async function setCooldown(host: string): Promise<void> {
  try {
    const { __wsOcLastActivationByDomain } = await chrome.storage.local.get('__wsOcLastActivationByDomain')
    const map = (__wsOcLastActivationByDomain || {}) as Record<string, number>
    const key = siteKey(host)
    map[key] = Date.now()
    await chrome.storage.local.set({ __wsOcLastActivationByDomain: map })
  } catch {}
}

function pickBestCashback(deals: Deal[]): Deal | null {
  if (!Array.isArray(deals) || deals.length === 0) return null
  const percent = deals.filter(d => (d.amountType || 'PERCENTAGE') === 'PERCENTAGE')
  const fixed = deals.filter(d => d.amountType === 'FIXED')
  if (percent.length) {
    return percent.sort((a, b) => (b.rate || 0) - (a.rate || 0))[0]
  }
  if (fixed.length) {
    return fixed.sort((a, b) => (b.rate || 0) - (a.rate || 0))[0]
  }
  return deals.sort((a, b) => (b.rate || 0) - (a.rate || 0))[0]
}

function filterOnlineCountry(deals: Deal[], userCountry: string): Deal[] {
  const up = (s?: string) => (s || '').toUpperCase()
  const country = up(userCountry)
  return deals.filter(d => up(d.country) === country && up(d.usageType).includes('ONLINE'))
}

// Helper: Send WS_PING to content script to verify it's loaded
async function pingContentScript(tabId: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { __wsPing: true }, (response) => {
        if (chrome.runtime.lastError) {
          if (OC_DEBUG) console.log(`[WS OC] WS_PING failed for tab ${tabId}:`, chrome.runtime.lastError.message)
          resolve(false)
        } else if (response?.__wsAck) {
          if (OC_DEBUG) console.log(`[WS OC] WS_PING success for tab ${tabId}`)
          resolve(true)
        } else {
          resolve(false)
        }
      })
    } catch {
      resolve(false)
    }
  })
}

export function setupOnlineCashbackFlow(setIcon: (state: 'neutral' | 'available' | 'active' | 'voucher' | 'error', tabId?: number) => void) {
  try {
    initAnalytics()
    // Visible diagnostic to confirm listener registration
    // Breadcrumb once on startup
    // Debug breadcrumb once at startup
    // console.debug('[WS OC] listener ready')
    // Primary activation flow onCommitted
    chrome.webNavigation.onCommitted.addListener(async (details) => {
      const { tabId, frameId, url } = details
      if (frameId !== 0 || !isHttpUrl(url)) return

      let host = ''
      try { host = new URL(url).hostname } catch { return }
      if (!host || isExcluded(host)) return
      const clean = cleanHost(host)

      console.log(`[WS OC Debug] Navigation detected: ${clean}`)
      if (OC_DEBUG) console.log('[WS OC] nav', { tabId, host: clean })
      
      // Debug: Check what's in our pending maps
      console.log(`[WS OC Debug] Checking pending states for ${clean}:`)
      console.log(`[WS OC Debug] pendingByDomain keys:`, Array.from(pendingByDomain.keys()))
      console.log(`[WS OC Debug] tabRedirectState keys:`, Array.from(tabRedirectState.keys()))
      console.log(`[WS OC Debug] tabRedirectState for tab ${tabId}:`, tabRedirectState.get(tabId))

      // Global safety limit to prevent activation loops
      if (activeActivationProcesses >= MAX_CONCURRENT_ACTIVATIONS) {
        console.warn(`[WS OC] Too many concurrent activation processes (${activeActivationProcesses}), skipping ${clean}`)
        return
      }

      // Debounce duplicate onCommitted events for the same (tab, host)
      const debounceKey = `${tabId}:${clean}`
      const now = Date.now()
      const last = navigationDebounce.get(debounceKey) || 0
      if (now - last < 1500) return
      navigationDebounce.set(debounceKey, now)
      
      // Increment active processes counter
      activeActivationProcesses++
      console.log(`[WS OC Debug] Active activation processes: ${activeActivationProcesses}`)
      
      try {

      // Notify UI: scan start
      try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_scan_start', host: clean }) } catch {}

      // Domain-scoped pending fallback: if we see a landing on expected host
      // within TTL (even from a different tab), mark active and emit.
      // Try exact key first; otherwise match by suffix to cover subdomains
      let domPending = pendingByDomain.get(clean)
      if (!domPending) {
        for (const [k, v] of pendingByDomain.entries()) {
          if (clean.endsWith(k)) { domPending = v; break }
        }
      }
      if (domPending && Date.now() < domPending.until) {
        if (OC_DEBUG) console.log('[WS OC] landed (domain-fallback)', { tabId, host: clean })
        try { markDomainActive(clean, tabId, domPending.clickId) } catch {}
        setIcon('active', tabId)
        try {
          await chrome.storage.local.set({
            __wsOcPopupData: {
              domain: clean,
              partnerName: domPending.partnerName || clean,
              rate: (domPending.deal && domPending.deal.rate) || 0,
              amountType: (domPending.deal && domPending.deal.amountType) || 'PERCENTAGE',
              title: (domPending.deal && domPending.deal.name) || 'Online aankoop',
              affiliateUrl: (domPending.deal && (domPending.deal as any).affiliateUrl) || null,
              dealId: (domPending.deal && domPending.deal.id) || null,
              clickId: domPending.clickId || null,
              conditions: (domPending.deal && (domPending.deal as any).conditions) || null,
              timestamp: Date.now(),
            }
          })
        } catch {}
        try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: domPending.deal ? [domPending.deal] : [], dealId: domPending.deal?.id, providerMerchantId: (domPending.deal as any)?.providerMerchantId }) } catch {}
        try { track('oc_state_reemit', { domain: clean, reason: 'domain_fallback' }) } catch {}
        pendingByDomain.delete(clean)
        return
      } else if (OC_DEBUG) {
        try {
          const keys = Array.from(pendingByDomain.keys())
          const foundExact = pendingByDomain.has(clean)
          const foundSuffix = keys.find(k => clean.endsWith(k))
          const reason = domPending ? 'expired' : (foundExact || foundSuffix ? 'expired' : 'not_found')
          console.log('[WS OC] fallback-miss', { host: clean, foundExact, foundSuffix, reason })
        } catch {}
      }

      // Handle post-redirect landing back on merchant
      const pending = tabRedirectState.get(tabId)
      // Extra debug to compare hosts during pending redirect flow
      if (pending && OC_DEBUG) {
        try {
          const expectedHost = cleanHost(pending.expectedFinalHost)
          console.log('[WS OC] pending-compare', { tabId, currentUrl: url, currentHost: clean, expectedHost, rawExpected: pending.expectedFinalHost })
        } catch {}
      }
      if (pending && clean.endsWith(cleanHost(pending.expectedFinalHost))) {
        if (OC_DEBUG) console.log('[WS OC] landed', { tabId, host: clean })
        // Mark cooldown after landing back to merchant to prevent repeated redirects
        try { await setCooldown(clean) } catch {}
        // Mark domain active for TTL and set icon green immediately
        try { markDomainActive(clean, tabId, pending.deal.clickId) } catch {}
        // If we landed on the merchant but not on the original deep URL, restore it once
        try {
          const shouldRestore = (() => {
            if (!pending.originalUrl || pending.restoredOnce) return false
            try {
              const cur = new URL(url)
              const orig = new URL(pending.originalUrl)
              // Only restore if original had a meaningful deep path or non-tracking params
              if (orig.hostname.replace(/^www\./i,'').toLowerCase() !== cur.hostname.replace(/^www\./i,'').toLowerCase()) return false
              const origHasDeepPath = (orig.pathname || '/') !== '/'
              const origHasMeaningfulParams = orig.search ? !isJustTrackingParams(orig) : false
              return (origHasDeepPath || origHasMeaningfulParams) && (pending.originalUrl !== url)
            } catch { return false }
          })()
          if (shouldRestore) {
            if (OC_DEBUG) console.log('[WS OC] restoring deep link', { from: url, to: pending.originalUrl })
            // Update state to avoid repeated restores
            tabRedirectState.set(tabId, { ...pending, restoredOnce: true })
            try { track('oc_restore_deeplink', { domain: clean, partner_name: pending.partnerName }) } catch {}
            await chrome.tabs.update(tabId, { url: pending.originalUrl })
            // Return early; onCommitted will fire again for the restored URL, but cooldown prevents re-redirect
            return
          }
        } catch {}
        setIcon('active', tabId)

        // Save popup data for the UI to render
        const conditions = pending.deal.merchantId ? await fetchMerchantConditions(pending.deal.merchantId) : null
        await chrome.storage.local.set({
          __wsOcPopupData: {
            domain: clean,
            partnerName: pending.partnerName,
            rate: pending.deal.rate,
            amountType: pending.deal.amountType || 'PERCENTAGE',
            title: pending.deal.name,
            affiliateUrl: pending.deal.affiliateUrl || null,
            dealId: pending.deal.id,
            clickId: pending.deal.clickId || null,
            conditions: conditions || pending.deal.conditions || null,
            timestamp: Date.now(),
          }
        })
        track('oc_activated', {
          domain: clean,
          partner_name: pending.partnerName,
          deal_id: pending.deal.id,
          amount_type: pending.deal.amountType || 'PERCENTAGE',
          rate: pending.deal.rate,
          click_id: pending.deal.clickId,
        })
        // Notify UI to show post-activation deck; include all deals in category if available
        const allDeals = (pending.deal && Array.isArray((pending as any).deals)) ? (pending as any).deals as Deal[] : [pending.deal]
        // Expose merchant webUrl to content deck via page context cache
        try { (globalThis as any).__wsLastMerchantWebUrl = (pending as any).merchantWebUrl || null } catch {}
        // Persist active pill for this domain in session storage so content can auto-show if message races
        let messageSent = false
        try { 
          await chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: allDeals, dealId: pending.deal.id, providerMerchantId: pending.deal.providerMerchantId })
          messageSent = true
          console.log(`[WS OC Debug] Successfully sent oc_activated message for ${clean}`)
        } catch (error) {
          console.warn(`[WS OC Debug] Failed to send oc_activated message for ${clean}:`, error)
        }
        try { track('oc_state_reemit', { domain: clean, reason: 'post_landing' }) } catch {}
        
        // As a safety, re-send activation after delays in case content script loads late
        if (!messageSent) {
          // Immediate retry
          setTimeout(async () => {
            try { 
              await chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: allDeals, dealId: pending.deal.id, providerMerchantId: pending.deal.providerMerchantId })
              console.log(`[WS OC Debug] Successfully sent delayed oc_activated message for ${clean}`)
            } catch (error) {
              console.warn(`[WS OC Debug] Failed delayed oc_activated message for ${clean}:`, error)
            }
          }, 500)
        }
        
        // Additional retry after longer delay
        setTimeout(async () => {
          try { 
            await chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: allDeals, dealId: pending.deal.id, providerMerchantId: pending.deal.providerMerchantId })
            console.log(`[WS OC Debug] Successfully sent final retry oc_activated message for ${clean}`)
            try { track('oc_state_reemit', { domain: clean, reason: 'final_retry' }) } catch {}
          } catch (error) {
            console.warn(`[WS OC Debug] Failed final retry oc_activated message for ${clean}:`, error)
          }
        }, 2000)
        try {
          const key = '__wsOcActivePillByDomain'
          const current = (await chrome.storage.session.get(key))[key] as Record<string, boolean> | undefined
          const map = current || {}
          map[clean] = true
          await chrome.storage.session.set({ [key]: map })
        } catch {}
        // Don't open popup - the top-right panel handles the UI now
        tabRedirectState.delete(tabId)
        return
      }

      // If we have a pending redirect state but navigated to an unrelated host,
      // clear the stale state so new domains work normally.
      if (pending) {
        const expectedHost = cleanHost(pending.expectedFinalHost)
        const affiliateHost = pending.affiliateHost ? cleanHost(pending.affiliateHost) : ''
        const isAffiliateHop = affiliateHost && clean.endsWith(affiliateHost)
        if (!clean.endsWith(expectedHost) && !isAffiliateHop) {
          const age = Date.now() - (pending.createdAt || 0)
          if (OC_DEBUG) console.log('[WS OC] clearing-stale-pending', { tabId, currentHost: clean, expectedHost, affiliateHost, age })
          tabRedirectState.delete(tabId)
        } else {
          if (OC_DEBUG) { try { console.log('[WS OC] pending-nonmatch', { tabId, currentUrl: url, currentHost: clean, expectedHost, rawExpected: pending.expectedFinalHost }) } catch { console.log('[WS OC] pending-nonmatch', { tabId, url }) } }
          return
        }
      }

      // Fallback: detect organic landing with affiliate markers and mark active
      // BUT: Skip this if domain is in cooldown (we just tried to activate it ourselves)
      const cooldownUntil = await getCooldownUntil(clean)
      const inCooldown = cooldownUntil && Date.now() - cooldownUntil < COOLDOWN_MS
      
      if (hasAffiliateMarkers(url) && !inCooldown) {
        if (OC_DEBUG) console.log('[WS OC] affiliate markers detected on organic landing', { url })
        try {
          const partner: PartnerLite | null = await getPartnerByHostname(clean, url)
          if (partner) {
            const userCountry = await getUserCountryCode()
            const ocCategory = (partner.categories || []).find(c => /online\s*cashback/i.test(String(c?.name || '')) || /cashback/i.test(String(c?.name || '')))
            const eligible = ocCategory ? filterOnlineCountry(ocCategory.deals as Deal[], userCountry) : []
            const best = pickBestCashback(eligible)
            try { markDomainActive(clean, tabId) } catch {}
            setIcon('active', tabId)
            await chrome.storage.local.set({
              __wsOcPopupData: {
                domain: clean,
                partnerName: partner.name,
                rate: best?.rate || 0,
                amountType: best?.amountType || 'PERCENTAGE',
                title: best?.name || 'Online aankoop',
                affiliateUrl: best?.affiliateUrl || null,
                dealId: best?.id || null,
                clickId: null,
                conditions: best?.conditions || null,
                timestamp: Date.now(),
              }
            })
            track('oc_activated', { domain: clean, partner_name: partner.name, deal_id: best?.id, amount_type: best?.amountType || 'PERCENTAGE', rate: best?.rate || 0, reason: 'affiliate_params' })
            // Notify UI to show post-activation deck
            try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: eligible, dealId: best?.id, providerMerchantId: best?.providerMerchantId }) } catch {}
            try { track('oc_state_reemit', { domain: clean, reason: 'organic_affiliate' }) } catch {}
            try {
              const key = '__wsOcActivePillByDomain'
              const current = (await chrome.storage.session.get(key))[key] as Record<string, boolean> | undefined
              const map = current || {}
              map[clean] = true
              await chrome.storage.session.set({ [key]: map })
            } catch {}
            return
          }
        } catch {}
      }

      const until = await getCooldownUntil(clean)
      if (until && Date.now() - until < COOLDOWN_MS) {
        track('oc_blocked', { domain: clean, reason: 'cooldown' })
        if (OC_DEBUG) console.log('[WS OC] blocked by cooldown', { domain: clean, until })
        return
      }

      // Lookup merchant
      // If domain is already marked active, keep active UI/icon and avoid downgrading
      try {
        const state = getDomainActivationState(clean)
        if (state.active) { setIcon('active', tabId) }
      } catch {}

      if (OC_DEBUG) console.log('[WS OC] Looking up partner for', clean)
      const partner: PartnerLite | null = await getPartnerByHostname(clean, url)
      if (!partner) { 
        if (OC_DEBUG) console.log('[WS OC] no partner for', clean)
        track('oc_blocked', { domain: clean, reason: 'no_partner' })
        return 
      }
      track('oc_partner_detected', { domain: clean, partner_name: partner.name })
      if (OC_DEBUG) console.log('[WS OC] partner', { name: partner.name })

      // Server-confirmed activation check: if recent click exists for this merchant/site
      try {
        const clicks = await fetchRecentClicksForSite(clean)
        const apex = clean
        const norm = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, '')
        const slug = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
        const pname = norm(partner.name)
        const apexSlug = slug(apex.replace(/\./g, '')) // hema.nl -> hemanl
        // Find the most recent matching click (scan all)
        let hit: any = null
        for (const c of (clicks || [])) {
          const sname = norm(c?.store?.name)
          const seg = String(c?.store?.urlPathSegment || '').toLowerCase()
          const segSlug = slug(seg)
          const nameMatch = sname && (sname===pname || sname.includes(pname) || pname.includes(sname))
          const segMatch = !!seg && (seg.includes(apex) || segSlug.includes(apexSlug))
          if (nameMatch || segMatch) { hit = c; break }
        }
        if (hit && hit.clickDate) {
          const when = new Date(hit.clickDate).getTime()
          if (Number.isFinite(when) && Date.now() - when <= 10 * 60 * 1000) {
            if (OC_DEBUG) console.log('[WS OC] server-click active', { domain: clean, clickId: hit.clickId, at: hit.clickDate })
            try { markDomainActive(clean, tabId, hit.clickId || undefined) } catch {}
            try { await setCooldown(clean) } catch {}
            setIcon('active', tabId)
            try {
              const key = '__wsOcActivePillByDomain'
              const current = (await chrome.storage.session.get(key))[key] as Record<string, boolean> | undefined
              const map = current || {}
              map[clean] = true
              await chrome.storage.session.set({ [key]: map })
            } catch {}
            try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: [], dealId: null, providerMerchantId: null }) } catch {}
            return
          }
        }
      } catch {}

      const userCountry = await getUserCountryCode()
      if (OC_DEBUG) console.log('[WS OC] User country:', userCountry)
      const ocCategory = (partner.categories || []).find(c => /online\s*cashback/i.test(String(c?.name || '')) || /cashback/i.test(String(c?.name || '')))
      if (!ocCategory) { 
        track('oc_blocked', { domain: clean, reason: 'no_deals' })
        if (OC_DEBUG) console.log('[WS OC] no online cashback category for', clean)
        return 
      }
      if (OC_DEBUG) console.log('[WS OC] Found OC category with', ocCategory.deals?.length || 0, 'deals')
      const eligible = filterOnlineCountry(ocCategory.deals as Deal[], userCountry)
      if (!eligible.length) { 
        track('oc_blocked', { domain: clean, reason: 'no_country_match', country: userCountry })
        if (OC_DEBUG) console.log('[WS OC] no eligible deals for country', userCountry, 'on', clean)
        return 
      }
      if (OC_DEBUG) console.log('[WS OC] Found', eligible.length, 'eligible deals for', userCountry)

      // Respect user settings
      try {
        const result = await chrome.storage.local.get('user')
        const user = result.user || { settings: {} }
        const showReminders = user?.settings?.showCashbackReminders !== false
        const autoActivate = user?.settings?.autoActivateOnlineCashback !== false
        
        console.log(`[WS OC Debug] User settings for ${clean}: showReminders=${showReminders}, autoActivate=${autoActivate}`)
        console.log(`[WS OC Debug] Raw user settings:`, user?.settings)
        
        // If reminders are disabled, don't show any UI
        if (!showReminders) { 
          console.log(`[WS OC Debug] Blocking scan for ${clean}: reminders disabled`)
          track('oc_blocked', { domain: clean, reason: 'reminders_disabled' })
          return 
        }
        
        // If auto-activation is disabled, show manual activation UI instead
        if (!autoActivate) {
          console.log(`[WS OC Debug] Manual activation enabled for ${clean}`)
          // If not logged in, show unauthenticated state instead of manual activate
          try {
            const active = await hasActiveSession()
            if (!active) {
              // Send message with retry logic for race condition
              const sendWithRetry = async (message: any, messageType: string, attempts = 3) => {
                for (let i = 0; i < attempts; i++) {
                  try {
                    await chrome.tabs.sendMessage(tabId, message)
                    console.log(`[WS OC Debug] Successfully sent ${messageType} for ${clean}`)
                    return
                  } catch (error) {
                    if (i < attempts - 1) {
                      const delay = [100, 500, 1000][i]
                      console.log(`[WS OC Debug] Retry ${i + 1} sending ${messageType} after ${delay}ms`)
                      await new Promise(resolve => setTimeout(resolve, delay))
                    } else {
                      console.warn(`[WS OC Debug] Failed to send ${messageType} after ${attempts} attempts:`, error)
                    }
                  }
                }
              }
              
              await sendWithRetry(
                { __wsOcUi: true, kind: 'oc_login_required', host: clean, deals: eligible },
                'oc_login_required'
              )
              return
            }
          } catch {}
          // Show manual activation UI (will be handled by content script)
          const sendWithRetry = async (message: any, messageType: string, attempts = 3) => {
            for (let i = 0; i < attempts; i++) {
              try {
                await chrome.tabs.sendMessage(tabId, message)
                console.log(`[WS OC Debug] Successfully sent ${messageType} for ${clean}`)
                return
              } catch (error) {
                if (i < attempts - 1) {
                  const delay = [100, 500, 1000][i]
                  console.log(`[WS OC Debug] Retry ${i + 1} sending ${messageType} after ${delay}ms`)
                  await new Promise(resolve => setTimeout(resolve, delay))
                } else {
                  console.warn(`[WS OC Debug] Failed to send ${messageType} after ${attempts} attempts:`, error)
                }
              }
            }
          }
          
          await sendWithRetry(
            {
              __wsOcUi: true,
              kind: 'oc_deals_found',
              host: clean,
              deals: eligible,
              platform: getPlatform(),
              isManualMode: true,
            },
            'oc_deals_found (manual mode)'
          )
          return
        }
      } catch (error) {
        console.error(`[WS OC Debug] Error reading user settings for ${clean}:`, error)
      }

      const best = pickBestCashback(eligible)
      if (!best || !best.id) { track('oc_blocked', { domain: clean, reason: 'no_link' }); if (OC_DEBUG) console.log('[WS OC] best deal missing id', best); return }

      track('oc_eligible', { domain: clean, partner_name: partner.name, deals_count: eligible.length, deal_id: best.id, amount_type: best.amountType, rate: best.rate, country: userCountry })
      // Skip the "deals found" panel - go straight to countdown after fetching redirect URL
      if (OC_DEBUG) console.log('[WS OC] eligible', { dealId: best.id, rate: best.rate, amountType: best.amountType })

      // Request tracked redirect URL (only if logged in); otherwise show login-required state
      track('oc_redirect_requested', { domain: clean, deal_id: best.id, provider: best.provider })
      // Note: Do NOT send oc_redirect_requested message here - it hides UI before countdown shows
      // The message will be sent in handleCountdownComplete when we actually navigate
      if (OC_DEBUG) console.log('[WS OC] requesting redirect', { dealId: best.id })
      // Guard: if site is already active (ActivationRegistry says active), do not redirect again
      try { 
        const state = getDomainActivationState(clean)
        if (OC_DEBUG) console.log('[WS OC] Activation state check:', { active: state.active, clickId: state.clickId })
        if (state.active) { 
          if (OC_DEBUG) console.log('[WS OC] skip redirect - already active', { host: clean })
          return 
        } 
      } catch (e) {
        if (OC_DEBUG) console.log('[WS OC] Error checking activation state:', e)
      }
      
      // Guard: if there is a domain-scoped pending in-flight redirect, skip issuing another
      const hasPending = hasValidDomainPending(clean)
      if (OC_DEBUG) console.log('[WS OC] Pending redirect check:', hasPending)
      if (hasPending) { 
        if (OC_DEBUG) console.log('[WS OC] skip redirect - pending in-flight', { host: clean })
        return 
      }
      
      // Fetch redirect URL with timeout to prevent hanging
      if (OC_DEBUG) console.log('[WS OC] Fetching redirect URL for deal', best.id)
      let redir: { url: string; clickId?: string } | null = null
      try {
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Redirect URL request timeout')), 10000)
        )
        redir = await Promise.race([requestRedirectUrl(best.id), timeoutPromise])
        if (OC_DEBUG) console.log('[WS OC] Redirect URL fetched:', redir ? 'success' : 'null')
      } catch (e) {
        console.error('[WS OC] Error fetching redirect URL:', e)
        // Set cooldown to prevent repeated attempts when fetch fails
        try { await setCooldown(clean) } catch {}
        // Show login required as fallback if redirect fetch fails
        try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_login_required', host: clean, deals: eligible, providerMerchantId: (best as any).providerMerchantId }) } catch {}
        return
      }
      
      if (!redir || !redir.url) {
        if (OC_DEBUG) console.log('[WS OC] no redirect url returned (likely not logged in)')
        // Set cooldown to prevent repeated attempts when not authenticated
        try { await setCooldown(clean) } catch {}
        try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_login_required', host: clean, deals: eligible, providerMerchantId: (best as any).providerMerchantId }) } catch {}
        return
      }
      if (OC_DEBUG) console.log('[WS OC] Redirect URL valid, proceeding to countdown')
      // Check platform and user settings to determine redirect behavior
      let platform = 'unknown'
      let supportsAuto = true
      let requiresGesture = false
      
      try {
        platform = getPlatform()
        if (OC_DEBUG) console.log('[WS OC] Platform detected:', platform)
      } catch (e) {
        console.error('[WS OC] Error detecting platform:', e)
      }
      
      try {
        supportsAuto = allowsAutoRedirect()
        if (OC_DEBUG) console.log('[WS OC] Auto-redirect supported:', supportsAuto)
      } catch (e) {
        console.error('[WS OC] Error checking auto-redirect support:', e)
      }
      
      try {
        requiresGesture = requiresUserGesture()
        if (OC_DEBUG) console.log('[WS OC] User gesture required:', requiresGesture)
      } catch (e) {
        console.error('[WS OC] Error checking user gesture requirement:', e)
      }
      
      console.log(`[WS OC Debug] Activation decision for ${clean}: platform=${platform}, supportsAuto=${supportsAuto}, requiresGesture=${requiresGesture}`)
      
      // Stash redirect info for later use
      best.affiliateUrl = redir.url
      best.clickId = redir.clickId
      ;(best as any).providerMerchantId = (best as any).providerMerchantId || eligible[0]?.providerMerchantId
      
      if (supportsAuto && !requiresGesture) {
        console.log(`[WS OC Debug] Initiating auto-activation countdown for ${clean}`)
        // Chrome/Firefox: Show countdown banner for auto-activation
        track('oc_countdown_shown', { domain: clean, deal_id: best.id, platform })
        
        // Send countdown message immediately - content script will handle it when ready
        // Retries ensure message gets through even if content script loads after background sends
        const sendCountdownWithRetry = async (attempts = 0): Promise<void> => {
          const maxAttempts = 3
          const delays = [0, 50, 150] // Shorter delays for faster UI
          
          if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, delays[attempts - 1] || 150))
          }
          
          return new Promise<void>((resolve) => {
            chrome.tabs.sendMessage(tabId, { 
              __wsOcUi: true, 
              kind: 'oc_countdown_start', 
              host: clean, 
              dealInfo: best, 
              countdown: 3 
            }, (_response) => {
              if (chrome.runtime.lastError) {
                console.log(`[WS OC Debug] Countdown message attempt ${attempts + 1}/${maxAttempts} failed:`, chrome.runtime.lastError.message)
                if (attempts < maxAttempts - 1) {
                  sendCountdownWithRetry(attempts + 1).then(resolve)
                } else {
                  console.error(`[WS OC Debug] All ${maxAttempts} attempts failed for countdown message`)
                  // Persist a short-lived pending UI event so content can render on DOMContentLoaded
                  try {
                    const payload = { kind: 'oc_countdown_start', host: clean, dealInfo: best, countdown: 3, ts: Date.now() }
                    chrome.storage.session.set({ __wsOcPendingUi: payload }).catch?.(() => {})
                    console.log(`[WS OC Debug] Stored pending countdown in session storage as fallback`)
                  } catch {}
                  resolve()
                }
              } else {
                console.log(`[WS OC Debug] Successfully sent countdown message for ${clean} (attempt ${attempts + 1})`)
                resolve()
              }
            })
          })
        }
        
        sendCountdownWithRetry().catch(e => {
          console.error(`[WS OC Debug] Error in countdown retry logic:`, e)
        })
        
        // Store redirect state for when countdown completes
        const enrich: any = { expectedFinalHost: clean, partnerName: partner.name, deal: best, originalUrl: url, startedAt: Date.now() }
        ;(enrich as any).deals = eligible
        tabRedirectState.set(tabId, enrich)
        
        // Set domain-scoped pending fallback (2.5 minutes TTL)
        try {
          let affiliateHost = ''
          try { affiliateHost = cleanHost(new URL(redir.url).hostname) } catch {}
          const until = Date.now() + 150000
          pendingByDomain.set(clean, { affiliateHost, clickId: redir.clickId, partnerName: partner.name, deal: best, originalUrl: url, until })
          if (OC_DEBUG) console.log('[WS OC] set domain-pending', { key: clean, affiliateHost, until })
        } catch {}
        
      } else {
        console.log(`[WS OC Debug] Initiating manual activation for ${clean} (Safari or manual mode)`)
        // Safari or manual mode: Show manual activation button
        track('oc_manual_activation_shown', { domain: clean, deal_id: best.id, platform })
        try { 
          chrome.tabs.sendMessage(tabId, { 
            __wsOcUi: true, 
            kind: 'oc_deals_found', 
            host: clean, 
            deals: eligible,
            platform: platform,
            isManualMode: true
          }, (_response) => {
            if (chrome.runtime.lastError) {
              console.error(`[WS OC Debug] Failed to send manual activation message to tab ${tabId}:`, chrome.runtime.lastError.message)
              // Fallback: show login required if content script isn't responding
              try { 
                chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_login_required', host: clean, deals: eligible, providerMerchantId: (best as any).providerMerchantId }) 
              } catch {}
            } else {
              console.log(`[WS OC Debug] Successfully sent manual activation message for ${clean}`)
            }
          }) 
        } catch (e) {
          console.error(`[WS OC Debug] Error sending manual activation message (else branch) for ${clean}:`, e)
        }
      }
      } finally {
        // Decrement active processes counter
        activeActivationProcesses = Math.max(0, activeActivationProcesses - 1)
        console.log(`[WS OC Debug] Activation process completed. Active processes: ${activeActivationProcesses}`)
      }
    }, { url: [{ schemes: ['http', 'https'] }] })

    // DOMContentLoaded: retry sending countdown or activated if content script is now ready
    chrome.webNavigation.onDOMContentLoaded.addListener(async (details) => {
      const { tabId, frameId, url } = details
      if (frameId !== 0 || !isHttpUrl(url)) return
      let host = ''
      try { host = new URL(url).hostname } catch { return }
      if (!host || isExcluded(host)) return
      const clean = cleanHost(host)
      
      if (OC_DEBUG) console.log(`[WS OC] DOMContentLoaded for ${clean}, checking for pending UI...`)
      
      // Check for pending countdown
      try {
        const { __wsOcPendingUi } = await chrome.storage.session.get('__wsOcPendingUi')
        if (__wsOcPendingUi && __wsOcPendingUi.host === clean && Date.now() - __wsOcPendingUi.ts < 10000) {
          if (OC_DEBUG) console.log(`[WS OC] Found pending countdown for ${clean}, retrying...`)
          const pingOk = await pingContentScript(tabId)
          if (pingOk && __wsOcPendingUi.kind === 'oc_countdown_start') {
            try {
              await chrome.tabs.sendMessage(tabId, {
                __wsOcUi: true,
                kind: 'oc_countdown_start',
                host: clean,
                dealInfo: __wsOcPendingUi.dealInfo,
                countdown: __wsOcPendingUi.countdown || 3
              })
              console.log(`[WS OC] Successfully retried countdown on DOMContentLoaded for ${clean}`)
              await chrome.storage.session.remove('__wsOcPendingUi')
            } catch (e) {
              console.warn(`[WS OC] Failed to retry countdown on DOMContentLoaded:`, e)
            }
          }
        }
      } catch {}
      
      // Check for pending activation pill
      try {
        const key = '__wsOcActivePillByDomain'
        const current = (await chrome.storage.session.get(key))[key] as Record<string, boolean> | undefined
        if (current && current[clean]) {
          const pingOk = await pingContentScript(tabId)
          if (pingOk) {
            try {
              await chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: [], dealId: null, providerMerchantId: null })
              console.log(`[WS OC] Successfully retried oc_activated on DOMContentLoaded for ${clean}`)
            } catch (e) {
              console.warn(`[WS OC] Failed to retry oc_activated on DOMContentLoaded:`, e)
            }
          }
        }
      } catch {}
    }, { url: [{ schemes: ['http', 'https'] }] })
    
    // Safety net: after full load, if we recorded activation for this domain in this session, re-emit UI message
    chrome.webNavigation.onCompleted.addListener(async (details) => {
      const { tabId, frameId, url } = details
      if (frameId !== 0 || !isHttpUrl(url)) return
      let host = ''
      try { host = new URL(url).hostname } catch { return }
      if (!host || isExcluded(host)) return
      const clean = cleanHost(host)
      try {
        const key = '__wsOcActivePillByDomain'
        const current = (await chrome.storage.session.get(key))[key] as Record<string, boolean> | undefined
        if (current && current[clean]) {
          // Content script might have loaded after the first message; nudge UI to render the pill
          const pingOk = await pingContentScript(tabId)
          if (pingOk) {
            try { 
              await chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: [], dealId: null, providerMerchantId: null })
              console.log(`[WS OC Debug] Safety net (onCompleted): successfully sent oc_activated message for ${clean}`)
            } catch (error) {
              console.warn(`[WS OC Debug] Safety net (onCompleted): failed to send oc_activated message for ${clean}:`, error)
            }
          }
        }
      } catch {}
    }, { url: [{ schemes: ['http', 'https'] }] })
  } catch (e) {
    console.warn('[WS] webNavigation listener could not be registered:', e)
  }
}

// Handle countdown completion and cancellation messages from content script
chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
  if (message.type === 'OC_COUNTDOWN_COMPLETE') {
    handleCountdownComplete(message.domain, message.dealInfo, sender.tab?.id)
  } else if (message.type === 'OC_COUNTDOWN_CANCEL') {
    handleCountdownCancel(message.domain, sender.tab?.id)
  } else if (message.type === 'OC_MANUAL_ACTIVATE') {
    handleManualActivation(message.domain, message.dealInfo, sender.tab?.id)
  } else if (message.type === 'OC_MANUAL_ACTIVATE_DEAL') {
    handleManualActivationDeal(message.domain, message.dealInfo)
  } else if (message.__wsReady && sender.tab?.id) {
    // Content script signaled it's ready - check for pending UI events
    const tabId = sender.tab.id
    const clean = message.host
    if (OC_DEBUG) console.log(`[WS OC] Received WS_READY from ${clean} (tab ${tabId})`)
    
    ;(async () => {
      try {
        // Check for pending countdown
        const { __wsOcPendingUi } = await chrome.storage.session.get('__wsOcPendingUi')
        if (__wsOcPendingUi && __wsOcPendingUi.host === clean && Date.now() - __wsOcPendingUi.ts < 10000) {
          if (__wsOcPendingUi.kind === 'oc_countdown_start') {
            try {
              await chrome.tabs.sendMessage(tabId, {
                __wsOcUi: true,
                kind: 'oc_countdown_start',
                host: clean,
                dealInfo: __wsOcPendingUi.dealInfo,
                countdown: __wsOcPendingUi.countdown || 3
              })
              console.log(`[WS OC] Successfully sent pending countdown on WS_READY for ${clean}`)
              await chrome.storage.session.remove('__wsOcPendingUi')
            } catch (e) {
              console.warn(`[WS OC] Failed to send pending countdown on WS_READY:`, e)
            }
          }
        }
        
        // Check for pending activation pill
        const key = '__wsOcActivePillByDomain'
        const current = (await chrome.storage.session.get(key))[key] as Record<string, boolean> | undefined
        if (current && current[clean]) {
          try {
            await chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: [], dealId: null, providerMerchantId: null })
            console.log(`[WS OC] Successfully sent pending oc_activated on WS_READY for ${clean}`)
          } catch (e) {
            console.warn(`[WS OC] Failed to send pending oc_activated on WS_READY:`, e)
          }
        }
      } catch (e) {
        console.error(`[WS OC] Error handling WS_READY:`, e)
      }
    })()
  }
})

async function handleCountdownComplete(domain: string, dealInfo: any, tabId?: number) {
  if (!tabId) return
  
  const pending = tabRedirectState.get(tabId)
  if (!pending || !pending.deal.affiliateUrl) {
    console.warn('[WS OC] countdown completed but no pending redirect found')
    return
  }
  // Enforce a minimum of 3 seconds from countdown start to navigation
  try {
    const startedAt = Number(pending.startedAt || 0)
    const elapsed = Date.now() - startedAt
    const MIN_MS = 3000
    if (!Number.isNaN(elapsed) && elapsed < MIN_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_MS - elapsed))
    }
  } catch {}
  
  try {
    track('oc_countdown_completed', { domain, deal_id: dealInfo.id, platform: getPlatform() })
    
    // Perform the redirect
    const redirUrl = pending.deal.affiliateUrl
    try { 
      const h = new URL(redirUrl).hostname
      track('oc_redirect_issued', { domain, deal_id: dealInfo.id, link_host: h, click_id: pending.deal.clickId }) 
    } catch { 
      track('oc_redirect_issued', { domain, deal_id: dealInfo.id, click_id: pending.deal.clickId }) 
    }
    
    if (OC_DEBUG) console.log('[WS OC] navigating to affiliate after countdown', { url: redirUrl })
    
    // Hide UI before redirect to prevent it from hanging during navigation
    try { 
      await chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_redirect_requested', host: domain }) 
    } catch {}
    
    try {
      await chrome.tabs.update(tabId, { url: redirUrl })
      track('oc_redirect_navigated', { domain, deal_id: dealInfo.id, click_id: pending.deal.clickId })
    } catch (e) {
      // Fallback: open in new tab if updating current tab is blocked
      try {
        const created = await chrome.tabs.create({ url: redirUrl, active: true })
        if (created?.id) {
          let affiliateHost = ''
          try { affiliateHost = cleanHost(new URL(redirUrl).hostname) } catch {}
          tabRedirectState.set(created.id, { 
            expectedFinalHost: domain, 
            partnerName: pending.partnerName, 
            deal: pending.deal, 
            originalUrl: pending.originalUrl, 
            affiliateHost, 
            createdAt: Date.now() 
          })
          track('oc_redirect_navigated', { domain, deal_id: dealInfo.id, click_id: pending.deal.clickId })
          if (OC_DEBUG) console.log('[WS OC] opened new tab for affiliate', { tabId: created.id })
        }
      } catch {}
      tabRedirectState.delete(tabId)
    }
  } catch (error) {
    console.error('[WS OC] error handling countdown completion:', error)
  }
}

async function handleCountdownCancel(domain: string, tabId?: number) {
  if (!tabId) return
  
  try {
    track('oc_countdown_cancelled', { domain, platform: getPlatform() })
    
    // Clear pending redirect state
    tabRedirectState.delete(tabId)
    
    // Set short cooldown to avoid re-prompting immediately
    try { await setCooldown(domain) } catch {}
    
    if (OC_DEBUG) console.log('[WS OC] countdown cancelled by user', { domain })
  } catch (error) {
    console.error('[WS OC] error handling countdown cancellation:', error)
  }
}

async function handleManualActivation(domain: string, dealInfo: any, tabId?: number) {
  if (!tabId) return
  
  try {
    track('oc_manual_activation_clicked', { domain, deal_id: dealInfo?.id, platform: getPlatform() })
    
    // Get partner and deals for this domain
    const partner = await getPartnerByHostname(domain)
    if (!partner) {
      console.warn('[WS OC] manual activation: no partner found for domain', domain)
      return
    }
    
    const userCountry = await getUserCountryCode()
    const ocCategory = (partner.categories || []).find(c => /online\s*cashback/i.test(String(c?.name || '')) || /cashback/i.test(String(c?.name || '')))
    if (!ocCategory) {
      console.warn('[WS OC] manual activation: no online cashback category found')
      return
    }
    
    const eligible = filterOnlineCountry(ocCategory.deals as Deal[], userCountry)
    const best = pickBestCashback(eligible)
    if (!best || !best.id) {
      console.warn('[WS OC] manual activation: no valid deal found')
      return
    }
    
    // Request redirect URL
    let redir: { url: string; clickId?: string } | null = null
    try {
      redir = await requestRedirectUrl(best.id)
    } catch (e) {
      console.error('[WS OC] manual activation: failed to get redirect URL', e)
      return
    }
    
    if (!redir || !redir.url) {
      console.warn('[WS OC] manual activation: no redirect URL returned')
      return
    }
    
    // Perform the redirect
    try { 
      const h = new URL(redir.url).hostname
      track('oc_redirect_issued', { domain, deal_id: best.id, link_host: h, click_id: redir.clickId, reason: 'manual_activation' }) 
    } catch { 
      track('oc_redirect_issued', { domain, deal_id: best.id, click_id: redir.clickId, reason: 'manual_activation' }) 
    }
    
    // Store redirect state for landing detection
    best.affiliateUrl = redir.url
    best.clickId = redir.clickId
    const enrich: any = { expectedFinalHost: domain, partnerName: partner.name, deal: best, originalUrl: `https://${domain}` }
    ;(enrich as any).deals = eligible
    tabRedirectState.set(tabId, enrich)
    
    // Set domain-scoped pending fallback
    try {
      let affiliateHost = ''
      try { affiliateHost = cleanHost(new URL(redir.url).hostname) } catch {}
      const until = Date.now() + 150000
      pendingByDomain.set(domain, { affiliateHost, clickId: redir.clickId, partnerName: partner.name, deal: best, originalUrl: `https://${domain}`, until })
    } catch {}
    
    // Perform redirect
    try {
      await chrome.tabs.update(tabId, { url: redir.url })
      track('oc_redirect_navigated', { domain, deal_id: best.id, click_id: redir.clickId, reason: 'manual_activation' })
      if (OC_DEBUG) console.log('[WS OC] manual activation redirect completed', { url: redir.url })
    } catch (e) {
      // Fallback: open in new tab
      try {
        const created = await chrome.tabs.create({ url: redir.url, active: true })
        if (created?.id) {
          let affiliateHost = ''
          try { affiliateHost = cleanHost(new URL(redir.url).hostname) } catch {}
          tabRedirectState.set(created.id, { 
            expectedFinalHost: domain, 
            partnerName: partner.name, 
            deal: best, 
            originalUrl: `https://${domain}`, 
            affiliateHost, 
            createdAt: Date.now() 
          })
          track('oc_redirect_navigated', { domain, deal_id: best.id, click_id: redir.clickId, reason: 'manual_activation' })
        }
      } catch {}
      tabRedirectState.delete(tabId)
    }
  } catch (error) {
    console.error('[WS OC] error handling manual activation:', error)
  }
}

// Handle manual activation from popup deal clicks
async function handleManualActivationDeal(domain: string, dealInfo: any) {
  if (!dealInfo || !dealInfo.id) {
    console.warn('[WS OC] manual activation deal: no deal info provided')
    return
  }
  
  try {
    track('oc_manual_activation_clicked', { domain, deal_id: dealInfo.id, platform: getPlatform(), source: 'popup' })
    
    // Get partner info
    const partner = await getPartnerByHostname(domain)
    if (!partner) {
      console.warn('[WS OC] manual activation deal: no partner found for domain', domain)
      return
    }
    
    // Request redirect URL for the specific deal
    let redir: { url: string; clickId?: string } | null = null
    try {
      redir = await requestRedirectUrl(dealInfo.id)
    } catch (e) {
      console.error('[WS OC] manual activation deal: failed to get redirect URL', e)
      return
    }
    
    if (!redir || !redir.url) {
      console.warn('[WS OC] manual activation deal: no redirect URL returned')
      return
    }
    
    // Track redirect
    try { 
      const h = new URL(redir.url).hostname
      track('oc_redirect_issued', { domain, deal_id: dealInfo.id, link_host: h, click_id: redir.clickId, reason: 'popup_deal_click' }) 
    } catch { 
      track('oc_redirect_issued', { domain, deal_id: dealInfo.id, click_id: redir.clickId, reason: 'popup_deal_click' }) 
    }
    
    // Create new tab with affiliate URL
    try {
      const created = await chrome.tabs.create({ url: redir.url, active: true })
      if (created?.id) {
        // Store redirect state for landing detection
        const enrich: RedirectState = {
          expectedFinalHost: domain,
          partnerName: partner.name,
          deal: { ...dealInfo, affiliateUrl: redir.url, clickId: redir.clickId },
          originalUrl: `https://${domain}`,
          affiliateHost: cleanHost(new URL(redir.url).hostname),
          createdAt: Date.now()
        }
        ;(enrich as any).deals = [dealInfo]
        tabRedirectState.set(created.id, enrich)
        
        // Set domain-scoped pending fallback
        try {
          let affiliateHost = ''
          try { affiliateHost = cleanHost(new URL(redir.url).hostname) } catch {}
          const until = Date.now() + 150000
          pendingByDomain.set(domain, { 
            affiliateHost, 
            clickId: redir.clickId, 
            partnerName: partner.name, 
            deal: enrich.deal, 
            originalUrl: `https://${domain}`, 
            until 
          })
        } catch {}
        
        track('oc_redirect_navigated', { domain, deal_id: dealInfo.id, click_id: redir.clickId, reason: 'popup_deal_click' })
        if (OC_DEBUG) console.log('[WS OC] popup deal activation redirect completed', { url: redir.url, tabId: created.id })
      }
    } catch (e) {
      console.error('[WS OC] manual activation deal: failed to create tab', e)
    }
  } catch (error) {
    console.error('[WS OC] error handling manual activation deal:', error)
  }
}


