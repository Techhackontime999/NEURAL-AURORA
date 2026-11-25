// Supabase email links can land on any path: a configured redirect URL, the
// project Site URL, or an older link already sitting in somebody's inbox. This
// module normalises all of those arrivals into one quiet acknowledgement route.

export const AUTH_CALLBACK_PATH = '/auth/callback'
export const RESET_PASSWORD_PATH = '/reset-password'
export const AUTH_INTENT_KEY = 'neural-aurora-auth-intent'

const INTENTS = new Set(['admin', 'partner', 'contributor', 'library', 'reset'])
const CALLBACK_KEYS = [
  'for',
  'next',
  'type',
  'token_hash',
  'code',
  'error_code',
  'error_description',
]
const AUTH_TYPES = new Set([
  'signup',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
  'emailchange',
  'email',
  'sms',
  'phone_change',
  'phonechange',
])
const SAFE_DESTINATIONS = new Set([
  '/library',
  '/contributor-apply',
  '/partner',
  '/admin',
  '/reset-password',
  '/login',
  '/affiliate-login',
  '/contributor-login',
  '/settings',
])

function hashParams(hash) {
  return new URLSearchParams(String(hash || '').replace(/^#/, ''))
}

export function normalizeIntent(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw.includes('contributor')) return 'contributor'
  if (raw.includes('partner') || raw.includes('affiliate')) return 'partner'
  if (raw === 'reset' || raw === 'recovery') return 'reset'
  if (raw === 'admin') return 'admin'
  if (raw === 'library' || raw === 'customer') return 'library'
  return 'library'
}

export function destinationForIntent(value) {
  switch (normalizeIntent(value)) {
    case 'admin':
      return '/admin'
    case 'partner':
      return '/partner'
    case 'contributor':
      return '/contributor-apply'
    case 'reset':
      return RESET_PASSWORD_PATH
    default:
      return '/library'
  }
}

/** Only internal, known destinations are accepted from a URL parameter. */
export function safeAuthDestination(raw) {
  const value = String(raw || '').trim()
  if (!value.startsWith('/') || value.startsWith('//')) return null

  const [path, query = ''] = value.split('?')
  if (!SAFE_DESTINATIONS.has(path)) return null

  const clean = new URLSearchParams()
  const requestedIntent = new URLSearchParams(query).get('for')
  if (requestedIntent) clean.set('for', normalizeIntent(requestedIntent))

  const suffix = clean.toString()
  return suffix ? `${path}?${suffix}` : path
}

/** True for implicit tokens, PKCE codes, token-hash links and Supabase errors. */
export function hasAuthCallbackParams(location) {
  const search = new URLSearchParams(location?.search || '')
  const hash = hashParams(location?.hash || '')
  const has = (key) => search.has(key) || hash.has(key)
  const type = String(search.get('type') || hash.get('type') || '').toLowerCase()

  return (
    ['access_token', 'refresh_token', 'token_hash', 'code', 'error_code', 'error_description'].some(has) ||
    AUTH_TYPES.has(type)
  )
}

/**
 * Moves auth material off a marketing/home URL and into the acknowledgement
 * route. Access tokens are deliberately dropped: supabase-js has already
 * consumed them from the hash before React renders.
 */
export function callbackPathFromLocation(location) {
  const target = new URLSearchParams()
  const sources = [new URLSearchParams(location?.search || ''), hashParams(location?.hash || '')]

  for (const source of sources) {
    for (const key of CALLBACK_KEYS) {
      const value = source.get(key)
      if (value && !target.has(key)) target.set(key, value)
    }
  }

  const query = target.toString()
  return query ? `${AUTH_CALLBACK_PATH}?${query}` : AUTH_CALLBACK_PATH
}

export function authRedirectUrl(intent, extra = {}) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://neural-aurora.vercel.app'
  const params = new URLSearchParams()
  params.set('for', normalizeIntent(intent))

  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, String(value))
  }

  return `${origin}${AUTH_CALLBACK_PATH}?${params.toString()}`
}

export function storeAuthIntent(intent) {
  try {
    sessionStorage.setItem(AUTH_INTENT_KEY, normalizeIntent(intent))
  } catch {
    // Private browsing can block storage; the URL still carries the intent.
  }
}

export function readAuthIntent() {
  try {
    return normalizeIntent(sessionStorage.getItem(AUTH_INTENT_KEY))
  } catch {
    return 'library'
  }
}

export function clearAuthIntent() {
  try {
    sessionStorage.removeItem(AUTH_INTENT_KEY)
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}

export function verifyOtpType(value) {
  const type = String(value || '').trim().toLowerCase()
  if (type === 'emailchange' || type === 'phonechange') {
    return type === 'emailchange' ? 'email_change' : 'phone_change'
  }
  if (INTENTS.has(type) && type === 'reset') return 'recovery'
  return AUTH_TYPES.has(type) ? type : 'magiclink'
}
