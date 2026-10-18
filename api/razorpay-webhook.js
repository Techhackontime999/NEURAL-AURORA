const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')

async function readRawBody(req) {
  if (req.rawBody) {
    return Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : String(req.rawBody)
  }
  if (typeof req.body === 'string') {
    return req.body
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8')
  }
  if (!req.body) {
    return await new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', chunk => chunks.push(Buffer.from(chunk)))
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })
  }
  console.warn('[Razorpay Webhook] Body was pre-parsed by the runtime; verifying against re-serialized body')
  return JSON.stringify(req.body)
}

function isDuplicateError(error) {
  const msg = error?.message || ''
  return msg.includes('duplicate key') || msg.includes('unique constraint')
}

/** Smallest database client for service-role work, or null if unconfigured. */
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
}

/**
 * Fulfil a DIGITAL STORE order after a verified payment event.
 *
 * This is strictly additive: it looks for a row in `orders` matching the
 * gateway order id, so a service/support payment (which has no such row) is a
 * no-op and existing payment behaviour is untouched.
 *
 * Idempotent by construction:
 *  - `payment_transactions.payment_id` is unique
 *  - `entitlements (product_id, order_item_id)` is unique
 *  - the order update is guarded by `.neq('payment_status', 'paid')`
 * so replayed or duplicated webhook deliveries cannot double-grant.
 *
 * Throws only on transient database failures, so the caller can return a
 * non-2xx and let the gateway retry — that retry IS the recovery path.
 */
async function fulfilDigitalOrder(supabase, { payment, order, event }) {
  const providerOrderId = payment?.order_id || order?.id
  if (!providerOrderId) return

  const { data: dbOrder, error: lookupError } = await supabase
    .from('orders')
    .select('id, order_ref, payment_status, total_paise, currency, email, user_id')
    .eq('provider_order_id', providerOrderId)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`Order lookup failed: ${lookupError.message}`)
  }
  // Not a digital-store order.
  if (!dbOrder) return

  // Record the transaction. Replays hit the unique index and are ignored.
  if (payment?.id) {
    const { error: txError } = await supabase.from('payment_transactions').insert({
      payment_id: payment.id,
      provider: 'razorpay',
      provider_order_id: providerOrderId,
      order_id: dbOrder.id,
      amount_paise: Number(payment.amount) || 0,
      currency: payment.currency || dbOrder.currency,
      status: payment.status || 'captured',
      // The signature was already verified at the top of this handler, so a
      // row here can never represent an unverified payment.
      signature_valid: true,
      event_type: event || '',
    })

    if (txError && !isDuplicateError(txError)) {
      throw new Error(`Transaction insert failed: ${txError.message}`)
    }
  }

  if (dbOrder.payment_status === 'paid') {
    console.log('[Razorpay Webhook] Digital order already fulfilled (idempotent):', dbOrder.order_ref)
    return
  }

  // The amount and currency must match exactly what we priced server-side.
  // A mismatch is never auto-fulfilled; the order is left pending and logged
  // loudly for manual reconciliation.
  const paidAmount = Number(payment?.amount ?? order?.amount ?? 0)
  const paidCurrency = payment?.currency || order?.currency || dbOrder.currency

  if (paidAmount !== Number(dbOrder.total_paise) || paidCurrency !== dbOrder.currency) {
    console.error('[Razorpay Webhook] PAYMENT MISMATCH — order left pending for reconciliation:', {
      order_ref: dbOrder.order_ref,
      expected_paise: dbOrder.total_paise,
      expected_currency: dbOrder.currency,
      paid_paise: paidAmount,
      paid_currency: paidCurrency,
      payment_id: payment?.id,
    })
    return
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString(), failure_reason: '' })
    .eq('id', dbOrder.id)
    .neq('payment_status', 'paid')

  if (updateError) {
    throw new Error(`Order update failed: ${updateError.message}`)
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id, product_id')
    .eq('order_id', dbOrder.id)

  if (itemsError) {
    throw new Error(`Order items lookup failed: ${itemsError.message}`)
  }

  for (const item of items || []) {
    if (!item.product_id) continue

    const { error: entitlementError } = await supabase.from('entitlements').insert({
      product_id: item.product_id,
      order_id: dbOrder.id,
      order_item_id: item.id,
      user_id: dbOrder.user_id,
      customer_email: dbOrder.email,
      source: 'purchase',
      status: 'active',
    })

    if (entitlementError && !isDuplicateError(entitlementError)) {
      throw new Error(`Entitlement insert failed: ${entitlementError.message}`)
    }
  }

  console.log('[Razorpay Webhook] Digital order fulfilled:', dbOrder.order_ref)
}

/**
 * Record a failed/cancelled payment against a digital order. Never grants
 * anything: it only moves the order out of 'pending' so the customer sees an
 * honest state, and leaves no entitlement behind.
 */
async function recordDigitalFailure({ payment, order, event }) {
  const providerOrderId = payment?.order_id || order?.id
  if (!providerOrderId) return

  const supabase = getServiceClient()
  if (!supabase) {
    console.error('[Razorpay Webhook] Missing Supabase service role credentials for failure recording')
    return
  }

  try {
    const { data: dbOrder } = await supabase
      .from('orders')
      .select('id, order_ref, payment_status')
      .eq('provider_order_id', providerOrderId)
      .maybeSingle()

    if (!dbOrder || dbOrder.payment_status === 'paid') return

    const reason =
      payment?.error_description ||
      payment?.error?.description ||
      order?.error_description ||
      event

    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: event === 'order.cancelled' ? 'cancelled' : 'failed',
        failure_reason: String(reason || '').slice(0, 500),
      })
      .eq('id', dbOrder.id)
      .neq('payment_status', 'paid')

    if (error) {
      console.error('[Razorpay Webhook] Failed to record payment failure:', error.message)
    } else {
      console.log('[Razorpay Webhook] Digital order marked', event, ':', dbOrder.order_ref)
    }
  } catch (err) {
    console.error('[Razorpay Webhook] Failure recording exception:', err)
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET

  if (!webhookSecret) {
    console.error('[Razorpay Webhook] Webhook secret not configured in environment variables')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  const signature = req.headers['x-razorpay-signature']
  if (!signature) {
    console.warn('[Razorpay Webhook] Missing x-razorpay-signature header')
    return res.status(400).json({ error: 'Missing signature header' })
  }

  let rawBody
  try {
    rawBody = await readRawBody(req)
  } catch (err) {
    console.error('[Razorpay Webhook] Error reading request body:', err)
    return res.status(400).json({ error: 'Failed to read request body' })
  }
  if (!rawBody) {
    console.warn('[Razorpay Webhook] Empty request body')
    return res.status(400).json({ error: 'Empty request body' })
  }

  // Verify signature using HMAC SHA256 over the exact raw body bytes
  try {
    const expectedDigest = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest()
    const receivedDigest = Buffer.from(String(signature), 'hex')

    if (
      expectedDigest.length !== receivedDigest.length ||
      !crypto.timingSafeEqual(expectedDigest, receivedDigest)
    ) {
      console.warn('[Razorpay Webhook] Signature verification failed')
      return res.status(400).json({ error: 'Invalid signature' })
    }
  } catch (err) {
    console.error('[Razorpay Webhook] Signature verification exception:', err)
    return res.status(400).json({ error: 'Signature verification failed' })
  }

  // Parse payload JSON
  let payload
  try {
    const isParsedBody = req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)
    payload = isParsedBody ? req.body : JSON.parse(rawBody)
  } catch (err) {
    console.error('[Razorpay Webhook] Invalid JSON payload:', err)
    return res.status(400).json({ error: 'Invalid JSON payload' })
  }

  const event = payload?.event
  console.log(`[Razorpay Webhook] Verified event received: ${event}`)

  // Process payment events
  if (event === 'payment.captured' || event === 'order.paid') {
    const payment = payload?.payload?.payment?.entity || {}
    const order = payload?.payload?.order?.entity || {}
    const notes = payment.notes || order.notes || {}

    // Razorpay amount is in paise (e.g., 50000 = 500 INR)
    const rawAmount = payment.amount || order.amount || 0
    const amountInUnits = rawAmount > 0 ? Math.round(rawAmount / 100) : 0

    const paymentRecord = {
      service_id: notes.service_id || 'support',
      service_title: notes.service_title || payment.description || 'Payment',
      pricing_label: notes.pricing_label || 'Direct Payment',
      amount: amountInUnits,
      currency: payment.currency || order.currency || 'INR',
      razorpay_payment_id: payment.id || null,
      razorpay_order_id: payment.order_id || order.id || null,
      status: payment.status === 'captured' ? 'completed' : (payment.status || (event === 'order.paid' ? 'paid' : 'completed')),
      customer_email: payment.email || notes.customer_email || null,
      customer_name: notes.customer_name || notes.name || null,
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      logError('razorpay-webhook', newRequestId(), {
        stage: 'env-check',
        event,
        env: envPresence(SUPABASE_ENV_NAMES),
      })
      return res.status(500).json({ error: 'Server database configuration missing' })
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      })

      const { error: insertError } = await supabase
        .from('payments')
        .insert([paymentRecord])

      if (insertError) {
        // A replayed event. The legacy payment row is already recorded, but we
        // still run digital fulfilment below: if the first delivery recorded
        // the payment and then failed before granting access, this replay is
        // the recovery path.
        if (!isDuplicateError(insertError)) {
          console.error('[Razorpay Webhook] Database insert error:', insertError)
          return res.status(500).json({ error: 'Failed to record payment' })
        }
        console.log('[Razorpay Webhook] Payment already recorded (idempotent):', paymentRecord.razorpay_payment_id)
      } else {
        console.log('[Razorpay Webhook] Payment successfully stored:', paymentRecord.razorpay_payment_id)
      }

      // --- Digital store fulfilment ---------------------------------------
      // Additive: service/support payments have no matching `orders` row, so
      // this is a no-op for them and existing behaviour is preserved.
      try {
        await fulfilDigitalOrder(supabase, { payment, order, event })
      } catch (fulfilErr) {
        // Return non-2xx so the gateway retries. The retry hits the duplicate
        // branch above and re-attempts fulfilment — the reconciliation path.
        console.error('[Razorpay Webhook] Digital fulfilment failed:', fulfilErr.message)
        return res.status(500).json({ error: 'Failed to process payment' })
      }
    } catch (dbErr) {
      console.error('[Razorpay Webhook] Database exception:', dbErr)
      return res.status(500).json({ error: 'Internal database error' })
    }
  } else if (
    event === 'payment.failed' ||
    event === 'order.failed' ||
    event === 'order.cancelled'
  ) {
    const failurePayment = payload?.payload?.payment?.entity || {}
    const failureOrder = payload?.payload?.order?.entity || {}
    await recordDigitalFailure({ payment: failurePayment, order: failureOrder, event })
  }

  return res.status(200).json({ status: 'ok', received: true })
}
