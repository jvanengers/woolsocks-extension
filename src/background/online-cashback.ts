// Online cashback auto-activation on navigation
// Hooks webNavigation to detect merchant visits, select best online cashback deal,
// request a tracked redirect URL, and open the popup once activated.

import { getPartnerByHostname, requestRedirectUrl, fetchMerchantConditions, getUserCountryCode, fetchRecentClicksForSite } from './api'
import { track, initAnalytics } from './analytics'
import type { Deal, PartnerLite } from '../shared/types'

const EXCLUDED_HOSTS = new Set<string>([
  'woolsocks.eu',
  'scoupy.nl', 'scoupy.com',
  'ok.nl', 'ok.com',
  'shopbuddies.nl', 'shopbuddies.com',
])

const COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes cooldown to avoid repeated redirects
const OC_DEBUG = true
const ACTIVE_TTL_MS = 10 * 60 * 1000 // 10 minutes active state per domain

type RedirectState = {
  expectedFinalHost: string
  partnerName: string
  deal: Deal
  originalUrl: string
  restoredOnce?: boolean
  affiliateHost?: string
  createdAt?: number
}

const tabRedirectState = new Map<number, RedirectState>()
const navigationDebounce = new Map<string, number>() // key = `${tabId}:${host}`

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

      if (OC_DEBUG) console.log('[WS OC] nav', { tabId, host: clean })

      // Debounce duplicate onCommitted events for the same (tab, host)
      const debounceKey = `${tabId}:${clean}`
      const now = Date.now()
      const last = navigationDebounce.get(debounceKey) || 0
      if (now - last < 1500) return
      navigationDebounce.set(debounceKey, now)

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
        try { await chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: allDeals, dealId: pending.deal.id, providerMerchantId: pending.deal.providerMerchantId }) } catch {}
        try { track('oc_state_reemit', { domain: clean, reason: 'post_landing' }) } catch {}
        // As a safety, re-send activation after a short delay in case content script loads late
        try { setTimeout(() => { try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: allDeals, dealId: pending.deal.id, providerMerchantId: pending.deal.providerMerchantId }); try { track('oc_state_reemit', { domain: clean, reason: 'delayed' }) } catch {} } catch {} }, 1200) } catch {}
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
      if (hasAffiliateMarkers(url)) {
        if (OC_DEBUG) console.log('[WS OC] affiliate markers detected on landing', { url })
        try {
          const partner: PartnerLite | null = await getPartnerByHostname(clean)
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

      // Respect user setting
      try {
        const result = await chrome.storage.local.get('user')
        const user = result.user || { settings: {} }
        const enabled = user?.settings?.autoActivateOnlineCashback !== false
        if (!enabled) { return }
      } catch {}

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

      const partner: PartnerLite | null = await getPartnerByHostname(clean)
      if (!partner) { if (OC_DEBUG) console.log('[WS OC] no partner for', clean); return }
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
      const ocCategory = (partner.categories || []).find(c => /online\s*cashback/i.test(String(c?.name || '')) || /cashback/i.test(String(c?.name || '')))
      if (!ocCategory) { track('oc_blocked', { domain: clean, reason: 'no_deals' }); if (OC_DEBUG) console.log('[WS OC] no online cashback category'); return }
      const eligible = filterOnlineCountry(ocCategory.deals as Deal[], userCountry)
      if (!eligible.length) { track('oc_blocked', { domain: clean, reason: 'no_country_match', country: userCountry }); if (OC_DEBUG) console.log('[WS OC] no eligible deals for country', userCountry); return }

      const best = pickBestCashback(eligible)
      if (!best || !best.id) { track('oc_blocked', { domain: clean, reason: 'no_link' }); if (OC_DEBUG) console.log('[WS OC] best deal missing id', best); return }

      track('oc_eligible', { domain: clean, partner_name: partner.name, deals_count: eligible.length, deal_id: best.id, amount_type: best.amountType, rate: best.rate, country: userCountry })
      // Notify UI that deals were found with list (for pre-activation state)
      try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_deals_found', host: clean, deals: eligible }) } catch {}
      if (OC_DEBUG) console.log('[WS OC] eligible', { dealId: best.id, rate: best.rate, amountType: best.amountType })

      // Request tracked redirect URL (only if logged in); otherwise show login-required state
      track('oc_redirect_requested', { domain: clean, deal_id: best.id, provider: best.provider })
      // Tell UI setting up
      try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_redirect_requested', host: clean }) } catch {}
      if (OC_DEBUG) console.log('[WS OC] requesting redirect', { dealId: best.id })
      // Guard: if site is already active (ActivationRegistry says active), do not redirect again
      try { const state = getDomainActivationState(clean); if (state.active) { if (OC_DEBUG) console.log('[WS OC] skip redirect - already active', { host: clean }); return } } catch {}
      // Guard: if there is a domain-scoped pending in-flight redirect, skip issuing another
      if (hasValidDomainPending(clean)) { if (OC_DEBUG) console.log('[WS OC] skip redirect - pending in-flight', { host: clean }); return }
      let redir: { url: string; clickId?: string } | null = null
      try {
        redir = await requestRedirectUrl(best.id)
      } catch (e) {}
      if (!redir || !redir.url) {
        if (OC_DEBUG) console.log('[WS OC] no redirect url returned (likely not logged in)')
        try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_login_required', host: clean, deals: eligible, providerMerchantId: (best as any).providerMerchantId }) } catch {}
        return
      }
      try { const h = new URL(redir.url).hostname; track('oc_redirect_issued', { domain: clean, deal_id: best.id, link_host: h, click_id: redir.clickId }) } catch { track('oc_redirect_issued', { domain: clean, deal_id: best.id, click_id: redir.clickId }) }
      if (OC_DEBUG) console.log('[WS OC] navigating to affiliate', { url: redir.url })

      // Stash state for when we land back (also keep all deals for deck page 1)
      best.affiliateUrl = redir.url
      best.clickId = redir.clickId
      ;(best as any).providerMerchantId = (best as any).providerMerchantId || eligible[0]?.providerMerchantId
      const enrich: any = { expectedFinalHost: clean, partnerName: partner.name, deal: best }
      ;(enrich as any).deals = eligible
      tabRedirectState.set(tabId, enrich)
      // Also set domain-scoped pending fallback (2.5 minutes TTL)
      try {
        let affiliateHost = ''
        try { affiliateHost = cleanHost(new URL(redir.url).hostname) } catch {}
        const until = Date.now() + 150000
        pendingByDomain.set(clean, { affiliateHost, clickId: redir.clickId, partnerName: partner.name, deal: best, originalUrl: url, until })
        if (OC_DEBUG) console.log('[WS OC] set domain-pending', { key: clean, affiliateHost, until })
      } catch {}

      try {
        // Save original deep URL before performing the affiliate hop
        let affiliateHost = ''
        try { affiliateHost = cleanHost(new URL(redir.url).hostname) } catch {}
        tabRedirectState.set(tabId, { expectedFinalHost: clean, partnerName: partner.name, deal: best, originalUrl: url, affiliateHost, createdAt: Date.now() })
        await chrome.tabs.update(tabId, { url: redir.url })
        track('oc_redirect_navigated', { domain: clean, deal_id: best.id, click_id: redir.clickId })
      } catch (e) {
        // Fallback: open in new tab if updating current tab is blocked
        try {
          const created = await chrome.tabs.create({ url: redir.url, active: true })
          if (created?.id) {
            // Save original deep URL for the newly opened tab as well
            let affiliateHost2 = ''
            try { affiliateHost2 = cleanHost(new URL(redir.url).hostname) } catch {}
            tabRedirectState.set(created.id, { expectedFinalHost: clean, partnerName: partner.name, deal: best, originalUrl: url, affiliateHost: affiliateHost2, createdAt: Date.now() })
            track('oc_redirect_navigated', { domain: clean, deal_id: best.id, click_id: redir.clickId })
            if (OC_DEBUG) console.log('[WS OC] opened new tab for affiliate', { tabId: created.id })
          }
        } catch {}
        tabRedirectState.delete(tabId)
      }
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
          try { chrome.tabs.sendMessage(tabId, { __wsOcUi: true, kind: 'oc_activated', host: clean, deals: [], dealId: null, providerMerchantId: null }) } catch {}
        }
      } catch {}
    }, { url: [{ schemes: ['http', 'https'] }] })
  } catch (e) {
    console.warn('[WS] webNavigation listener could not be registered:', e)
  }
}


