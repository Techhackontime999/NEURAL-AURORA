const Razorpay = require('razorpay')
const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, log, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')
const { fulfilDigitalOrder } = require('./_lib/fulfilment')

// ---------------------------------------------------------------------------
// POST /api/admin-reconcile-order
//
// Recovery path for a FULLY PAID order whose webhook never arrived (or whose
// delivery failed). Without this, a customer's money would be captured while
// their access stayed pending forever — the only alternatives were hand-written
// SQL or re-sending gateway events from a dashboard.
//
// Security model — this endpoint does NOT weaken the store's guarantees:
//   * POST only, and the caller must present a Supabase access token that
//     belongs to a profile whose role is exactly 'admin'.
//   * The payment is proven by fetching it from the Razorpay API with the
//     SERVER secret key. The browser never supplies an amount, a status or a
//     "paid" flag, so nothing here can be forged by a client.
//   * The same `fulfilDigitalOrder` used by the webhook runs, which refuses to
//     grant anything unless the captured amount and currency exactly match the
//     order our own database priced.
//   * Idempotent: a second call is a no-op.
//
// Body: { "order_ref": "NA-xxxxxxxxxxxxxxxx" }  or  { "payment_id": "pay_xxx" }
// ---------------------------------------------------------------------------

const ORDER_REF_RE = /^NA-[0-9a-fA-F]{16}$/
const PAYMENT_ID_RE = /^pay_[A-Za-z0-9]+$/

/** The server's Supabase client, or null when the deployment is unconfigured. */
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
}

/**
 * Resolve the caller's account from a Bearer token, then confirm the matching
 * profile is an administrator. Returns the admin user, or null when the caller
 * is not provably an admin. The role is read from the database with the service
 * role, so claiming 'admin' in the request body achieves nothing.
 */
async function requireAdmin(req, supabase) {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (!header.toLowerCase().startsWith('bearer ')) return null

  const token = header.slice(7).trim()
  if (!token) return null

  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError || profile?.role !== 'admin') return null
    return data.user
  } catch {
    return null
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()

  const supabase = getServiceClient()
  if (!supabase) {
    logError('admin-reconcile-order', requestId, {
      stage: 'env-check',
      env: envPresence(SUPABASE_ENV_NAMES),
    })
    return res.status(503).json({ error: 'Order reconciliation is unavailable right now.' })
  }

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    logError('admin-reconcile-order', requestId, {
      stage: 'razorpay-credentials-check',
      env: envPresence(['RAZORPAY_KEY_ID', 'VITE_RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']),
    })
    return res.status(503).json({ error: 'Payment gateway is not configured on the server.' })
  }

  const admin = await requireAdmin(req, supabase)
  if (!admin) {
    logError('admin-reconcile-order', requestId, { stage: 'auth-rejected' })
    return res.status(403).json({ error: 'Administrator access required.' })
  }

  const { order_ref, payment_id } = req.body || {}

  if (!order_ref && !payment_id) {
    return res.status(400).json({ error: 'Provide an order_ref or a payment_id.' })
  }
  if (order_ref && !ORDER_REF_RE.test(order_ref)) {
    return res.status(400).json({ error: 'That does not look like a valid order reference.' })
  }
  if (payment_id && !PAYMENT_ID_RE.test(payment_id)) {
    return res.status(400).json({ error: 'That does not look like a valid payment id.' })
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })

  try {
    const ORDER_COLUMNS = 'id, order_ref, payment_status, provider_order_id, total_paise, currency, email'

    // --- 1. Which order are we talking about? ------------------------------
    let order = null

    if (order_ref) {
      const { data, error: orderError } = await supabase
        .from('orders')
        .select(ORDER_COLUMNS)
        .eq('order_ref', order_ref)
        .maybeSingle()

      if (orderError) {
        logError('admin-reconcile-order', requestId, {
          stage: 'order-lookup-failed',
          db_error: orderError.message,
        })
        return res.status(500).json({ error: 'Could not read that order.' })
      }
      order = data || null
    }

    // --- 2. Prove the payment with the gateway (never the browser) ---------
    let payment = null

    if (payment_id) {
      payment = await razorpay.payments.fetch(payment_id)
    }

    if (!order && payment?.order_id) {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_COLUMNS)
        .eq('provider_order_id', payment.order_id)
        .maybeSingle()

      if (error) {
        logError('admin-reconcile-order', requestId, {
          stage: 'order-lookup-by-payment-failed',
          db_error: error.message,
        })
        return res.status(500).json({ error: 'Could not read that order.' })
      }
      order = data || null
    }

    if (!order) {
      return res.status(404).json({ error: 'No digital-store order matches that reference.' })
    }

    if (order.payment_status === 'paid') {
      return res.json({ ok: true, status: 'already_paid', order_ref: order.order_ref })
    }

    if (!order.provider_order_id) {
      return res.status(409).json({
        error: 'This order was never linked to a payment attempt, so there is nothing to verify.',
      })
    }

    if (!payment) {
      const collection = await razorpay.orders.fetchPayments(order.provider_order_id)
      const items = Array.isArray(collection?.items) ? collection.items : []

      const captured = items.filter((p) => p?.status === 'captured')
      if (captured.length === 0) {
        const authorized = items.filter((p) => p?.status === 'authorized')
        return res.status(409).json({
          error: authorized.length
            ? 'A payment for this order is authorised but not yet captured. Try again shortly.'
            : 'Razorpay shows no successful payment for this order yet. Nothing was changed.',
        })
      }

      // Prefer the captured payment whose amount matches what we priced.
      payment =
        captured.find(
          (p) =>
            Number(p.amount) === Number(order.total_paise) &&
            (p.currency || order.currency) === order.currency
        ) || captured[0]
    } else if (payment.order_id && payment.order_id !== order.provider_order_id) {
      return res.status(409).json({
        error: 'That payment belongs to a different order.',
      })
    }

    if (payment.status !== 'captured') {
      return res.status(409).json({
        error: `That payment is '${payment.status || 'unknown'}', not captured. Nothing was changed.`,
      })
    }

    // --- 3. Run the SAME fulfilment the webhook runs -----------------------
    const result = await fulfilDigitalOrder(supabase, {
      payment,
      event: 'manual.reconcile',
      signatureVerified: false,
    })

    log('admin-reconcile-order', requestId, {
      stage: 'reconciled',
      actor: admin.id,
      order_ref: order.order_ref,
      payment_id: payment.id,
      result: result.status,
    })

    if (result.status === 'mismatch') {
      return res.status(409).json({
        error:
          'The captured amount does not match this order, so access was NOT granted. Check the payment in Razorpay.',
        expected_paise: result.expected_paise,
        paid_paise: result.paid_paise,
        expected_currency: result.expected_currency,
        paid_currency: result.paid_currency,
      })
    }

    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'No digital-store order matches that payment.' })
    }

    return res.json({
      ok: true,
      status: result.status,
      order_ref: result.order_ref,
      payment_id: payment.id,
    })
  } catch (err) {
    logError('admin-reconcile-order', requestId, {
      stage: 'exception',
      error: err?.message || String(err),
    })
    return res.status(500).json({ error: 'Could not verify that payment with the gateway.' })
  }
}
