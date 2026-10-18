const { newRequestId, envPresence, log, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')
const { getServiceClient, requireAdmin } = require('./_lib/adminAuth')

// ---------------------------------------------------------------------------
// POST /api/admin-access-link
//
// Gets a PAYING CUSTOMER into their library when email delivery cannot be
// relied on. Supabase's built-in mailer only sends a couple of messages per
// hour until a custom SMTP provider is configured, and a customer who cannot
// sign in cannot download what they bought.
//
// The server asks Supabase to MINT a sign-in link for the buyer's address. It
// never sends an email itself, so the mailer's rate limit is not involved. The
// administrator then delivers that link through whatever channel works — their
// own mail client (the admin UI offers a pre-filled mailto:) or WhatsApp — and
// the customer lands on /library already signed in.
//
// Security model:
//   * POST only, and the caller must be an administrator (see _lib/adminAuth).
//   * A link is only minted for an address that already has a digital-store
//     order, so this can never be used to create accounts for strangers.
//   * The account is created with `email_confirm: true`. The address is only
//     trusted because the administrator is choosing to send the link to it.
//   * The link is the same one Supabase would have emailed. It is returned only
//     to the admin who asked, and no secret is ever included in the response.
// ---------------------------------------------------------------------------

const ORDER_REF_RE = /^NA-[0-9a-fA-F]{16}$/
// Pragmatic address shape. Deliberately excludes spaces, quotes and the LIKE
// metacharacters so an address is always safe to match literally in the query.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

/** The public origin this request arrived on, used to build the redirect. */
function requestOrigin(req) {
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '')
    .split(',')[0]
    .trim()
  if (!host) return null

  const proto = String(req.headers?.['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim()

  return `${proto || 'https'}://${host}`
}

/** Supabase answers "already registered" when the account exists — that is fine. */
function isAlreadyRegistered(error) {
  const code = error?.code || ''
  const message = String(error?.message || '').toLowerCase()
  return (
    code === 'email_exists' ||
    message.includes('already been registered') ||
    message.includes('already registered') ||
    message.includes('already exists')
  )
}

/** Supabase moved the generated link under `properties`; accept both shapes. */
function actionLinkOf(data) {
  const link = data?.properties?.action_link || data?.action_link
  return typeof link === 'string' && link.startsWith('http') ? link : null
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()

  const supabase = getServiceClient()
  if (!supabase) {
    logError('admin-access-link', requestId, {
      stage: 'env-check',
      env: envPresence(SUPABASE_ENV_NAMES),
    })
    return res.status(503).json({ error: 'Sign-in links are unavailable right now.' })
  }

  const admin = await requireAdmin(req, supabase)
  if (!admin) {
    logError('admin-access-link', requestId, { stage: 'auth-rejected' })
    return res.status(403).json({ error: 'Administrator access required.' })
  }

  const orderRef = String(req.body?.order_ref || '').trim()
  let email = String(req.body?.email || '').trim().toLowerCase()

  if (orderRef && !ORDER_REF_RE.test(orderRef)) {
    return res.status(400).json({ error: 'That does not look like a valid order reference.' })
  }
  if (!orderRef && !email) {
    return res.status(400).json({ error: 'Provide an order_ref or an email address.' })
  }
  if (email && !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'That does not look like a valid email address.' })
  }

  try {
    // --- 1. Whose address is this? -----------------------------------------
    if (orderRef) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('order_ref, email')
        .eq('order_ref', orderRef)
        .maybeSingle()

      if (orderError) {
        logError('admin-access-link', requestId, {
          stage: 'order-lookup-failed',
          db_error: orderError.message,
        })
        return res.status(500).json({ error: 'Could not read that order.' })
      }
      if (!order) {
        return res.status(404).json({ error: 'No order matches that reference.' })
      }

      email = String(order.email || '').trim().toLowerCase()
      if (!email) {
        return res.status(409).json({
          error: 'That order has no customer email, so no link can be addressed to it.',
        })
      }
    }

    // --- 2. Refuse addresses that never bought anything --------------------
    // create-order lowercases the address before storing it, so an exact match
    // is both correct and unambiguous.
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('order_ref, payment_status')
      .eq('email', email)
      .order('created_at', { ascending: false })

    if (ordersError) {
      logError('admin-access-link', requestId, {
        stage: 'orders-lookup-failed',
        db_error: ordersError.message,
      })
      return res.status(500).json({ error: 'Could not read that customer’s orders.' })
    }
    if (!orders || orders.length === 0) {
      return res.status(404).json({
        error: 'No digital-store order is recorded for that email, so no link was created.',
      })
    }

    const { count: activeEntitlements, error: entitlementError } = await supabase
      .from('entitlements')
      .select('id', { count: 'exact', head: true })
      .eq('customer_email', email)
      .eq('status', 'active')

    if (entitlementError) {
      // Not fatal: the link is still useful, the admin is just told less.
      logError('admin-access-link', requestId, {
        stage: 'entitlement-count-failed',
        db_error: entitlementError.message,
      })
    }

    // --- 3. Make sure the account exists (idempotent) ----------------------
    // `generateLink` would create the user itself, so this is only here to pin
    // `email_confirm` and to report honestly whether the account was new. It is
    // deliberately non-fatal: an unexpected error must not block a link that
    // Supabase can still mint.
    let created = false
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    })

    if (!createError) {
      created = true
    } else if (!isAlreadyRegistered(createError)) {
      logError('admin-access-link', requestId, {
        stage: 'create-user-non-fatal',
        auth_error: createError.message,
      })
    }

    // --- 4. Mint the link. No email is sent by this call. ------------------
    // The redirect is built from the origin this request arrived on, so nothing
    // is hardcoded to one deployment. Supabase falls back to the project's
    // configured Site URL if this URL is not allow-listed.
    const origin = requestOrigin(req)
    const redirectTo = origin ? `${origin}/library` : null

    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      ...(redirectTo ? { options: { redirectTo } } : {}),
    })

    if (linkError) {
      logError('admin-access-link', requestId, {
        stage: 'generate-link-failed',
        auth_error: linkError.message,
      })
      return res.status(502).json({
        error: 'Supabase could not generate a sign-in link for that address right now.',
      })
    }

    const link = actionLinkOf(data)
    if (!link) {
      logError('admin-access-link', requestId, { stage: 'generate-link-empty' })
      return res.status(502).json({ error: 'Supabase returned no sign-in link.' })
    }

    log('admin-access-link', requestId, {
      stage: 'link-created',
      actor: admin.id,
      email,
      created_account: created,
      orders: orders.length,
      active_entitlements: activeEntitlements ?? null,
    })

    return res.json({
      ok: true,
      email,
      link,
      redirect_to: redirectTo,
      account_created: created,
      orders: orders.length,
      active_entitlements: activeEntitlements ?? null,
      latest_order_ref: orders[0]?.order_ref || null,
    })
  } catch (err) {
    logError('admin-access-link', requestId, {
      stage: 'exception',
      error: err?.message || String(err),
    })
    return res.status(500).json({ error: 'Could not prepare a sign-in link right now.' })
  }
}
