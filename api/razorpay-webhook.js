const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')

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

  // Retrieve raw body for signature verification
  let rawBody = ''
  if (typeof req.body === 'string') {
    rawBody = req.body
  } else if (req.rawBody) {
    rawBody = typeof req.rawBody === 'string' ? req.rawBody : req.rawBody.toString('utf8')
  } else if (req.body && typeof req.body === 'object') {
    rawBody = JSON.stringify(req.body)
  } else {
    // Attempt stream read if body was not pre-parsed
    try {
      rawBody = await new Promise((resolve, reject) => {
        let buffer = ''
        req.on('data', chunk => { buffer += chunk })
        req.on('end', () => resolve(buffer))
        req.on('error', err => reject(err))
      })
    } catch (err) {
      console.error('[Razorpay Webhook] Error reading request stream:', err)
      return res.status(400).json({ error: 'Failed to read request body' })
    }
  }

  // Verify signature using HMAC SHA256
  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')

    const expectedBuf = Buffer.from(expectedSignature, 'utf8')
    const receivedBuf = Buffer.from(String(signature), 'utf8')

    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
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
    payload = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(rawBody)
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
      status: payment.status === 'captured' ? 'completed' : (payment.status || 'completed'),
      customer_email: payment.email || notes.customer_email || null,
      customer_name: notes.customer_name || notes.name || null,
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Razorpay Webhook] Missing Supabase credentials in environment')
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
        // If duplicate record (already recorded), treat as idempotent success
        const msg = insertError.message || ''
        if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
          console.log('[Razorpay Webhook] Payment already recorded (idempotent):', paymentRecord.razorpay_payment_id)
          return res.status(200).json({ status: 'ok', duplicate: true })
        }
        console.error('[Razorpay Webhook] Database insert error:', insertError)
        return res.status(500).json({ error: 'Failed to record payment' })
      }

      console.log('[Razorpay Webhook] Payment successfully stored:', paymentRecord.razorpay_payment_id)
    } catch (dbErr) {
      console.error('[Razorpay Webhook] Database exception:', dbErr)
      return res.status(500).json({ error: 'Internal database error' })
    }
  }

  return res.status(200).json({ status: 'ok', received: true })
}
