const { newRequestId, envPresence, log, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')
const { getServiceClient } = require('./_lib/adminAuth')

// ---------------------------------------------------------------------------
// POST /api/customer-signin-link
//
// Self-service library recovery. The caller supplies an email address; if it
// matches a paid digital order, Supabase emails a magic link to THAT address.
//
// Security model:
//   * the generated link is never returned in the response, logged, or exposed
//     to the browser — only the mailbox on file receives it;
//   * the response is identical for a paid order, a non-purchase, and any
//     delivery failure, so the endpoint cannot be used to enumerate buyers;
//   * an account is created only for an address with a paid digital order, and
//     the link is emailed only to that address;
//   * the redirect comes from server configuration, never from request headers.
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const DEFAULT_SITE_ORIGIN = 'https://neural-aurora.vercel.app'
const LIBRARY_PATH = '/library'

function originOf(value) {
  try {
    const url = new URL(String(value).trim())
    if (url.protocol === 'https:') return url.origin
    if (url.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/i.test(url.hostname)) {
      return url.origin
    }
  } catch {
    /* not a usable absolute URL */
  }
  return null
}

/** Only server-provided configuration, or an explicitly local host, is trusted. */
function allowedRedirectOrigin(req) {
  const host = String(req.headers?.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
  const localOrigin =
    /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) && `http://${host}`

  const candidates = [
    process.env.SITE_URL,
    process.env.VITE_SITE_URL,
    process.env.VERCEL_URL && `https://${String(process.env.VERCEL_URL).trim()}`,
    localOrigin,
    DEFAULT_SITE_ORIGIN,
  ]

  for (const candidate of candidates) {
    const origin = candidate && originOf(candidate)
    if (origin) return origin
  }
  return DEFAULT_SITE_ORIGIN
}

/** Paid digital orders only. Pending/failed/refunded orders get no email. */
async function hasPaidOrder(supabase, email) {
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('email', email)
    .eq('payment_status', 'paid')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

/** Generic acknowledgement used for every accepted request. */
function accepted(res) {
  return res.status(200).json({ ok: true })
}

async function handle(req, res, supabase, requestId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase()
  if (!email) {
    return res.status(400).json({ error: 'Provide the email address you used at checkout.' })
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'That does not look like a valid email address.' })
  }

  try {
    const paid = await hasPaidOrder(supabase, email)

    if (paid) {
      const redirectTo = `${allowedRedirectOrigin(req)}${LIBRARY_PATH}`
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      })

      if (error) {
        // Deliberately still return the generic acknowledgement: a caller must
        // not learn that an address has a paid order from a different status.
        logError('customer-signin-link', requestId, {
          stage: 'otp-failed',
          auth_error: error.message,
        })
        return accepted(res)
      }
    }

    log('customer-signin-link', requestId, {
      stage: 'ok',
      email_domain: email.split('@')[1] || '',
      paid_order: paid,
    })

    return accepted(res)
  } catch (error) {
    logError('customer-signin-link', requestId, {
      stage: 'exception',
      message: error?.message,
    })
    // Even a database failure gets the same body; the status alone reports the
    // outage without saying anything about the address.
    return res.status(503).json({ error: 'Sign-in links are unavailable right now.' })
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()
  const supabase = getServiceClient()
  if (!supabase) {
    logError('customer-signin-link', requestId, {
      stage: 'env-check',
      env: envPresence(SUPABASE_ENV_NAMES),
    })
    return res.status(503).json({ error: 'Sign-in links are unavailable right now.' })
  }

  return handle(req, res, supabase, requestId)
}

// Exported only for the local guard tests; no production caller uses it.
module.exports.__test = { handle, allowedRedirectOrigin, hasPaidOrder }
