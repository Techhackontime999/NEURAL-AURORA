import { supabase } from '../supabase'

/**
 * Site identity used by Mithi (and anything else that needs a display name
 * without hardcoding one). The value is admin-managed, publicly readable, and
 * resolved once per session with an in-memory cache.
 *
 * Nothing here is personalised to a single owner: a fresh deployment with no
 * admin configuration gets a neutral, generic brand instead of another site's
 * personal details. That is what makes Mithi a product rather than a one-off.
 */

const CACHE_TTL_MS = 5 * 60 * 1000
const FETCH_TIMEOUT_MS = 6000

export const DEFAULT_SITE_BRAND = {
  name: 'this site',
  tagline: '',
  source: 'default',
}

let cachedBrand = null
let cachedAt = 0
let inFlight = null

function fallback() {
  return { ...DEFAULT_SITE_BRAND }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('brand-lookup-timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

/**
 * Resolve the site brand from admin settings. Only the two branding columns are
 * selected — never the whole settings row — and a failure always settles on the
 * neutral default rather than blocking the UI.
 */
export async function resolveSiteBrand({ force = false } = {}) {
  const now = Date.now()
  if (!force && cachedBrand && now - cachedAt < CACHE_TTL_MS) return cachedBrand
  if (!force && inFlight) return inFlight

  inFlight = (async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('admin_settings').select('site_name, site_tagline').eq('id', 1).maybeSingle(),
        FETCH_TIMEOUT_MS
      )
      if (error) throw error

      const name = typeof data?.site_name === 'string' ? data.site_name.trim() : ''
      const tagline = typeof data?.site_tagline === 'string' ? data.site_tagline.trim() : ''

      const brand = name
        ? { name, tagline, source: 'admin' }
        : fallback()

      cachedBrand = brand
      cachedAt = Date.now()
      return brand
    } catch {
      cachedBrand = cachedBrand || fallback()
      cachedAt = Date.now()
      return cachedBrand
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/** Synchronous value for first paint; may be the neutral default. */
export function getCachedSiteBrand() {
  return cachedBrand || fallback()
}
