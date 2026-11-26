// ---------------------------------------------------------------------------
// Monetization placements.
//
// Database placements are optional. When the `ad_placements` table has not
// been created yet, env-configured AdSense units are used instead so the site
// still monetizes without a broken UI or a failed request on every page.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { AD_SLOTS, getAdSenseClient, getAdSenseSlot, isAdSenseEnabled, sanitizeAdClient, sanitizeAdSlot } from './adsConfig'

const TABLE = 'ad_placements'
const CACHE_TTL_MS = 5 * 60 * 1000
const SESSION_KEY = 'neural-aurora:ad-impressions:v1'
const MAX_TOTAL_PER_SESSION = 8
const PROVIDERS = new Set(['adsense', 'sponsor', 'affiliate', 'custom'])

let cache = null
let inFlight = null

function safeUrl(value) {
  const url = String(value || '').trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/') && !url.startsWith('//')) return url
  return ''
}

function clamp(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(Math.max(Math.round(number), min), max)
}

/** Normalise a DB row so hostile or partial values can never reach the DOM. */
export function normalizePlacement(row = {}) {
  const provider = PROVIDERS.has(row.provider) ? row.provider : 'custom'
  return {
    id: row.id ?? null,
    name: String(row.name || '').slice(0, 120),
    slot: Object.prototype.hasOwnProperty.call(AD_SLOTS, row.slot) ? row.slot : '',
    provider,
    ad_client: sanitizeAdClient(row.ad_client) || getAdSenseClient(),
    ad_slot: sanitizeAdSlot(row.ad_slot),
    title: String(row.title || '').slice(0, 180),
    description: String(row.description || '').slice(0, 320),
    image_url: safeUrl(row.image_url),
    target_url: safeUrl(row.target_url),
    cta_label: String(row.cta_label || 'Learn more').slice(0, 60),
    active: row.active !== false,
    weight: clamp(row.weight, 1, 10),
    max_per_session: clamp(row.max_per_session, 1, 8),
    starts_at: row.starts_at || null,
    ends_at: row.ends_at || null,
    impression_count: Number(row.impression_count || 0),
    click_count: Number(row.click_count || 0),
  }
}

function envFallbackPlacements() {
  if (!isAdSenseEnabled()) return []
  return Object.keys(AD_SLOTS).map((slot, index) => normalizePlacement({
    id: `env:${slot}`,
    name: `${AD_SLOTS[slot].label} (environment)`,
    slot,
    provider: 'adsense',
    ad_client: getAdSenseClient(),
    ad_slot: getAdSenseSlot(slot),
    active: true,
    weight: 1,
    max_per_session: index < 4 ? 2 : 1,
  }))
}

/** Public placements, cached briefly and degraded to env config on failure. */
export async function getPublicAdPlacements({ force = false } = {}) {
  if (!isSupabaseConfigured) {
    const fallback = envFallbackPlacements()
    cache = { at: Date.now(), rows: fallback }
    return fallback
  }
  if (cache && !force && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('active', true)
        .order('weight', { ascending: false })
      if (error) throw error
      const rows = (data || []).map(normalizePlacement).filter((row) => row.slot)
      const fallback = envFallbackPlacements()
      const hasDbSlot = new Set(rows.map((row) => row.slot))
      const merged = [...rows, ...fallback.filter((row) => !hasDbSlot.has(row.slot))]
      cache = { at: Date.now(), rows: merged }
      return merged
    } catch {
      // A missing table or offline browser must not break public pages.
      const rows = envFallbackPlacements()
      cache = { at: Date.now(), rows }
      return rows
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

export async function getAllAdPlacements() {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addAdPlacement(row) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.from(TABLE).insert([row]).select().single()
  if (error) throw error
  cache = null
  return data
}

export async function updateAdPlacement(id, patch) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
  const { error } = await supabase.from(TABLE).update(patch).eq('id', id)
  if (error) throw error
  cache = null
}

export async function deleteAdPlacement(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured')
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
  cache = null
}

function readSessionCounts() {
  if (typeof window === 'undefined') return { total: 0, slots: {} }
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || '{}')
    return {
      total: Number(parsed.total) || 0,
      slots: parsed.slots && typeof parsed.slots === 'object' ? parsed.slots : {},
    }
  } catch {
    return { total: 0, slots: {} }
  }
}

function writeSessionCounts(counts) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(counts))
  } catch {
    /* private browsing: frequency caps degrade gracefully */
  }
}

/** Non-blocking event recording; RPC absence is never a user-facing error. */
export function recordAdEvent(placement, eventType) {
  if (!placement || !isSupabaseConfigured) return
  const type = eventType === 'click' ? 'click' : 'impression'
  if (!placement.id || String(placement.id).startsWith('env:')) return
  Promise.resolve(supabase.rpc('record_ad_event', {
    placement_id: Number(placement.id),
    event_type: type,
  })).catch(() => { /* analytics must never break the page */ })
}

function isScheduled(placement, now = Date.now()) {
  const start = placement.starts_at ? new Date(placement.starts_at).getTime() : 0
  const end = placement.ends_at ? new Date(placement.ends_at).getTime() : 0
  if (start && Number.isFinite(start) && start > now) return false
  if (end && Number.isFinite(end) && end < now) return false
  return true
}

/**
 * Choose one eligible placement for a slot. Frequency caps are per browser
 * session: a visitor never sees a wall of ads, which keeps the site premium.
 */
export function selectPlacement(placements = [], slot = '', options = {}) {
  const counts = options.counts || readSessionCounts()
  const candidates = placements.filter((placement) =>
    placement.active &&
    placement.slot === slot &&
    isScheduled(placement, options.now) &&
    (counts.slots[slot] || 0) < placement.max_per_session &&
    counts.total < MAX_TOTAL_PER_SESSION,
  )
  if (!candidates.length) return null

  const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0)
  let ticket = (options.random ?? Math.random()) * totalWeight
  for (const candidate of candidates) {
    ticket -= candidate.weight
    if (ticket <= 0) return candidate
  }
  return candidates[candidates.length - 1]
}

/** Called once when an ad actually enters the viewport. */
export function markAdImpression(placement, slot) {
  if (!placement) return
  const counts = readSessionCounts()
  counts.total += 1
  counts.slots = { ...counts.slots, [slot]: (counts.slots[slot] || 0) + 1 }
  writeSessionCounts(counts)
  recordAdEvent(placement, 'impression')
}

export function markAdClick(placement) {
  recordAdEvent(placement, 'click')
}

/** React hook used by <AdSlot>. */
export function useAdPlacement(slot) {
  const [placements, setPlacements] = useState([])
  const [placement, setPlacement] = useState(null)

  useEffect(() => {
    let alive = true
    getPublicAdPlacements()
      .then((rows) => { if (alive) setPlacements(rows) })
      .catch(() => { if (alive) setPlacements([]) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    setPlacement(selectPlacement(placements, slot))
  }, [placements, slot])

  const trackImpression = useCallback(() => markAdImpression(placement, slot), [placement, slot])
  const trackClick = useCallback(() => markAdClick(placement), [placement])

  return { placement, trackImpression, trackClick }
}
