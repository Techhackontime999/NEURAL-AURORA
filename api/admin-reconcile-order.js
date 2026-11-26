const Razorpay = require('razorpay')
const { newRequestId, envPresence, log, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')
const { getServiceClient, requireAdmin } = require('./_lib/adminAuth')
const { fulfilDigitalOrder } = require('./_lib/fulfilment')
const { normalisePhone } = require('./_lib/phone')

// ---------------------------------------------------------------------------
// POST /api/admin-reconcile-order
//
// action: "reconcile" (default) - verify a captured payment with Razorpay and
// run fulfilDigitalOrder. Body: { order_ref?, payment_id? }
// action: "access-link" - mint a Supabase sign-in link for a customer who has
// store orders. Body: { action: "access-link", order_ref? | email? }
// ---------------------------------------------------------------------------

const ORDER_REF_RE = /^NA-[0-9a-fA-F]{16}$/
const PAYMENT_ID_RE = /^pay_[A-Za-z0-9]+$/
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

function requestOrigin(req) {
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim()
  if (!host) return null
  const proto = String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim()
  return `${proto || 'https'}://${host}`
}
function isAlreadyRegistered(error) {
  const code = error?.code || ''
  const message = String(error?.message || '').toLowerCase()
  return code === 'email_exists' || message.includes('already been registered') || message.includes('already registered') || message.includes('already exists')
}
function actionLinkOf(data) {
  const link = data?.properties?.action_link || data?.action_link
  return typeof link === 'string' && link.startsWith('http') ? link : null
}
async function latestCustomerPhone(supabase, email) {
  try {
    const { data, error } = await supabase.from('orders').select('customer_phone').eq('email', email).order('created_at', { ascending: false }).limit(10)
    if (error) return ''
    const row = (data || []).find((entry) => normalisePhone(entry?.customer_phone))
    return normalisePhone(row?.customer_phone)
  } catch { return '' }
}

async function handleAccessLink(req, res, requestId, supabase, admin) {
  const orderRef = String(req.body?.order_ref || '').trim()
  let email = String(req.body?.email || '').trim().toLowerCase()

  if (orderRef && !ORDER_REF_RE.test(orderRef)) return res.status(400).json({ error: 'That does not look like a valid order reference.' })
  if (!orderRef && !email) return res.status(400).json({ error: 'Provide an order_ref or an email address.' })
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'That does not look like a valid email address.' })

  if (orderRef) {
    const { data: order, error: orderError } = await supabase.from('orders').select('order_ref, email').eq('order_ref', orderRef).maybeSingle()
    if (orderError) {
      logError('admin-reconcile-order', requestId, { stage: 'access-link-order-lookup-failed', db_error: orderError.message })
      return res.status(500).json({ error: 'Could not read that order.' })
    }
    if (!order) return res.status(404).json({ error: 'No order matches that reference.' })
    email = String(order.email || '').trim().toLowerCase()
    if (!email) return res.status(409).json({ error: 'That order has no customer email, so no link can be addressed to it.' })
  }

  const { data: orders, error: ordersError } = await supabase.from('orders').select('order_ref, payment_status').eq('email', email).order('created_at', { ascending: false })
  if (ordersError) {
    logError('admin-reconcile-order', requestId, { stage: 'access-link-orders-failed', db_error: ordersError.message })
    return res.status(500).json({ error: 'Could not read that customer’s orders.' })
  }
  if (!orders || orders.length === 0) return res.status(404).json({ error: 'No digital-store order is recorded for that email, so no link was created.' })

  const { count: activeEntitlements, error: entitlementError } = await supabase.from('entitlements').select('id', { count: 'exact', head: true }).eq('customer_email', email).eq('status', 'active')
  if (entitlementError) logError('admin-reconcile-order', requestId, { stage: 'access-link-entitlement-count-failed', db_error: entitlementError.message })

  const phone = await latestCustomerPhone(supabase, email)
  let created = false
  const { error: createError } = await supabase.auth.admin.createUser({ email, email_confirm: true })
  if (!createError) created = true
  else if (!isAlreadyRegistered(createError)) logError('admin-reconcile-order', requestId, { stage: 'access-link-create-user-non-fatal', auth_error: createError.message })

  const origin = requestOrigin(req)
  const redirectTo = origin ? `${origin}/library` : null
  const { data, error: linkError } = await supabase.auth.admin.generateLink({ type: 'magiclink', email, ...(redirectTo ? { options: { redirectTo } } : {}) })
  if (linkError) {
    logError('admin-reconcile-order', requestId, { stage: 'access-link-generate-failed', auth_error: linkError.message })
    return res.status(502).json({ error: 'Supabase could not generate a sign-in link for that address right now.' })
  }
  const link = actionLinkOf(data)
  if (!link) {
    logError('admin-reconcile-order', requestId, { stage: 'access-link-empty' })
    return res.status(502).json({ error: 'Supabase returned no sign-in link.' })
  }

  log('admin-reconcile-order', requestId, { stage: 'access-link-created', actor: admin.id, email, created_account: created, orders: orders.length, active_entitlements: activeEntitlements ?? null, has_customer_phone: Boolean(phone) })
  return res.json({ ok: true, email, link, redirect_to: redirectTo, account_created: created, orders: orders.length, active_entitlements: activeEntitlements ?? null, latest_order_ref: orders[0]?.order_ref || null, phone: phone || null })
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestId = newRequestId()

  const supabase = getServiceClient()
  if (!supabase) {
    logError('admin-reconcile-order', requestId, { stage: 'env-check', env: envPresence(SUPABASE_ENV_NAMES) })
    return res.status(503).json({ error: 'Order reconciliation is unavailable right now.' })
  }

  const admin = await requireAdmin(req, supabase)
  if (!admin) {
    logError('admin-reconcile-order', requestId, { stage: 'auth-rejected' })
    return res.status(403).json({ error: 'Administrator access required.' })
  }

  const body = req.body || {}
  if (String(body.action || '').toLowerCase() === 'access-link') {
    return handleAccessLink(req, res, requestId, supabase, admin)
  }

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    logError('admin-reconcile-order', requestId, { stage: 'razorpay-credentials-check', env: envPresence(['RAZORPAY_KEY_ID', 'VITE_RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']) })
    return res.status(503).json({ error: 'Payment gateway is not configured on the server.' })
  }

  const { order_ref, payment_id } = body
  if (!order_ref && !payment_id) return res.status(400).json({ error: 'Provide an order_ref or a payment_id.' })
  if (order_ref && !ORDER_REF_RE.test(order_ref)) return res.status(400).json({ error: 'That does not look like a valid order reference.' })
  if (payment_id && !PAYMENT_ID_RE.test(payment_id)) return res.status(400).json({ error: 'That does not look like a valid payment id.' })

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })

  try {
    const ORDER_COLUMNS = 'id, order_ref, payment_status, provider_order_id, total_paise, currency, email'
    let payment = null

    if (payment_id) {
      payment = await razorpay.payments.fetch(payment_id)
      if (payment?.status !== 'captured') {
        return res.status(409).json({ error: `That payment is '${payment?.status || 'unknown'}', not captured. Nothing was changed.` })
      }
    }

    async function queryOrder(build) {
      const { data, error } = await build(supabase.from('orders').select(ORDER_COLUMNS)).maybeSingle()
      return { order: data || null, error }
    }

    let order = null
    let matchedBy = null

    if (order_ref) {
      const found = await queryOrder((q) => q.eq('order_ref', order_ref))
      if (found.error) {
        logError('admin-reconcile-order', requestId, { stage: 'order-lookup-failed', db_error: found.error.message })
        return res.status(500).json({ error: 'Could not read that order.' })
      }
      order = found.order
      matchedBy = 'order_ref'
    }

    if (!order && payment?.order_id) {
      const found = await queryOrder((q) => q.eq('provider_order_id', payment.order_id))
      if (found.error) {
        logError('admin-reconcile-order', requestId, { stage: 'order-lookup-by-payment-failed', db_error: found.error.message })
        return res.status(500).json({ error: 'Could not read that order.' })
      }
      order = found.order
      if (order) matchedBy = matchedBy || 'payment.order_id'
    }

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
          logError('admin-reconcile-order', requestId, { stage: 'candidate-lookup-failed', db_error: candidateError.message })
          return res.status(500).json({ error: 'Could not read that order.' })
        }
        const candidates = data || []
        if (candidates.length === 1) { order = candidates[0]; matchedBy = 'payment email + amount' }
        else if (candidates.length > 1) return res.status(409).json({ error: 'Several pending orders match that payment. Send the order reference as well.', order_refs: candidates.map((o) => o.order_ref) })
      }
    }

    if (!order) return res.status(404).json({ error: 'No pending digital-store order matches that payment. Nothing was changed.' })
    if (order.payment_status === 'paid') return res.json({ ok: true, status: 'already_paid', order_ref: order.order_ref })

    if (!payment) {
      if (!order.provider_order_id) return res.status(409).json({ error: 'This order was never linked to a payment attempt, so there is nothing to verify.' })
      const collection = await razorpay.orders.fetchPayments(order.provider_order_id)
      const items = Array.isArray(collection?.items) ? collection.items : []
      const captured = items.filter((p) => p?.status === 'captured')
      if (captured.length === 0) {
        const authorized = items.filter((p) => p?.status === 'authorized')
        return res.status(409).json({
          error: authorized.length ? 'A payment for this order is authorised but not yet captured. Try again shortly.' : `Razorpay has no successful payment attached to gateway order ${order.provider_order_id}. Nothing was changed.`,
          razorpay_order_id: order.provider_order_id,
          payments_found: items.map((p) => ({ id: p.id, status: p.status, amount: p.amount })),
          hint: 'If the customer really did pay, find that payment in the Razorpay dashboard and use “Verify by payment ID” with its pay_… id.',
        })
      }
      payment = captured.find((p) => Number(p.amount) === Number(order.total_paise) && (p.currency || order.currency) === order.currency) || captured[0]
    }

    if (payment.order_id && order.provider_order_id && payment.order_id !== order.provider_order_id) {
      log('admin-reconcile-order', requestId, { stage: 'gateway-order-mismatch-accepted', order_ref: order.order_ref, order_gateway_id: order.provider_order_id, payment_gateway_id: payment.order_id })
    }

    const result = await fulfilDigitalOrder(supabase, { payment, event: 'manual.reconcile', signatureVerified: false })
    log('admin-reconcile-order', requestId, { stage: 'reconciled', actor: admin.id, order_ref: order.order_ref, payment_id: payment.id, matched_by: matchedBy, result: result.status })

    if (result.status === 'mismatch') {
      return res.status(409).json({ error: 'The captured amount does not match this order, so access was NOT granted. Check the payment in Razorpay.', expected_paise: result.expected_paise, paid_paise: result.paid_paise, expected_currency: result.expected_currency, paid_currency: result.paid_currency })
    }
    if (result.status === 'not_found') return res.status(404).json({ error: 'No digital-store order matches that payment.' })
    return res.json({ ok: true, status: result.status, order_ref: result.order_ref, payment_id: payment.id, matched_by: matchedBy })
  } catch (err) {
    logError('admin-reconcile-order', requestId, { stage: 'exception', error: err?.message || String(err) })
    return res.status(500).json({ error: 'Could not verify that payment with the gateway.' })
  }
}
