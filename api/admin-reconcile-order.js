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
//       (both together pair a specific capture with a specific order)
//
// The payment_id form exists for a capture that is real but is NOT attached to
// the gateway order we recorded (e.g. the buyer's payment completed against an
// earlier checkout attempt). The admin reads the pay_… id off the Razorpay
// dashboard; the server then proves it and falls back to matching a single
// pending order by the gateway-reported email + amount + currency.
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

    // --- 1. Prove the payment with the gateway (never the browser) ---------
    let payment = null

    if (payment_id) {
      payment = await razorpay.payments.fetch(payment_id)

      if (payment?.status !== 'captured') {
        return res.status(409).json({
          error: `That payment is '${payment?.status || 'unknown'}', not captured. Nothing was changed.`,
        })
      }
    }

    // --- 2. Which order does it belong to? ---------------------------------
    /** Run a maybeSingle() lookup against `orders`, reporting DB errors. */
    async function queryOrder(build) {
      const { data, error } = await build(supabase.from('orders').select(ORDER_COLUMNS)).maybeSingle()
      return { order: data || null, error }
    }

    let order = null
    let matchedBy = null

    if (order_ref) {
      const found = await queryOrder((q) => q.eq('order_ref', order_ref))
      if (found.error) {
        logError('admin-reconcile-order', requestId, {
          stage: 'order-lookup-failed',
          db_error: found.error.message,
        })
        return res.status(500).json({ error: 'Could not read that order.' })
      }
      order = found.order
      matchedBy = 'order_ref'
    }

    if (!order && payment?.order_id) {
      const found = await queryOrder((q) => q.eq('provider_order_id', payment.order_id))
      if (found.error) {
        logError('admin-reconcile-order', requestId, {
          stage: 'order-lookup-by-payment-failed',
          db_error: found.error.message,
        })
        return res.status(500).json({ error: 'Could not read that order.' })
      }
      order = found.order
      if (order) matchedBy = matchedBy || 'payment.order_id'
    }

    // The capture is real, but it is not attached to a gateway order we
    // recorded — for example the customer's payment landed on an earlier
    // checkout attempt. Match it to a pending order using only what the
    // gateway told us (paying email + amount + currency), and only when that
    // identifies exactly one order, so no one else's purchase can be touched.
    if (!order && payment) {
      const payerEmail = String(payment.email || '').trim().toLowerCase()

      if (payerEmail) {
        const { data, error: candidateError } = await supabase
          .from('orders')
          .select(ORDER_COLUMNS)
          .eq('payment_status', 'pending')
          .eq('total_paise', Number(payment.amount) || 0)
          .eq('currency', payment.currency || 'INR')
          .ilike('email', payerEmail)

        if (candidateError) {
          logError('admin-reconcile-order', requestId, {
            stage: 'candidate-lookup-failed',
            db_error: candidateError.message,
          })
          return res.status(500).json({ error: 'Could not read that order.' })
        }

        const candidates = data || []
        if (candidates.length === 1) {
          order = candidates[0]
          matchedBy = 'payment email + amount'
        } else if (candidates.length > 1) {
          return res.status(409).json({
            error: 'Several pending orders match that payment. Send the order reference as well.',
            order_refs: candidates.map((o) => o.order_ref),
          })
        }
      }
    }

    if (!order) {
      return res.status(404).json({
        error: 'No pending digital-store order matches that payment. Nothing was changed.',
      })
    }

    if (order.payment_status === 'paid') {
      return res.json({ ok: true, status: 'already_paid', order_ref: order.order_ref })
    }

    // --- 3. If we only have the order, ask the gateway for its payments ----
    if (!payment) {
      if (!order.provider_order_id) {
        return res.status(409).json({
          error: 'This order was never linked to a payment attempt, so there is nothing to verify.',
        })
      }

      const collection = await razorpay.orders.fetchPayments(order.provider_order_id)
      const items = Array.isArray(collection?.items) ? collection.items : []
      const captured = items.filter((p) => p?.status === 'captured')

      if (captured.length === 0) {
        const authorized = items.filter((p) => p?.status === 'authorized')
        return res.status(409).json({
          error: authorized.length
            ? 'A payment for this order is authorised but not yet captured. Try again shortly.'
            : `Razorpay has no successful payment attached to gateway order ${order.provider_order_id}. Nothing was changed.`,
          razorpay_order_id: order.provider_order_id,
          payments_found: items.map((p) => ({ id: p.id, status: p.status, amount: p.amount })),
          hint:
            'If the customer really did pay, find that payment in the Razorpay dashboard and use “Verify by payment ID” with its pay_… id.',
        })
      }

      // Prefer the captured payment whose amount matches what we priced.
      payment =
        captured.find(
          (p) =>
            Number(p.amount) === Number(order.total_paise) &&
            (p.currency || order.currency) === order.currency
        ) || captured[0]
    }

    if (payment.order_id && order.provider_order_id && payment.order_id !== order.provider_order_id) {
      // Explicitly tolerated: an administrator paired a genuine capture with a
      // pending order. Access is still gated by the amount/currency check in
      // fulfilDigitalOrder below, and the pairing is logged.
      log('admin-reconcile-order', requestId, {
        stage: 'gateway-order-mismatch-accepted',
        order_ref: order.order_ref,
        order_gateway_id: order.provider_order_id,
        payment_gateway_id: payment.order_id,
      })
    }

    // --- 4. Run the SAME fulfilment the webhook runs -----------------------
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
      matched_by: matchedBy,
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
      matched_by: matchedBy,
    })
  } catch (err) {
    logError('admin-reconcile-order', requestId, {
      stage: 'exception',
      error: err?.message || String(err),
    })
    return res.status(500).json({ error: 'Could not verify that payment with the gateway.' })
  }
}
