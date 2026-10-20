import { supabase } from '../supabase'
import {
  DEFAULT_DOCS_URL,
  getDocsUrl,
  isSafeDocsUrl,
  normaliseDocsUrl,
  setDocsUrl,
} from '../docs-config'

const REFRESH_AFTER_MS = 60 * 1000
const RETRY_AFTER_MS = 20 * 1000
const FETCH_TIMEOUT_MS = 6000

let lastFetchedAt = 0
let lastAttemptAt = 0
let inFlight = null

/**
 * A synchronous, immediately-usable destination: the admin value cached from a
 * previous visit, or the safe default. Used to paint the option instantly while
 * the authoritative lookup is still in flight.
 */
export function getCachedDocs() {
  const cached = getDocsUrl()
  if (cached) {
    return { url: cached, source: 'cache', configured: true, reason: '' }
  }
  return {
    url: DEFAULT_DOCS_URL,
    source: 'default',
    configured: false,
    reason: '',
  }
}

/**
 * The default link, used only when the admin setting is genuinely absent or
 * unreachable. It is still a safe HTTPS destination, so the option remains
 * usable rather than becoming a dead end.
 */
function fallback(reason = '', source = 'fallback') {
  return {
    url: DEFAULT_DOCS_URL,
    source,
    configured: false,
    reason,
  }
}

/**
 * A hung request (offline, DNS failure, blocked host) must never leave the
 * docs option spinning forever — it always settles on a usable destination.
 */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('docs-lookup-timeout')), ms)
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
 * Resolve the documentation destination from the existing admin setting.
 *
 * Only `docs_url` is selected — never the rest of the admin settings row — and
 * the bare anon client is used because this table is intentionally public-read.
 * A cached value keeps the link usable if the network is unavailable.
 */
export async function resolveDocsDestination({ force = false } = {}) {
  const cached = getDocsUrl()
  const now = Date.now()

  if (
    !force &&
    cached &&
    lastFetchedAt &&
    now - lastFetchedAt < REFRESH_AFTER_MS
  ) {
    return { url: cached, source: 'cache', configured: true, reason: '' }
  }

  if (!force && inFlight) return inFlight
  if (!force && lastAttemptAt && now - lastAttemptAt < RETRY_AFTER_MS) {
    return cached
      ? { url: cached, source: 'cache', configured: true, reason: '' }
      : fallback('Documentation settings could not be reached.')
  }

  lastAttemptAt = now
  inFlight = (async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('admin_settings').select('docs_url').eq('id', 1).maybeSingle(),
        FETCH_TIMEOUT_MS
      )

      if (error) throw error

      const configuredUrl = normaliseDocsUrl(data?.docs_url)

      if (!configuredUrl) {
        setDocsUrl('')
        lastFetchedAt = Date.now()
        return fallback('No documentation URL is configured yet.', 'default')
      }

      if (!isSafeDocsUrl(configuredUrl)) {
        return {
          url: '',
          source: 'invalid',
          configured: false,
          reason:
            'The documentation URL in the admin panel is invalid. It must be a public HTTPS URL.',
        }
      }

      setDocsUrl(configuredUrl)
      lastFetchedAt = Date.now()
      return {
        url: configuredUrl,
        source: 'admin',
        configured: true,
        reason: '',
      }
    } catch {
      if (cached) {
        return {
          url: cached,
          source: 'cache',
          configured: true,
          reason: 'Using the last saved documentation link.',
        }
      }
      return fallback('Using the default documentation link.', 'default')
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
