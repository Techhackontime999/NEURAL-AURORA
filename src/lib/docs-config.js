const DOCS_URL_KEY = 'neural-docs-url'

/**
 * Last-resort destination when the admin has genuinely never configured a
 * documentation URL. The admin setting is always authoritative when present.
 */
export const DEFAULT_DOCS_URL = 'https://docs-neural-aurora.vercel.app'

const MAX_URL_LENGTH = 2048

function isPrivateHostname(hostname) {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === '0.0.0.0' || host === '::1' || host === '[::1]') return true
  if (host.endsWith('.local') || host.endsWith('.internal')) return true

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4) return false

  const octets = ipv4.slice(1).map(Number)
  if (octets.some((part) => part > 255)) return true

  const [a, b] = octets
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

/**
 * Only public HTTPS destinations are allowed. Admin changes keep working
 * without a redeploy because the allow rule is protocol/host-safety based,
 * not a hardcoded list of one domain.
 */
export function isSafeDocsUrl(value) {
  if (typeof value !== 'string') return false

  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return false

  let url
  try {
    url = new URL(trimmed)
  } catch {
    return false
  }

  if (url.protocol !== 'https:') return false
  if (url.username || url.password) return false
  if (!url.hostname || !url.hostname.includes('.')) return false
  if (isPrivateHostname(url.hostname)) return false

  return true
}

export function normaliseDocsUrl(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/** Synchronous cached value used by the navbar and verification loader. */
export function getDocsUrl() {
  try {
    const cached = localStorage.getItem(DOCS_URL_KEY) || ''
    return isSafeDocsUrl(cached) ? normaliseDocsUrl(cached) : ''
  } catch {
    return ''
  }
}

/**
 * Cache only valid URLs. An empty value clears the cache so a future admin
 * change (or a deliberate clear) is not shadowed by stale local state.
 */
export function setDocsUrl(url) {
  const normalised = normaliseDocsUrl(url)
  try {
    if (!normalised) {
      localStorage.removeItem(DOCS_URL_KEY)
      return true
    }
    if (!isSafeDocsUrl(normalised)) return false
    localStorage.setItem(DOCS_URL_KEY, normalised)
    return true
  } catch {
    return false
  }
}
