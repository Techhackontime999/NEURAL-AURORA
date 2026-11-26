const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { newRequestId, envPresence, logError, SUPABASE_ENV_NAMES } = require('./_lib/diag')
const {
  isDuplicateError,
  fulfilDigitalOrder,
  recordDigitalFailure,
} = require('./_lib/fulfilment')

const BODY_SUFFIXES = ['', '\n', '\r\n']

function textCandidates(value) {
  if (value == null) return []
  return [Buffer.isBuffer(value) ? value.toString('utf8') : String(value)]
}

/**
 * All byte sequences the platform may have handed us, paired with the
 * already-parsed object when it parsed the JSON for us.
 *
 * Vercel's Node.js runtime pre-parses `application/json` for standalone
 * functions. The Next.js-style `bodyParser: false` config below is ignored
 * there. Razorpay signs the exact bytes it sent, so a re-serialization is only
 * acceptable if the HMAC over *those same bytes* verifies. That check keeps
 * this path fail-closed: no valid signature, no fulfilment.
 */
async function bodyCandidates(req) {
  const candidates = []

  if (req.rawBody != null) {
    for (const text of textCandidates(req.rawBody)) candidates.push({ text, payload: null })
  }

  if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
    for (const text of textCandidates(req.body)) candidates.push({ text, payload: null })
  } else if (req.body && typeof req.body === 'object') {
    try {
      const canonical = JSON.stringify(req.body)
      for (const suffix of BODY_SUFFIXES) {
        candidates.push({ text: canonical + suffix, payload: req.body })
      }
    } catch {
      // Non-serialisable bodies cannot be authenticated and are rejected below.
    }
  }

  if (candidates.length === 0) {
    const text = await new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', chunk => chunks.push(Buffer.from(chunk)))
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })
    candidates.push({ text, payload: null })
  }

  return candidates
}

function signatureMatches(text, signature, secret) {
  const expectedDigest = crypto.createHmac('sha256', secret).update(text).digest()
  const receivedDigest = Buffer.from(String(signature), 'hex')
  return (
    expectedDigest.length === receivedDigest.length &&
    crypto.timingSafeEqual(expectedDigest, receivedDigest)
  )
}

const handler = async function handler(req, res) {
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

  // Verify the signature against the exact bytes we were given. A pre-parsed
  // object is only trusted after its canonical re-serialization verifies.
  let rawBody
  let payload
  try {
    const candidates = await bodyCandidates(req)
    const matched = candidates.find((candidate) =>
      signatureMatches(candidate.text, signature, webhookSecret)
    )
    if (!matched) {
      console.warn('[Razorpay Webhook] Signature verification failed')
      return res.status(400).json({ error: 'Invalid signature' })
    }
    rawBody = matched.text
    payload = matched.payload
  } catch (err) {
    console.error('[Razorpay Webhook] Error reading request body:', err)
    return res.status(400).json({ error: 'Failed to read request body' })
  }
  if (!rawBody) {
    console.warn('[Razorpay Webhook] Empty request body')
    return res.status(400).json({ error: 'Empty request body' })
  }

  if (!payload) {
    try {
      payload = JSON.parse(rawBody)
    } catch (err) {
      console.error('[Razorpay Webhook] Invalid JSON payload:', err)
      return res.status(400).json({ error: 'Invalid JSON payload' })
    }
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
      // this is a no-op for them and existing behaviour is preserved. The
      // signature was verified above, hence signatureVerified: true.
      try {
        await fulfilDigitalOrder(supabase, { payment, order, event, signatureVerified: true })
      } catch (fulfilErr) {
        // Return non-2xx so the gateway retries. The retry hits the duplicate
        // branch above and re-attempts fulfilment — the reconciliation path.
        console.error('[Razorpay Webhook] Digital fulfilment failed:', fulfilErr.message)
        return res.status(500).json({ error: 'Failed to process payment' })
      }

      // --- Appointment booking confirmation --------------------------------
      // Paid appointments create a pending appointment with razorpay_order_id.
      // Confirm it here as a reliable backup to client-side verification.
      try {
        const appointmentId = notes.appointment_id
        const razorpayOrderId = payment.order_id || order.id || null
        const isAppointment = notes.item_type === 'appointment' || Boolean(appointmentId)
        if (isAppointment && razorpayOrderId) {
          let query = supabase
            .from('appointments')
            .update({
              payment_status: 'paid',
              status: 'confirmed',
              razorpay_payment_id: payment.id || null,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('razorpay_order_id', razorpayOrderId)
            .neq('payment_status', 'paid')
          if (appointmentId) query = query.eq('id', appointmentId)
          const { error: apptErr } = await query
          if (apptErr) console.error('[Razorpay Webhook] Appointment confirmation failed:', apptErr.message)
        }
      } catch (apptErr) {
        console.error('[Razorpay Webhook] Appointment confirmation exception:', apptErr.message)
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

    try {
      const notes = failurePayment.notes || failureOrder.notes || {}
      const razorpayOrderId = failurePayment.order_id || failureOrder.id || null
      const isAppointment = notes.item_type === 'appointment' || Boolean(notes.appointment_id)
      if (isAppointment && razorpayOrderId) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
          await supabase
            .from('appointments')
            .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
            .eq('razorpay_order_id', razorpayOrderId)
            .neq('payment_status', 'paid')
        }
      }
    } catch (apptErr) {
      console.error('[Razorpay Webhook] Appointment failure update exception:', apptErr.message)
    }
  }

  return res.status(200).json({ status: 'ok', received: true })
}

module.exports = handler
// Razorpay signs the exact request bytes. Disabling body parsing prevents the
// runtime from turning them into an object that can no longer be verified.
module.exports.config = { api: { bodyParser: false } }
